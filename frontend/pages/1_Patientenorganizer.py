import json
from pathlib import Path

import streamlit as st

from frontend.components.omni_assistant import render_omni
from frontend.components.companion import render_companion

i18n = json.loads((Path(__file__).parent.parent / "i18n" / "de.json").read_text())

if not st.session_state.get("logged_in"):
    st.switch_page("streamlit_app.py")

PATIENTS = [
    {"zimmer": "101", "bett": "A", "patient": "Schneider, Maria, 78J", "qs": True,  "drg": "I21.4 NSTEMI",                       "ews": 4, "id": "P001"},
    {"zimmer": "102", "bett": "B", "patient": "Müller, Hans, 65J",     "qs": True,  "drg": "J96.0 Respiratorische Insuffizienz",  "ews": 2, "id": "P002"},
    {"zimmer": "103", "bett": "A", "patient": "Weber, Anna, 52J",      "qs": False, "drg": "K35.2 Akute Appendizitis",            "ews": 1, "id": "P003"},
]

st.title(i18n["patientenorganizer"]["title"])

if "selected_patient" not in st.session_state:
    st.session_state.selected_patient = None

if st.session_state.selected_patient is None:
    header_cols = st.columns([1, 1, 3, 1, 3, 1, 1])
    for col, label in zip(header_cols, [
        i18n["patientenorganizer"]["col_zimmer"],
        i18n["patientenorganizer"]["col_bett"],
        i18n["patientenorganizer"]["col_patient"],
        i18n["patientenorganizer"]["col_qs_status"],
        i18n["patientenorganizer"]["col_drg"],
        i18n["patientenorganizer"]["col_ews"],
        "",
    ]):
        col.markdown(f"**{label}**")
    st.divider()

    for p in PATIENTS:
        cols = st.columns([1, 1, 3, 1, 3, 1, 1])
        cols[0].write(p["zimmer"])
        cols[1].write(p["bett"])
        cols[2].write(p["patient"])
        cols[3].write("✅" if p["qs"] else "❌")
        cols[4].write(p["drg"])
        cols[5].write(str(p["ews"]))
        if cols[6].button("↗", key=f"open_{p['id']}"):
            st.session_state.selected_patient = p
            st.session_state.omni_prefill_shown = False
            st.rerun()
else:
    p = st.session_state.selected_patient
    if st.button("← Zurück zur Liste"):
        st.session_state.selected_patient = None
        st.rerun()

    st.subheader(p["patient"])
    t1, t2, t3, t4 = st.tabs([
        i18n["patientenorganizer"]["tab_vitals"],
        i18n["patientenorganizer"]["tab_medication"],
        i18n["patientenorganizer"]["tab_verlauf"],
        i18n["patientenorganizer"]["tab_labor"],
    ])

    with t1:
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Blutdruck", "160/95 mmHg")
        c2.metric("Puls", "88/min")
        c3.metric("SpO2", "97%")
        c4.metric("Temperatur", "36.8°C")

    with t2:
        st.table([
            {"Medikament": "Ramipril",    "Dosis": "5mg",   "Schema": "1-0-0"},
            {"Medikament": "ASS",         "Dosis": "100mg", "Schema": "1-0-0"},
            {"Medikament": "Pantoprazol", "Dosis": "40mg",  "Schema": "1-0-0"},
        ])

    with t3:
        st.info(f"🩺 {i18n['patientenorganizer']['omni_draft_banner']}")
        c1, c2, _ = st.columns([1, 1, 4])
        if c1.button(i18n["omni"]["insert_btn"], key="verlauf_insert"):
            st.session_state.verlauf_text = (
                "S: Patientin berichtet über Brustschmerzen.\n"
                "O: BD 160/95, Puls 88, SpO2 97%.\n"
                "A: V.a. NSTEMI (I21.4).\n"
                "P: EKG, Troponin, kardiologisches Konsil."
            )
        if c2.button(i18n["omni"]["show_btn"], key="verlauf_show"):
            st.session_state.show_draft = True
        st.text_area(
            i18n["patientenorganizer"]["tab_verlauf"],
            value=st.session_state.get("verlauf_text", ""),
            height=200,
            key="verlauf_ta",
        )

    with t4:
        st.table([
            {"Parameter": "Troponin I", "Wert": "ausstehend", "Norm": "< 0.04 ng/mL"},
            {"Parameter": "Hämoglobin", "Wert": "13.2 g/dL",  "Norm": "12–16 g/dL"},
            {"Parameter": "Leukozyten", "Wert": "9.8 G/L",    "Norm": "4–11 G/L"},
        ])

render_omni()
render_companion()
