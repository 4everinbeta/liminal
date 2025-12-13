"""
Tests for Initiative API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_initiative(authed_client: AsyncClient, sample_initiative_data):
    """Test creating a new initiative."""
    response = await authed_client.post("/initiatives", json=sample_initiative_data)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == sample_initiative_data["title"]
    assert "id" in data


@pytest.mark.asyncio
async def test_create_initiative_with_theme(authed_client: AsyncClient):
    """Test creating an initiative linked to a theme."""
    theme_data = {"title": "Strategic Theme"}
    theme_response = await authed_client.post("/themes", json=theme_data)
    theme_id = theme_response.json()["id"]

    initiative_data = {
        "title": "Themed Initiative",
        "theme_id": theme_id
    }
    response = await authed_client.post("/initiatives", json=initiative_data)

    assert response.status_code == 200
    data = response.json()
    assert data["theme_id"] == theme_id


@pytest.mark.asyncio
async def test_get_initiatives_list(authed_client: AsyncClient):
    """Test getting list of initiatives."""
    await authed_client.post("/initiatives", json={"title": "Init 1"})
    await authed_client.post("/initiatives", json={"title": "Init 2"})

    response = await authed_client.get("/initiatives")

    assert response.status_code == 200
    assert len(response.json()) == 2