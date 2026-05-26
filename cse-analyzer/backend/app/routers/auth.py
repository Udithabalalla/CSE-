from fastapi import APIRouter
from app.models.user import UserRegister, UserLogin, TokenResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister):
    token, user = await auth_service.register_user(
        body.username, body.email, body.password, body.full_name
    )
    return TokenResponse(access_token=token, user=UserOut(**user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    token, user = await auth_service.login_user(body.username, body.password)
    return TokenResponse(access_token=token, user=UserOut(**user))
