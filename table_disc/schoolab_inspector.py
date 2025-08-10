import os
import sys
import csv
import json
from io import StringIO
from typing import List, Dict, Any
from datetime import datetime, timedelta

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Set SUPABASE_URL and SUPABASE_KEY in environment or .env file.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def to_csv(rows: List[Dict[str, Any]]) -> str:
    if not rows:
        return ""
    headers = list(rows[0].keys())
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        flat = {k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in r.items()}
        writer.writerow(flat)
    return output.getvalue()

def get_schoolab_data(limit: int = 50, order_by: str = "created_at", desc: bool = True):
    """Fetch data from schoolab table with optional filtering"""
    try:
        query = supabase.table("schoolab").select("*").limit(limit)
        
        if desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by)
            
        res = query.execute()
        if getattr(res, "error", None):
            raise RuntimeError(f"Data fetch error: {res.error}")
        return res.data or []
    except Exception as e:
        raise RuntimeError(f"Failed to fetch data: {e}")

def get_row_count():
    """Get total row count from schoolab table"""
    try:
        res = supabase.table("schoolab").select("*", count="exact").limit(0).execute()
        return getattr(res, "count", None)
    except:
        return None

def search_by_query(search_term: str, limit: int = 50):
    """Search schoolab table by query content"""
    try:
        res = supabase.table("schoolab").select("*").ilike("query", f"%{search_term}%").limit(limit).execute()
        if getattr(res, "error", None):
            raise RuntimeError(f"Search error: {res.error}")
        return res.data or []
    except Exception as e:
        raise RuntimeError(f"Search failed: {e}")

def get_recent_entries(days: int = 7, limit: int = 50):
    """Get entries from the last N days"""
    try:
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        res = supabase.table("schoolab").select("*").gte("created_at", cutoff_date).order("created_at", desc=True).limit(limit).execute()
        if getattr(res, "error", None):
            raise RuntimeError(f"Date filter error: {res.error}")
        return res.data or []
    except Exception as e:
        raise RuntimeError(f"Date filtering failed: {e}")

def display_table_info():
    """Display schoolab table structure"""
    print("📋 **Schoolab Table Structure:**")
    print("- **id**: bigint (Primary Key, Auto-increment)")
    print("- **created_at**: timestamp with timezone (Creation date)")
    print("- **query**: text (Query/search content, nullable)")
    print("- **report**: text (Report/result content, nullable)")
    
    count = get_row_count()
    if count is not None:
        print(f"\n📊 **Total rows**: {count}")

def get_user_choice(prompt_text: str, choices: list) -> str:
    """Simple menu selection using built-in input()"""
    print(f"\n{prompt_text}")
    for i, choice in enumerate(choices, 1):
        print(f"{i}. {choice}")
    
    while True:
        try:
            selection = int(input("Enter your choice (number): "))
            if 1 <= selection <= len(choices):
                return choices[selection - 1]
            else:
                print("❌ Invalid choice. Please try again.")
        except ValueError:
            print("❌ Please enter a valid number.")

def get_number_input(prompt_text: str, default: int, min_val: int = 1, max_val: int = 10000) -> int:
    """Get numeric input with validation"""
    while True:
        try:
            user_input = input(f"{prompt_text} (default {default}): ").strip()
            if not user_input:
                return default
            value = int(user_input)
            if min_val <= value <= max_val:
                return value
            else:
                print(f"❌ Please enter a number between {min_val} and {max_val}")
        except ValueError:
            print("❌ Please enter a valid number.")

def main():
    print("🎓 **Schoolab Database Inspector**\n")
    
    # Display table info
    display_table_info()
    
    # Choose operation
    operations = [
        "📄 Browse all data",
        "🔍 Search by query content", 
        "📅 Get recent entries",
        "📊 Export specific data"
    ]
    
    operation = get_user_choice("What would you like to do?", operations)
    
    rows = []
    
    if "Browse all data" in operation:
        limit = get_number_input("How many rows?", 20)
        
        order_choices = [
            "📅 Newest first",
            "📅 Oldest first", 
            "🔢 ID ascending",
            "🔢 ID descending"
        ]
        
        order_choice = get_user_choice("Order by:", order_choices)
        
        if "Newest first" in order_choice:
            order_by, desc = "created_at", True
        elif "Oldest first" in order_choice:
            order_by, desc = "created_at", False
        elif "ID ascending" in order_choice:
            order_by, desc = "id", False
        else:
            order_by, desc = "id", True
            
        rows = get_schoolab_data(limit, order_by, desc)
        
    elif "Search by query" in operation:
        search_term = input("🔍 Enter search term for 'query' field: ").strip()
        if search_term:
            limit = get_number_input("Max results?", 50)
            rows = search_by_query(search_term, limit)
        else:
            print("❌ No search term provided")
            return
            
    elif "Get recent entries" in operation:
        days = get_number_input("Last N days?", 7, 1, 365)
        limit = get_number_input("Max results?", 50)
        rows = get_recent_entries(days, limit)
        
    elif "Export specific data" in operation:
        limit = get_number_input("How many rows to export?", 100, 1, 10000)
        rows = get_schoolab_data(limit, "created_at", True)

    if not rows:
        print("❌ No data found")
        return

    # Format selection
    format_choices = [
        "📊 JSON (detailed)",
        "📋 CSV (spreadsheet)", 
        "📄 Summary (readable)"
    ]
    
    fmt_choice = get_user_choice("Output format:", format_choices)
    
    print(f"\n📄 **Results ({len(rows)} entries):**")
    
    if "CSV" in fmt_choice:
        print(to_csv(rows))
    elif "Summary" in fmt_choice:
        for i, row in enumerate(rows[:10], 1):  # Show first 10 in summary
            print(f"\n**Entry {i}** (ID: {row.get('id')})")
            print(f"📅 Created: {row.get('created_at')}")
            query_text = row.get('query', '')[:100]
            print(f"🔍 Query: {query_text}{'...' if len(row.get('query', '')) > 100 else ''}")
            report_text = row.get('report', '')[:100]
            print(f"📋 Report: {report_text}{'...' if len(row.get('report', '')) > 100 else ''}")
        if len(rows) > 10:
            print(f"\n... and {len(rows) - 10} more entries")
    else:
        print(json.dumps(rows, indent=2, default=str))

if __name__ == "__main__":
    main()
