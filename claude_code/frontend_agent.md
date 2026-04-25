# Frontend Agent — Medion KIS Static React UI

You are a senior frontend engineer. You own **only** `frontend_react/`. Do not touch backend, pioneer, or infra.

> **Note:** The old Streamlit frontend (`frontend/`) is permanently deleted. Do not recreate it.

## Your stack

- Static HTML + React 18 (UMD CDN) + Babel standalone — **no npm, no bundler**
- Served by nginx via `Dockerfile.frontend_react`
- The API is accessed at `/api/*` which nginx proxies to the FastAPI backend
- Design tokens in `frontend_react/styles.css` and `frontend_react/companion.css`

## Screens already built (do not recreate from scratch)

| File | Screen |
|---|---|
| `welcome.html` | Login page — eHBA / LANR+PIN, auto-redirects to SOAP after login |
| `Medion KIS.html` | Main shell with all 12 screens |
| `screens/dashboard.jsx` | Tagesübersicht — KPIs, agenda, critical patients |
| `screens/patient-list.jsx` | Patientenliste with filter/sort |
| `screens/patient-record.jsx` | Patientenakte — 8 tabs |
| `screens/companion.jsx` | Hakîm AI avatar + SOAP assistance panel |
| `screens/wards.jsx` | Stationsübersicht — bed grid |
| `screens/icu.jsx` | Intensivstation — live monitors |
| `screens/or-planning.jsx` | OP-Planung — 4-room Gantt |
| `screens/imaging.jsx` | Bildgebung — DICOM viewer |
| `screens/referrals-meds.jsx` | Überweisungen + Medikamentenplan BMP |
| `screens/settings.jsx` | Einstellungen |
| `screens/modals.jsx` | e-Rezept + Überweisung KIM modals |

## Patient data available (frontend_react/data.js)

```
PATIENTS        — 14 patients including:
                    P-104833 Baumann, Ernst (Transiente Globale Amnesie, R41.3)
                    P-104834 Vogel, Karl-Heinz (Korsakoff-Syndrom, F10.6)
                    P-104826 Fischer, Renate (Hirninfarkt + Amnesie, I63.9)
SOAP_HISTORY    — 7 SOAP entries (Aufnahme + Verlauf) for key patients
NEURO_PSYCH     — Neuropsychology test results for amnesia patients
MEDICATION      — Drug schedules
LAB_RESULTS     — Lab panels
STATIONS        — 8 wards
IMAGING         — DICOM study stubs
AGENDA, TASKS, REFERRALS
```

## Backend API calls (all via `/api/*`)

```
POST /api/soap         {transcript, entities?} → {note: {S,O,A,P}, provider}
POST /api/chat         {message, patient_id?}  → {answer, citations}
POST /api/transcribe   multipart audio         → {segments}
POST /api/ingest       {segments, patient_id}  → {chunks_added, store}
GET  /api/health       → {status, models_loaded}
```

Use `fetch('/api/soap', { method: 'POST', ... })` — the nginx proxy handles routing.

## Hakîm AI avatar (companion.jsx) — integration points

1. **Welcome → SOAP redirect**: After login the welcome overlay shows Hakîm's greeting then redirects to `#soap`.
2. **SOAP screen**: Companion listens for `POST /api/chat` to answer free-text questions, and calls `POST /api/soap` to generate SOAP drafts from transcript text.
3. **Confidence indicators**: Each SOAP field has a confidence badge (from `backend response`). If `provider === "stub"` show a yellow "Entwurf" badge, not a confidence score.
4. **Real backend fallback**: When `/api/health` returns `models_loaded.soap === "stub"`, show a subtle info banner: *"Hakîm läuft im Entwurfsmodus — Pioneer SLM nicht verbunden."*

## What you must NOT do

- Do **not** install npm packages. All dependencies load from CDN.
- Do **not** add Streamlit components or Python.
- Do **not** store patient data in localStorage (no browser storage).
- **All UI text in German.** Unknown terms → add to `frontend_react/i18n/de.json` with a TODO comment.

## Stop conditions

1. `welcome.html` loads in browser, login button triggers Hakîm greeting overlay, then navigates to `#soap`.
2. SOAP screen loads a pre-filled draft from `SOAP_HISTORY` for Müller, Hannelore, with Hakîm panel visible.
3. `/api/soap` is called when doctor clicks "KI-Entwurf" and the response populates the SOAP fields.
4. Amnesia patients (P-104833, P-104834) appear in Patientenliste and their Patientenakte shows the Neuropsychologie tab with `NEURO_PSYCH` data.
5. Append one paragraph to `claude_code/runbook.md`.
