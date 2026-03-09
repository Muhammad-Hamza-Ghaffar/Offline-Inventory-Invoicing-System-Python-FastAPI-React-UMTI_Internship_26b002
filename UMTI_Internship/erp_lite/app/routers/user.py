from fastapi import APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.orm import Session
from typing import List
from app.schemas.user import UserResponse, UserUpdate  # You'll need to create UserUpdate schema
from app.models.user import User
from app.database import get_db
from app.core.security import get_current_user, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])

# Get all users (admin only - you might want to add admin role check)
@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Optional: Add admin check here
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(User).all()

# Get current user profile
@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

# Get single user by ID
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int = Path(..., gt=0),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Update user
@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int = Path(..., gt=0),
    updated_user: UserUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Optional: Check if user is updating themselves or is admin
    if current_user.id != user_id:
        # Check for admin role here
        # if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You can only update your own profile")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for duplicate username/email
    if updated_user.username or updated_user.email:
        existing = db.query(User).filter(
            ((User.username == updated_user.username) | (User.email == updated_user.email)) &
            (User.id != user_id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username or email already taken")
    
    # Update user data
    update_data = updated_user.model_dump(exclude_unset=True)
    
    # Hash password if it's being updated
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

# Delete user
@router.delete("/{user_id}", response_model=dict)
def delete_user(
    user_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Optional: Only allow admins to delete users
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}

# Toggle user active status
@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    user_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Optional: Only allow admins to toggle status
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user