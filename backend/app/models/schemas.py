from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class CategoryScores(BaseModel):
    technical_skills: int = Field(ge=0, le=100, description="Match score for technical hard skills")
    experience_alignment: int = Field(ge=0, le=100, description="Alignment of past roles and responsibilities")
    education_and_certifications: int = Field(ge=0, le=100, description="Match for degrees and relevant certifications")

class ResumeAnalysisResult(BaseModel):
    match_score: int = Field(ge=0, le=100, description="Overall matching score from 0 to 100")
    summary: str = Field(description="Executive summary of the candidate's qualification for the role")
    category_scores: CategoryScores
    matched_skills: List[str] = Field(default_factory=list, description="Skills present in both JD and resume")
    missing_skills: List[str] = Field(default_factory=list, description="Key skills required by JD but missing in resume")
    strengths: List[str] = Field(default_factory=list, description="Key strengths of the candidate")
    weaknesses_and_gaps: List[str] = Field(default_factory=list, description="Noticeable gaps or missing experiences")
    actionable_feedback: List[str] = Field(default_factory=list, description="Constructive tips to improve or tailor the resume")

class RankResponse(BaseModel):
    fingerprint: str = Field(description="SHA-256 fingerprint generated for this resume + JD pair")
    cached: bool = Field(description="True if result was served from Redis cache")
    latency_ms: float = Field(description="Processing latency in milliseconds")
    analysis: ResumeAnalysisResult
    extracted_text_preview: Optional[str] = None

class RankTextRequest(BaseModel):
    resume_text: str = Field(..., min_length=20, description="Plain text extracted from resume")
    job_description: str = Field(..., min_length=20, description="Target job description")

class HealthResponse(BaseModel):
    status: str
    redis_connected: bool
    redis_backend: str
    openai_configured: bool
    model: str
