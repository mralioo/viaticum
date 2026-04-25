def test_omi_health_stub_mode(client):
    r = client.get("/omi/health")
    assert r.status_code == 200
    data = r.json()
    assert data["connected"] is False
    assert data["mode"] == "stub"


def test_omi_conversations_returns_list(client):
    r = client.get("/omi/conversations?q=Brustschmerz")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
