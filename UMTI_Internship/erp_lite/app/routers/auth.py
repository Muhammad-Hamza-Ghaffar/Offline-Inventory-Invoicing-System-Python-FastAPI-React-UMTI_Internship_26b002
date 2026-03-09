from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserResponse
from app.models.user import User
from app.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])

# Register user
@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(User).filter(
            (User.username == user.username) | (User.email == user.email)
        ).first()
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Username or email already exists")
        
        hashed_password = get_password_hash(user.password)
        db_user = User(
            username=user.username, 
            email=user.email, 
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

# Login user
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        logger.info(f"Login attempt for username: {form_data.username}")
        
        # Find user
        db_user = db.query(User).filter(User.username == form_data.username).first()
        
        if not db_user:
            logger.warning(f"User not found: {form_data.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Verify password
        if not verify_password(form_data.password, db_user.hashed_password):
            logger.warning(f"Invalid password for user: {form_data.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Check if user is active
        if not db_user.is_active:
            logger.warning(f"Inactive user attempted login: {form_data.username}")
            raise HTTPException(status_code=401, detail="User account is inactive")
        
        # Create token
        access_token = create_access_token({"sub": db_user.username})
        logger.info(f"Successful login for user: {form_data.username}")
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")