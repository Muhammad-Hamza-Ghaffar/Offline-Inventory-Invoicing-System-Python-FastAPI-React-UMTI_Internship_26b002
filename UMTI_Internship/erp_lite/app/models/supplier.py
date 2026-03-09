from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    address = Column(String, nullable=True)
    
    # Fix the relationship - make sure it matches the back_populates in PurchaseOrder
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")