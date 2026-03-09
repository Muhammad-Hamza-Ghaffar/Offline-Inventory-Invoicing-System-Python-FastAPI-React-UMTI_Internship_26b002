from fastapi import APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.orm import Session
from typing import List
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.models.product import Product
from app.models.user import User
from app.database import get_db
from app.core.security import get_current_user  # Change this line

router = APIRouter(prefix="/products", tags=["Products"])

# Create Product
@router.post("/", response_model=ProductResponse)
def create_product(
    product: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)  # Use User type
):
    # Check for existing product
    existing = db.query(Product).filter(
        (Product.sku == product.sku) | (Product.barcode == product.barcode)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Product with same SKU or Barcode already exists")
    
    # Fixed: .dict() -> .model_dump() for Pydantic V2
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# Get all products
@router.get("/", response_model=List[ProductResponse])
def get_products(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Product).all()

# Get single product
@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# Update product
@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int = Path(..., gt=0),
    updated_product: ProductUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check for duplicates (excluding current product)
    existing = db.query(Product).filter(
        ((Product.sku == updated_product.sku) | (Product.barcode == updated_product.barcode)) & 
        (Product.id != product_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Another product with same SKU or Barcode exists")
    
    # Fixed: .dict() -> .model_dump() with exclude_unset=True
    update_data = updated_product.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product

# Delete product
@router.delete("/{product_id}", response_model=dict)
def delete_product(
    product_id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Optional: Check if product is used in any orders before deleting
    # from app.models.order import PurchaseItem, SalesItem
    # in_use = db.query(PurchaseItem).filter(PurchaseItem.product_id == product_id).first()
    # if in_use:
    #     raise HTTPException(status_code=400, detail="Cannot delete product that has purchase history")
    
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted successfully"}

# Increment stock
@router.patch("/{product_id}/add_stock", response_model=ProductResponse)
def add_stock(
    product_id: int, 
    quantity: int = Body(..., gt=0, embed=True),  # Added embed=True for better API docs
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.stock += quantity
    db.commit()
    db.refresh(product)
    return product

# Decrement stock
@router.patch("/{product_id}/reduce_stock", response_model=ProductResponse)
def reduce_stock(
    product_id: int, 
    quantity: int = Body(..., gt=0, embed=True),  # Added embed=True for better API docs
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {product.stock}")
    
    product.stock -= quantity
    db.commit()
    db.refresh(product)
    return product