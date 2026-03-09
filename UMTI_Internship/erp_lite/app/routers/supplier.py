from fastapi import APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.orm import Session
from typing import List
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.models.supplier import Supplier
from app.models.user import User
from app.database import get_db
from app.core.security import get_current_user  # Change this line

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])
# Create Supplier
@router.post("/", response_model=SupplierResponse)
def create_supplier(
    supplier: SupplierCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)  # Add User type hint
):
    # Check for existing supplier
    existing = db.query(Supplier).filter(
        (Supplier.email == supplier.email) | (Supplier.phone == supplier.phone)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Supplier with same email or phone exists")
    
    # Fixed: .dict() -> .model_dump() for Pydantic V2
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

# Get all suppliers
@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Supplier).all()

# Get single supplier
@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

# Update supplier
@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int = Path(..., gt=0),
    updated_supplier: SupplierUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check for duplicates (excluding current supplier)
    existing = db.query(Supplier).filter(
        ((Supplier.email == updated_supplier.email) | (Supplier.phone == updated_supplier.phone)) & 
        (Supplier.id != supplier_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Another supplier with same email or phone exists")
    
    # Fixed: .dict() -> .model_dump() with exclude_unset=True
    update_data = updated_supplier.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(supplier, key, value)
    
    db.commit()
    db.refresh(supplier)
    return supplier

# Delete supplier
@router.delete("/{supplier_id}", response_model=dict)
def delete_supplier(
    supplier_id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Optional: Check if supplier has any purchase orders before deleting
    # from app.models.order import PurchaseOrder
    # has_orders = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == supplier_id).first()
    # if has_orders:
    #     raise HTTPException(status_code=400, detail="Cannot delete supplier with existing purchase orders")
    
    db.delete(supplier)
    db.commit()
    return {"detail": "Supplier deleted successfully"}