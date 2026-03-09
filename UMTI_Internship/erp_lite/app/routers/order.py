from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
from app.database import get_db
from app.models.order import PurchaseOrder, PurchaseItem, SalesOrder, SalesItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    PurchaseOrderCreate, PurchaseOrderResponse,
    SalesOrderCreate, SalesOrderResponse
)
from app.core.security import get_current_user  # Change this line
# PDF generation with ReportLab
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/orders", tags=["Orders"])

# --------------------
# PDF Invoice Generator
# --------------------
def generate_invoice_pdf(order, order_type="sales", output_dir="invoices"):
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, f"{order_type}_invoice_{order.id}.pdf")
    
    c = canvas.Canvas(pdf_path, pagesize=A4)
    width, height = A4
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"{order_type.capitalize()} Invoice #{order.id}")
    
    # Add date
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}")
    
    # Table header
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 100, "Product ID")
    c.drawString(150, height - 100, "Quantity")
    c.drawString(250, height - 100, "Price")
    c.drawString(350, height - 100, "Subtotal")
    
    # Table content
    c.setFont("Helvetica", 12)
    y = height - 120
    for item in order.items:
        subtotal = item.quantity * item.price
        c.drawString(50, y, str(item.product_id))
        c.drawString(150, y, str(item.quantity))
        c.drawString(250, y, f"${item.price:.2f}")
        c.drawString(350, y, f"${subtotal:.2f}")
        y -= 20
    
    # Total
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y - 20, f"Total Amount: ${order.total_amount:.2f}")
    
    c.save()
    return pdf_path

# --------------------
# PURCHASE ORDERS
# --------------------
@router.post("/purchase", response_model=PurchaseOrderResponse)
def create_purchase_order(
    order: PurchaseOrderCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)  # Add User type
):
    # Calculate total
    total = sum([item.quantity * item.price for item in order.items])
    
    # Create order
    db_order = PurchaseOrder(supplier_id=order.supplier_id, total_amount=total)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Add items and update stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Check if purchase price is reasonable (optional)
        if item.price <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid price for product {item.product_id}")
        
        product.stock += item.quantity  # Increment stock
        
        # Create purchase item
        db_item = PurchaseItem(
            order_id=db_order.id, 
            product_id=item.product_id,
            quantity=item.quantity, 
            price=item.price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    
    # Generate PDF
    try:
        generate_invoice_pdf(db_order, order_type="purchase")
    except Exception as e:
        print(f"PDF generation failed: {e}")  # Log error but don't fail the order
    
    return db_order

# Get all purchase orders
@router.get("/purchase", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(PurchaseOrder).all()

# Get single purchase order
@router.get("/purchase/{order_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    order_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return order

# --------------------
# SALES ORDERS
# --------------------
@router.post("/sales", response_model=SalesOrderResponse)
def create_sales_order(
    order: SalesOrderCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)  # Add User type
):
    # Calculate total
    total = sum([item.quantity * item.price for item in order.items])
    
    # First check stock availability for all items
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for product {product.name}. Available: {product.stock}, Requested: {item.quantity}"
            )
    
    # Create order
    db_order = SalesOrder(customer_id=order.customer_id, total_amount=total)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Add items and reduce stock
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        product.stock -= item.quantity  # Reduce stock
        
        # Create sales item
        db_item = SalesItem(
            order_id=db_order.id, 
            product_id=item.product_id,
            quantity=item.quantity, 
            price=item.price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    
    # Generate PDF
    try:
        generate_invoice_pdf(db_order, order_type="sales")
    except Exception as e:
        print(f"PDF generation failed: {e}")  # Log error but don't fail the order
    
    return db_order

# Get all sales orders
@router.get("/sales", response_model=List[SalesOrderResponse])
def get_sales_orders(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(SalesOrder).all()

# Get single sales order
@router.get("/sales/{order_id}", response_model=SalesOrderResponse)
def get_sales_order(
    order_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order

# Download invoice PDF
@router.get("/{order_type}/{order_id}/invoice")
def download_invoice(
    order_type: str,
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi.responses import FileResponse
    
    # Verify order exists
    if order_type == "purchase":
        order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    else:
        order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    pdf_path = os.path.join("invoices", f"{order_type}_invoice_{order_id}.pdf")
    if not os.path.exists(pdf_path):
        # Generate if doesn't exist
        generate_invoice_pdf(order, order_type)
    
    return FileResponse(pdf_path, media_type='application/pdf', filename=f"{order_type}_invoice_{order_id}.pdf")