from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.core.security import get_current_user
from app.services.csv_service import CSVService
import io
import csv

router = APIRouter(prefix="/csv", tags=["CSV Import/Export"])

# ==================== EXPORT ====================

@router.get("/export/products")
def export_products(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export all products to CSV"""
    csv_data = CSVService.export_products(db)
    
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"}
    )

@router.get("/export/customers")
def export_customers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export all customers to CSV"""
    csv_data = CSVService.export_customers(db)
    
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers.csv"}
    )

@router.get("/export/suppliers")
def export_suppliers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export all suppliers to CSV"""
    csv_data = CSVService.export_suppliers(db)
    
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=suppliers.csv"}
    )

@router.get("/export/sales-orders")
def export_sales_orders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export all sales orders to CSV"""
    csv_data = CSVService.export_sales_orders(db)
    
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_orders.csv"}
    )

@router.get("/export/purchase-orders")
def export_purchase_orders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export all purchase orders to CSV"""
    csv_data = CSVService.export_purchase_orders(db)
    
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=purchase_orders.csv"}
    )

# ==================== IMPORT ====================

@router.post("/import/products")
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Import products from CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    content_str = content.decode('utf-8')
    
    result = CSVService.import_products(content_str, db)
    
    return {
        "message": f"Imported {result['imported']} products",
        "errors": result['errors'],
        "filename": file.filename
    }

@router.post("/import/customers")
async def import_customers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Import customers from CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    content_str = content.decode('utf-8')
    
    result = CSVService.import_customers(content_str, db)
    
    return {
        "message": f"Imported {result['imported']} customers",
        "errors": result['errors'],
        "filename": file.filename
    }

@router.post("/import/suppliers")
async def import_suppliers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Import suppliers from CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    content_str = content.decode('utf-8')
    
    result = CSVService.import_suppliers(content_str, db)
    
    return {
        "message": f"Imported {result['imported']} suppliers",
        "errors": result['errors'],
        "filename": file.filename
    }