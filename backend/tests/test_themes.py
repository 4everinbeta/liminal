"""
Tests for Theme API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_theme(authed_client: AsyncClient, sample_theme_data):
    """Test creating a new theme."""
    response = await authed_client.post("/themes", json=sample_theme_data)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == sample_theme_data["title"]
    assert "id" in data


@pytest.mark.asyncio
async def test_get_themes_list(authed_client: AsyncClient, sample_theme_data):
    """Test getting list of themes."""
    await authed_client.post("/themes", json=sample_theme_data)
    await authed_client.post("/themes", json={"title": "Theme 2"})

    response = await authed_client.get("/themes")

    assert response.status_code == 200
    assert len(response.json()) == 2