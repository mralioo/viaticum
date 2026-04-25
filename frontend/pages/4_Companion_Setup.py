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
current_pick = st.session_state.get("_companion_name_pick", "Hakim")
if current_pick not in NAME_OPTIONS:
    current_pick = "Eigener Name"
name_choice = st.radio(
    c["name_label"],
    NAME_OPTIONS,
    index=NAME_OPTIONS.index(current_pick),
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
current_personality = st.session_state.get("companion_personality", PERSONALITY_OPTIONS[0])
personality_idx = (
    PERSONALITY_OPTIONS.index(current_personality)
    if current_personality in PERSONALITY_OPTIONS
    else 0
)
personality_choice = st.radio(
    c["personality_label"],
    PERSONALITY_OPTIONS,
    index=personality_idx,
    label_visibility="collapsed",
)

st.subheader(c["checkin_label"])
checkin_labels = list(CHECKIN_OPTIONS.keys())
current_checkin = st.session_state.get("companion_checkin_interval", "30min")
checkin_idx = (
    list(CHECKIN_OPTIONS.values()).index(current_checkin)
    if current_checkin in CHECKIN_OPTIONS.values()
    else 1
)
checkin_choice_label = st.radio(
    c["checkin_label"],
    checkin_labels,
    index=checkin_idx,
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
_prev_ci = st.session_state.get("companion_checkin_interval", checkin_value)
st.session_state["companion_name"] = preview_name
st.session_state["companion_personality"] = personality_choice
st.session_state["companion_checkin_interval"] = checkin_value
render_companion()
st.session_state["companion_name"] = _prev_name
st.session_state["companion_personality"] = _prev_pers
st.session_state["companion_checkin_interval"] = _prev_ci
