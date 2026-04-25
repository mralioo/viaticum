def test_health_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "stt" in data["models_loaded"]
    assert data["models_loaded"]["stt"] == "stub"
