import pytest
from fastapi import status

class TestSuppliersAPI:
    def test_get_all_suppliers(self, client, auth_headers, test_supplier):
        """Test GET /suppliers"""
        response = client.get("/suppliers", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_create_supplier(self, client, auth_headers):
        """Test POST /suppliers"""
        new_supplier = {
            "name": "New Supplier",
            "email": "supplier@test.com",
            "phone": "555-4321",
            "address": "456 Supply Ave"
        }
        response = client.post("/suppliers", json=new_supplier, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == new_supplier["name"]
        assert "id" in data

    def test_update_supplier(self, client, auth_headers, test_supplier):
        """Test PUT /suppliers/{id}"""
        update_data = {
            "name": "Updated Supplier",
            "phone": "555-7777"
        }
        response = client.put(f"/suppliers/{test_supplier.id}", json=update_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Supplier"

    def test_delete_supplier(self, client, auth_headers, test_supplier):
        """Test DELETE /suppliers/{id}"""
        response = client.delete(f"/suppliers/{test_supplier.id}", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert "deleted" in response.json()["detail"].lower()
