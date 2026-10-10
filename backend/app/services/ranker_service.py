import json
import logging
import re
from typing import Optional, List
from openai import AsyncOpenAI
from app.config import settings
from app.models.schemas import ResumeAnalysisResult, CategoryScores

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite Senior Technical Recruiter and AI Talent Screener.
Analyze the candidate's Resume against the provided Job Description (JD).
Evaluate objectively and return a structured assessment:
1. match_score (0-100 overall score)
2. summary (2-3 sentences executive summary)
3. category_scores:
   - technical_skills (0-100)
   - experience_alignment (0-100)
   - education_and_certifications (0-100)
4. matched_skills: Array of relevant skills, tools, or domain knowledge present in both resume and JD
5. missing_skills: Array of important requirements or tools in JD that are missing in resume
6. strengths: Array of 2-4 key strengths aligned with the JD
7. weaknesses_and_gaps: Array of 1-3 gaps or weak points
8. actionable_feedback: Array of 2-4 concrete, actionable recommendations for the candidate to improve their fit
"""

class RankerService:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    @property
    def client(self) -> Optional[AsyncOpenAI]:
        if not self._client and settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your-"):
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def analyze(self, resume_text: str, job_description: str) -> ResumeAnalysisResult:
        """
        Evaluates resume against job description.
        Uses OpenAI structured output when API key is set;
        Falls back to local NLP heuristic ranking if key is not provided.
        """
        if self.client:
            try:
                return await self._analyze_with_openai(resume_text, job_description)
            except Exception as e:
                logger.error("OpenAI analysis failed (%s). Falling back to heuristic ranking.", e)
                return self._heuristic_analysis(resume_text, job_description)
        else:
            logger.info("OpenAI API key not configured or demo mode. Using intelligent local evaluation.")
            return self._heuristic_analysis(resume_text, job_description)

    async def _analyze_with_openai(self, resume_text: str, job_description: str) -> ResumeAnalysisResult:
        user_prompt = f"""
### JOB DESCRIPTION:
{job_description}

### CANDIDATE RESUME:
{resume_text}
"""
        completion = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format=ResumeAnalysisResult,
            temperature=0.2
        )
        return completion.choices[0].message.parsed

    def _heuristic_analysis(self, resume_text: str, job_description: str) -> ResumeAnalysisResult:
        """
        Deterministic, local heuristic evaluator for offline demonstration and testing.
        Extracts key technologies and measures token overlap, section matching, and experience.
        """
        resume_lower = resume_text.lower()
        jd_lower = job_description.lower()

        # Common tech keywords dictionary for extraction
        tech_keywords = [
            "python", "javascript", "typescript", "react", "next.js", "vue", "angular",
            "node.js", "fastapi", "django", "flask", "docker", "kubernetes", "aws",
            "gcp", "azure", "redis", "postgresql", "mysql", "mongodb", "graphql",
            "rest api", "git", "ci/cd", "linux", "html", "css", "tailwind", "microservices",
            "kafka", "rabbitmq", "celery", "elasticsearch", "machine learning", "pytorch",
            "tensorflow", "pandas", "numpy", "scikit-learn", "llm", "langchain", "openai"
        ]

        found_in_jd = [kw for kw in tech_keywords if re.search(r'\b' + re.escape(kw) + r'\b', jd_lower)]
        if not found_in_jd:
            # Fallback to extracting capital words/tokens if no tech keywords
            words = [w for w in re.findall(r'\b[a-zA-Z]{3,}\b', jd_lower) if len(w) > 3][:12]
            found_in_jd = list(set(words))

        matched = [kw for kw in found_in_jd if re.search(r'\b' + re.escape(kw) + r'\b', resume_lower)]
        missing = [kw for kw in found_in_jd if kw not in matched]

        total_req = max(len(found_in_jd), 1)
        tech_ratio = len(matched) / total_req
        tech_score = int(min(100, max(25, tech_ratio * 90 + 10)))

        # Experience check
        has_exp_words = any(w in resume_lower for w in ["years", "senior", "led", "developed", "architected", "managed"])
        exp_score = 85 if has_exp_words else 65

        # Education check
        has_degree = any(w in resume_lower for w in ["bachelor", "master", "degree", "bs", "ms", "computer science", "university", "engineer"])
        edu_score = 90 if has_degree else 70

        overall_score = int((tech_score * 0.55) + (exp_score * 0.30) + (edu_score * 0.15))

        matched_formatted = [kw.title() if len(kw) > 3 else kw.upper() for kw in matched]
        missing_formatted = [kw.title() if len(kw) > 3 else kw.upper() for kw in missing]

        summary = (
            f"Candidate matches {len(matched)} of {len(found_in_jd)} core technologies required by the role. "
            f"Overall competency is rated at {overall_score}% with strong background alignment."
        )

        strengths = [
            f"Direct competency verified in: {', '.join(matched_formatted[:4])}" if matched else "Demonstrated baseline technical comprehension",
            "Clear relevant professional background and project execution"
        ]

        weaknesses = [
            f"Noticeable gap in: {', '.join(missing_formatted[:3])}" if missing else "No significant technical gaps identified for the role"
        ]

        feedback = [
            f"Highlight specific project impact and metrics using {missing_formatted[0]}" if missing else "Include measurable KPIs for past deployments",
            "Tailor resume summary to highlight JD-aligned keywords and architecture patterns"
        ]

        return ResumeAnalysisResult(
            match_score=overall_score,
            summary=summary,
            category_scores=CategoryScores(
                technical_skills=tech_score,
                experience_alignment=exp_score,
                education_and_certifications=edu_score
            ),
            matched_skills=matched_formatted,
            missing_skills=missing_formatted,
            strengths=strengths,
            weaknesses_and_gaps=weaknesses,
            actionable_feedback=feedback
        )

ranker_service = RankerService()
