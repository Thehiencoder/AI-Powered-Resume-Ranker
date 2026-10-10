import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.services.pdf_parser import pdf_parser
from app.services.cache_service import cache_service
from app.services.ranker_service import ranker_service
from app.config import settings
from app.models.schemas import RankResponse, RankTextRequest, ResumeAnalysisResult

router = APIRouter()

@router.post("/rank", response_model=RankResponse, summary="Rank uploaded PDF resume against Job Description")
async def rank_pdf_resume(
    file: UploadFile = File(..., description="PDF Resume file"),
    job_description: str = Form(..., min_length=20, description="Target Job Description text")
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are supported."
        )

    start_time = time.perf_counter()
    
    # 1. Read file buffer
    file_bytes = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF file exceeds {settings.MAX_FILE_SIZE_MB}MB limit."
        )
        
    # 2. Extract text from PDF
    extracted_text = pdf_parser.extract_text_from_bytes(file_bytes)
    
    # 3. Generate SHA-256 fingerprint
    fingerprint = cache_service.generate_fingerprint(extracted_text, job_description)
    
    # 4. Check Redis cache
    cached_data = await cache_service.get(fingerprint)
    if cached_data:
        latency = (time.perf_counter() - start_time) * 1000
        return RankResponse(
            fingerprint=fingerprint,
            cached=True,
            latency_ms=round(latency, 2),
            analysis=ResumeAnalysisResult(**cached_data),
            extracted_text_preview=extracted_text[:400] + ("..." if len(extracted_text) > 400 else "")
        )
        
    # 5. Cache Miss: Run AI evaluation
    analysis = await ranker_service.analyze(extracted_text, job_description)
    
    # 6. Store in Redis
    await cache_service.set(fingerprint, analysis.model_dump())
    
    latency = (time.perf_counter() - start_time) * 1000
    return RankResponse(
        fingerprint=fingerprint,
        cached=False,
        latency_ms=round(latency, 2),
        analysis=analysis,
        extracted_text_preview=extracted_text[:400] + ("..." if len(extracted_text) > 400 else "")
    )

@router.post("/rank-text", response_model=RankResponse, summary="Rank raw resume text against Job Description")
async def rank_raw_text(payload: RankTextRequest):
    start_time = time.perf_counter()
    
    # 1. Generate SHA-256 fingerprint
    fingerprint = cache_service.generate_fingerprint(payload.resume_text, payload.job_description)
    
    # 2. Check Redis cache
    cached_data = await cache_service.get(fingerprint)
    if cached_data:
        latency = (time.perf_counter() - start_time) * 1000
        return RankResponse(
            fingerprint=fingerprint,
            cached=True,
            latency_ms=round(latency, 2),
            analysis=ResumeAnalysisResult(**cached_data),
            extracted_text_preview=payload.resume_text[:400] + ("..." if len(payload.resume_text) > 400 else "")
        )
        
    # 3. Cache Miss: Run AI evaluation
    analysis = await ranker_service.analyze(payload.resume_text, payload.job_description)
    
    # 4. Store in Redis
    await cache_service.set(fingerprint, analysis.model_dump())
    
    latency = (time.perf_counter() - start_time) * 1000
    return RankResponse(
        fingerprint=fingerprint,
        cached=False,
        latency_ms=round(latency, 2),
        analysis=analysis,
        extracted_text_preview=payload.resume_text[:400] + ("..." if len(payload.resume_text) > 400 else "")
    )
