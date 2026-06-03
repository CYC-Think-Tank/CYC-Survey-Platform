"""
Minimal local psycopg2-backed Supabase client shim for testing against local Postgres.
Set LOCAL_DB=postgresql://... in environment to use this instead of real Supabase.
"""
import json
import os
import re
import uuid
from typing import Any

import psycopg2
from psycopg2.extras import Json


def _dict_row(cursor, row):
    """Convert a tuple row to a dict using cursor description."""
    if row is None:
        return None
    cols = [desc[0] for desc in cursor.description]
    return dict(zip(cols, row))


def _dict_rows(cursor, rows):
    return [_dict_row(cursor, r) for r in rows]


def _serialize(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return str(val)
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return val
    return val


def _serialize_row(row: dict) -> dict:
    return {k: _serialize(v) for k, v in row.items()}


class LocalResponse:
    def __init__(self, data):
        self.data = data


class LocalPostgrestError(Exception):
    pass


class LocalQueryBuilder:
    def __init__(self, conn, table_name):
        self._conn = conn
        self._table = table_name
        self._select_cols = "*"
        self._conditions: list[tuple[str, str, Any]] = []
        self._in_conditions: list[tuple[str, list]] = []
        self._order_col: str | None = None
        self._order_desc = False

    def select(self, columns: str) -> "LocalQueryBuilder":
        self._select_cols = columns
        return self

    def eq(self, column: str, value: Any) -> "LocalQueryBuilder":
        self._conditions.append((column, "=", value))
        return self

    def in_(self, column: str, values: list) -> "LocalQueryBuilder":
        self._in_conditions.append((column, values))
        return self

    def order(self, column: str, desc: bool = False) -> "LocalQueryBuilder":
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "LocalQueryBuilder":
        return self  # no-op

    def offset(self, n: int) -> "LocalQueryBuilder":
        return self  # no-op

    def _build_where(self):
        parts = []
        params = []
        for col, op, val in self._conditions:
            parts.append(f'"{col}" {op} %s')
            params.append(val)
        for col, vals in self._in_conditions:
            placeholders = ",".join(["%s"] * len(vals))
            parts.append(f'"{col}" IN ({placeholders})')
            params.extend(vals)
        where = " AND ".join(parts)
        return f"WHERE {where}" if where else "", params

    def _strip_embedding(self):
        """Strip Supabase resource embedding like *, response_sessions(count) -> *, (table, col)."""
        cols = self._select_cols
        embedded = None
        if "," in cols and "(" in cols:
            parts = cols.split(",", 1)
            cols = parts[0].strip()
            m = re.match(r"(\w+)\s*\(\s*(\w+)\s*\)", parts[1].strip())
            if m:
                embedded = (m.group(1), m.group(2))
        return cols, embedded

    def execute(self):
        select_cols, embedded = self._strip_embedding()
        where_clause, params = self._build_where()

        order = ""
        if self._order_col:
            direction = "DESC" if self._order_desc else "ASC"
            order = f'ORDER BY "{self._order_col}" {direction}'

        query = f'SELECT {select_cols} FROM "{self._table}" {where_clause} {order}'.strip()
        cur = self._conn.cursor()
        try:
            cur.execute(query, params)
            rows = _dict_rows(cur, cur.fetchall())
        except Exception as e:
            cur.close()
            self._conn.rollback()
            raise LocalPostgrestError(str(e))
        finally:
            cur.close()

        # Add embedded count via subquery
        if embedded:
            rel_name, col = embedded[0], embedded[1]
            for r in rows:
                c = self._conn.cursor()
                c.execute(f'SELECT {col}(*) as ct FROM "{rel_name}" WHERE survey_id = %s', (r["id"],))
                cr = _dict_row(c, c.fetchone())
                c.close()
                r["response_sessions"] = [{"count": cr.get("ct", 0)}] if cr else [{"count": 0}]

        return LocalResponse([_serialize_row(r) for r in rows])

    def insert(self, data: dict | list) -> "LocalInsertResult":
        items = data if isinstance(data, list) else [data]
        inserted = []
        for item in items:
            serialized = {k: Json(v) if isinstance(v, (dict, list)) else v for k, v in item.items()}
            cols = ", ".join(f'"{c}"' for c in serialized)
            placeholders = ", ".join(["%s"] * len(serialized))
            query = f'INSERT INTO "{self._table}" ({cols}) VALUES ({placeholders}) RETURNING *'
            cur = self._conn.cursor()
            try:
                cur.execute(query, list(serialized.values()))
                inserted.append(_serialize_row(_dict_row(cur, cur.fetchone())))
            except Exception as e:
                cur.close()
                self._conn.rollback()
                raise LocalPostgrestError(str(e))
            finally:
                cur.close()
        return LocalInsertResult(inserted)

    def update(self, data: dict) -> "LocalUpdateBuilder":
        return LocalUpdateBuilder(self._conn, self._table, data, self._conditions)

    def delete(self) -> "LocalDeleteBuilder":
        return LocalDeleteBuilder(self._conn, self._table, self._conditions)


class LocalInsertResult:
    def __init__(self, data):
        self._data = data

    def execute(self):
        return LocalResponse(self._data)


class LocalUpdateBuilder:
    def __init__(self, conn, table, data, conditions):
        self._conn = conn
        self._table = table
        self._data = data
        self._conditions = list(conditions)

    def eq(self, column: str, value: Any) -> "LocalUpdateBuilder":
        self._conditions.append((column, "=", value))
        return self

    def execute(self):
        set_items = {k: Json(v) if isinstance(v, (dict, list)) else v for k, v in self._data.items()}
        params = list(set_items.values())
        set_parts = [f'"{k}" = %s' for k in set_items]

        where_parts = []
        for col, op, val in self._conditions:
            where_parts.append(f'"{col}" {op} %s')
            params.append(val)
        where_clause = " AND ".join(where_parts)

        query = f'UPDATE "{self._table}" SET {", ".join(set_parts)} WHERE {where_clause} RETURNING *'
        cur = self._conn.cursor()
        try:
            cur.execute(query, params)
            rows = [_serialize_row(_dict_row(cur, r)) for r in cur.fetchall()]
            return LocalResponse(rows)
        except Exception as e:
            cur.close()
            self._conn.rollback()
            raise LocalPostgrestError(str(e))
        finally:
            cur.close()


class LocalDeleteBuilder:
    def __init__(self, conn, table, conditions):
        self._conn = conn
        self._table = table
        self._conditions = list(conditions)

    def eq(self, column: str, value: Any) -> "LocalDeleteBuilder":
        self._conditions.append((column, "=", value))
        return self

    def execute(self):
        where_parts = []
        params = []
        for col, op, val in self._conditions:
            where_parts.append(f'"{col}" {op} %s')
            params.append(val)
        where_clause = " AND ".join(where_parts)
        query = f'DELETE FROM "{self._table}" WHERE {where_clause}'
        cur = self._conn.cursor()
        try:
            cur.execute(query, params)
            return LocalResponse([])
        except Exception as e:
            cur.close()
            self._conn.rollback()
            raise LocalPostgrestError(str(e))
        finally:
            cur.close()


class LocalStorage:
    def from_(self, bucket: str):
        return LocalStorageBucket(bucket)


class LocalStorageBucket:
    def __init__(self, bucket):
        self._bucket = bucket

    def upload(self, path, data, file_options=None):
        return None

    def get_public_url(self, path):
        return f"http://localhost:8000/local-storage/{self._bucket}/{path}"


class LocalSupabaseClient:
    def __init__(self, db_url: str):
        self._conn = psycopg2.connect(db_url)
        self._conn.autocommit = True

    def table(self, name: str) -> LocalQueryBuilder:
        return LocalQueryBuilder(self._conn, name)

    @property
    def storage(self):
        return LocalStorage()
