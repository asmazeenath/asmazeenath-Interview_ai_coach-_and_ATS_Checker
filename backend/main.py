import os, re, json, sqlite3, io
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://asmazeenath-interview-ai-coach-and-sage.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv()
DB_PATH = os.getenv("DATABASE_PATH", "./interviews.db")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
app = FastAPI(title="SkillSpring Interview and ATS API", version="1.0.0")
origins = [x.strip() for x in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS interviews(
            id INTEGER PRIMARY KEY AUTOINCREMENT, candidate TEXT NOT NULL, role TEXT NOT NULL,
            level TEXT NOT NULL, created_at TEXT NOT NULL, overall_score INTEGER, report_json TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS interview_answers(
            id INTEGER PRIMARY KEY AUTOINCREMENT, interview_id INTEGER NOT NULL, question TEXT NOT NULL,
            answer TEXT NOT NULL, seconds_used INTEGER DEFAULT 0, score INTEGER, feedback TEXT,
            FOREIGN KEY(interview_id) REFERENCES interviews(id))""")
init_db()

class StartRequest(BaseModel):
    candidate: str = "Candidate"
    role: str = "General"
    level: str = "Entry level"
    questions: list[str] = Field(default_factory=list)
class AnswerRequest(BaseModel):
    question: str
    answer: str = ""
    seconds_used: int = 0
class FinishRequest(BaseModel):
    answers: list[dict] = Field(default_factory=list)
    role: str = "General"
class ResumeRequest(BaseModel):
    resume_text: str
    job_description: str
class ExportRequest(BaseModel):
    resume_text: str

def gemini_json(prompt: str) -> Optional[dict]:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=key)
        response = client.models.generate_content(model=MODEL, contents=prompt)
        text = (response.text or "").strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I)
        return json.loads(text)
    except Exception as exc:
        print("Gemini evaluation unavailable:", exc)
        return None

def fallback_evaluation(answers):
    details = []
    for item in answers:
        answer = str(item.get("answer", "")).strip()
        words = re.findall(r"\b[\w'-]+\b", answer)
        score = min(90, max(10, 25 + min(len(words), 100) // 2)) if words else 0
        feedback = ("Give a specific example, explain the actions you personally took, and include the outcome."
                    if len(words) < 25 else
                    "Good start. Strengthen this answer with a clear situation, your actions, and a measurable result.")
        details.append({"question": item.get("question", ""), "answer": answer, "score": score, "feedback": feedback})
    scores = [d["score"] for d in details]
    overall = round(sum(scores)/len(scores)) if scores else 0
    return {"overall_score": overall,
            "competencies": {"problem_solving": overall, "attitude": overall, "learning_agility": overall, "communication": overall},
            "summary": "Heuristic practice estimate. Add a Gemini API key for richer AI-generated feedback.",
            "strengths": ["You completed a structured practice session."],
            "improvements": ["Use specific examples and measurable outcomes.", "Structure behavioral answers with Situation, Task, Action and Result."],
            "answers": details, "evaluation_mode": "basic heuristic"}

@app.get("/")
def root():
    return {"status":"ok", "service":"SkillSpring Interview and ATS API"}

@app.get("/api/health")
def health():
    return {"ok": True, "gemini_enabled": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))}

@app.post("/api/interviews/start")
def start_interview(body: StartRequest):
    with db() as c:
        cur = c.execute("INSERT INTO interviews(candidate,role,level,created_at) VALUES(?,?,?,?)",
                        (body.candidate.strip() or "Candidate", body.role, body.level, datetime.now(timezone.utc).isoformat()))
        return {"session_id": cur.lastrowid}

@app.post("/api/interviews/{session_id}/answer")
def save_answer(session_id: int, body: AnswerRequest):
    with db() as c:
        if not c.execute("SELECT id FROM interviews WHERE id=?", (session_id,)).fetchone():
            raise HTTPException(404, "Interview session not found")
        c.execute("INSERT INTO interview_answers(interview_id,question,answer,seconds_used) VALUES(?,?,?,?)",
                  (session_id, body.question, body.answer, body.seconds_used))
    return {"saved": True}

@app.post("/api/interviews/{session_id}/finish")
def finish_interview(session_id: int, body: FinishRequest):
    with db() as c:
        row = c.execute("SELECT * FROM interviews WHERE id=?", (session_id,)).fetchone()
        if not row: raise HTTPException(404, "Interview session not found")
        # Use submitted complete list to ensure the final answer is included exactly once.
        prompt = """You are a constructive interview coach. Evaluate each answer fairly against its question and target role.
Return ONLY valid JSON with keys: overall_score (0-100 integer), competencies (problem_solving, attitude, learning_agility, communication each 0-100), summary (string), strengths (array of strings), improvements (array of strings), answers (array matching input order with question, answer, score 0-100, feedback).
Do not infer personality, protected traits, or visual appearance. Score only the answer content; short/blank answers should score low. Be supportive and specific.
Target role: %s
Answers JSON: %s""" % (body.role, json.dumps(body.answers, ensure_ascii=False))
        report = gemini_json(prompt) or fallback_evaluation(body.answers)
        report.setdefault("evaluation_mode", "Gemini" if (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")) else "basic heuristic")
        c.execute("UPDATE interviews SET overall_score=?, report_json=? WHERE id=?",
                  (int(report.get("overall_score", 0)), json.dumps(report, ensure_ascii=False), session_id))
        # Refresh stored answers with evaluated answer feedback.
        for a in report.get("answers", []):
            c.execute("INSERT INTO interview_answers(interview_id,question,answer,score,feedback) VALUES(?,?,?,?,?)",
                      (session_id, a.get("question",""), a.get("answer",""), a.get("score",0), a.get("feedback","")))
    return report

@app.get("/api/history")
def history():
    with db() as c:
        rows = c.execute("SELECT id,candidate,role,level,created_at,overall_score FROM interviews ORDER BY id DESC LIMIT 100").fetchall()
        return [dict(r) for r in rows if r["overall_score"] is not None]

@app.get("/api/history/{session_id}")
def get_history(session_id: int):
    with db() as c:
        row = c.execute("SELECT report_json FROM interviews WHERE id=?", (session_id,)).fetchone()
        if not row or not row["report_json"]: raise HTTPException(404, "Completed report not found")
        return json.loads(row["report_json"])

def extract_text(filename: str, raw: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".txt":
        return raw.decode("utf-8", errors="ignore")
    if suffix == ".pdf":
        try:
            import fitz
            doc = fitz.open(stream=raw, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        except Exception as e:
            raise HTTPException(400, f"Could not read PDF. Is it scanned? OCR is not included. Details: {e}")
    if suffix == ".docx":
        try:
            from docx import Document
            doc = Document(io.BytesIO(raw))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            raise HTTPException(400, f"Could not read DOCX: {e}")
    raise HTTPException(400, "Upload a PDF, DOCX or TXT file")

@app.post("/api/resume/parse")
async def parse_resume(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 8 * 1024 * 1024: raise HTTPException(413, "Resume must be under 8 MB")
    return {"filename": file.filename, "text": extract_text(file.filename or "", data)}

def words(text):
    return set(re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower()))

@app.post("/api/resume/analyze")
def analyze_resume(body: ResumeRequest):
    resume = body.resume_text.strip()
    jd = body.job_description.strip()
    if not resume or not jd: raise HTTPException(400, "Resume text and job description are required")
    jd_words = words(jd)
    stop = {"with","from","that","this","will","your","have","you","our","are","and","the","for","you","years","work","role","job","required","skills","using","ability","strong","good","such","including","knowledge","experience"}
    # Prioritize skill-like and meaningful job-description terms, not every common word.
    candidates = sorted((w for w in jd_words if w not in stop and len(w) >= 3), key=lambda w: (-len(w), w))
    resume_words = words(resume)
    matched = [w for w in candidates if w in resume_words]
    missing = [w for w in candidates if w not in resume_words]
    # Limit the displayed vocabulary and use a transparent overlap estimate.
    pool = candidates[:60]
    pool_matched = [w for w in pool if w in resume_words]
    score = round(100 * len(pool_matched) / max(1, len(pool)))
    improved = resume
    recs = []
    if missing: recs.append("If you genuinely have these skills, include relevant missing terms naturally: " + ", ".join(missing[:12]) + ".")
    recs += ["Tailor your summary to the target role and emphasize relevant projects.",
             "Quantify outcomes where possible (time saved, accuracy, scale, or users served).",
             "Use clear standard headings and simple formatting; do not add skills you cannot substantiate."]
    ai = gemini_json("""Return ONLY JSON with keys improved_resume (string), recommendations (array of strings), matched_keywords (array), missing_keywords (array), match_score (integer 0-100). Improve wording without inventing qualifications or work history. Be explicit that a score is an estimate.
Resume:
%s
Job description:
%s
Initial matched keywords: %s
Initial missing keywords: %s""" % (resume[:12000], jd[:12000], json.dumps(matched[:60]), json.dumps(missing[:60])))
    if ai:
        ai.setdefault("match_score", score); ai.setdefault("matched_keywords", matched[:60]); ai.setdefault("missing_keywords", missing[:60]); ai.setdefault("recommendations", recs); ai.setdefault("improved_resume", improved)
        return ai
    return {"match_score": score, "matched_keywords": matched[:40], "missing_keywords": missing[:40],
            "recommendations": recs, "improved_resume": improved,
            "note": "Keyword-overlap estimate, not a prediction of any employer's ATS result."}

@app.post("/api/resume/export")
def export_resume(body: ExportRequest):
    try:
        from docx import Document
        from docx.shared import Pt
        doc = Document()
        style = doc.styles["Normal"]; style.font.name = "Arial"; style.font.size = Pt(10)
        for line in body.resume_text.splitlines():
            line = line.strip()
            if not line: continue
            if len(line) < 70 and (line.isupper() or line.endswith(":")):
                doc.add_heading(line.rstrip(":"), level=2)
            else:
                doc.add_paragraph(line)
        out = io.BytesIO(); doc.save(out); out.seek(0)
        from fastapi.responses import StreamingResponse
        return StreamingResponse(out, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                 headers={"Content-Disposition": 'attachment; filename="improved_resume.docx"'})
    except Exception as e:
        raise HTTPException(500, f"Could not create DOCX: {e}")
