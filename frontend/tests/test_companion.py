import importlib
import sys
import types


def _stub_streamlit():
    st_stub = types.ModuleType("streamlit")
    st_stub.session_state = {}

    class _CompV1:
        @staticmethod
        def html(*a, **kw):
            pass

    st_stub.components = types.SimpleNamespace(v1=_CompV1())
    sys.modules["streamlit"] = st_stub
    sys.modules["streamlit.components"] = st_stub.components
    sys.modules["streamlit.components.v1"] = _CompV1()


def test_render_companion_importable():
    _stub_streamlit()
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


def test_i18n_companion_keys_present():
    import json
    import pathlib

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
