from pydantic import BaseModel, ConfigDict
from typing import Optional

class ProductBase(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    stock: int
    cost: float
    price: float
    barcode: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    """All fields are optional for updates"""
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    cost: Optional[float] = None
    price: Optional[float] = None
    barcode: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ProductResponse(ProductBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)
