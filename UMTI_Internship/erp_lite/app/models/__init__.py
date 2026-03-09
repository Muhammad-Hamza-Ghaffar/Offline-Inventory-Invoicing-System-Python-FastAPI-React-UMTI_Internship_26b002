# app/models/__init__.py
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models in the correct order (dependencies first)
from .user import User
from .customer import Customer
from .supplier import Supplier
from .product import Product
from .order import PurchaseOrder, PurchaseItem, SalesOrder, SalesItem

__all__ = [
    "Base",
    "User",
    "Customer",
    "Supplier",
    "Product",
    "PurchaseOrder",
    "PurchaseItem",
    "SalesOrder",
    "SalesItem"
]