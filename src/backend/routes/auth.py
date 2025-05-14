from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.backend.schemas.auth import Token, LoginRequest
from src.backend.utils.auth import create_access_token

# Simulated user database - replace with actual database queries in production
USERS = {
    "admin": {
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "password"
        "disabled": False,
    }
}

router = APIRouter(prefix="/auth", tags=["authentication"])

def verify_password(plain_password, hashed_password):
    # In production, use passlib to verify password
    # For this demo, we'll use a simple check for "password"
    return plain_password == "password"

def authenticate_user(username: str, password: str):
    user = USERS.get(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get an access token."""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    token_data = {"sub": user["username"]}
    access_token = create_access_token(token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login/json", response_model=Token)
async def login_json(login_data: LoginRequest):
    """Login with JSON payload and get an access token."""
    user = authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    token_data = {"sub": user["username"]}
    access_token = create_access_token(token_data)
    
    return {"access_token": access_token, "token_type": "bearer"} 