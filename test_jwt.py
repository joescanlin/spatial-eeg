from src.backend.utils.auth import create_access_token
from jose import jwt
from src.utils.config import get_settings

settings = get_settings()
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"

# Test token creation
test_data = {"sub": "test@example.com", "role": "admin"}
token = create_access_token(test_data, expire_m=15)
print(f"Generated JWT token: {token}")

# Test token decoding
decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
print(f"Decoded token data: {decoded_token}")

# Verify data integrity
assert decoded_token["sub"] == test_data["sub"]
assert decoded_token["role"] == test_data["role"]
print("Token validation successful!") 