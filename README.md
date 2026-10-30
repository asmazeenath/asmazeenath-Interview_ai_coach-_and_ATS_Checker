# SkillSpring: GUVI-style AI Interview Coach + ATS Resume Builder

This is a starter implementation for adding an AI interview and ATS resume experience to an existing React + Vite LMS. It recreates the interaction pattern, not GUVI's proprietary source code or exact private stack.

## Included
- React + Vite responsive dashboard
- CSS animated avatar and browser text-to-speech
- Webcam preview
- Browser speech recognition where supported, with editable transcript fallback
- Question-by-question interview workflow and countdown
- FastAPI service, SQLite session history and report retrieval
- Gemini evaluation when a server-side API key is configured; heuristic fallback without a key
- PDF/DOCX/TXT resume parsing
- Job description keyword comparison, recommendations and DOCX export

## 1. Copy into your existing project

Back up your current project first. Copy:
- `frontend/src/App.jsx` to your existing `LMS_website/frontend/src/App.jsx`
- `frontend/src/app.css` to `LMS_website/frontend/src/app.css`
- merge `frontend/.env.example` into your frontend `.env` as `VITE_API_URL=http://localhost:8000`

Do not replace your existing `package.json`, `index.html`, `main.jsx`, or Vite configuration. This UI uses only React and browser APIs; no extra frontend package is required. Ensure your existing `src/main.jsx` imports `App` and renders it.

If your Vite frontend is in a different folder, copy the two source files into that frontend's `src` directory.

## 2. Start the backend (Windows PowerShell)

Open a new terminal:
```powershell
cd path\to\LMS_website
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\interview_component\backend\requirements.txt
Copy-Item .\interview_component\backend\.env.example .\interview_component\backend\.env
cd .\interview_component\backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process Bypass` in that terminal and activate again. If you put `backend` somewhere else, adjust the `cd` and `pip install -r` paths accordingly.

**Simpler alternative:** copy the `backend` folder next to your frontend, then from that folder run:
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## 3. Start your existing frontend

In a second terminal, from the folder that contains your existing `package.json`:
```powershell
npm run dev
```
Open the Local URL Vite prints (commonly `http://localhost:5173`). Do not run `npm install` from the parent folder unless it contains the `package.json`.

## 4. Enable Gemini evaluation (optional but recommended)

Edit `backend/.env`:
```env
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
DATABASE_PATH=./interviews.db
FRONTEND_ORIGINS=http://localhost:5173
```
Restart FastAPI after editing `.env`. Keep this key only on the backend. Never put it in `VITE_*` variables or frontend JavaScript. Without a key, interviews still save and produce a basic heuristic score, and ATS matching still works, but the evaluation is less intelligent.

## 5. Browser permissions and speech notes
- Allow camera access when the browser asks.
- Speech recognition support differs by browser; Chromium-based desktop browsers generally have the best support. If recognition is unavailable, type in the answer box.
- The browser's speech voice is local and free, but voice quality and available voices depend on the operating system.
- Browsers may require microphone permission and a user gesture before microphone capture. This app starts recognition after the spoken question ends, following the Start Interview click. If the browser does not allow that transition, grant permissions and retry.
- Camera preview is not recorded or uploaded. This starter uses `getUserMedia` for local preview only.
- The animated avatar is a CSS illustration with a speaking mouth animation, not a photorealistic video avatar.

## 6. Online deployment
For students to use this anywhere, deploy the frontend and backend separately:
1. Deploy frontend to a static hosting service (e.g. Vercel/Netlify).
2. Deploy FastAPI to a Python host (e.g. Render, Railway, or a VPS).
3. Set frontend `VITE_API_URL` to the public HTTPS backend URL and rebuild/redeploy frontend.
4. Set backend `FRONTEND_ORIGINS` to the exact deployed frontend origin, e.g. `https://your-lms.example`.
5. Add `GEMINI_API_KEY` to backend host environment variables, not to frontend.
6. Use managed PostgreSQL and persistent storage in production. SQLite on an ephemeral host can lose data during redeploys.
7. Add real authentication, per-user authorization, rate limiting, request size limits, HTTPS, retention controls and privacy notices before real student use. The starter has no login or user isolation, so do not expose it publicly with real student records as-is.

## Troubleshooting
- `Failed to fetch`: confirm FastAPI is running at port 8000 and `VITE_API_URL` is correct.
- CORS error: set `FRONTEND_ORIGINS` to the exact frontend origin, then restart backend.
- `ModuleNotFoundError`: activate the intended virtual environment and run `pip install -r requirements.txt`.
- PDF has no text: it may be a scanned image; OCR is not included in this starter.
- Browser voice not starting: allow site microphone permission, use HTTPS (or localhost), and try Chrome/Edge.

## API
- `GET /api/health`
- `POST /api/interviews/start`
- `POST /api/interviews/{id}/answer`
- `POST /api/interviews/{id}/finish`
- `GET /api/history`
- `GET /api/history/{id}`
- `POST /api/resume/parse`
- `POST /api/resume/analyze`
- `POST /api/resume/export`
