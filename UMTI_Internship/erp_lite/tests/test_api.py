from fastapi import status

class TestProductsAPI:
    def test_get_all_products(self, client, auth_headers, test_product):
        response = client.get("/products", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_create_product(self, client, auth_headers):
        new_product = {
            "sku": "NEWSKU001",
            "name": "New Test Product",
            "cost": 15.50,
            "price": 29.99,
            "stock": 25
        }
        response = client.post("/products", json=new_product, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["sku"] == new_product["sku"]