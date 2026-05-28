def test_get_all_statuses(client):
    response = client.get("/api/v1/item-status/")
    data = response.json()
    names = {s["name"] for s in data}

    expected = {
        "Dostępny",
        "Wypożyczony",
        "Zarezerwowany",
        "Uszkodzony",
        "Oczekuje zatwierdzenia",
    }

    assert response.status_code == 200
    assert expected.issubset(names)


def test_create_status(client):
    response = client.post("/api/v1/item-status/", json={"name": "Test"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test"
    assert response.json()["is_system"] is False


def test_create_duplicate_status(client):
    client.post("/api/v1/item-status/", json={"name": "Test"})

    response = client.post("/api/v1/item-status/", json={"name": "Test"})

    assert response.status_code == 400


def test_create_empty_name(client):
    response = client.post("/api/v1/item-status/", json={"name": ""})

    assert response.status_code == 422


def test_delete_custom_status(client):
    custom_status = client.post("/api/v1/item-status/", json={"name": "Test"})
    status_id = custom_status.json()["id"]
    response = client.delete(f"/api/v1/item-status/{status_id}")
    assert response.status_code == 204


def test_delete_system_status_forbidden(client):
    all_statuses = client.get("/api/v1/item-status/").json()
    system_status_id = next(s["id"] for s in all_statuses if s["is_system"])
    response = client.delete(f"/api/v1/item-status/{system_status_id}")
    assert response.status_code == 403


def test_update_custom_status(client):
    custom_status = client.post("/api/v1/item-status/", json={"name": "Old name"})
    status_id = custom_status.json()["id"]
    response = client.put(f"/api/v1/item-status/{status_id}", json={"name": "New name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New name"


def test_update_to_existing_name(client):
    client.post("/api/v1/item-status/", json={"name": "A"})
    s2 = client.post("/api/v1/item-status/", json={"name": "B"})

    response = client.put(f"/api/v1/item-status/{s2.json()['id']}", json={"name": "A"})

    assert response.status_code == 400


def test_update_system_status_forbidden(client):
    all_statuses = client.get("/api/v1/item-status/").json()
    system_status_id = next(s["id"] for s in all_statuses if s["is_system"])
    response = client.put(
        f"/api/v1/item-status/{system_status_id}", json={"name": "Test"}
    )
    assert response.status_code == 403


def test_create_status_trims_name(client):
    response = client.post("/api/v1/item-status/", json={"name": "   Test   "})

    assert response.status_code == 201
    assert response.json()["name"] == "Test"


def test_delete_not_found(client):
    response = client.delete("/api/v1/item-status/99999999")
    assert response.status_code == 404


def test_update_not_found(client):
    response = client.put("/api/v1/item-status/9999999", json={"name": "Test"})
    assert response.status_code == 404
