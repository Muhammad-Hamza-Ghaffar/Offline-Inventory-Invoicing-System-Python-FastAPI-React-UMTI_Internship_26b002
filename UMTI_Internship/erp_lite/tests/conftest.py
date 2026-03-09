

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
from typing import Generator
import tempfile
import os
import time

from app.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.models.user import User
from app.models.product import Product
from app.models.customer import Customer
from app.models.supplier import Supplier

@pytest.fixture(scope="session")
def db_engine():
    """Create a temporary SQLite database for testing"""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Dispose the engine to close all connections
    engine.dispose()
    
    # Small delay to ensure file is released
    time.sleep(0.1)
    
    # Now try to delete the file
    try:
        os.unlink(db_path)
    except PermissionError:
        # If still locked, wait and try again
        time.sleep(0.5)
        os.unlink(db_path)

@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    """Create a new database session for each test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with a test database session"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db_session):
    """Create a test user"""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_product(db_session):
    """Create a test product"""
    product = Product(
        sku="TEST001",
        name="Test Product",
        category="Electronics",
        stock=100,
        cost=50.00,
        price=99.99,
        barcode="1234567890123"
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

@pytest.fixture(scope="function")
def test_customer(db_session):
    """Create a test customer"""
    customer = Customer(
        name="Test Customer",
        email="customer@test.com",
        phone="123-456-7890",
        address="123 Test St"
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer

@pytest.fixture(scope="function")
def test_supplier(db_session):
    """Create a test supplier"""
    supplier = Supplier(
        name="Test Supplier",
        email="supplier@test.com",
        phone="098-765-4321",
        address="456 Supply Ave"
    )
    db_session.add(supplier)
    db_session.commit()
    db_session.refresh(supplier)
    return supplier

@pytest.fixture(scope="function")
def auth_headers(client, test_user):
    """Get authentication headers for test user"""
    response = client.post("/login", data={
        "username": "testuser",
        "password": "testpass123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
