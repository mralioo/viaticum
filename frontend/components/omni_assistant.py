import json
from pathlib import Path

import streamlit as st

from frontend import api_client

_i18n = json.loads((Path(__file__).parent.parent / "i18n" / "de.json").read_text())

_BUBBLE_CSS = """
<style>
.omni-float {
    position: fixed; bottom: 24px; right: 24px;
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #1a73e8, #0d47a1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
    animation: omni-pulse 2.4s infinite;
    z-index: 9999;
}
@keyframes omni-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(26,115,232,.45); }
    50%      { box-shadow: 0 0 0 12px rgba(26,115,232,0); }
}
</style>
<div class="omni-float">🩺</div>
"""


def render_omni():
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🩺 OMNI")

    if "omni_msgs" not in st.session_state:
        st.session_state.omni_msgs = [{"role": "assistant", "content": _i18n["omni"]["greeting"]}]

    if st.session_state.get("selected_patient") and not st.session_state.get("omni_prefill_shown"):
        st.session_state.omni_msgs.append({"role": "assistant", "content": _i18n["omni"]["draft_ready"]})
        st.session_state.omni_prefill_shown = True

    for msg in st.session_state.omni_msgs[-6:]:
        with st.sidebar.chat_message(msg["role"]):
            st.sidebar.write(msg["content"])

    if prompt := st.sidebar.chat_input(_i18n["omni"]["chat_placeholder"]):
        st.session_state.omni_msgs.append({"role": "user", "content": prompt})
        result = api_client.chat_sync(prompt, mode="free_chat")
        answer = result.get("answer", "")
        citations = result.get("citations", [])
        if citations:
            answer += "\n\n" + "  |  ".join(f"[{c['timestamp']}, {c['speaker']}]" for c in citations)
        st.session_state.omni_msgs.append({"role": "assistant", "content": answer})
        st.rerun()

    st.markdown(_BUBBLE_CSS, unsafe_allow_html=True)
