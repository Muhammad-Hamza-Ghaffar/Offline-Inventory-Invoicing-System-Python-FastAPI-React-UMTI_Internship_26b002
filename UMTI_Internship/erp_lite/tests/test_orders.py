import pytest
from fastapi import status

class TestOrdersAPI:
    def test_create_sales_order(self, client, auth_headers, test_customer, test_product):
        """Test POST /orders/sales"""
        order_data = {
            "customer_id": test_customer.id,
            "items": [
                {
                    "product_id": test_product.id,
                    "quantity": 2,
                    "price": test_product.price
                }
            ]
        }
        response = client.post("/orders/sales", json=order_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["customer_id"] == test_customer.id
        assert "id" in data
        assert data["total_amount"] == test_product.price * 2

    def test_create_purchase_order(self, client, auth_headers, test_supplier, test_product):
        """Test POST /orders/purchase"""
        order_data = {
            "supplier_id": test_supplier.id,
            "items": [
                {
                    "product_id": test_product.id,
                    "quantity": 5,
                    "price": test_product.cost
                }
            ]
        }
        response = client.post("/orders/purchase", json=order_data, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["supplier_id"] == test_supplier.id
        assert "id" in data

    def test_get_sales_orders(self, client, auth_headers):
        """Test GET /orders/sales"""
        response = client.get("/orders/sales", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_purchase_orders(self, client, auth_headers):
        """Test GET /orders/purchase"""
        response = client.get("/orders/purchase", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
