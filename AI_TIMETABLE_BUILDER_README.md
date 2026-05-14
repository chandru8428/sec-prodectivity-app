# AI Timetable Builder

This repo now includes a separate full-stack app built with:

- Frontend: React + Vite + Tailwind CSS
- Backend: Django + Django REST Framework
- AI parsing: OpenAI or NVIDIA when API keys are available
- Optimization: deterministic conflict-free slot selection with preference scoring

## Folder layout

- `frontend/` — React app
- `backend/` — Django project
- `builder/` — Django API app
- `backend/sample_data/sample_timetable.txt` — sample input

## Backend setup

From the repo root:

```bash
python backend/manage.py migrate
python backend/manage.py runserver
```

Optional environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NVIDIA_API_KEY`
- `NVIDIA_MODEL`

If no AI key is configured, the parser falls back to a heuristic parser.

## Frontend setup

From the repo root:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

- `http://localhost:5174`

The frontend proxies `/api/*` to Django at:

- `http://127.0.0.1:8000`

## API endpoints

- `POST /api/parse`
- `POST /api/optimize`
- `GET /api/timetables`
- `POST /api/timetables`
- `GET /api/sample-data`
- `GET /api/health`

## Workflow implemented

1. Paste text or upload PDF
2. AI/heuristic extraction of subject code, subject name, slot, staff, day, and time
3. Multi-select subject cards
4. Preferences:
   - preferred staff
   - leave day
   - avoid time slots
   - preferred slot
5. Optimized weekly timetable generation
6. Final output:
   - selected slots list
   - weekly timetable grid
   - summary

## Bonus features included

- Save timetable to backend
- Export final result as PDF
- Sample timetable loader
- Glassmorphism UI
- Dark / light mode toggle

## Verification completed

- Django `manage.py check` passed
- Django migrations completed
- React production build completed
- Parser + optimizer smoke test passed on sample timetable data
