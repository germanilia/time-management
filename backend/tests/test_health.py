from httpx import AsyncClient


async def test_health_check_returns_success(client: AsyncClient):
    """GET /health should return status success with healthy data."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["status"] == "healthy"
