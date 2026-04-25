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
