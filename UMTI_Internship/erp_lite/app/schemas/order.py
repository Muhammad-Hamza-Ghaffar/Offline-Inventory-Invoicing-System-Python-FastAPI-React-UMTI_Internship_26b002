from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime

# Purchase
class PurchaseItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    items: List[PurchaseItemBase]

class PurchaseItemResponse(PurchaseItemBase):
    id: int
    product_id: int
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderResponse(BaseModel):
    id: int
    supplier_id: int
    total_amount: float
    created_at: datetime
    items: List[PurchaseItemResponse]
    model_config = ConfigDict(from_attributes=True)

# Sales
class SalesItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float

class SalesOrderCreate(BaseModel):
    customer_id: int
    items: List[SalesItemBase]

class SalesItemResponse(SalesItemBase):
    id: int
    product_id: int
    model_config = ConfigDict(from_attributes=True)

class SalesOrderResponse(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    created_at: datetime
    items: List[SalesItemResponse]
    model_config = ConfigDict(from_attributes=True)
