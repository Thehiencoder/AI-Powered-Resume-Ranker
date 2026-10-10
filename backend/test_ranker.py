import io
from fastapi.testclient import TestClient
from app.main import app

def test_health():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "redis_backend" in data

def test_rank_text_and_cache():
    payload = {
        "resume_text": "Experienced Python Backend Engineer with 5 years building microservices using FastAPI, Docker, and Redis. Solid experience with PostgreSQL databases and CI/CD pipelines.",
        "job_description": "We are seeking a Senior Backend Developer proficient in Python, FastAPI, Redis caching, and Docker containerization. Must have database knowledge."
    }
    
    with TestClient(app) as client:
        # 1. First call - should be cache miss
        res1 = client.post("/api/v1/rank-text", json=payload)
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["cached"] is False
        assert data1["analysis"]["match_score"] > 60
        fingerprint = data1["fingerprint"]
        
        # 2. Second call - should be cache hit (< 15ms)
        res2 = client.post("/api/v1/rank-text", json=payload)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["cached"] is True
        assert data2["fingerprint"] == fingerprint
        assert data2["analysis"]["match_score"] == data1["analysis"]["match_score"]

def test_rank_pdf_upload():
    from pathlib import Path
    sample_path = Path("samples/alex_rivers_resume.pdf")
    if not sample_path.exists():
        sample_path = Path("../samples/alex_rivers_resume.pdf")
    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()

    job_description = "We are seeking a Senior Backend Developer proficient in Python, FastAPI, Redis caching, and Docker containerization."
    
    with TestClient(app) as client:
        # 1. Upload PDF
        files = {"file": ("alex_rivers_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"job_description": job_description}
        res1 = client.post("/api/v1/rank", files=files, data=data)
        assert res1.status_code == 200
        result1 = res1.json()
        assert result1["cached"] is False
        assert result1["analysis"]["match_score"] > 60
        assert "fingerprint" in result1
        fp = result1["fingerprint"]

        # 2. Upload same PDF again -> verify cache hit
        files2 = {"file": ("alex_rivers_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        res2 = client.post("/api/v1/rank", files=files2, data=data)
        assert res2.status_code == 200
        result2 = res2.json()
        assert result2["cached"] is True
        assert result2["fingerprint"] == fp

if __name__ == "__main__":
    test_health()
    print("[PASS] Health check PASSED")
    test_rank_text_and_cache()
    print("[PASS] Ranking & Redis Cache SHA-256 fingerprinting PASSED")
    test_rank_pdf_upload()
    print("[PASS] PDF upload, text extraction & Redis cache PASSED")
