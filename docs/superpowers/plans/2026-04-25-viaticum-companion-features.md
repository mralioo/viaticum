# Viaticum Companion Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auto-login, hover RAG suggestions on Verlaufseintrag, a floating animated SVG doctor companion with chat, and a companion setup page to the Streamlit frontend.

**Architecture:** All changes are frontend-only (no backend changes needed — the existing `/chat` endpoint handles companion and RAG requests). The companion is injected into the parent Streamlit document via `window.parent.document` from a zero-height `st.components.v1.html()` iframe, making it truly float fixed over all page content. The hover RAG uses the same injection technique.

**Tech Stack:** Streamlit, Python f-strings for HTML templating, vanilla JS (no build step), SVG for the doctor character, CSS keyframe animations for states.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/i18n/de.json` | Modify | Add companion i18n keys |
| `frontend/streamlit_app.py` | Modify | Remove login gate, auto-login as Dr. Weber, show avatar badge |
| `frontend/components/companion.py` | **Create** | SVG doctor widget HTML/JS, `render_companion()` |
| `frontend/pages/1_Patientenorganizer.py` | Modify | Add hover RAG JS + `render_companion()` |
| `frontend/pages/2_ZNA_Triage.py` | Modify | Add `render_companion()` |
| `frontend/pages/3_Live_Consultation.py` | Modify | Add `render_companion()` |
| `frontend/pages/4_Companion_Setup.py` | **Create** | Name/personality/interval picker + live preview |

---

## Task 1: Add companion i18n strings

**Files:**
- Modify: `frontend/i18n/de.json`

- [ ] **Step 1: Add companion keys to de.json**

Open `frontend/i18n/de.json`. The file currently ends with `"live_consultation": { ... }` before the closing `}`. Add the new `"companion"` block so the file becomes:

```json
{
  "app_title": "Viaticum",
  "login": {
    "title": "Viaticum — Anmelden",
    "username": "Benutzername",
    "password": "Passwort",
    "button": "Anmelden",
    "error": "Ungültige Anmeldedaten"
  },
  "omni": {
    "greeting": "Guten Morgen! Ich bin OMNI, Ihr KI-Dokumentationsassistent.",
    "draft_ready": "Ich habe einen Entwurf für den Verlaufseintrag vorbereitet. Anzeigen?",
    "insert_btn": "Einfügen",
    "show_btn": "Anzeigen",
    "discard_btn": "Verwerfen",
    "chat_placeholder": "Frage zu heutigen Gesprächen stellen..."
  },
  "patientenorganizer": {
    "title": "Patientenorganizer",
    "col_zimmer": "Zimmer",
    "col_bett": "Bett",
    "col_patient": "Patient",
    "col_qs_status": "QS",
    "col_drg": "DRG-Hauptdiagnose",
    "col_ews": "EWS",
    "tab_vitals": "Vitalzeichen",
    "tab_medication": "Medikation",
    "tab_verlauf": "Verlaufseintrag",
    "tab_labor": "Labor",
    "omni_draft_banner": "OMNI hat einen Entwurf für den Verlaufseintrag."
  },
  "zna": {
    "title": "ZNA Triage",
    "col_zeit": "Zeit",
    "col_triage": "MTS Ersttriage",
    "col_raum": "Beh.Raum",
    "col_diagnose": "Diagnose",
    "col_behandler": "Behandler/in"
  },
  "live_consultation": {
    "title": "Live-Konsultation",
    "upload_label": "Audio-Datei hochladen (.wav, .mp3)",
    "use_sample": "Beispiel verwenden",
    "transcribe_btn": "Transkribieren",
    "soap_btn": "SOAP-Notiz erstellen",
    "insert_btn": "In Verlaufseintrag einfügen",
    "subjektiv": "Subjektiv",
    "objektiv": "Objektiv",
    "beurteilung": "Beurteilung",
    "plan": "Plan",
    "entities_title": "Erkannte medizinische Entitäten",
    "disclaimer": "Demo. Keine medizinische Beratung. Keine echten Patientendaten."
  },
  "companion": {
    "setup_title": "Begleiter einrichten",
    "name_label": "Name deines Begleiters",
    "personality_label": "Persönlichkeit",
    "personality_warm": "Fürsorglich & warmherzig",
    "personality_fun": "Witzig & locker",
    "personality_calm": "Professionell & ruhig",
    "checkin_label": "Erinnerungen",
    "checkin_never": "Nie",
    "checkin_30": "Alle 30 Minuten",
    "checkin_60": "Jede Stunde",
    "save_btn": "Einstellungen speichern",
    "saved_msg": "Gespeichert! Dein Begleiter heißt jetzt",
    "preview_title": "Vorschau",
    "custom_name_label": "Eigenen Namen eingeben",
    "chat_placeholder": "Wie geht es dir?"
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('frontend/i18n/de.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/i18n/de.json
git commit -m "feat: add companion i18n strings"
```

---

## Task 2: Auto-login as Dr. Weber

**Files:**
- Modify: `frontend/streamlit_app.py`

- [ ] **Step 1: Replace the login gate with auto-login**

Replace the entire content of `frontend/streamlit_app.py` with:

```python
import json
from pathlib import Path

import streamlit as st

st.set_page_config(
    page_title="Viaticum",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

_i18n = json.loads((Path(__file__).parent / "i18n" / "de.json").read_text())

if not st.session_state.get("logged_in"):
    st.session_state.logged_in = True
    st.session_state.username = "dr.weber"

st.sidebar.markdown("👨‍⚕️ **Dr. Weber**")
st.sidebar.caption("Klinikum Viaticum")

from frontend.components.omni_assistant import render_omni  # noqa: E402
render_omni()

st.title(_i18n["app_title"])
st.info("Wählen Sie eine Seite aus der linken Navigation.")
```

- [ ] **Step 2: Verify the app imports cleanly**

```bash
cd /home/alioo/Desktop/viaticum-ltd/viaticum
STT_PROVIDER=stub .venv/bin/python -c "
import sys; sys.argv = ['streamlit']
import streamlit.testing.v1 as st_test
# Just check syntax
import ast, pathlib
src = pathlib.Path('frontend/streamlit_app.py').read_text()
ast.parse(src)
print('syntax OK')
"
```

Expected: `syntax OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/streamlit_app.py
git commit -m "feat: remove login gate, auto-login as Dr. Weber"
```

---

## Task 3: Create the companion component

**Files:**
- Create: `frontend/components/companion.py`

- [ ] **Step 1: Create `frontend/components/companion.py`**

```python
import os
import streamlit as st

_BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

_HTML = """\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:transparent;font-family:-apple-system,sans-serif}}
#cw{{position:fixed;bottom:24px;left:24px;width:120px;display:flex;
     flex-direction:column;align-items:center;z-index:9998}}
#sb{{background:white;border:1.5px solid #1a73e8;border-radius:12px 12px 12px 0;
     padding:8px 10px;font-size:11px;line-height:1.4;color:#333;max-width:180px;
     margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,.12);opacity:0;
     transition:opacity .3s;pointer-events:none;min-height:30px;word-wrap:break-word}}
#sb.v{{opacity:1;pointer-events:auto}}
#ds{{animation:float 2s ease-in-out infinite;cursor:pointer}}
@keyframes float{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-4px)}}}}
@keyframes bounce{{0%,100%{{transform:translateY(0)}}20%{{transform:translateY(-14px)}}
  40%{{transform:translateY(-8px)}}60%{{transform:translateY(-12px)}}80%{{transform:translateY(-4px)}}}}
@keyframes tilt{{0%,100%{{transform:rotate(0deg) translateY(-2px)}}
  50%{{transform:rotate(8deg) translateY(-2px)}}}}
@keyframes droop{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(3px)}}}}
#ds.happy{{animation:bounce .6s ease-in-out 3,float 2s ease-in-out infinite 1.8s}}
#ds.thinking{{animation:tilt 1.2s ease-in-out infinite}}
#ds.sad{{animation:droop 3s ease-in-out infinite}}
#cs{{display:flex;gap:4px;margin-top:6px;width:100%}}
#ci{{flex:1;border:1px solid #ccc;border-radius:12px;padding:4px 8px;
     font-size:11px;outline:none}}
#ci:focus{{border-color:#1a73e8}}
#csend{{background:#1a73e8;border:none;border-radius:50%;width:24px;height:24px;
        color:white;font-size:11px;cursor:pointer;flex-shrink:0}}
#csend:hover{{background:#1558b0}}
</style>
</head>
<body>
<div id="cw">
  <div id="sb"></div>
  <svg id="ds" viewBox="0 0 60 88" width="90" height="132"
       xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="30" cy="10" rx="13" ry="7" fill="#4a3728"/>
    <circle cx="30" cy="22" r="14" fill="#FDBCB4"/>
    <g id="eyes">
      <circle cx="24" cy="20" r="2.5" fill="#333"/>
      <circle cx="36" cy="20" r="2.5" fill="#333"/>
      <circle cx="24.8" cy="19.2" r=".8" fill="white"/>
      <circle cx="36.8" cy="19.2" r=".8" fill="white"/>
    </g>
    <path id="mi" d="M25 27 Q30 31 35 27" stroke="#a0522d" stroke-width="1.5"
          fill="none" stroke-linecap="round"/>
    <path id="ms" d="M25 29 Q30 25 35 29" stroke="#a0522d" stroke-width="1.5"
          fill="none" stroke-linecap="round" opacity="0"/>
    <rect x="10" y="36" width="40" height="48" rx="5" fill="white"
          stroke="#e0e0e0" stroke-width="1.2"/>
    <polygon points="30,36 18,52 28,44" fill="#f0f0f0"/>
    <polygon points="30,36 42,52 32,44" fill="#f0f0f0"/>
    <rect x="27" y="36" width="6" height="16" fill="#e8f0fe"/>
    <path d="M20 44 Q15 56 20 62 Q25 68 30 62" stroke="#666" stroke-width="2"
          fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="62" r="3.5" fill="#888" stroke="#666" stroke-width=".8"/>
    <rect x="33" y="50" width="16" height="10" rx="2" fill="#1a73e8"/>
    <text id="nb" x="41" y="57" font-size="4.5" fill="white"
          text-anchor="middle" font-family="-apple-system,sans-serif">HAKIM</text>
    <text id="tm" x="46" y="12" font-size="12" fill="#1a73e8"
          opacity="0" font-weight="bold">?</text>
  </svg>
  <div id="cs">
    <input id="ci" type="text" placeholder="{chat_placeholder}"/>
    <button id="csend">&#x27A4;</button>
  </div>
</div>
<script>
const BU="{backend_url}",NAME="{name}",PERS="{personality}",IMS={interval_ms};
const ds=document.getElementById('ds'),sb=document.getElementById('sb'),
      nb=document.getElementById('nb'),tm=document.getElementById('tm'),
      mi=document.getElementById('mi'),ms=document.getElementById('ms'),
      ci=document.getElementById('ci'),csend=document.getElementById('csend');
nb.textContent=NAME.toUpperCase().slice(0,5);
function setState(s){{
  ds.className='';tm.setAttribute('opacity','0');
  mi.setAttribute('opacity','1');ms.setAttribute('opacity','0');
  if(s==='happy')ds.className='happy';
  else if(s==='thinking'){{ds.className='thinking';tm.setAttribute('opacity','1');}}
  else if(s==='sad'){{ds.className='sad';mi.setAttribute('opacity','0');
    ms.setAttribute('opacity','1');}}
}}
function showBubble(t,ms_dur){{
  sb.textContent=t;sb.classList.add('v');
  if(ms_dur>0)setTimeout(()=>sb.classList.remove('v'),ms_dur);
}}
async function sendChat(msg){{
  setState('thinking');showBubble('...',0);
  try{{
    const r=await fetch(BU+'/chat',{{method:'POST',
      headers:{{'Content-Type':'application/json'}},
      body:JSON.stringify({{message:msg,mode:'companion',
        companion_name:NAME,companion_personality:PERS}})}});
    const d=await r.json();
    const ans=d.answer||d.message||'Alles wird gut! 😊';
    setState('happy');showBubble(ans,5000);
    setTimeout(()=>setState(''),6000);
  }}catch{{setState('');showBubble('Ich bin gleich wieder da! 😊',3000);}}
}}
csend.addEventListener('click',()=>{{
  const m=ci.value.trim();if(!m)return;ci.value='';sendChat(m);
}});
ci.addEventListener('keydown',e=>{{if(e.key==='Enter')csend.click();}});
const PH=[
  'Du machst das gro\xDFartig, Dr. Weber! 💪',
  'Denk daran, kurz Pause zu machen. ☕',
  'Du hast heute schon viel erreicht! ⭐',
  'Wie geht es dir gerade? Ich bin hier!',
  'Du bist ein Held f\xFCr deine Patienten! 🩺',
  'Kurze Atem\xFCbung: tief einatmen... gut! 😌',
  'Deine Patienten sind in guten H\xE4nden!',
  'Vergiss nicht zu trinken. Hydration ist wichtig! 💧',
  'Du machst das wirklich super heute!',
  'Ich bin stolz auf dich, Dr. Weber! 🌟'
];
let pi=0;
if(IMS>0)setTimeout(function ci2(){{
  showBubble(PH[pi%PH.length],6000);setState('happy');
  setTimeout(()=>setState(''),7000);pi++;setTimeout(ci2,IMS);
}},IMS);
setTimeout(()=>{{
  showBubble('Hallo! Ich bin '+NAME+'. Wie kann ich helfen? 😊',5000);
  setState('happy');setTimeout(()=>setState(''),6000);
}},1200);
</script>
</body>
</html>"""

_INJECT = """\
<script>
(function(){{
  var BU="{backend_url}",NAME="{name}",PERS="{personality}",IMS={interval_ms};
  var pd=window.parent.document;
  if(pd.getElementById('viaticum-companion')){{
    // Update badge name if companion already exists
    var nb=pd.getElementById('viaticum-companion-name');
    if(nb)nb.textContent=NAME.toUpperCase().slice(0,5);
    return;
  }}
  var style=pd.createElement('style');
  style.textContent=[
    '#viaticum-companion{{position:fixed;bottom:24px;left:24px;width:120px;',
    'display:flex;flex-direction:column;align-items:center;z-index:9998;',
    'font-family:-apple-system,sans-serif}}',
    '#vc-sb{{background:white;border:1.5px solid #1a73e8;',
    'border-radius:12px 12px 12px 0;padding:8px 10px;font-size:11px;',
    'line-height:1.4;color:#333;max-width:180px;margin-bottom:8px;',
    'box-shadow:0 2px 8px rgba(0,0,0,.12);opacity:0;transition:opacity .3s;',
    'pointer-events:none;min-height:30px;word-wrap:break-word}}',
    '#vc-sb.v{{opacity:1;pointer-events:auto}}',
    '#vc-svg{{animation:vc-float 2s ease-in-out infinite;cursor:pointer}}',
    '@keyframes vc-float{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-4px)}}}}',
    '@keyframes vc-bounce{{0%,100%{{transform:translateY(0)}}20%{{transform:translateY(-14px)}}',
    '40%{{transform:translateY(-8px)}}60%{{transform:translateY(-12px)}}80%{{transform:translateY(-4px)}}}}',
    '@keyframes vc-tilt{{0%,100%{{transform:rotate(0deg)}}50%{{transform:rotate(8deg)}}}}',
    '@keyframes vc-droop{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(3px)}}}}',
    '#vc-svg.happy{{animation:vc-bounce .6s ease-in-out 3,vc-float 2s ease-in-out infinite 1.8s}}',
    '#vc-svg.thinking{{animation:vc-tilt 1.2s ease-in-out infinite}}',
    '#vc-svg.sad{{animation:vc-droop 3s ease-in-out infinite}}',
    '#vc-cs{{display:flex;gap:4px;margin-top:6px;width:100%}}',
    '#vc-ci{{flex:1;border:1px solid #ccc;border-radius:12px;padding:4px 8px;',
    'font-size:11px;outline:none}}',
    '#vc-ci:focus{{border-color:#1a73e8}}',
    '#vc-send{{background:#1a73e8;border:none;border-radius:50%;width:24px;height:24px;',
    'color:white;font-size:11px;cursor:pointer;flex-shrink:0}}',
    '#vc-send:hover{{background:#1558b0}}'
  ].join('');
  pd.head.appendChild(style);
  var div=pd.createElement('div');
  div.id='viaticum-companion';
  div.innerHTML=`
    <div id="vc-sb"></div>
    <svg id="vc-svg" viewBox="0 0 60 88" width="90" height="132"
         xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="10" rx="13" ry="7" fill="#4a3728"/>
      <circle cx="30" cy="22" r="14" fill="#FDBCB4"/>
      <circle cx="24" cy="20" r="2.5" fill="#333"/>
      <circle cx="36" cy="20" r="2.5" fill="#333"/>
      <circle cx="24.8" cy="19.2" r=".8" fill="white"/>
      <circle cx="36.8" cy="19.2" r=".8" fill="white"/>
      <path id="vc-mi" d="M25 27 Q30 31 35 27" stroke="#a0522d" stroke-width="1.5"
            fill="none" stroke-linecap="round"/>
      <path id="vc-ms" d="M25 29 Q30 25 35 29" stroke="#a0522d" stroke-width="1.5"
            fill="none" stroke-linecap="round" opacity="0"/>
      <rect x="10" y="36" width="40" height="48" rx="5" fill="white"
            stroke="#e0e0e0" stroke-width="1.2"/>
      <polygon points="30,36 18,52 28,44" fill="#f0f0f0"/>
      <polygon points="30,36 42,52 32,44" fill="#f0f0f0"/>
      <rect x="27" y="36" width="6" height="16" fill="#e8f0fe"/>
      <path d="M20 44 Q15 56 20 62 Q25 68 30 62" stroke="#666" stroke-width="2"
            fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="62" r="3.5" fill="#888" stroke="#666" stroke-width=".8"/>
      <rect x="33" y="50" width="16" height="10" rx="2" fill="#1a73e8"/>
      <text id="viaticum-companion-name" x="41" y="57" font-size="4.5"
            fill="white" text-anchor="middle"
            font-family="-apple-system,sans-serif">HAKIM</text>
      <text id="vc-tm" x="46" y="12" font-size="12" fill="#1a73e8"
            opacity="0" font-weight="bold">?</text>
    </svg>
    <div id="vc-cs">
      <input id="vc-ci" type="text" placeholder="Wie geht es dir?"/>
      <button id="vc-send">&#x27A4;</button>
    </div>`;
  pd.body.appendChild(div);
  var svg2=pd.getElementById('vc-svg'),sb2=pd.getElementById('vc-sb'),
      nb2=pd.getElementById('viaticum-companion-name'),
      tm2=pd.getElementById('vc-tm'),
      mi2=pd.getElementById('vc-mi'),ms2=pd.getElementById('vc-ms'),
      ci2=pd.getElementById('vc-ci'),csend2=pd.getElementById('vc-send');
  nb2.textContent=NAME.toUpperCase().slice(0,5);
  function ss(s){{
    svg2.className='';tm2.setAttribute('opacity','0');
    mi2.setAttribute('opacity','1');ms2.setAttribute('opacity','0');
    if(s==='happy')svg2.className='happy';
    else if(s==='thinking'){{svg2.className='thinking';tm2.setAttribute('opacity','1');}}
    else if(s==='sad'){{svg2.className='sad';mi2.setAttribute('opacity','0');
      ms2.setAttribute('opacity','1');}}
  }}
  function show(t,d){{
    sb2.textContent=t;sb2.classList.add('v');
    if(d>0)setTimeout(()=>sb2.classList.remove('v'),d);
  }}
  async function chat(msg){{
    ss('thinking');show('...',0);
    try{{
      var r=await fetch(BU+'/chat',{{method:'POST',
        headers:{{'Content-Type':'application/json'}},
        body:JSON.stringify({{message:msg,mode:'companion',
          companion_name:NAME,companion_personality:PERS}})}});
      var d2=await r.json();
      var ans=d2.answer||d2.message||'Alles wird gut! 😊';
      ss('happy');show(ans,5000);setTimeout(()=>ss(''),6000);
    }}catch{{ss('');show('Ich bin gleich wieder da! 😊',3000);}}
  }}
  csend2.addEventListener('click',()=>{{
    var m=ci2.value.trim();if(!m)return;ci2.value='';chat(m);
  }});
  ci2.addEventListener('keydown',e=>{{if(e.key==='Enter')csend2.click();}});
  var PH=[
    'Du machst das gro\xDFartig, Dr. Weber! 💪',
    'Denk daran, kurz Pause zu machen. ☕',
    'Du hast heute schon viel erreicht! ⭐',
    'Wie geht es dir gerade? Ich bin hier!',
    'Du bist ein Held f\xFCr deine Patienten! 🩺',
    'Kurze Atem\xFCbung: tief einatmen... gut! 😌',
    'Deine Patienten sind in guten H\xE4nden!',
    'Vergiss nicht zu trinken. Hydration ist wichtig! 💧',
    'Du machst das wirklich super heute!',
    'Ich bin stolz auf dich, Dr. Weber! 🌟'
  ],pi=0;
  if(IMS>0)setTimeout(function tick(){{
    show(PH[pi%PH.length],6000);ss('happy');
    setTimeout(()=>ss(''),7000);pi++;setTimeout(tick,IMS);
  }},IMS);
  setTimeout(()=>{{
    show('Hallo! Ich bin '+NAME+'. Wie kann ich helfen? 😊',5000);
    ss('happy');setTimeout(()=>ss(''),6000);
  }},1200);
}})();
</script>"""

_INTERVAL_MAP = {"never": 0, "30min": 30 * 60 * 1000, "60min": 60 * 60 * 1000}


def render_companion():
    name = st.session_state.get("companion_name", "Hakim")
    personality = st.session_state.get("companion_personality", "Fürsorglich & warmherzig")
    interval = st.session_state.get("companion_checkin_interval", "30min")
    interval_ms = _INTERVAL_MAP.get(interval, 0)

    html = _INJECT.format(
        backend_url=_BACKEND_URL,
        name=name.replace('"', '\\"'),
        personality=personality.replace('"', '\\"'),
        interval_ms=interval_ms,
    )
    st.components.v1.html(html, height=0, scrolling=False)
```

- [ ] **Step 2: Write an import smoke test**

Create `frontend/tests/test_companion.py`:

```python
import importlib
import sys
import types

# Stub streamlit before import so the module loads without a running server
st_stub = types.ModuleType("streamlit")
st_stub.session_state = {}

class _CompStub:
    @staticmethod
    def html(*a, **kw):
        pass

st_stub.components = types.SimpleNamespace(v1=_CompStub())
sys.modules.setdefault("streamlit", st_stub)
sys.modules.setdefault("streamlit.components", st_stub.components)
sys.modules.setdefault("streamlit.components.v1", _CompStub())


def test_render_companion_importable():
    import importlib, sys
    # reload with stub in place
    if "frontend.components.companion" in sys.modules:
        del sys.modules["frontend.components.companion"]
    mod = importlib.import_module("frontend.components.companion")
    assert callable(mod.render_companion)


def test_interval_map_complete():
    if "frontend.components.companion" in sys.modules:
        del sys.modules["frontend.components.companion"]
    mod = importlib.import_module("frontend.components.companion")
    assert mod._INTERVAL_MAP["never"] == 0
    assert mod._INTERVAL_MAP["30min"] == 30 * 60 * 1000
    assert mod._INTERVAL_MAP["60min"] == 60 * 60 * 1000
```

- [ ] **Step 3: Run the smoke test**

```bash
cd /home/alioo/Desktop/viaticum-ltd/viaticum
STT_PROVIDER=stub .venv/bin/pytest frontend/tests/test_companion.py -v
```

Expected:
```
PASSED frontend/tests/test_companion.py::test_render_companion_importable
PASSED frontend/tests/test_companion.py::test_interval_map_complete
2 passed
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/companion.py frontend/tests/test_companion.py
git commit -m "feat: add SVG doctor companion component"
```

---

## Task 4: Wire companion to all pages

**Files:**
- Modify: `frontend/pages/1_Patientenorganizer.py` (last line)
- Modify: `frontend/pages/2_ZNA_Triage.py` (last line)
- Modify: `frontend/pages/3_Live_Consultation.py` (last line)

- [ ] **Step 1: Add import + call to Patientenorganizer**

At the top of `frontend/pages/1_Patientenorganizer.py`, change the import block from:
```python
from frontend.components.omni_assistant import render_omni
```
to:
```python
from frontend.components.omni_assistant import render_omni
from frontend.components.companion import render_companion
```

Then at the very bottom of the file, the last two lines currently are:
```python
render_omni()
```
Change to:
```python
render_omni()
render_companion()
```

- [ ] **Step 2: Add import + call to ZNA Triage**

In `frontend/pages/2_ZNA_Triage.py`, after the existing imports at the top, add:
```python
from frontend.components.companion import render_companion
```

At the very bottom of the file (after the last `cols[4].write(p["behandler"])` line), add:
```python

render_companion()
```

- [ ] **Step 3: Add import + call to Live Consultation**

In `frontend/pages/3_Live_Consultation.py`, after the existing imports at the top, add:
```python
from frontend.components.companion import render_companion
```

At the very bottom of the file (after `st.caption(i18n["live_consultation"]["disclaimer"])`), add:
```python
render_companion()
```

- [ ] **Step 4: Verify syntax on all three files**

```bash
python3 -c "
import ast, pathlib
for f in ['frontend/pages/1_Patientenorganizer.py',
          'frontend/pages/2_ZNA_Triage.py',
          'frontend/pages/3_Live_Consultation.py']:
    ast.parse(pathlib.Path(f).read_text())
    print(f, 'OK')
"
```

Expected:
```
frontend/pages/1_Patientenorganizer.py OK
frontend/pages/2_ZNA_Triage.py OK
frontend/pages/3_Live_Consultation.py OK
```

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/1_Patientenorganizer.py \
        frontend/pages/2_ZNA_Triage.py \
        frontend/pages/3_Live_Consultation.py
git commit -m "feat: wire companion widget to all pages"
```

---

## Task 5: Hover RAG suggestions on Verlaufseintrag

**Files:**
- Modify: `frontend/pages/1_Patientenorganizer.py`

- [ ] **Step 1: Add the hover RAG JS injection inside the Verlaufseintrag tab**

In `frontend/pages/1_Patientenorganizer.py`, locate the `with t3:` block. It currently ends with:
```python
    with t3:
        st.info(f"🩺 {i18n['patientenorganizer']['omni_draft_banner']}")
        c1, c2, _ = st.columns([1, 1, 4])
        if c1.button(i18n["omni"]["insert_btn"], key="verlauf_insert"):
            ...
        if c2.button(i18n["omni"]["show_btn"], key="verlauf_show"):
            ...
        st.text_area(
            i18n["patientenorganizer"]["tab_verlauf"],
            value=st.session_state.get("verlauf_text", ""),
            height=200,
            key="verlauf_ta",
        )
```

Add these lines at the **top** of `frontend/pages/1_Patientenorganizer.py`, after the existing imports:
```python
import os as _os
_BACKEND_URL = _os.environ.get("BACKEND_URL", "http://localhost:8000")
```

Then, inside the `with t3:` block, **after** the `st.text_area(...)` call, add:

```python
        if st.session_state.selected_patient:
            _p = st.session_state.selected_patient
            _rag_js = f"""
<script>
(function(){{
  var BU="{_BACKEND_URL}",PN="{_p['patient']}",DRG="{_p['drg']}";
  var pd=window.parent.document;
  var panel=pd.getElementById('vc-rag-panel');
  if(!panel){{
    panel=pd.createElement('div');
    panel.id='vc-rag-panel';
    panel.style.cssText='position:fixed;background:white;border:1px solid #e0e0e0;'
      +'border-radius:8px;padding:12px 16px;box-shadow:0 4px 20px rgba(0,0,0,.15);'
      +'max-width:320px;font-size:13px;z-index:10000;display:none;';
    pd.body.appendChild(panel);
  }}
  var hideT=null;
  function showP(rect){{
    panel.style.display='block';
    var top=rect.top-panel.offsetHeight-10;
    if(top<10)top=rect.bottom+10;
    panel.style.top=top+'px';
    panel.style.left=rect.left+'px';
  }}
  function hideP(){{panel.style.display='none';}}
  panel.addEventListener('mouseenter',()=>clearTimeout(hideT));
  panel.addEventListener('mouseleave',()=>{{hideT=setTimeout(hideP,800);}});
  async function fetchSug(rect){{
    panel.innerHTML='<span style="color:#888">⭐ Lade Vorschläge...</span>';
    showP(rect);
    try{{
      var r=await fetch(BU+'/chat',{{method:'POST',
        headers:{{'Content-Type':'application/json'}},
        body:JSON.stringify({{message:'Schlage relevante klinische Informationen vor',
          patient_name:PN,drg:DRG,mode:'rag_suggest'}})}});
      var d=await r.json();
      var lines=(d.answer||'').split('\\n').filter(l=>l.trim()).slice(0,3);
      if(!lines.length){{hideP();return;}}
      panel.innerHTML='<div style="font-weight:600;margin-bottom:6px;color:#1a73e8">'
        +'💡 RAG-Vorschläge</div>'
        +lines.map(b=>'<div style="padding:4px 0;cursor:pointer;'
          +'border-bottom:1px solid #f0f0f0" class="rb">▸ '+b+'</div>').join('');
      panel.querySelectorAll('.rb').forEach(el=>{{
        el.addEventListener('click',()=>{{
          var wps=pd.querySelectorAll('.stTextArea');
          for(var w of wps){{
            var lbl=w.querySelector('label');
            if(lbl&&lbl.textContent.includes('Verlaufseintrag')){{
              var ta=w.querySelector('textarea');
              if(ta){{
                var niv=Object.getOwnPropertyDescriptor(
                  window.parent.HTMLTextAreaElement.prototype,'value').set;
                niv.call(ta,(ta.value?(ta.value+'\\n'):'')+el.textContent.replace('▸ ',''));
                ta.dispatchEvent(new Event('input',{{bubbles:true}}));
              }}
              break;
            }}
          }}
          hideP();
        }});
      }});
    }}catch{{hideP();}}
  }}
  function findTA(){{
    var wps=pd.querySelectorAll('.stTextArea');
    for(var w of wps){{
      var lbl=w.querySelector('label');
      if(lbl&&lbl.textContent.includes('Verlaufseintrag'))
        return w.querySelector('textarea');
    }}
    return null;
  }}
  function attach(ta){{
    if(ta._ragOK)return;ta._ragOK=true;
    ta.addEventListener('mouseenter',()=>{{
      clearTimeout(hideT);fetchSug(ta.getBoundingClientRect());
    }});
    ta.addEventListener('mouseleave',()=>{{
      hideT=setTimeout(hideP,1000);
    }});
  }}
  var obs=new MutationObserver(()=>{{var t=findTA();if(t)attach(t);}});
  obs.observe(pd.body,{{childList:true,subtree:true}});
  var t=findTA();if(t)attach(t);
}})();
</script>"""
            st.components.v1.html(_rag_js, height=0, scrolling=False)
```

- [ ] **Step 2: Verify syntax**

```bash
python3 -c "import ast, pathlib; ast.parse(pathlib.Path('frontend/pages/1_Patientenorganizer.py').read_text()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/1_Patientenorganizer.py
git commit -m "feat: hover RAG suggestions on Verlaufseintrag textarea"
```

---

## Task 6: Companion setup page

**Files:**
- Create: `frontend/pages/4_Companion_Setup.py`

- [ ] **Step 1: Create `frontend/pages/4_Companion_Setup.py`**

```python
import json
from pathlib import Path

import streamlit as st

from frontend.components.companion import render_companion

i18n = json.loads((Path(__file__).parent.parent / "i18n" / "de.json").read_text())
c = i18n["companion"]

if not st.session_state.get("logged_in"):
    st.switch_page("streamlit_app.py")

st.title(c["setup_title"])

NAME_OPTIONS = ["Hakim", "Tabib", "Sina", "Yuki", "Max", "Eigener Name"]
PERSONALITY_OPTIONS = [
    c["personality_warm"],
    c["personality_fun"],
    c["personality_calm"],
]
CHECKIN_OPTIONS = {
    c["checkin_never"]: "never",
    c["checkin_30"]: "30min",
    c["checkin_60"]: "60min",
}

st.subheader(c["name_label"])
name_choice = st.radio(
    c["name_label"],
    NAME_OPTIONS,
    index=NAME_OPTIONS.index(st.session_state.get("_companion_name_pick", "Hakim")),
    horizontal=True,
    label_visibility="collapsed",
)
if name_choice == "Eigener Name":
    custom_name = st.text_input(
        c["custom_name_label"],
        value=st.session_state.get("companion_name", ""),
        max_chars=20,
    )
    preview_name = custom_name.strip() or "Hakim"
else:
    preview_name = name_choice
st.session_state["_companion_name_pick"] = name_choice

st.subheader(c["personality_label"])
personality_choice = st.radio(
    c["personality_label"],
    PERSONALITY_OPTIONS,
    index=PERSONALITY_OPTIONS.index(
        st.session_state.get("companion_personality", PERSONALITY_OPTIONS[0])
    )
    if st.session_state.get("companion_personality") in PERSONALITY_OPTIONS
    else 0,
    label_visibility="collapsed",
)

st.subheader(c["checkin_label"])
checkin_labels = list(CHECKIN_OPTIONS.keys())
checkin_choice_label = st.radio(
    c["checkin_label"],
    checkin_labels,
    index=list(CHECKIN_OPTIONS.values()).index(
        st.session_state.get("companion_checkin_interval", "30min")
    )
    if st.session_state.get("companion_checkin_interval") in CHECKIN_OPTIONS.values()
    else 1,
    horizontal=True,
    label_visibility="collapsed",
)
checkin_value = CHECKIN_OPTIONS[checkin_choice_label]

if st.button(c["save_btn"], type="primary"):
    st.session_state.companion_name = preview_name
    st.session_state.companion_personality = personality_choice
    st.session_state.companion_checkin_interval = checkin_value
    st.success(f"{c['saved_msg']} **{preview_name}**! 🩺")

st.divider()
st.subheader(c["preview_title"])
st.caption(f"Name: {preview_name} · Persönlichkeit: {personality_choice}")

_prev_name = st.session_state.get("companion_name", preview_name)
_prev_pers = st.session_state.get("companion_personality", personality_choice)
_prev_ci   = st.session_state.get("companion_checkin_interval", checkin_value)
st.session_state["companion_name"] = preview_name
st.session_state["companion_personality"] = personality_choice
st.session_state["companion_checkin_interval"] = checkin_value
render_companion()
st.session_state["companion_name"] = _prev_name
st.session_state["companion_personality"] = _prev_pers
st.session_state["companion_checkin_interval"] = _prev_ci
```

- [ ] **Step 2: Write an import test for the setup page**

Add to `frontend/tests/test_companion.py` (append, don't replace):

```python
def test_i18n_companion_keys_present():
    import json, pathlib
    data = json.loads(pathlib.Path("frontend/i18n/de.json").read_text())
    c = data.get("companion", {})
    required = [
        "setup_title", "name_label", "personality_label",
        "personality_warm", "personality_fun", "personality_calm",
        "checkin_label", "checkin_never", "checkin_30", "checkin_60",
        "save_btn", "saved_msg", "preview_title", "custom_name_label",
        "chat_placeholder",
    ]
    for k in required:
        assert k in c, f"Missing i18n key: companion.{k}"
```

- [ ] **Step 3: Run all frontend tests**

```bash
STT_PROVIDER=stub .venv/bin/pytest frontend/tests/ -v
```

Expected:
```
PASSED frontend/tests/test_companion.py::test_render_companion_importable
PASSED frontend/tests/test_companion.py::test_interval_map_complete
PASSED frontend/tests/test_companion.py::test_i18n_companion_keys_present
3 passed
```

- [ ] **Step 4: Verify syntax of setup page**

```bash
python3 -c "import ast, pathlib; ast.parse(pathlib.Path('frontend/pages/4_Companion_Setup.py').read_text()); print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/4_Companion_Setup.py frontend/tests/test_companion.py
git commit -m "feat: companion setup page (name, personality, check-in interval)"
```

---

## Task 7: End-to-end smoke test

- [ ] **Step 1: Run backend tests to confirm nothing regressed**

```bash
STT_PROVIDER=stub .venv/bin/pytest backend/tests/ -v
```

Expected: `8 passed`

- [ ] **Step 2: Start the app and do a visual walkthrough**

```bash
STT_PROVIDER=stub .venv/bin/streamlit run frontend/streamlit_app.py
```

Open http://localhost:8501 and verify:

1. **No login screen** — app opens directly on the landing page with `👨‍⚕️ Dr. Weber` in the sidebar
2. **Companion** — within ~1.5s a small SVG doctor appears at bottom-left with a greeting bubble
3. **Companion chat** — type `"Wie geht es dir?"` → companion shows thinking animation → response bubble appears
4. **Patientenorganizer** — click `↗` on Schneider, Maria → open Verlaufseintrag tab → hover over the textarea → floating RAG suggestion panel appears within ~2s
5. **Companion setup** — navigate to `Begleiter einrichten` → change name to `Tabib` → click save → companion badge updates
6. **All pages** — navigate ZNA Triage and Live-Konsultation → companion visible bottom-left on each

- [ ] **Step 3: Commit progress marker**

```bash
git commit --allow-empty -m "chore: companion features complete, all checks passing"
```
