def test_chat_returns_answer(client):
    r = client.post("/chat", json={"message": "Was hat die Patientin gesagt?"})
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
    assert "citations" in data
    assert isinstance(data["citations"], list)
