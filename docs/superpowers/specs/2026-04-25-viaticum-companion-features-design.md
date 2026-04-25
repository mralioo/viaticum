# Viaticum — Companion & UX Features Design Spec

**Date:** 2026-04-25  
**Status:** Approved

---

## Overview

Four UX improvements to the running Streamlit app:

1. **Auto-login** — remove the login gate, auto-enter as Dr. Weber with an avatar badge
2. **Hover RAG suggestions** — floating tooltip on the Verlaufseintrag textarea that fetches context from the backend RAG system
3. **Tamagotchi companion** — animated pixel SVG doctor at bottom-left of every page, interactive chat, mental health check-ins
4. **Companion setup page** — name the companion, choose personality, set check-in interval

---

## Feature 1 — Auto-login as Dr. Weber

### What changes
- `frontend/streamlit_app.py`: remove `require_login()` function and its call. Replace with a one-line auto-login block.
- On first render, set `st.session_state.logged_in = True` and `st.session_state.username = "dr.weber"`.
- Sidebar shows a `👨‍⚕️ **Dr. Weber**` avatar badge instead of "Angemeldet als `dr.weber`".
- Remove the login form, login button, and login error string from the UI.
- All page-level guards (`if not st.session_state.get("logged_in"): st.switch_page(...)`) remain unchanged — they always pass now.
- Login-related i18n keys in `de.json` are left in place (unused) for potential future re-enablement.

### What does NOT change
- Session state structure — `logged_in`, `username` keys remain the same so other pages keep working without modification.

---

## Feature 2 — Hover RAG Suggestions on Verlaufseintrag

### What changes
- `frontend/pages/1_Patientenorganizer.py`: inside the `with t3:` block (Verlaufseintrag tab), after the `st.text_area(...)` call, inject a zero-height JS component.

### Behaviour
- JavaScript polls every 500ms for the Streamlit textarea element matching the `verlaufseintrag` aria-label.
- On `mouseenter`: fires a `fetch()` POST to `BACKEND_URL/chat` with body:
  ```json
  {
    "message": "Schlage relevante klinische Informationen für diesen Patienten vor",
    "patient_name": "<patient name>",
    "drg": "<patient DRG>",
    "mode": "rag_suggest"
  }
  ```
- While fetching: shows a small spinner `<div>` above the textarea.
- On response: renders a floating `<div>` (max 3 bullet points) positioned 8px above the textarea, z-index 10000, white card with subtle shadow.
- On `mouseleave`: hides the suggestion panel after a 1-second delay (so the user can move the cursor onto it).
- On suggestion panel click: copies the clicked bullet text directly into the textarea DOM element via JS (`textarea.value += '\n' + text`) — no postMessage needed since the JS is injected into the main Streamlit page via `st.markdown`.

### Technical notes
- `BACKEND_URL` is baked into the JS as a Python f-string: `f"const BACKEND_URL = '{backend_url}';"`.
- `backend_url` is read from `os.environ.get("BACKEND_URL", "http://localhost:8000")` at module import time.
- The component height is `0` so it takes no layout space. The floating div breaks out of the iframe via `position:fixed` — this only works in Streamlit because Streamlit renders components in iframes that can overlay the parent via `allow="fullscreen"` + `sandbox` relaxation. The standard workaround is to inject the JS into the **main page** via `st.markdown(..., unsafe_allow_html=True)` instead of `components.v1.html()` — this approach is used here.

---

## Feature 3 — Tamagotchi Doctor Companion

### New file: `frontend/components/companion.py`

Exports one public function: `render_companion()`.

Called at the bottom of every page file (same pattern as `render_omni()`).

### Visual design — SVG pixel doctor
Self-contained SVG character (~60 lines):
- Round head, simple eyes (2 circles), mouth (arc, changes per state)
- White coat body, stethoscope hanging from neck
- Name badge rectangle showing companion name
- All drawn in SVG primitives — no external assets, no fonts

