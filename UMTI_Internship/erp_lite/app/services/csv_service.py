import csv
import io
from fastapi import HTTPException
from app.models.product import Product
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.order import SalesOrder, PurchaseOrder
from sqlalchemy.orm import Session
import pandas as pd

class CSVService:
    
    @staticmethod
    def export_products(db: Session):
        """Export all products to CSV"""
        products = db.query(Product).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(['ID', 'SKU', 'Name', 'Category', 'Stock', 'Cost', 'Price', 'Barcode'])
        
        # Write data
        for p in products:
            writer.writerow([
                p.id, p.sku, p.name, p.category, 
                p.stock, p.cost, p.price, p.barcode
            ])
        
        return output.getvalue()

    @staticmethod
    def export_customers(db: Session):
        """Export all customers to CSV"""
        customers = db.query(Customer).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['ID', 'Name', 'Email', 'Phone', 'Address'])
        
        for c in customers:
            writer.writerow([c.id, c.name, c.email, c.phone, c.address])
        
        return output.getvalue()

    @staticmethod
    def export_suppliers(db: Session):
        """Export all suppliers to CSV"""
        suppliers = db.query(Supplier).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['ID', 'Name', 'Email', 'Phone', 'Address'])
        
        for s in suppliers:
            writer.writerow([s.id, s.name, s.email, s.phone, s.address])
        
        return output.getvalue()

    @staticmethod
    def export_sales_orders(db: Session):
        """Export all sales orders to CSV"""
        orders = db.query(SalesOrder).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['ID', 'Customer ID', 'Total Amount', 'Created At', 'Status'])
        
        for o in orders:
            writer.writerow([o.id, o.customer_id, o.total_amount, o.created_at, o.status])
        
        return output.getvalue()

    @staticmethod
    def export_purchase_orders(db: Session):
        """Export all purchase orders to CSV"""
        orders = db.query(PurchaseOrder).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['ID', 'Supplier ID', 'Total Amount', 'Created At', 'Status'])
        
        for o in orders:
            writer.writerow([o.id, o.supplier_id, o.total_amount, o.created_at, o.status])
        
        return output.getvalue()

    @staticmethod
    def import_products(file_content: str, db: Session):
        """Import products from CSV"""
        try:
            reader = csv.DictReader(io.StringIO(file_content))
            imported = 0
            errors = []
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    # Validate required fields
                    if not row.get('SKU') or not row.get('Name'):
                        errors.append(f"Row {row_num}: Missing required fields")
                        continue
                    
                    # Check if product exists
                    existing = db.query(Product).filter(
                        (Product.sku == row['SKU']) | 
                        (Product.barcode == row.get('Barcode', ''))
                    ).first()
                    
                    if existing:
                        # Update existing
                        existing.name = row.get('Name', existing.name)
                        existing.category = row.get('Category', existing.category)
                        existing.stock = int(row.get('Stock', existing.stock))
                        existing.cost = float(row.get('Cost', existing.cost))
                        existing.price = float(row.get('Price', existing.price))
                        existing.barcode = row.get('Barcode', existing.barcode)
                    else:
                        # Create new
                        product = Product(
                            sku=row['SKU'],
                            name=row['Name'],
                            category=row.get('Category'),
                            stock=int(row.get('Stock', 0)),
                            cost=float(row.get('Cost', 0)),
                            price=float(row.get('Price', 0)),
                            barcode=row.get('Barcode')
                        )
                        db.add(product)
                    
                    imported += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
            
            db.commit()
            return {"imported": imported, "errors": errors}
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV import failed: {str(e)}")

    @staticmethod
    def import_customers(file_content: str, db: Session):
        """Import customers from CSV"""
        try:
            reader = csv.DictReader(io.StringIO(file_content))
            imported = 0
            errors = []
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    if not row.get('Name'):
                        errors.append(f"Row {row_num}: Name is required")
                        continue
                    
                    existing = db.query(Customer).filter(
                        (Customer.email == row.get('Email')) | 
                        (Customer.phone == row.get('Phone'))
                    ).first()
                    
                    if existing:
                        existing.name = row.get('Name', existing.name)
                        existing.email = row.get('Email', existing.email)
                        existing.phone = row.get('Phone', existing.phone)
                        existing.address = row.get('Address', existing.address)
                    else:
                        customer = Customer(
                            name=row['Name'],
                            email=row.get('Email'),
                            phone=row.get('Phone'),
                            address=row.get('Address')
                        )
                        db.add(customer)
                    
                    imported += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
            
            db.commit()
            return {"imported": imported, "errors": errors}
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV import failed: {str(e)}")

    @staticmethod
    def import_suppliers(file_content: str, db: Session):
        """Import suppliers from CSV"""
        try:
            reader = csv.DictReader(io.StringIO(file_content))
            imported = 0
            errors = []
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    if not row.get('Name'):
                        errors.append(f"Row {row_num}: Name is required")
                        continue
                    
                    existing = db.query(Supplier).filter(
                        (Supplier.email == row.get('Email')) | 
                        (Supplier.phone == row.get('Phone'))
                    ).first()
                    
                    if existing:
                        existing.name = row.get('Name', existing.name)
                        existing.email = row.get('Email', existing.email)
                        existing.phone = row.get('Phone', existing.phone)
                        existing.address = row.get('Address', existing.address)
                    else:
                        supplier = Supplier(
                            name=row['Name'],
                            email=row.get('Email'),
                            phone=row.get('Phone'),
                            address=row.get('Address')
                        )
                        db.add(supplier)
                    
                    imported += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
            
            db.commit()
            return {"imported": imported, "errors": errors}
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV import failed: {str(e)}")