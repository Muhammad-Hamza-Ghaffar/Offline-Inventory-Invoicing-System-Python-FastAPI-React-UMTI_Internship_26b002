from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True)
    stock = Column(Integer, default=0)
    cost = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    barcode = Column(String, unique=True, index=True)
    
    # Add these relationships
    purchase_items = relationship("PurchaseItem", back_populates="product")
    sales_items = relationship("SalesItem", back_populates="product")