import os
import re
import json
import io
from datetime import datetime, timezone
from typing import Optional

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from google import genai
from docx import Document
import pymupdf

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL =("gemini-2.5-flash")

FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "https://asmazeenath-interview-ai-coach-and-ats-checker-j2kh-qz0gfk510.vercel.app/,http://localhost:5173/"
)

origins = [
    origin.strip().rstrip("/")
    for origin in FRONTEND_ORIGINS.split(",")
    if origin.strip()
]

app = FastAPI(
    title="SkillSpring AI Career Studio API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


def get_db():
    if not DATABASE_URL:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL is not configured."
        )

    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
        connect_timeout=15
    )


def initialize_database():
    if not DATABASE_URL:
        print("DATABASE_URL is missing. Database initialization skipped.")
        return

    try:
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS interviews (
                    session_id TEXT PRIMARY KEY,
                    candidate TEXT,
                    role TEXT,
                    level TEXT,
                    questions JSONB,
                    report_json JSONB,
                    status TEXT DEFAULT 'started',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    completed_at TIMESTAMPTZ
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS interview_answers (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT REFERENCES interviews(session_id)
                        ON DELETE CASCADE,
                    question TEXT,
                    answer TEXT,
                    score INTEGER DEFAULT 0,
                    feedback TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)

        print("Database initialized successfully.")

    except Exception as error:
        print("Database initialization failed:", str(error))


@app.on_event("startup")
def startup_event():
    initialize_database()


class StartInterviewRequest(BaseModel):
    candidate: str = "Candidate"
    role: str = "Software Engineer"
    level: str = "Entry level"
    questions: list = Field(default_factory=list)


class AnswerRequest(BaseModel):
    question: str
    answer: str


class FinishRequest(BaseModel):
    answers: list = Field(default_factory=list)
    role: Optional[str] = None
    level: Optional[str] = None


class ResumeAnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str


def clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def extract_json(text):
    text = clean_text(text)

    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(r"\s*```$", "", text)

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("Gemini did not return valid JSON.")

    return json.loads(text[start:end + 1])


def gemini_json(prompt):
    if not client:
        return None

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )

        if not response or not response.text:
            return None

        return extract_json(response.text)

    except Exception as error:
        print("Gemini evaluation error:", str(error))
        return None


def fallback_evaluation(answers, role):
    question_results = []
    total_score = 0

    for index, item in enumerate(answers):
        answer = clean_text(item.get("answer", ""))
        question = clean_text(item.get("question", ""))

        word_count = len(answer.split())

        if word_count >= 100:
            score = 65
        elif word_count >= 50:
            score = 50
        elif word_count >= 20:
            score = 35
        elif word_count > 0:
            score = 20
        else:
            score = 0

        total_score += score

        question_results.append({
            "question_number": index + 1,
            "question": question,
            "answer": answer,
            "score": score,
            "feedback": (
                "Your answer has some content. Add more specific "
                "details and explain your approach."
                if word_count > 0
                else "No answer was provided."
            ),
            "strengths": (
                ["You attempted the question."]
                if word_count > 0 else []
            ),
            "missing_concepts": [
                "A specific example",
                "Your individual contribution",
                "The result or outcome"
            ],
            "ideal_answer": (
                "Structure your answer by explaining the situation, "
                "the task, the actions you personally took, and the result."
            ),
            "improvement_tip": (
                "Give a specific example, explain the actions you "
                "personally took, and include the outcome."
            )
        })

    overall = round(total_score / len(answers)) if answers else 0

    return {
        "overall_score": overall,
        "evaluation_mode": "Basic fallback",
        "model": None,
        "summary": (
            "This is a basic estimate based on answer length. "
            "Gemini evaluation was unavailable."
        ),
        "competency_scores": {
            "technical_accuracy": overall,
            "conceptual_understanding": overall,
            "practical_examples": overall,
            "problem_solving": overall,
            "communication": overall
        },
        "strengths": [],
        "improvements": [
            "Provide detailed examples.",
            "Explain your problem-solving approach.",
            "Include measurable results where possible."
        ],
        "question_feedback": question_results
    }


