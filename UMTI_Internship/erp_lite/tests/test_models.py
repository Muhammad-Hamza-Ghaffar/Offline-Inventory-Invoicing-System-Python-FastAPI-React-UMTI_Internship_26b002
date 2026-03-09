import pytest
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.models.product import Product

class TestUserModel:
    def test_create_user(self, db_session):
        user = User(
            username="newuser",
            email="new@example.com",
            hashed_password="hashed123",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.username == "newuser"

    def test_unique_username(self, db_session, test_user):
        duplicate = User(
            username="testuser",
            email="different@example.com",
            hashed_password="hashed456"
        )
        db_session.add(duplicate)
        with pytest.raises(IntegrityError):
            db_session.commit()

class TestProductModel:
    def test_create_product(self, db_session):
        product = Product(
            sku="SKU123",
            name="Test Product",
            cost=25.50,
            price=49.99
        )
        db_session.add(product)
        db_session.commit()
        
        assert product.id is not None
        assert product.sku == "SKU123"