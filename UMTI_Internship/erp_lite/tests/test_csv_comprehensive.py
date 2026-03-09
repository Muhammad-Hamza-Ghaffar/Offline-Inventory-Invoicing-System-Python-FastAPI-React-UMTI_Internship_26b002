import pytest
import io
import csv
from fastapi import status

class TestCSVExport:
    def test_export_products(self, client, auth_headers, test_product):
        """Test exporting products to CSV"""
        response = client.get("/csv/export/products", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        
        # Parse CSV content
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        
        # Check headers
        assert rows[0] == ['ID', 'SKU', 'Name', 'Category', 'Stock', 'Cost', 'Price', 'Barcode']
        # Should have at least header + 1 product
        assert len(rows) >= 2

    def test_export_customers(self, client, auth_headers, test_customer):
        """Test exporting customers to CSV"""
        response = client.get("/csv/export/customers", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        assert rows[0] == ['ID', 'Name', 'Email', 'Phone', 'Address']

    def test_export_suppliers(self, client, auth_headers, test_supplier):
        """Test exporting suppliers to CSV"""
        response = client.get("/csv/export/suppliers", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        assert rows[0] == ['ID', 'Name', 'Email', 'Phone', 'Address']

    def test_export_sales_orders(self, client, auth_headers):
        """Test exporting sales orders to CSV"""
        response = client.get("/csv/export/sales-orders", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        assert rows[0] == ['ID', 'Customer ID', 'Total Amount', 'Created At', 'Status']

    def test_export_purchase_orders(self, client, auth_headers):
        """Test exporting purchase orders to CSV"""
        response = client.get("/csv/export/purchase-orders", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        assert rows[0] == ['ID', 'Supplier ID', 'Total Amount', 'Created At', 'Status']

class TestCSVImport:
    def test_import_products_success(self, client, auth_headers):
        """Test successful product import"""
        csv_content = """SKU,Name,Category,Stock,Cost,Price,Barcode
IMPTEST1,Import Product 1,Electronics,10,25.50,49.99,IMP123456
IMPTEST2,Import Product 2,Accessories,20,10.00,19.99,IMP789012"""
        
        files = {"file": ("test.csv", csv_content, "text/csv")}
        response = client.post("/csv/import/products", files=files, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "Imported 2 products" in data["message"]
        assert len(data["errors"]) == 0

    def test_import_products_with_errors(self, client, auth_headers):
        """Test product import with invalid data"""
        csv_content = """SKU,Name,Category,Stock,Cost,Price,Barcode
,Missing Name,Electronics,10,25.50,49.99,ERR001
IMPTERR2,,Accessories,20,10.00,19.99,ERR002"""
        
        files = {"file": ("test.csv", csv_content, "text/csv")}
        response = client.post("/csv/import/products", files=files, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "Imported 0 products" in data["message"]
        assert len(data["errors"]) >= 2

    def test_import_customers_success(self, client, auth_headers):
        """Test successful customer import"""
        csv_content = """Name,Email,Phone,Address
Import Customer,customer@import.com,555-IMPORT,123 Import St
Second Customer,second@import.com,555-SECOND,456 Import Ave"""
        
        files = {"file": ("test.csv", csv_content, "text/csv")}
        response = client.post("/csv/import/customers", files=files, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "Imported 2 customers" in data["message"]

    def test_import_suppliers_success(self, client, auth_headers):
        """Test successful supplier import"""
        csv_content = """Name,Email,Phone,Address
Import Supplier,supplier@import.com,555-SUPPLY,789 Import Blvd"""
        
        files = {"file": ("test.csv", csv_content, "text/csv")}
        response = client.post("/csv/import/suppliers", files=files, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "Imported 1 suppliers" in data["message"]

    def test_import_invalid_file_type(self, client, auth_headers):
        """Test import with invalid file type"""
        files = {"file": ("test.txt", "not a csv", "text/plain")}
        response = client.post("/csv/import/products", files=files, headers=auth_headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
