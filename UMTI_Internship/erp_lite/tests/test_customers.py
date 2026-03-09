import pytest
from fastapi import status

class TestCustomersAPI:
    def test_get_all_customers(self, client, auth_headers, test_customer):
        """Test GET /customers"""
        response = client.get("/customers", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_single_customer(self, client, auth_headers, test_customer):
        """Test GET /customers/{id}"""
        response = client.get(f"/customers/{test_customer.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_customer.id
        assert data["name"] == test_customer.name

    def test_get_customer_not_found(self, client, auth_headers):
        """Test GET /customers/{id} with invalid ID"""
        response = client.get("/customers/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_customer(self, client, auth_headers):
        """Test POST /customers"""
        new_customer = {
            "name": "New Customer",
            "email": "new@customer.com",
            "phone": "555-1234",
            "address": "123 Test St"
        }
        response = client.post("/customers", json=new_customer, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == new_customer["name"]
        assert data["email"] == new_customer["email"]
        assert "id" in data

    def test_create_customer_duplicate_email(self, client, auth_headers, test_customer):
        """Test POST /customers with duplicate email"""
        duplicate = {
            "name": "Duplicate Customer",
            "email": "customer@test.com",  # Same as test_customer
            "phone": "555-5678"
        }
        response = client.post("/customers", json=duplicate, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_customer_duplicate_phone(self, client, auth_headers, test_customer):
        """Test POST /customers with duplicate phone"""
        duplicate = {
            "name": "Duplicate Customer",
            "email": "unique@test.com",
            "phone": "123-456-7890"  # Same as test_customer
        }
        response = client.post("/customers", json=duplicate, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_customer_missing_name(self, client, auth_headers):
        """Test POST /customers with missing name"""
        invalid = {
            "email": "no@name.com",
            "phone": "555-0000"
        }
        response = client.post("/customers", json=invalid, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_customer(self, client, auth_headers, test_customer):
        """Test PUT /customers/{id}"""
        update_data = {
            "name": "Updated Customer Name",
            "phone": "555-9999"
        }
        response = client.put(f"/customers/{test_customer.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Customer Name"
        assert data["phone"] == "555-9999"

    def test_update_customer_not_found(self, client, auth_headers):
        """Test PUT /customers/{id} with invalid ID"""
        update_data = {"name": "Updated"}
        response = client.put("/customers/99999", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_customer(self, client, auth_headers, test_customer):
        """Test DELETE /customers/{id}"""
        response = client.delete(f"/customers/{test_customer.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "deleted" in response.json()["detail"].lower()

    def test_delete_customer_not_found(self, client, auth_headers):
        """Test DELETE /customers/{id} with invalid ID"""
        response = client.delete("/customers/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
