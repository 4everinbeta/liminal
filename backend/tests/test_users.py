"""
Tests for User API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, sample_user_data):
    """Test creating a new user."""
    # Use JSON body
    user_data = {
        "email": sample_user_data["email"],
        "name": sample_user_data["name"],
        "password": "strongpassword"
    }
    response = await client.post("/users", json=user_data)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == sample_user_data["email"]
    assert "id" in data


@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient, sample_user_data):
    """Test that creating a user with duplicate email returns error (or exists?)."""
    # Note: main.py implementation raises 400 for duplicate email.
    # Previous implementation might have returned existing user.
    # Checking main.py:
    # if existing: raise HTTPException(status_code=400, detail="Email already registered")
    
    user_data = {
        "email": sample_user_data["email"],
        "name": sample_user_data["name"],
        "password": "strongpassword"
    }
    response1 = await client.post("/users", json=user_data)
    assert response1.status_code == 201

    response2 = await client.post("/users", json=user_data)
    assert response2.status_code == 400