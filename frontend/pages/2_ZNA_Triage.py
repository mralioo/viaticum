import json
from pathlib import Path

import streamlit as st

from frontend.components.companion import render_companion

i18n = json.loads((Path(__file__).parent.parent / "i18n" / "de.json").read_text())

if not st.session_state.get("logged_in"):
    st.switch_page("streamlit_app.py")

MTS_COLOR = {
    "Rot": "#c62828", "Orange": "#e65100", "Gelb": "#f9a825",
    "Grün": "#2e7d32", "Blau": "#1565c0",
}

PATIENTS = [
    {"zeit": "08:42", "triage": "Orange", "raum": "1", "diagnose": "Thoraxschmerz",        "behandler": "Dr. Weber"},
    {"zeit": "09:05", "triage": "Gelb",   "raum": "3", "diagnose": "Sturz, V.a. Fraktur",  "behandler": "Dr. Müller"},
    {"zeit": "09:31", "triage": "Grün",   "raum": "5", "diagnose": "Fieber 38.5°C",         "behandler": "Dr. Schmidt"},
]

st.title(i18n["zna"]["title"])

hcols = st.columns([1, 1, 1, 2, 2])
for col, key in zip(hcols, ["col_zeit", "col_triage", "col_raum", "col_diagnose", "col_behandler"]):
    col.markdown(f"**{i18n['zna'][key]}**")
st.divider()

for p in PATIENTS:
    cols = st.columns([1, 1, 1, 2, 2])
    cols[0].write(p["zeit"])
    color = MTS_COLOR.get(p["triage"], "#000")
    cols[1].markdown(
        f'<span style="color:{color};font-weight:bold">⬛ {p["triage"]}</span>',
        unsafe_allow_html=True,
    )
    cols[2].write(p["raum"])
    cols[3].write(p["diagnose"])
    cols[4].write(p["behandler"])

render_companion()
