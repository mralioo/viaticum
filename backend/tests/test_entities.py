def test_entities_returns_list(client):
    r = client.post("/entities", json={"text": "Ramipril 5mg täglich bei Bluthochdruck."})
    assert r.status_code == 200
    data = r.json()
    assert "entities" in data
    assert len(data["entities"]) > 0
    e = data["entities"][0]
    assert "text" in e and "type" in e and "confidence" in e


def test_entity_confidence_in_range(client):
    r = client.post("/entities", json={"text": "Brustschmerzen seit gestern."})
    data = r.json()
    for e in data["entities"]:
        assert 0.0 <= e["confidence"] <= 1.0
