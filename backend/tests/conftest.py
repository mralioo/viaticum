import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("STT_PROVIDER", "stub")
os.environ.setdefault("CHROMA_PATH", "/tmp/viaticum_test_chroma")

from backend.app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


MINIMAL_WAV = (
    b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
    b"\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
)
