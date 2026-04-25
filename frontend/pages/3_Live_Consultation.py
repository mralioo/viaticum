import json
import time
from pathlib import Path

import streamlit as st

from frontend import api_client
from frontend.components.companion import render_companion

i18n = json.loads((Path(__file__).parent.parent / "i18n" / "de.json").read_text())

if not st.session_state.get("logged_in"):
    st.switch_page("streamlit_app.py")

ENTITY_COLORS = {
    "medication": "#1565c0", "dosage": "#6a1b9a", "symptom": "#c62828",
    "diagnosis": "#e65100", "vital_sign": "#2e7d32", "anatomy": "#455a64", "procedure": "#00838f",
}

st.title(i18n["live_consultation"]["title"])

# ── Audio input ───────────────────────────────────────────────────────────────
st.subheader("1. Audio")
uploaded = st.file_uploader(i18n["live_consultation"]["upload_label"], type=["wav", "mp3", "ogg"])
sample = st.selectbox(i18n["live_consultation"]["use_sample"], ["—", "Beispiel 1", "Beispiel 2"])

has_audio = uploaded is not None or sample != "—"
col_t, col_s = st.columns(2)

# ── Transcribe ────────────────────────────────────────────────────────────────
if col_t.button(i18n["live_consultation"]["transcribe_btn"], disabled=not has_audio):
    with st.spinner("Transkribiere..."):
        audio_bytes = uploaded.read() if uploaded else b""
        st.session_state.transcript = api_client.transcribe_sync(audio_bytes)

if "transcript" in st.session_state:
    st.subheader("2. Transkript")
    for seg in st.session_state.transcript.get("segments", []):
        is_doc = seg["speaker"] == "SPEAKER_01"
        with st.chat_message("assistant" if is_doc else "user"):
            st.markdown(f"**{'Arzt' if is_doc else 'Patient'}** `[{seg['start']:.1f}s]`")
            st.write(seg["text"])

    # ── SOAP ──────────────────────────────────────────────────────────────────
    if col_s.button(i18n["live_consultation"]["soap_btn"]):
        with st.spinner("Erstelle SOAP-Notiz..."):
            full_text = " ".join(s["text"] for s in st.session_state.transcript.get("segments", []))
            st.session_state.soap = api_client.soap_sync(full_text)
            st.session_state.entities = api_client.entities_sync(full_text)

if "soap" in st.session_state:
    st.subheader("3. SOAP-Notiz")
    note = st.session_state.soap.get("note", {})
    label_map = {
        "S": i18n["live_consultation"]["subjektiv"],
        "O": i18n["live_consultation"]["objektiv"],
        "A": i18n["live_consultation"]["beurteilung"],
        "P": i18n["live_consultation"]["plan"],
    }
    for col, (key, label) in zip(st.columns(4), label_map.items()):
        with col:
            st.markdown(f"**{label}**")
            st.info(note.get(key, ""))

    if "entities" in st.session_state:
        st.subheader(i18n["live_consultation"]["entities_title"])
        chips_html = ""
        for e in st.session_state.entities.get("entities", []):
            color = ENTITY_COLORS.get(e["type"], "#555")
            chips_html += (
                f'<span style="background:{color}22;border:1px solid {color};'
                f'border-radius:4px;padding:2px 8px;margin:3px;display:inline-block;font-size:13px;">'
                f'<b>{e["text"]}</b> <code>{e["type"]}</code> {e["confidence"]:.0%}</span>'
            )
        st.markdown(chips_html, unsafe_allow_html=True)

    # ── KIS pre-fill ──────────────────────────────────────────────────────────
    st.subheader("4. KIS Verlaufseintrag")
    if st.button(i18n["live_consultation"]["insert_btn"]):
        note = st.session_state.soap.get("note", {})
        full = f"S: {note.get('S','')}\n\nO: {note.get('O','')}\n\nA: {note.get('A','')}\n\nP: {note.get('P','')}"
        placeholder = st.empty()
        displayed = ""
        for char in full:
            displayed += char
            placeholder.text_area("Verlaufseintrag", value=displayed, height=220, key="kis_anim")
            time.sleep(0.004)
        st.session_state.kis_text = full

st.caption(i18n["live_consultation"]["disclaimer"])
render_companion()