### Animation states (CSS keyframes on SVG groups)
| State | Trigger | Animation |
|-------|---------|-----------|
| `idle` | default | 2s vertical float loop, slow blink every 4s |
| `happy` | positive response or greeting | bounce (3 quick up/down), eyes become arcs |
| `talking` | sending/receiving chat message | mouth arc oscillates, speech bubble pulses |
| `thinking` | waiting for response | head tilts 10°, `?` appears above head |
| `sad` | doctor has been typing for >4h (page load counter) | droop, downward arc mouth |

### Chat strip
Below the SVG: a single-line text input and a send button (German placeholder: `"Wie geht es dir?"`)

On send:
1. JS sets state → `talking`
2. JS fires `fetch(BACKEND_URL + "/chat", { method: "POST", body: JSON.stringify({ message: userText, mode: "companion", companion_name: NAME, companion_personality: PERSONALITY }) })`
3. On response: show text in speech bubble above the SVG, state → `happy`
4. After 4 seconds: bubble fades, state → `idle`

### Proactive check-ins
A `setInterval` runs every `CHECK_IN_INTERVAL` ms. If the interval is not `"never"`, the companion says one of a list of rotating German encouragement phrases (hardcoded array of 10 phrases, no backend call needed for these). Example phrases:
- `"Du machst das großartig, Dr. Weber!"`
- `"Denk daran, kurz Pause zu machen."`
- `"Du hast heute schon viel erreicht!"`

### Layout
- `position: fixed; bottom: 24px; left: 24px; z-index: 9998`
- Companion widget: 120px wide × 200px tall
- OMNI stays at `bottom: 24px; right: 24px` — they coexist without overlap

### Session state consumed
- `st.session_state.companion_name` (default: `"Hakim"`)
- `st.session_state.companion_personality` (default: `"Fürsorglich & warmherzig"`)
- `st.session_state.companion_checkin_interval` (default: `"30min"`, options: `"never"`, `"30min"`, `"60min"`)

These are passed into the HTML as JS variables in the Python f-string.

---

## Feature 4 — Companion Setup Page

### New file: `frontend/pages/4_Companion_Setup.py`

Page title: `"🤖 Begleiter einrichten"`

### Sections

**Name auswählen**  
Pill-button row using `st.radio` with `horizontal=True`:  
`Hakim | Tabib | Sina | Yuki | Max | Eigener Name`  
If "Eigener Name" selected: show `st.text_input("Name eingeben")`.

**Persönlichkeit**  
`st.radio` (vertical):
- `"Fürsorglich & warmherzig"` — supportive, warm German phrases
- `"Witzig & locker"` — light humour, emoji-heavy
- `"Professionell & ruhig"` — concise, calm tone

**Erinnerungen**  
`st.radio` (horizontal): `Nie | Alle 30 Minuten | Jede Stunde`

**Vorschau**  
`st.subheader("Vorschau")` followed by a `render_companion()` call passing the currently selected (not yet saved) settings — so changes reflect live.

**Speichern**  
`st.button("Einstellungen speichern")` → writes all three values to `st.session_state` → `st.success("Gespeichert!")`.

---

## File Change Summary

| File | Action |
|------|--------|
| `frontend/streamlit_app.py` | Modify — remove login, add auto-login, update sidebar |
| `frontend/pages/1_Patientenorganizer.py` | Modify — add hover RAG JS injection in Verlaufseintrag tab + add `render_companion()` call |
| `frontend/components/companion.py` | Create — SVG companion widget |
| `frontend/pages/4_Companion_Setup.py` | Create — companion setup page |
| `frontend/pages/2_ZNA_Triage.py` | Modify — add `render_companion()` call |
| `frontend/pages/3_Live_Consultation.py` | Modify — add `render_companion()` call |
| `frontend/i18n/de.json` | Modify — add companion i18n strings |

---

## Out of Scope

- Persisting companion settings across browser sessions (localStorage / database) — session state only
- Companion avatar image uploads or custom sprites
- Streaming responses for companion chat
- Mobile layout optimisation
