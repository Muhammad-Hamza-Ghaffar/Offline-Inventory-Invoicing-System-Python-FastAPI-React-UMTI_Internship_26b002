from pydantic import BaseModel, ConfigDict
from typing import Optional

class SupplierBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    
    # Method 1: Using model_config with ConfigDict (recommended for V2)
    model_config = ConfigDict(from_attributes=True)
    
    # OR Method 2: Using class Config with from_attributes
    # class Config:
    #     from_attributes = True
