# EduSync — Exam Timetable Uploader Guide

## Option 1 — Python Script (Recommended for bulk uploads)

### Step 1 — Get Firebase Service Account Key
1. Open https://console.firebase.google.com/project/gamers-diary-chandru128/settings/serviceaccounts/adminsdk
2. Click **Generate new private key**
3. Save the downloaded JSON file as **`serviceAccountKey.json`** inside the `scripts/` folder

### Step 2 — Run the script

```bash
cd scripts

# Preview only (no upload) — see how columns are detected
python extract_timetable.py your_file.xlsx --preview

# Upload (will ask for confirmation)
python extract_timetable.py your_file.xlsx

# Upload and clear old data for these students first
python extract_timetable.py your_file.xlsx --clear

# Specific sheet
python extract_timetable.py your_file.xlsx --sheet "Sheet2"
```

### Excel Column Names (auto-detected)
| Your Column Name        | Maps To        |
|-------------------------|----------------|
| Reg No / Register Number / Roll No | registerNumber |
| Name / Student Name     | studentName    |
| Date / Exam Date        | examDate       |
| Subject Code / Sub Code / Code | subjectCode |
| Session (FN / AN)       | session        |
| Subject Name / Subject  | subject        |
| Location / Hall / Room / Venue | hall    |

> **Session:** FN = ForNoon (10:00 AM – 1:00 PM), AN = AfterNoon (2:00 PM – 5:00 PM)
> 
> **Date formats supported:** DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, and Excel serial numbers

---

## Option 2 — Admin Web Upload

1. Login as admin → Upload Exam Timetable
2. Drag & Drop your Excel/CSV file
3. Check the **Column Detection** panel to confirm columns matched
4. Enable **"Clear old data first"** if replacing previous schedules
5. Click **Upload All**

---

## Student View

When a student logs in with their **Register Number**, they see only their own exams.
The timetable page automatically filters by `registerNumber` from Firestore.
