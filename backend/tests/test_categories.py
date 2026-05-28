def test_create_root_category(client):
    response = client.post("/api/v1/categories/", json={"name": "urządzenie"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "urządzenie"
    assert data["parent_id"] is None


def test_create_child_category(client):
    parent = client.post("/api/v1/categories/", json={"name": "urządzenie"}).json()
    response = client.post(
        "/api/v1/categories/", json={"name": "pomiarowe", "parent_id": parent["id"]}
    )
    assert response.status_code == 201
    assert response.json()["parent_id"] == parent["id"]


def test_create_category_nonexistent_parent(client):
    response = client.post("/api/v1/categories/", json={"name": "x", "parent_id": 999})
    assert response.status_code == 404


def test_create_category_empty_name(client):
    response = client.post("/api/v1/categories/", json={"name": ""})
    assert response.status_code == 422


def test_create_category_whitespace_name(client):
    response = client.post("/api/v1/categories/", json={"name": "   "})
    assert response.status_code == 422


def test_create_category_name_too_long(client):
    response = client.post("/api/v1/categories/", json={"name": "a" * 101})
    assert response.status_code == 422


def test_create_category_duplicate_name_under_same_parent(client):
    parent = client.post("/api/v1/categories/", json={"name": "urządzenie"}).json()
    client.post(
        "/api/v1/categories/", json={"name": "pomiarowe", "parent_id": parent["id"]}
    )
    response = client.post(
        "/api/v1/categories/", json={"name": "pomiarowe", "parent_id": parent["id"]}
    )
    assert response.status_code == 400


def test_create_category_same_name_different_parent(client):
    p1 = client.post("/api/v1/categories/", json={"name": "A"}).json()
    p2 = client.post("/api/v1/categories/", json={"name": "B"}).json()
    client.post("/api/v1/categories/", json={"name": "sub", "parent_id": p1["id"]})
    response = client.post(
        "/api/v1/categories/", json={"name": "sub", "parent_id": p2["id"]}
    )
    assert response.status_code == 201


def test_list_categories(client):
    client.post("/api/v1/categories/", json={"name": "A"})
    client.post("/api/v1/categories/", json={"name": "B"})
    response = client.get("/api/v1/categories/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_tree(client):
    parent = client.post("/api/v1/categories/", json={"name": "urządzenie"}).json()
    child = client.post(
        "/api/v1/categories/", json={"name": "pomiarowe", "parent_id": parent["id"]}
    ).json()
    client.post(
        "/api/v1/categories/", json={"name": "oscyloskop", "parent_id": child["id"]}
    )
    response = client.get("/api/v1/categories/tree")
    assert response.status_code == 200
    tree = response.json()
    assert len(tree) == 1
    assert tree[0]["name"] == "urządzenie"
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["name"] == "pomiarowe"
    assert len(tree[0]["children"][0]["children"]) == 1


def test_update_category_name(client):
    category = client.post("/api/v1/categories/", json={"name": "stara"}).json()
    response = client.patch(
        f"/api/v1/categories/{category['id']}", json={"name": "nowa"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "nowa"


def test_update_category_empty_name(client):
    category = client.post("/api/v1/categories/", json={"name": "test"}).json()
    response = client.patch(f"/api/v1/categories/{category['id']}", json={"name": "  "})
    assert response.status_code == 422


def test_update_nonexistent_category(client):
    response = client.patch("/api/v1/categories/999", json={"name": "x"})
    assert response.status_code == 404


def test_update_category_self_as_parent(client):
    category = client.post("/api/v1/categories/", json={"name": "A"}).json()
    response = client.patch(
        f"/api/v1/categories/{category['id']}",
        json={"name": "A", "parent_id": category["id"]},
    )
    assert response.status_code == 400


def test_update_category_cycle(client):
    parent = client.post("/api/v1/categories/", json={"name": "rodzic"}).json()
    child = client.post(
        "/api/v1/categories/", json={"name": "dziecko", "parent_id": parent["id"]}
    ).json()
    response = client.patch(
        f"/api/v1/categories/{parent['id']}",
        json={"name": "rodzic", "parent_id": child["id"]},
    )
    assert response.status_code == 400


def test_delete_category(client):
    category = client.post("/api/v1/categories/", json={"name": "do usunięcia"}).json()
    response = client.delete(f"/api/v1/categories/{category['id']}")
    assert response.status_code == 204


def test_delete_category_with_children(client):
    parent = client.post("/api/v1/categories/", json={"name": "rodzic"}).json()
    client.post(
        "/api/v1/categories/", json={"name": "dziecko", "parent_id": parent["id"]}
    )
    response = client.delete(f"/api/v1/categories/{parent['id']}")
    assert response.status_code == 400


def test_delete_nonexistent_category(client):
    response = client.delete("/api/v1/categories/999")
    assert response.status_code == 404
