"""
EduSync — Exam Timetable Extractor
====================================
Reads an Excel file with exam schedule data and uploads to Firebase Firestore.

Columns expected (flexible, auto-detected):
  Reg No / Register Number / Roll No
  Name / Student Name
  Date / Exam Date
  Subject Code / Sub Code
  Session / FN/AN
  Subject Name / Subject
  Location / Hall / Room / Venue

Usage:
  python extract_timetable.py <path_to_excel.xlsx>
  python extract_timetable.py schedules.xlsx
  python extract_timetable.py schedules.xlsx --preview   (preview only, no upload)
"""

import sys
import os
import json
import datetime
import argparse
import re

try:
    import pandas as pd
except ImportError:
    print("❌ pandas not found. Run:  pip install -r requirements.txt")
    sys.exit(1)

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not found. Run:  pip install -r requirements.txt")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
FIREBASE_PROJECT_ID = "gamers-diary-chandru128"
SERVICE_ACCOUNT_FILE = "serviceAccountKey.json"   # Download from Firebase Console
COLLECTION_NAME = "examSchedules"

# Column aliases — all lowercase, stripped
COL_MAP = {
    "registerNumber": [
        "reg no", "regno", "register no", "register number", "registernumber",
        "roll no", "rollno", "roll number", "enrollment no", "enrollment number",
        "reg_no", "reg.no", "registration number"
    ],
    "studentName": [
        "name", "student name", "studentname", "candidate name",
        "full name", "fullname", "student_name"
    ],
    "examDate": [
        "date", "exam date", "examdate", "examination date",
        "exam_date", "date of exam"
    ],
    "subjectCode": [
        "subject code", "subjectcode", "sub code", "subcode",
        "course code", "subject_code", "code"
    ],
    "session": [
        "session", "sess", "fn/an", "fn", "an", "slot",
        "exam session", "time slot"
    ],
    "subject": [
        "subject name", "subjectname", "subject", "course name",
        "paper name", "course", "subject_name", "paper"
    ],
    "hall": [
        "location", "hall", "room", "venue", "exam hall",
        "exam center", "room no", "hall no", "exam venue"
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def normalize(s):
    return str(s).strip().lower().replace("_", " ").replace("-", " ")

def detect_columns(df_cols):
    """Maps detected DataFrame columns to our standard field names."""
    normalized_cols = {normalize(c): c for c in df_cols}
    mapping = {}
    for field, aliases in COL_MAP.items():
        for alias in aliases:
            if alias in normalized_cols:
                mapping[field] = normalized_cols[alias]
                break
    return mapping

def parse_date(val):
    """Try multiple date formats and return YYYY-MM-DD string."""
    if pd.isna(val) or str(val).strip() == "":
        return ""
    val = str(val).strip()
    # Already correct format
    if re.match(r"^\d{4}-\d{2}-\d{2}$", val):
        return val
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y",
        "%d/%m/%y", "%d-%m-%y",
        "%B %d, %Y", "%b %d, %Y",
        "%d %B %Y", "%d %b %Y",
        "%Y/%m/%d",
    ]
    for fmt in formats:
        try:
            return datetime.datetime.strptime(val, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # pandas Timestamp
    try:
        dt = pd.to_datetime(val, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return val

def normalize_session(val):
    """Normalize FN/AN session field."""
    if pd.isna(val) or str(val).strip() == "":
        return ""
    v = str(val).strip().upper()
    if "FN" in v or "FORE" in v or "MORN" in v or "AM" in v:
        return "FN"
    if "AN" in v or "AFTER" in v or "PM" in v:
        return "AN"
    return v

def session_to_time(session):
    """Convert FN/AN to start/end times."""
    if session == "FN":
        return "10:00", "13:00"
    if session == "AN":
        return "14:00", "17:00"
    return "", ""

def extract_rows(filepath, sheet=0):
    """Read Excel/CSV and return list of standardized dicts."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(filepath, dtype=str, encoding="utf-8", errors="ignore")
    else:
        df = pd.read_excel(filepath, sheet_name=sheet, dtype=str)

    df.columns = [str(c).strip() for c in df.columns]
    col_map = detect_columns(df.columns)

    print("\n📋 Detected column mapping:")
    for field, col in col_map.items():
        print(f"   {field:20s} ← '{col}'")

    missing = [f for f in ["registerNumber", "examDate", "subject"] if f not in col_map]
    if missing:
        print(f"\n⚠️  Warning: Could not detect columns for: {missing}")
        print(f"   Found columns: {list(df.columns)}")

    rows = []
    for idx, row in df.iterrows():
        def get(field):
            c = col_map.get(field)
            if c is None:
                return ""
            v = row.get(c, "")
            if pd.isna(v):
                return ""
            return str(v).strip()

        reg_no     = get("registerNumber")
        if not reg_no:
            continue   # Skip rows with no register number

        session    = normalize_session(get("session"))
        start, end = session_to_time(session)
        exam_date  = parse_date(get("examDate"))

        record = {
            "registerNumber": reg_no.upper(),
            "studentName":    get("studentName"),
            "examDate":       exam_date,
            "subjectCode":    get("subjectCode").upper(),
            "subject":        get("subject"),
            "session":        session,
            "startTime":      start,
            "endTime":        end,
            "hall":           get("hall"),
        }
        rows.append(record)

    return rows

# ─────────────────────────────────────────────────────────────────────────────
# FIREBASE UPLOAD
# ─────────────────────────────────────────────────────────────────────────────
def init_firebase():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"\n❌ Service account key not found: {SERVICE_ACCOUNT_FILE}")
        print("   Download it from Firebase Console →")
        print("   https://console.firebase.google.com/project/gamers-diary-chandru128/settings/serviceaccounts/adminsdk")
        print("   Save it as 'serviceAccountKey.json' in this folder.")
        sys.exit(1)

    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
    return firestore.client()

def clear_existing(db, reg_numbers):
    """Delete existing records for these register numbers before re-upload."""
    print(f"\n🗑️  Clearing existing records for {len(reg_numbers)} students...")
    col_ref = db.collection(COLLECTION_NAME)
    deleted = 0
    for reg in reg_numbers:
        docs = col_ref.where("registerNumber", "==", reg).stream()
        for d in docs:
            d.reference.delete()
            deleted += 1
    print(f"   Removed {deleted} old records.")

def upload_to_firestore(db, rows, clear_first=False):
    reg_numbers = list(set(r["registerNumber"] for r in rows))
    if clear_first:
        clear_existing(db, reg_numbers)

    col_ref = db.collection(COLLECTION_NAME)
    print(f"\n⬆️  Uploading {len(rows)} exam records...")
    batch  = db.batch()
    count  = 0
    for i, row in enumerate(rows):
        doc_ref = col_ref.document()
        row["uploadedAt"] = firestore.SERVER_TIMESTAMP
        row["uploadedBy"] = "admin-python-script"
        batch.set(doc_ref, row)
        count += 1
        # Firestore batch limit = 500
        if count % 499 == 0:
            batch.commit()
            batch = db.batch()
            print(f"   Committed batch at {count} records...")

    batch.commit()
    print(f"✅ Successfully uploaded {count} exam records to '{COLLECTION_NAME}'!")

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="EduSync Timetable Extractor — Upload exam schedules to Firebase"
    )
    parser.add_argument("file", help="Path to Excel (.xlsx/.xls) or CSV file")
    parser.add_argument("--sheet", default=0, help="Sheet index or name (default: 0)")
    parser.add_argument("--preview", action="store_true", help="Preview extracted data without uploading")
    parser.add_argument("--clear", action="store_true", help="Clear existing records for these students before uploading")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"❌ File not found: {args.file}")
        sys.exit(1)

    print(f"\n🎓 EduSync Timetable Extractor")
    print(f"   File: {args.file}")
    print(f"   Sheet: {args.sheet}")

    # Extract
    rows = extract_rows(args.file, sheet=args.sheet)
    print(f"\n✅ Extracted {len(rows)} rows")

    if not rows:
        print("⚠️  No valid rows found. Check that your file has a 'Register No' column.")
        sys.exit(1)

    # Preview
    print(f"\n{'─'*70}")
    print(f"{'Reg No':<20} {'Name':<20} {'Date':<12} {'Code':<10} {'Session':<7} {'Subject':<20} {'Hall'}")
    print(f"{'─'*70}")
    for r in rows[:15]:
        print(
            f"{r['registerNumber']:<20} "
            f"{r['studentName'][:18]:<20} "
            f"{r['examDate']:<12} "
            f"{r['subjectCode']:<10} "
            f"{r['session']:<7} "
            f"{r['subject'][:18]:<20} "
            f"{r['hall']}"
        )
    if len(rows) > 15:
        print(f"   ... and {len(rows)-15} more rows")
    print(f"{'─'*70}")

    if args.preview:
        print("\n👁️  Preview mode — not uploading. Remove --preview flag to upload.")
        return

    # Upload
    ans = input(f"\n❓ Upload {len(rows)} records to Firebase? (yes/no): ").strip().lower()
    if ans not in ("yes", "y"):
        print("Aborted.")
        return

    db = init_firebase()
    upload_to_firestore(db, rows, clear_first=args.clear)

if __name__ == "__main__":
    main()
