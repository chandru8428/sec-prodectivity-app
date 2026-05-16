# Graph Report - clg prodectivity  (2026-05-16)

## Corpus Check
- 93 files · ~61,144 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 698 nodes · 1072 edges · 54 communities (45 shown, 9 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc6616a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Calendar and Moderation|Calendar and Moderation]]
- [[_COMMUNITY_Chart Components|Chart Components]]
- [[_COMMUNITY_Firebase Scripts|Firebase Scripts]]
- [[_COMMUNITY_Timetable AI|Timetable AI]]
- [[_COMMUNITY_Django Models|Django Models]]
- [[_COMMUNITY_Dashboard & Firestore|Dashboard & Firestore]]
- [[_COMMUNITY_Record Book & Github|Record Book & Github]]
- [[_COMMUNITY_Frontend Deps|Frontend Deps]]
- [[_COMMUNITY_Backend Deps|Backend Deps]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Extract Timetable|Extract Timetable]]
- [[_COMMUNITY_Upload Timetable|Upload Timetable]]
- [[_COMMUNITY_Student Attendance|Student Attendance]]
- [[_COMMUNITY_Service Account|Service Account]]
- [[_COMMUNITY_Timetable Scheduler|Timetable Scheduler]]
- [[_COMMUNITY_Full Parse Test|Full Parse Test]]
- [[_COMMUNITY_Firebase Hosting|Firebase Hosting]]
- [[_COMMUNITY_Firebase Migrate|Firebase Migrate]]
- [[_COMMUNITY_Parser Test|Parser Test]]
- [[_COMMUNITY_Create Users|Create Users]]
- [[_COMMUNITY_Firebase Service|Firebase Service]]
- [[_COMMUNITY_Builder App|Builder App]]
- [[_COMMUNITY_Manage.py|Manage.py]]
- [[_COMMUNITY_Get Users|Get Users]]
- [[_COMMUNITY_Fetch Users|Fetch Users]]
- [[_COMMUNITY_ASGI|ASGI]]
- [[_COMMUNITY_WSGI|WSGI]]
- [[_COMMUNITY_Migrations|Migrations]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]