def evaluate_interview(answers, role, level):
    if not answers:
        raise HTTPException(
            status_code=400,
            detail="No interview answers were provided."
        )

    formatted_answers = []

    for index, item in enumerate(answers):
        formatted_answers.append({
            "question_number": index + 1,
            "question": clean_text(item.get("question", "")),
            "answer": clean_text(item.get("answer", ""))
        })

    prompt = f"""
You are an experienced technical interviewer and AI career coach.

Evaluate the candidate's interview answers carefully.

Candidate target role: {role}
Experience level: {level}

Use this scoring rubric:
1. Technical accuracy: 40%
2. Conceptual understanding: 20%
3. Practical examples: 15%
4. Problem solving: 15%
5. Communication: 10%

Evaluate every answer separately.
Do not give identical generic feedback for different answers.
Do not assume the candidate knows something unless the answer demonstrates it.
Be fair to freshers and entry-level candidates.
Do not reward answer length alone.
Give constructive and realistic feedback.

Return only valid JSON in this structure:

{{
  "summary": "Overall interview summary",
  "competency_scores": {{
    "technical_accuracy": 0,
    "conceptual_understanding": 0,
    "practical_examples": 0,
    "problem_solving": 0,
    "communication": 0
  }},
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "question_feedback": [
    {{
      "question_number": 1,
      "question": "Original question",
      "score": 0,
      "feedback": "Specific evaluation of this answer",
      "strengths": ["specific strength"],
      "missing_concepts": ["missing concept"],
      "ideal_answer": "A suitable example of a strong answer",
      "improvement_tip": "A specific recommendation"
    }}
  ]
}}

Each score must be between 0 and 100.
Include one question_feedback object for each submitted answer.
Keep the original question text.
The ideal answer must be relevant to the actual question.
The overall score will be calculated separately.

Candidate answers:
{json.dumps(formatted_answers, ensure_ascii=False)}
"""

    result = gemini_json(prompt)

    if not isinstance(result, dict):
        return fallback_evaluation(answers, role)

    try:
        question_feedback = result.get("question_feedback", [])

        if len(question_feedback) != len(answers):
            raise ValueError("Gemini returned an incorrect number of evaluations.")

        competency_scores = result.get("competency_scores", {})

        rubric_keys = [
            "technical_accuracy",
            "conceptual_understanding",
            "practical_examples",
            "problem_solving",
            "communication"
        ]

        for key in rubric_keys:
            competency_scores[key] = max(
                0,
                min(100, int(competency_scores.get(key, 0)))
            )

        total_score = 0

        for index, feedback in enumerate(question_feedback):
            original = formatted_answers[index]

            score = max(
                0,
                min(100, int(feedback.get("score", 0)))
            )

            feedback["question_number"] = index + 1
            feedback["question"] = original["question"]
            feedback["answer"] = original["answer"]
            feedback["score"] = score

            feedback["feedback"] = clean_text(
                feedback.get("feedback")
            ) or "Review this answer and provide more specific details."

            feedback["strengths"] = (
                feedback.get("strengths")
                if isinstance(feedback.get("strengths"), list)
                else []
            )

            feedback["missing_concepts"] = (
                feedback.get("missing_concepts")
                if isinstance(feedback.get("missing_concepts"), list)
                else []
            )

            feedback["ideal_answer"] = clean_text(
                feedback.get("ideal_answer")
            )

            feedback["improvement_tip"] = clean_text(
                feedback.get("improvement_tip")
            )

            total_score += score

        overall_score = round(total_score / len(question_feedback))

        return {
            "overall_score": overall_score,
            "evaluation_mode": "Gemini AI",
            "model": GEMINI_MODEL,
            "summary": clean_text(result.get("summary")),
            "competency_scores": competency_scores,
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", []),
            "question_feedback": question_feedback
        }

    except Exception as error:
        print("Gemini response validation error:", str(error))
        return fallback_evaluation(answers, role)


@app.get("/")
def root():
    return {
        "message": "Welcome to SkillSpring AI Career Studio API",
        "status": "running"
    }


@app.get("/api/health")
def health():
    database_status = "not_configured"

    if DATABASE_URL:
        try:
            with get_db() as conn:
                conn.execute("SELECT 1")
            database_status = "connected"
        except Exception:
            database_status = "error"

    return {
        "status": "ok",
        "service": "SkillSpring Interview and ATS API",
        "database": database_status,
        "gemini_enabled": bool(GEMINI_API_KEY),
        "gemini_model": GEMINI_MODEL
    }


