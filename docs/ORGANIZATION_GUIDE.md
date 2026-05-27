# EduSync — Organization Guide

> Rules and conventions for keeping the codebase organized.

## Folder Rules

| Folder | Purpose | Contains |
|---|---|---|
| `src/app/` | Bootstrap & routing | `main.js`, `router.js` |
| `src/components/ui/` | Atomic UI primitives | Toast, Modal, Loader, Chart |
| `src/components/layout/` | Page layout shells | Sidebar, Topbar |
| `src/features/<name>/` | Feature modules | One folder per feature |
| `src/services/` | External API interfaces | One file per service |
| `src/lib/` | SDK initialization | Firebase, Supabase config |
| `src/utils/` | Pure utility functions | **NO UI code** |
| `src/styles/` | Global CSS only | Design system, layout, resets |

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Page/Component files | `PascalCase.js` | `LoginPage.js`, `Sidebar.js` |
| Service files | `kebab-case.js` | `auth-service.js` |
| Utility files | `camelCase.js` | `helpers.js`, `grading.js` |
| CSS files | `kebab-case.css` | `design-system.css` |
| Feature folders | `kebab-case/` | `qa-board/`, `record-book/` |

## Import Rules

- **Always use relative imports** (`../lib/firebase.js`, NOT `/src/firebase.js`)
- **Import order**: external libs → lib/SDK → services → components → utils → styles
- **No circular imports**: A module must never import from a module that imports from it

## Adding a New Feature

1. Create `src/features/<feature-name>/` folder
2. Create the main component: `FeatureName.js`
3. Add route to `src/app/router.js`
4. Add sidebar link to `src/components/layout/Sidebar.js`

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| Put UI code in `utils/` | Put it in `components/` or `features/` |
| Import from `main.js` for utilities | Extract to proper modules |
| Use absolute imports (`/src/...`) | Use relative paths (`../...`) |
| Hardcode colors, spacing | Use CSS variables |
| Commit `dist/`, logs | Add to `.gitignore` |
