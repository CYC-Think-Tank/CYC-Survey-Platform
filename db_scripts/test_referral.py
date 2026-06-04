import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.dependencies import supabase

share_links = supabase.table("share_links").select("*").execute().data
print("Share Links:", share_links)

raffle_entries = supabase.table("raffle_entries").select("*").execute().data
print("Raffle Entries:", raffle_entries)
