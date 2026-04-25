import io

from backend.tests.conftest import MINIMAL_WAV


def test_transcribe_returns_segments(client):
    r = client.post("/transcribe", files={"audio": ("test.wav", io.BytesIO(MINIMAL_WAV), "audio/wav")})
    assert r.status_code == 200
    data = r.json()
    assert "segments" in data
    assert len(data["segments"]) > 0
    seg = data["segments"][0]
    assert "text" in seg
    assert "speaker" in seg
    assert "start" in seg
    assert "end" in seg