@app.post("/api/interviews/start")
def start_interview(request: StartInterviewRequest):
    import uuid

    session_id = str(uuid.uuid4())

    questions = request.questions or [
        "Tell me about yourself.",
        "Describe a challenging problem you solved.",
        "How do you handle feedback?",
        "How do you learn a new skill?",
        "Why are you interested in this role?"
    ]

    try:
        with get_db() as conn:
            conn.execute("""
                INSERT INTO interviews
                (session_id, candidate, role, level, questions, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                session_id,
                request.candidate,
                request.role,
                request.level,
                json.dumps(questions),
                "started"
            ))

        return {
            "session_id": session_id,
            "candidate": request.candidate,
            "role": request.role,
            "level": request.level,
            "questions": questions,
            "status": "started"
        }

    except Exception as error:
        print("Interview start error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not start interview. Please try again."
        )


@app.post("/api/interviews/{session_id}/answer")
def submit_answer(session_id: str, request: AnswerRequest):
    try:
        with get_db() as conn:
            interview = conn.execute("""
                SELECT session_id
                FROM interviews
                WHERE session_id = %s
            """, (session_id,)).fetchone()

            if not interview:
                raise HTTPException(
                    status_code=404,
                    detail="Interview session not found."
                )

            conn.execute("""
                INSERT INTO interview_answers
                (session_id, question, answer)
                VALUES (%s, %s, %s)
            """, (
                session_id,
                request.question,
                request.answer
            ))

        return {
            "message": "Answer saved successfully",
            "session_id": session_id
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Answer submission error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not save interview answer."
        )


@app.post("/api/interviews/{session_id}/finish")
def finish_interview(session_id: str, request: FinishRequest):
    try:
        with get_db() as conn:
            interview = conn.execute("""
                SELECT *
                FROM interviews
                WHERE session_id = %s
            """, (session_id,)).fetchone()

            if not interview:
                raise HTTPException(
                    status_code=404,
                    detail="Interview session not found."
                )

            if interview.get("report_json"):
                report = interview["report_json"]

                if isinstance(report, str):
                    report = json.loads(report)

                return report

            answers = request.answers

            if not answers:
                saved_answers = conn.execute("""
                    SELECT question, answer
                    FROM interview_answers
                    WHERE session_id = %s
                    ORDER BY id
                """, (session_id,)).fetchall()

                answers = [
                    {
                        "question": item["question"],
                        "answer": item["answer"]
                    }
                    for item in saved_answers
                ]

            role = request.role or interview["role"]
            level = request.level or interview["level"]

            if not answers:
                raise HTTPException(
                    status_code=400,
                    detail="No answers found for this interview."
                )

            report = evaluate_interview(
                answers,
                role,
                level
            )

            conn.execute("""
                DELETE FROM interview_answers
                WHERE session_id = %s
            """, (session_id,))

            for item in report["question_feedback"]:
                conn.execute("""
                    INSERT INTO interview_answers
                    (session_id, question, answer, score, feedback)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    session_id,
                    item["question"],
                    item["answer"],
                    item["score"],
                    item["feedback"]
                ))

            conn.execute("""
                UPDATE interviews
                SET report_json = %s,
                    status = 'completed',
                    completed_at = NOW()
                WHERE session_id = %s
            """, (
                json.dumps(report),
                session_id
            ))

        return report

    except HTTPException:
        raise
    except Exception as error:
        print("Interview finish error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not generate interview report."
        )


@app.get("/api/history")
def get_history():
    try:
        with get_db() as conn:
            rows = conn.execute("""
                SELECT
                    session_id,
                    candidate,
                    role,
                    level,
                    status,
                    created_at,
                    completed_at,
                    report_json
                FROM interviews
                ORDER BY created_at DESC
            """).fetchall()

        history = []

        for row in rows:
            report = row.get("report_json")

            if isinstance(report, str):
                report = json.loads(report)

            history.append({
                "session_id": row["session_id"],
                "candidate": row["candidate"],
                "role": row["role"],
                "level": row["level"],
                "status": row["status"],
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
                "overall_score": (
                    report.get("overall_score")
                    if isinstance(report, dict)
                    else None
                )
            })

        return history

    except Exception as error:
        print("History error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve interview history."
        )


@app.get("/api/history/{session_id}")
def get_interview_history(session_id: str):
    try:
        with get_db() as conn:
            interview = conn.execute("""
                SELECT *
                FROM interviews
                WHERE session_id = %s
            """, (session_id,)).fetchone()

            if not interview:
                raise HTTPException(
                    status_code=404,
                    detail="Interview not found."
                )

            answers = conn.execute("""
                SELECT question, answer, score, feedback
                FROM interview_answers
                WHERE session_id = %s
                ORDER BY id
            """, (session_id,)).fetchall()

        report = interview.get("report_json")

        if isinstance(report, str):
            report = json.loads(report)

        return {
            "session_id": interview["session_id"],
            "candidate": interview["candidate"],
            "role": interview["role"],
            "level": interview["level"],
            "status": interview["status"],
            "questions": interview["questions"],
            "answers": answers,
            "report": report
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Interview history detail error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve interview details."
        )


