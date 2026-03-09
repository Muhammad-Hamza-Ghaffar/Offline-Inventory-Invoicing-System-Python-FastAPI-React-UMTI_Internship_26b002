import pytest
from fastapi import status

class TestProductsAPI:
    def test_get_all_products(self, client, auth_headers, test_product):
        """Test GET /products"""
        response = client.get("/products", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_single_product(self, client, auth_headers, test_product):
        """Test GET /products/{id}"""
        response = client.get(f"/products/{test_product.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_product.id
        assert data["sku"] == test_product.sku

    def test_get_product_not_found(self, client, auth_headers):
        """Test GET /products/{id} with invalid ID"""
        response = client.get("/products/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_product(self, client, auth_headers):
        """Test POST /products"""
        new_product = {
            "sku": "NEWSKU001",
            "name": "New Test Product",
            "category": "Testing",
            "cost": 15.50,
            "price": 29.99,
            "stock": 25,
            "barcode": "9999999999999"
        }
        response = client.post("/products", json=new_product, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["sku"] == new_product["sku"]
        assert data["name"] == new_product["name"]
        assert "id" in data

    def test_create_product_duplicate_sku(self, client, auth_headers, test_product):
        """Test POST /products with duplicate SKU"""
        duplicate = {
            "sku": "TEST001",  # Same as test_product
            "name": "Duplicate Product",
            "cost": 10.00,
            "price": 20.00,
            "stock": 5
        }
        response = client.post("/products", json=duplicate, headers=auth_headers)
        # Should return 400 Bad Request for duplicate
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_product_missing_required(self, client, auth_headers):
        """Test POST /products with missing required fields"""
        invalid = {
            "name": "Invalid Product",
            "price": 29.99
            # Missing sku, cost
        }
        response = client.post("/products", json=invalid, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_product(self, client, auth_headers, test_product):
        """Test PUT /products/{id} with partial update"""
        # Send only the fields we want to update
        update_data = {
            "name": "Updated Product Name",
            "price": 149.99
            # Other fields will remain unchanged
        }
        response = client.put(f"/products/{test_product.id}", json=update_data, headers=auth_headers)
        
        # This should work because your router uses exclude_unset=True
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Product Name"
        assert data["price"] == 149.99
        # Other fields should remain the same
        assert data["sku"] == test_product.sku
        assert data["cost"] == test_product.cost

    def test_update_product_not_found(self, client, auth_headers):
        """Test PUT /products/{id} with invalid ID"""
        update_data = {
            "name": "Updated"
            # Only sending one field is fine
        }
        response = client.put("/products/99999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_product(self, client, auth_headers, test_product):
        """Test DELETE /products/{id}"""
        response = client.delete(f"/products/{test_product.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["detail"] == "Product deleted successfully"

    def test_delete_product_not_found(self, client, auth_headers):
        """Test DELETE /products/{id} with invalid ID"""
        response = client.delete("/products/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_add_stock(self, client, auth_headers, test_product):
        """Test PATCH /products/{id}/add_stock"""
        initial_stock = test_product.stock
        response = client.patch(f"/products/{test_product.id}/add_stock", 
                               json={"quantity": 10}, 
                               headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["stock"] == initial_stock + 10

    def test_reduce_stock(self, client, auth_headers, test_product):
        """Test PATCH /products/{id}/reduce_stock"""
        # First ensure we have enough stock
        client.patch(f"/products/{test_product.id}/add_stock", 
                    json={"quantity": 50}, 
                    headers=auth_headers)
        
        response = client.patch(f"/products/{test_product.id}/reduce_stock", 
                               json={"quantity": 5}, 
                               headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["stock"] > 0

    def test_reduce_stock_insufficient(self, client, auth_headers, test_product):
        """Test PATCH /products/{id}/reduce_stock with insufficient stock"""
        # First set stock to a low value
        # Instead of manipulating the object directly, use the API
        current = client.get(f"/products/{test_product.id}", headers=auth_headers).json()
        
        # If stock is too high, reduce it first
        if current["stock"] > 10:
            client.patch(f"/products/{test_product.id}/reduce_stock", 
                        json={"quantity": current["stock"] - 5}, 
                        headers=auth_headers)
        
        response = client.patch(f"/products/{test_product.id}/reduce_stock", 
                               json={"quantity": 1000}, 
                               headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_add_stock_invalid_quantity(self, client, auth_headers, test_product):
        """Test PATCH /products/{id}/add_stock with invalid quantity"""
        response = client.patch(f"/products/{test_product.id}/add_stock", 
                               json={"quantity": -5}, 
                               headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
