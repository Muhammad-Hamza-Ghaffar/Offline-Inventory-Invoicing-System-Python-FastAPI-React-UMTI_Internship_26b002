from fastapi import APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.orm import Session
from typing import List
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.models.customer import Customer
from app.models.user import User
from app.database import get_db
from app.core.security import get_current_user  # Change this line

router = APIRouter(prefix="/customers", tags=["Customers"])

# Create
@router.post("/", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)  # Now User is defined
):
    # Check for existing customer
    existing = db.query(Customer).filter(
        (Customer.email == customer.email) | (Customer.phone == customer.phone)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Customer with same email or phone exists")
    
    # Using model_dump() for Pydantic V2
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# Read all
@router.get("/", response_model=List[CustomerResponse])
def get_customers(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(Customer).all()

# Read single
@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

# Update
@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int = Path(..., gt=0), 
    updated: CustomerUpdate = Body(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Using model_dump() for Pydantic V2
    update_data = updated.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
    
    db.commit()
    db.refresh(customer)
    return customer

# Delete
@router.delete("/{customer_id}", response_model=dict)
def delete_customer(
    customer_id: int = Path(..., gt=0), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(customer)
    db.commit()
    return {"detail": "Customer deleted successfully"}