def extract_resume_text(filename, content):
    extension = filename.lower().split(".")[-1]

    if extension == "txt":
        return content.decode("utf-8", errors="ignore")

    if extension == "pdf":
        document = pymupdf.open(
            stream=content,
            filetype="pdf"
        )

        return "\n".join(
            page.get_text()
            for page in document
        )

    if extension == "docx":
        document = Document(io.BytesIO(content))

        return "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
        )

    raise HTTPException(
        status_code=400,
        detail="Only PDF, DOCX and TXT files are supported."
    )


@app.post("/api/resume/parse")
async def parse_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Resume file must be smaller than 10 MB."
            )

        resume_text = extract_resume_text(
            file.filename or "",
            content
        )

        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this resume."
            )

        return {
            "filename": file.filename,
            "resume_text": resume_text
        }

    except HTTPException:
        raise
    except Exception as error:
        print("Resume parsing error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not parse the resume."
        )


@app.post("/api/resume/analyze")
def analyze_resume(request: ResumeAnalyzeRequest):
    resume_text = request.resume_text.strip()
    job_description = request.job_description.strip()

    if not resume_text or not job_description:
        raise HTTPException(
            status_code=400,
            detail="Resume text and job description are required."
        )

    prompt = f"""
You are an expert ATS resume analyzer and career consultant.

Compare the resume with the job description.

Return only valid JSON with this structure:

{{
  "match_score": 0,
  "matched_skills": ["Python"],
  "missing_skills": ["Docker"],
  "strengths": ["strength"],
  "improvements": ["improvement"],
  "summary": "Resume analysis summary",
  "recommendations": ["recommendation"]
}}

Give a realistic match score from 0 to 100.
Do not invent skills that are not present in the resume.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""

    result = gemini_json(prompt)

    if result:
        result["evaluation_mode"] = "Gemini AI"
        return result

    resume_words = set(
        re.findall(r"[a-zA-Z0-9+#.]+", resume_text.lower())
    )

    job_words = set(
        re.findall(r"[a-zA-Z0-9+#.]+", job_description.lower())
    )

    ignored_words = {
        "and", "the", "for", "with", "you", "are",
        "our", "your", "will", "this", "that", "from",
        "have", "has", "who", "what", "how", "job"
    }

    job_keywords = job_words - ignored_words
    matched = sorted(resume_words & job_keywords)
    missing = sorted(job_keywords - resume_words)

    score = (
        round(len(matched) / len(job_keywords) * 100)
        if job_keywords else 0
    )

    return {
        "match_score": score,
        "matched_skills": matched[:30],
        "missing_skills": missing[:30],
        "strengths": [
            "Resume text was successfully extracted."
        ],
        "improvements": [
            "Add relevant skills from the job description where they accurately reflect your experience."
        ],
        "summary": (
            "This is a basic keyword comparison. "
            "AI-powered analysis was unavailable."
        ),
        "recommendations": [
            "Include measurable project outcomes.",
            "Use relevant job-description keywords naturally.",
            "Highlight your most relevant technical projects."
        ],
        "evaluation_mode": "Basic keyword analysis"
    }


@app.post("/api/resume/export")
def export_resume(request: dict):
    try:
        resume_text = clean_text(
            request.get("resume_text", "")
        )

        if not resume_text:
            raise HTTPException(
                status_code=400,
                detail="Resume content is required."
            )

        document = Document()

        document.add_heading(
            "Professional Resume",
            level=1
        )

        for line in resume_text.splitlines():
            if line.strip():
                document.add_paragraph(line.strip())

        output = io.BytesIO()
        document.save(output)
        output.seek(0)

        from fastapi.responses import StreamingResponse

        return StreamingResponse(
            output,
            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
            headers={
                "Content-Disposition":
                    'attachment; filename="improved_resume.docx"'
            }
        )

    except HTTPException:
        raise
    except Exception as error:
        print("Resume export error:", str(error))
        raise HTTPException(
            status_code=500,
            detail="Could not export the resume."
        )
