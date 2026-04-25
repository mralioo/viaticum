def test_soap_returns_all_fields(client):
    r = client.post("/soap", json={"transcript": "Patient klagt über Brustschmerzen."})
    assert r.status_code == 200
    data = r.json()
    assert "note" in data
    note = data["note"]
    for field in ("S", "O", "A", "P"):
        assert field in note, f"Missing SOAP field: {field}"
        assert len(note[field]) > 0