## God Nodes (most connected - your core abstractions)
1. `createLayout()` - 28 edges
2. `collection()` - 21 edges
3. `getDocs()` - 20 edges
4. `doc()` - 17 edges
5. `UI Styling Skill` - 17 edges
6. `showToast()` - 15 edges
7. `Design` - 14 edges
8. `UI/UX Pro Max - Design Intelligence` - 13 edges
9. `query()` - 12 edges
10. `setDoc()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `testUsers()` --calls--> `signInWithEmailAndPassword()`  [INFERRED]
  scripts/test_firebase_users.js → src/supabase-adapter.js
- `migrateUsers()` --calls--> `createUserWithEmailAndPassword()`  [INFERRED]
  scratch/migrate-to-firebase.js → src/supabase-adapter.js
- `migrateUsers()` --calls--> `signInWithEmailAndPassword()`  [INFERRED]
  scratch/migrate-to-firebase.js → src/supabase-adapter.js
- `migrateUsers()` --calls--> `setDoc()`  [INFERRED]
  scratch/migrate-to-firebase.js → src/supabase-adapter.js
- `migrateUsers()` --calls--> `doc()`  [INFERRED]
  scratch/migrate-to-firebase.js → src/supabase-adapter.js

## Communities (54 total, 9 thin omitted)

### Community 0 - "Calendar and Moderation"
Cohesion: 0.06
Nodes (43): render(), loadMappings(), render(), render(), adminNavItems, createLayout(), renderSidebar(), studentNavItems (+35 more)

### Community 1 - "Chart Components"
Cohesion: 0.07
Nodes (28): createChart(), darkDefaults, deepMerge(), showModal(), ensureContainer(), showToast(), demoSubjects, demoAttendance (+20 more)

### Community 2 - "Firebase Scripts"
Cohesion: 0.06
Nodes (74): render(), loadAdminStats(), render(), uploadRows(), renderDashboard(), app, auth, db (+66 more)

### Community 3 - "Timetable AI"
Cohesion: 0.08
Nodes (35): aiCall(), aiRepairParse(), extractSubjects(), getModel(), pdfToText(), $(), loadS(), nav() (+27 more)

### Community 4 - "Django Models"
Cohesion: 0.1
Nodes (29): SavedTimetableAdmin, Meta, SavedTimetable, Meta, SavedTimetableSerializer, build_optimality_summary(), candidate_score(), dedupe_timings() (+21 more)

### Community 5 - "Dashboard & Firestore"
Cohesion: 0.04
Nodes (45): Banner Design (Built-in), Banner: Design Rules, Banner: Quick Size Reference, Banner: Top Art Styles, Banner: Workflow, CIP Design (Built-in), CIP: Generate Brief, CIP: Generate Mockups (+37 more)

### Community 6 - "Record Book & Github"
Cohesion: 0.13
Nodes (19): checkUrlLive(), defaultSubjectRepoMap, findBestMatchingRepo(), getUserRepos(), stringSimilarity(), validateAndFixMappingUrls(), validateUsername(), buildEditor() (+11 more)

### Community 7 - "Frontend Deps"
Cohesion: 0.09
Nodes (22): dependencies, html2canvas, jspdf, lucide-react, pdfjs-dist, react, react-dom, devDependencies (+14 more)

### Community 8 - "Backend Deps"
Cohesion: 0.1
Nodes (20): dependencies, chart.js, firebase, html2canvas, jspdf, lucide, pdfjs-dist, qrcode (+12 more)

### Community 9 - "UI Components"
Cohesion: 0.15
Nodes (9): apiRequest(), fetchSampleData(), fetchSavedTimetables(), optimizeTimetable(), parseRawText(), saveTimetable(), LEAVE_DAYS, STEP_TITLES (+1 more)

### Community 10 - "Extract Timetable"
Cohesion: 0.17
Nodes (17): clear_existing(), detect_columns(), extract_rows(), init_firebase(), main(), normalize(), normalize_session(), parse_date() (+9 more)

### Community 11 - "Upload Timetable"
Cohesion: 0.16
Nodes (10): COL_ALIASES, deleteByType(), loadSchedules(), looksLikeRegisterNumber(), render(), sanityCheckColMap(), setupUploadZone(), clearExamSchedulesByType() (+2 more)

### Community 12 - "Student Attendance"
Cohesion: 0.26
Nodes (12): calculateBunks(), calculatePercentage(), calculateRequiredClasses(), DEFAULTS, loadSavedState(), render(), renderComputation(), renderInvalidState() (+4 more)

### Community 13 - "Service Account"
Cohesion: 0.17
Nodes (11): auth_provider_x509_cert_url, auth_uri, client_email, client_id, client_x509_cert_url, private_key, private_key_id, project_id (+3 more)

### Community 14 - "Timetable Scheduler"
Cohesion: 0.27
Nodes (8): buildCandidates(), DAYS, deepClone(), dfs(), generateTimetables(), hasConflict(), scoreSolution(), TIMES

### Community 15 - "Full Parse Test"
Cohesion: 0.28
Nodes (7): cleaned, days, isNoise(), NOISE, parseText(), startHourToSlot(), subjects

### Community 16 - "Firebase Hosting"
Cohesion: 0.33
Nodes (5): hosting, headers, ignore, public, rewrites

### Community 17 - "Firebase Migrate"
Cohesion: 0.06
Nodes (34): Accessibility Patterns, Alternative: Tailwind-Only Setup, Best Practices, code:bash (npx shadcn@latest init), code:tsx (<div className="min-h-screen bg-white dark:bg-gray-900">), code:bash (npx shadcn@latest add button card dialog form), code:tsx (import { Button } from "@/components/ui/button"), code:bash (npm install -D tailwindcss @tailwindcss/vite) (+26 more)

### Community 18 - "Parser Test"
Cohesion: 0.33
Nodes (5): daytimes, fixed, h, headers, slots

### Community 19 - "Create Users"
Cohesion: 0.15
Nodes (12): code:bash (git clone https://github.com/chandru8428/sec-prodectivity-ap), code:bash (npm install), code:bash (cp .env.example .env), code:bash (npm run dev), EduSync - SEC Productivity App, 🚀 Getting Started, Installation, 🌟 Key Features (+4 more)

### Community 20 - "Firebase Service"
Cohesion: 0.33
Nodes (5): app, auth, db, firebaseConfig, googleProvider

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (13): code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" -), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" -), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<product_typ), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa w), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --d), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --d), code:block9 (I am building the [Page Name] page. Please read design-syste), How to Use This Skill (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (10): AI Timetable Builder, API endpoints, Backend setup, Bonus features included, code:bash (python backend/manage.py migrate), code:bash (cd frontend), Folder layout, Frontend setup (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (11): 10. Charts & Data (LOW), 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Style Selection (HIGH), 5. Layout & Responsive (HIGH), 6. Typography & Color (MEDIUM), 7. Animation (MEDIUM) (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (8): Available Domains, Available Stacks, code:bash (# ASCII box (default) - best for terminal display), How to Use, Output Formats, Rule Categories by Priority, Search Reference, UI/UX Pro Max - Design Intelligence

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (8): code:bash (cd scripts), EduSync — Exam Timetable Uploader Guide, Excel Column Names (auto-detected), Option 1 — Python Script (Recommended for bulk uploads), Option 2 — Admin Web Upload, Step 1 — Get Firebase Service Account Key, Step 2 — Run the script, Student View

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (8): code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "AI search to), code:bash (# Get style options for a modern tool product), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "list perform), Example Workflow, Step 1: Analyze Requirements, Step 2: Generate Design System (REQUIRED), Step 3: Supplement with Detailed Searches (as needed), Step 4: Stack Guidelines

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (6): Accessibility, Interaction, Layout, Light/Dark Mode, Pre-Delivery Checklist, Visual Quality

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): app, auth, firebaseConfig, testUsers(), usersToTest

### Community 48 - "Community 48"
Cohesion: 0.4
Nodes (5): code:bash (python3 --version || python --version), code:bash (brew install python3), code:bash (sudo apt update && sudo apt install python3), code:powershell (winget install Python.Python.3.12), Prerequisites

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (5): Common Rules for Professional UI, Icons & Visual Elements, Interaction (App), Layout & Spacing, Light/Dark Mode Contrast

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (4): Common Sticking Points, Pre-Delivery Checklist, Query Strategy, Tips for Better Results

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (4): Must Use, Recommended, Skip, When to Apply

## Knowledge Gaps
- **252 isolated node(s):** `public`, `ignore`, `rewrites`, `headers`, `name` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createLayout()` connect `Calendar and Moderation` to `Firebase Scripts`, `Timetable AI`, `Record Book & Github`, `Upload Timetable`, `Student Attendance`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Chart Components` to `Record Book & Github`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `collection()` (e.g. with `loadAdminStats()` and `render()`) actually correct?**
  _`collection()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `getDocs()` (e.g. with `loadAdminStats()` and `render()`) actually correct?**
  _`getDocs()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `doc()` (e.g. with `migrateUsers()` and `createUsers()`) actually correct?**
  _`doc()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `public`, `ignore`, `rewrites` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Calendar and Moderation` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._