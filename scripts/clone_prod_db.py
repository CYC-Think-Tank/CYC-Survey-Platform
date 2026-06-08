import json
import os
import psycopg2
from psycopg2.extras import Json
from supabase import create_client

# Production Supabase config
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# Local Postgres config
import getpass
LOCAL_USER = getpass.getuser()
LOCAL_DB = f"postgresql://{LOCAL_USER}@localhost:5432/cyc_survey_platform_local"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_tables():
    """Get list of tables from production Supabase"""
    # Query information_schema for tables in public schema
    res = supabase.rpc("get_tables", {}).execute()
    # Actually, let's just use a direct SQL query via supabase
    res = supabase.table("information_schema.tables").select("table_name").eq("table_schema", "public").execute()
    tables = [row["table_name"] for row in res.data if not row["table_name"].startswith("pg_") and not row["table_name"].startswith("_")]
    return tables

def dump_table(table_name):
    """Dump all data from a production table"""
    print(f"Dumping {table_name}...")
    try:
        res = supabase.table(table_name).select("*").execute()
        return res.data
    except Exception as e:
        print(f"  Error dumping {table_name}: {e}")
        return []

def get_local_columns(conn, table_name):
    """Get list of columns in local table"""
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = %s AND table_schema = 'public'
    """, (table_name,))
    cols = {r[0]: r[1] for r in cur.fetchall()}
    cur.close()
    return cols

def insert_into_local(table_name, rows):
    """Insert rows into local Postgres"""
    if not rows:
        print(f"  No data for {table_name}")
        return
    
    conn = psycopg2.connect(LOCAL_DB)
    cur = conn.cursor()
    
    # Get intersection of columns that exist in both source and destination
    local_cols = get_local_columns(conn, table_name)
    source_cols = list(rows[0].keys())
    columns = [c for c in source_cols if c in local_cols]
    jsonb_cols = {c for c, t in local_cols.items() if 'json' in t.lower()}
    
    if not columns:
        print(f"  No matching columns found for {table_name}")
        cur.close()
        conn.close()
        return
    
    col_str = ", ".join([f'"{c}"' for c in columns])
    placeholders = ", ".join(["%s"] * len(columns))
    
    # Disable triggers and constraints for clean import
    cur.execute(f"ALTER TABLE \"{table_name}\" DISABLE TRIGGER ALL;")
    
    inserted = 0
    for row in rows:
        values = []
        for c in columns:
            val = row.get(c)
            if c in jsonb_cols and val is not None:
                values.append(Json(val))
            else:
                values.append(val)
        try:
            cur.execute(
                f'INSERT INTO \"{table_name}\" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING',
                values
            )
            inserted += 1
        except Exception as e:
            print(f"    Error inserting row: {e}")
            conn.rollback()
            cur.execute(f"ALTER TABLE \"{table_name}\" DISABLE TRIGGER ALL;")
    
    cur.execute(f"ALTER TABLE \"{table_name}\" ENABLE TRIGGER ALL;")
    conn.commit()
    cur.close()
    conn.close()
    print(f"  Inserted {inserted}/{len(rows)} rows into local {table_name}")

if __name__ == "__main__":
    # Try to get tables
    print("Fetching table list from production...")
    try:
        res = supabase.table("information_schema.tables").select("table_name").eq("table_schema", "public").execute()
        tables = [row["table_name"] for row in res.data 
                  if not row["table_name"].startswith("pg_") 
                  and not row["table_name"].startswith("_")
                  and row["table_name"] not in ("schema_migrations", "schema_migration", "spatial_ref_sys")]
        print(f"Found tables: {tables}")
    except Exception as e:
        print(f"Error listing tables: {e}")
        # Fallback to known tables
        tables = ["surveys", "questions", "response_sessions", "answers", "ai_analyses"]
        print(f"Using fallback table list: {tables}")
    
    for table in tables:
        data = dump_table(table)
        if data:
            insert_into_local(table, data)
    
    print("\nDone! Local database cloned from production.")
