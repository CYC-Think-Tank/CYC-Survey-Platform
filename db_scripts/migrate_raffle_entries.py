import os
import sys

# Add parent directory to path so we can import api.dependencies
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.dependencies import supabase

def migrate_raffle_entries():
    print("Fetching completed response sessions...")
    limit = 1000
    offset = 0
    sessions = []
    
    while True:
        res = (
            supabase.table("response_sessions")
            .select("*")
            .eq("is_completed", True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        data = res.data
        if not data:
            break
        sessions.extend(data)
        if len(data) < limit:
            break
        offset += limit
        
    print(f"Found {len(sessions)} completed sessions.")
    
    print("Fetching existing raffle entries to avoid duplicates...")
    existing_res = supabase.table("raffle_entries").select("session_id").eq("is_referral", False).execute()
    existing_session_ids = {row["session_id"] for row in existing_res.data if row.get("session_id")}
    print(f"Found {len(existing_session_ids)} existing entries.")
    
    # Prepare batch inserts for raffle_entries
    entries_to_insert = []
    for session in sessions:
        if session.get("email") and session["id"] not in existing_session_ids:
            entries_to_insert.append({
                "email": session["email"],
                "survey_id": session.get("survey_id"),
                "session_id": session["id"],
                "is_referral": False
            })
            
    print(f"Prepared {len(entries_to_insert)} new base entries to insert.")
    
    # Insert in batches
    if not entries_to_insert:
        print("Nothing to migrate!")
        return
        
    batch_size = 500
    for i in range(0, len(entries_to_insert), batch_size):
        batch = entries_to_insert[i:i + batch_size]
        supabase.table("raffle_entries").insert(batch).execute()
        print(f"Inserted batch {i//batch_size + 1}...")
        
    print("Migration complete!")

if __name__ == "__main__":
    migrate_raffle_entries()
