import { useEffect, useRef, useState } from "react";
import "./app.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QUESTION_BANK = {
  "AI/ML Engineer": [
    "Explain supervised and unsupervised learning.",
    "How would you handle an imbalanced dataset?",
    "Explain overfitting and how to prevent it.",
    "How do you select evaluation metrics for an ML model?",
    "Describe an end-to-end machine learning project.",
    "How would you deploy and monitor an ML model?",
    "Explain feature engineering.",
    "How would you debug poor model performance?",
    "What is cross-validation?",
    "How would you handle missing data?"
  ],
  "Data Scientist": [
    "How would you explore a new dataset?",
    "Explain correlation versus causation.",
    "How would you test a business hypothesis?",
    "Explain p-values and confidence intervals.",
    "How would you handle outliers?",
    "Describe a data science project and its impact.",
    "Regression versus classification: when would you use each?",
    "How do you validate a predictive model?",
    "How would you explain findings to stakeholders?",
    "How would you investigate a sudden drop in sales?"
  ],
  "Data Analyst": [
    "How do you clean and validate data?",
    "Explain INNER JOIN versus LEFT JOIN.",
    "How would you calculate monthly growth using SQL?",
    "What makes a dashboard useful?",
    "How would you investigate customer churn?",
    "Explain WHERE versus HAVING.",
    "How do you identify trends in data?",
    "How would you handle duplicate records?",
    "Describe a report that supported a decision.",
    "How would you investigate a KPI change?"
  ],
  "Python Developer": [
    "Explain lists, tuples, sets, and dictionaries.",
    "How do you handle exceptions in Python?",
    "What are decorators?",
    "Explain generators and yield.",
    "How would you optimize slow Python code?",
    "How do you organize a Python project?",
    "Explain mutable and immutable objects.",
    "How would you test a Python function?",
    "Why use virtual environments?",
    "How would you investigate high memory usage?"
  ],
  "Software Engineer": [
    "Explain object-oriented programming principles.",
    "How would you investigate a production bug?",
    "Explain processes versus threads.",
    "How do you design maintainable software?",
    "Explain common data structures.",
    "How do you approach software testing?",
    "What is time complexity?",
    "How would you review another developer's code?",
    "How do you manage errors?",
    "Describe a technical challenge you solved."
  ],
  "Full Stack Developer": [
    "How does a frontend communicate with a backend?",
    "How would you implement authentication?",
    "How do you validate user input?",
    "Explain REST APIs and HTTP status codes.",
    "How would you improve a slow web application?",
    "How do you manage state in React?",
    "How would you design a web application's database?",
    "How do you protect against common web attacks?",
    "How would you deploy a full-stack application?",
    "How would you debug an API failure?"
  ],
  "Frontend Developer": [
    "Explain props versus state in React.",
    "What is the virtual DOM?",
    "How would you make a website responsive?",
    "How do you manage API loading and error states?",
    "How would you improve web accessibility?",
    "Explain useEffect and its dependencies.",
    "How do you optimize frontend performance?",
    "How do you validate forms in React?",
    "What causes unnecessary component renders?",
    "How would you debug a mobile layout issue?"
  ],
  "Backend Developer": [
    "How would you design a REST API?",
    "How do database indexes improve performance?",
    "Explain authentication versus authorization.",
    "How would you handle concurrent requests?",
    "How do you prevent SQL injection?",
    "How would you design error handling?",
    "When would you use caching?",
    "How do you manage database transactions?",
    "How would you investigate API latency?",
    "How would you design background jobs?"
  ],
  "Generative AI Engineer": [
    "Explain retrieval-augmented generation.",
    "How would you reduce LLM hallucinations?",
    "What are embeddings and vector databases?",
    "How would you evaluate LLM responses?",
    "How do you design effective prompts?",
    "How would you manage context-window limits?",
    "When would you fine-tune instead of using RAG?",
    "How would you protect sensitive AI data?",
    "How would you reduce LLM latency and cost?",
    "How would you evaluate a chatbot before deployment?"
  ],
  "NLP Engineer": [
    "Explain tokenization.",
    "How would you prepare text for classification?",
    "Explain stemming versus lemmatization.",
    "What is attention in transformer models?",
    "How would you evaluate named-entity recognition?",
    "How would you handle rare words?",
    "What are word embeddings?",
    "How would you build sentiment analysis?",
    "How would you handle multilingual text?",
    "How would you detect bias in NLP?"
  ],
  "Computer Vision Engineer": [
    "Explain image classification versus object detection.",
    "How would you prepare images for training?",
    "What is data augmentation?",
    "How would you evaluate object detection?",
    "How do CNNs extract features?",
    "How would you handle class imbalance in images?",
    "What is transfer learning?",
    "How would you speed up image inference?",
    "How would you handle poor lighting?",
    "How would you investigate false detections?"
  ],
  "Machine Learning Engineer": [
    "How would you build a repeatable ML pipeline?",
    "Explain data leakage.",
    "How do you monitor model drift?",
    "How would you version datasets and models?",
    "How do you compare baseline models?",
    "How would you deploy a model through an API?",
    "What is hyperparameter tuning?",
    "How do you ensure reproducible experiments?",
    "How would you scale model inference?",
    "How would you detect model degradation?"
  ],
  "DevOps Engineer": [
    "Explain CI/CD pipelines.",
    "How do Docker containers differ from virtual machines?",
    "How would you investigate a failed deployment?",
    "What is infrastructure as code?",
    "How do you monitor application health?",
    "How would you manage deployment secrets?",
    "Explain rolling deployments and rollbacks.",
    "How would you troubleshoot restarting containers?",
    "Why automate tests in CI?",
    "How would you reduce deployment downtime?"
  ],
  "Cloud Engineer": [
    "How would you design a highly available application?",
    "Explain least privilege in cloud IAM.",
    "How would you control cloud costs?",
    "Explain vertical versus horizontal scaling.",
    "How would you secure cloud data?",
    "Explain load balancing and auto-scaling.",
    "How would you recover a cloud database?",
    "How do you monitor cloud resources?",
    "How would you troubleshoot cloud networking?",
    "When would you use serverless architecture?"
  ],
  "Cybersecurity Engineer": [
    "How would you investigate a security incident?",
    "Explain authentication and authorization.",
    "How do you prevent SQL injection?",
    "How would you prioritize vulnerabilities?",
    "Explain the principle of least privilege.",
    "How would you secure an API?",
    "Explain encryption in transit and at rest.",
    "How would you respond to phishing?",
    "How would you investigate suspicious logs?",
    "How would you perform a security risk assessment?"
  ],
  "HR": [
    "How would you screen candidates against a job description?",
    "How would you handle employee disagreements?",
    "How would you improve employee retention?",
    "How would you structure an effective interview?",
    "How would you protect employee information?",
    "How would you measure recruitment effectiveness?",
    "How would you manage competing hiring priorities?",
    "How would you respond to an employee grievance?",
    "How would you support fair hiring?",
    "How would you improve onboarding?"
  ],
  "Product Manager": [
    "How would you prioritize product requests?",
    "How do you measure product success?",
    "How would you validate user requirements?",
    "How would you decide whether to build a feature?",
    "How would you resolve disagreements with engineers?",
    "How would you investigate declining engagement?",
    "How would you create a product roadmap?",
    "How would you test a product idea?",
    "How do you balance customer needs and technical constraints?",
    "How would you communicate a delayed launch?"
  ],
  "Project Manager": [
    "How would you manage a delayed project?",
    "How do you identify project risks?",
    "How would you resolve team conflicts?",
    "How do you track project progress?",
    "How would you handle changing requirements?",
    "How would you communicate delays?",
    "How would you allocate limited resources?",
    "How do you define project scope?",
    "How would you manage dependencies?",
    "How would you measure project success?"
  ],
  "Other": [
    "Tell me about yourself and your relevant experience.",
    "Describe a challenging problem you solved.",
    "How do you approach learning a new skill?",
    "Describe a time you received feedback.",
    "Why are you interested in this role?",
    "How do you prioritize tasks?",
    "Describe a teamwork challenge.",
    "How do you handle deadlines?",
    "What are your professional strengths?",
    "What would you like to improve?"
  ]
};

function generateQuestions(role, level) {
  const bank = [...(QUESTION_BANK[role] || QUESTION_BANK.Other)];

  // Shuffle main questions
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }

  // Experience-based follow-up questions
  const followUps = {
    "Entry level": [
      "Can you explain this with a real-world example?",
      "What steps would you take to solve this problem?",
      "What challenges might you face?",
      "Which tools or technologies would you use?",
      "How would you test your solution?"
    ],

    "1–3 years": [
      "Can you describe a project where you applied this?",
      "What technical challenges did you face?",
      "How did you validate your results?",
      "What alternatives did you consider?",
      "How would you optimize your solution?"
    ],

    "3–5 years": [
      "How would you implement this in production?",
      "What trade-offs influenced your decisions?",
      "How would you measure performance?",
      "How would you improve scalability?",
      "What potential bottlenecks would you investigate?"
    ],

    "5+ years": [
      "How would you design this for millions of users?",
      "What architectural risks would you consider?",
      "How would you balance cost and performance?",
      "How would you manage technical debt?",
      "How would you ensure security and reliability?"
    ]
  };

  const selectedFollowUps = [
    ...(followUps[level] || followUps["Entry level"])
  ];

  // Shuffle follow-ups
  for (let i = selectedFollowUps.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedFollowUps[i], selectedFollowUps[j]] =
      [selectedFollowUps[j], selectedFollowUps[i]];
  }

  // Five main questions with different follow-ups
  return bank.slice(0, 5).map((q, i) => {
    return `${q}\n ${selectedFollowUps[i]}`;
  });
}

function Avatar({ speaking }) {
  return (
    <div className={`avatar ${speaking ? "speaking" : ""}`}>
      <div className="avatar-halo" />
      <div className="avatar-head">
        <div className="avatar-hair" />
        <div className="avatar-ear left" />
        <div className="avatar-ear right" />
        <div className="avatar-brow left" />
        <div className="avatar-brow right" />
        <div className="avatar-eye left" />
        <div className="avatar-eye right" />
        <div className="avatar-nose" />
        <div className="avatar-mouth" />
      </div>
      <div className="avatar-neck" />
      <div className="avatar-body">
        <div className="avatar-shirt" />
      </div>
      <div className="avatar-status">
        <span />
        {speaking ? "Speaking" : "AI Interviewer"}
      </div>
    </div>
  );
}

function speak(text, onEnd) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1;

  const voice = window.speechSynthesis
    .getVoices()
    .find(v => /en-IN|en-US|en-GB/i.test(v.lang));

  if (voice) utterance.voice = voice;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export default function App() {
  const [page, setPage] = useState("interview");
  const [role, setRole] = useState("AI/ML Engineer");
  const [level, setLevel] = useState("Entry level");
  const [candidate, setCandidate] = useState("");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("ready");
  const [speaking, setSpeaking] = useState(false);
  const [seconds, setSeconds] = useState(120);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // ATS states
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [atsResult, setAtsResult] = useState(null);
  const [atsBusy, setAtsBusy] = useState(false);

  // Interview report and history
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const answerRef = useRef("");

  const currentQuestion = questions[index] || "";

  useEffect(() => {
    loadHistory();

    return () => {
      window.speechSynthesis?.cancel();
      stopCamera();
      stopRecognition();
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    if (!running || status !== "recording") return;

    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          submitAnswer(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [running, status, index]);

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(Array.isArray(data) ? data : data.history || []);
      }
    } catch (err) {
      console.error("History loading error:", err);
    }
  }

  // Upload and extract resume text
  async function uploadResume(file) {
    if (!file) return;

    setError("");
    setAtsBusy(true);
    setResumeName(file.name);
    setAtsResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API}/api/resume/parse`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not extract resume text.");
      }

      const extractedText =
        data.resume_text || data.extracted_text || data.text || "";

      if (!extractedText) {
        throw new Error("No text was extracted from this file.");
      }

      setResumeText(extractedText);
    } catch (err) {
      console.error("Resume upload error:", err);
      setError(`Resume upload failed: ${err.message}`);
    } finally {
      setAtsBusy(false);
    }
  }

  // Analyze resume against job description
  async function analyzeResume() {
    if (!resumeText.trim()) {
      setError("Please upload or paste your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the target job description.");
      return;
    }

    setError("");
    setAtsBusy(true);
    setAtsResult(null);

    try {
      const response = await fetch(`${API}/api/resume/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          resume_name: resumeName || "Resume"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Resume analysis failed.");
      }

      setAtsResult(data);
    } catch (err) {
      console.error("ATS analysis error:", err);
      setError(`Resume analysis failed: ${err.message}`);
    } finally {
      setAtsBusy(false);
    }
  }

  // Export improved resume as DOCX
  async function exportResume() {
    if (!atsResult?.improved_resume) {
      setError("No improved resume is available to download.");
      return;
    }

    setError("");

    try {
      const response = await fetch(`${API}/api/resume/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume_text: atsResult.improved_resume,
          resume_name: resumeName || "Improved_Resume"
        })
      });

      if (!response.ok) {
        let message = "Could not export resume.";

        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {}

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${(resumeName || "Improved_Resume")
        .replace(/\.[^/.]+$/, "")}_Improved.docx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Resume export error:", err);
      setError(`Resume export failed: ${err.message}`);
    }

}
async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraOn(true);
    } catch {
      setError(
        "Camera permission was not granted. You can continue without video."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function stopRecognition() {
    try {
      recognitionRef.current?.stop();
    } catch {}

    recognitionRef.current = null;
  }

  function beginRecognition() {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      setStatus("recording");
      setError(
        "Speech recognition is unavailable. You can type your answer."
      );
      return;
    }

    stopRecognition();

    const rec = new SR();

    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = event => {
      let text = "";

      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + " ";
      }

      setAnswer(text.trim());
      answerRef.current = text.trim();
    };

    rec.onerror = event => {
      if (
        event.error !== "no-speech" &&
        event.error !== "aborted"
      ) {
        setError(
          "Speech recognition failed. You can type your answer."
        );
      }
    };

    rec.onend = () => {
      if (running && status === "recording") {
        try {
          rec.start();
        } catch {}
      }
    };

    recognitionRef.current = rec;

    try {
      rec.start();
      setStatus("recording");
    } catch {
      setStatus("recording");
      setError(
        "Microphone transcription could not start. Type your answer."
      );
    }
  }

  async function startInterview() {
    setError("");
    setReport(null);
    setAnswers([]);
    setAnswer("");
    answerRef.current = "";
    setIndex(0);
    setSeconds(120);

    const selectedQuestions = generateQuestions(role, level);
    setQuestions(selectedQuestions);

    try {
      const response = await fetch(`${API}/api/interviews/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          candidate: candidate || "Candidate",
          role,
          level,
          questions: selectedQuestions
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not start interview."
        );
      }

      setSessionId(data.session_id);
      setRunning(true);

      await startCamera();
      askQuestion(0, selectedQuestions);
    } catch (err) {
      setRunning(false);
      setError(
        `Could not start interview: ${err.message}. Check your FastAPI backend.`
      );
    }
  }

  function askQuestion(i, qs = questions) {
    setIndex(i);
    setAnswer("");
    answerRef.current = "";
    setSeconds(120);
    setStatus("asking");
    setSpeaking(true);

    speak(qs[i], () => {
      setSpeaking(false);
      beginRecognition();
    });
  }

  async function submitAnswer(auto = false) {
    if (status !== "recording" && !auto) return;

    clearInterval(timerRef.current);
    stopRecognition();

    const item = {
      question: currentQuestion,
      answer: answerRef.current.trim(),
      seconds_used: 120 - seconds
    };

    const nextAnswers = [...answers, item];

    setAnswers(nextAnswers);
    setStatus("evaluating");

    if (index + 1 < questions.length) {
      try {
        await fetch(
          `${API}/api/interviews/${sessionId}/answer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(item)
          }
        );
      } catch (err) {
        console.error("Answer save error:", err);
      }

      setTimeout(() => askQuestion(index + 1), 500);
    } else {
      try {
        const response = await fetch(
          `${API}/api/interviews/${sessionId}/finish`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              answers: nextAnswers,
              role
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Evaluation failed."
          );
        }

        setReport(data);
        setStatus("complete");
        setRunning(false);
        stopCamera();
        loadHistory();
      } catch (err) {
        setError(
          `Could not generate report: ${err.message}`
        );

        setStatus("complete");
        setRunning(false);
        stopCamera();
      }
    }
  }

  function endInterview() {
    window.speechSynthesis?.cancel();
    stopRecognition();
    clearInterval(timerRef.current);
    setSpeaking(false);
    setRunning(false);
    setStatus("ready");
    stopCamera();
  }

  function openPage(selectedPage) {
    setPage(selectedPage);
    setError("");

    if (selectedPage === "history") {
      loadHistory();
    }
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <span>
            SkillSpring
            <small>AI CAREER STUDIO</small>
          </span>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          className={`nav-item ${
            page === "interview" ? "active" : ""
          }`}
          onClick={() => openPage("interview")}
        >
          ◉ <span>AI Interview Coach</span>
        </button>

        <button
          className={`nav-item ${
            page === "ats" ? "active" : ""
          }`}
          onClick={() => openPage("ats")}
        >
          ▤ <span>ATS Resume Builder</span>
        </button>

        <button
          className={`nav-item ${
            page === "history" ? "active" : ""
          }`}
          onClick={() => openPage("history")}
        >
          ◷ <span>Interview History</span>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">AI CAREER STUDIO</span>
            <h1>
              {page === "ats"
                ? "ATS Resume Builder"
                : page === "history"
                ? "Interview History"
                : "AI Interview Coach"}
            </h1>
          </div>

          <span>{candidate || "Candidate"}</span>
        </header>

        {error && (
          <div className="alert" role="alert">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {/* INTERVIEW SETUP */}
        {page === "interview" &&
          !running &&
          !report && (
            <section className="setup-grid">
              <div className="panel setup-panel">
                <span className="eyebrow">
                  YOUR NEXT OPPORTUNITY
                </span>

                <h2>Practice like it's the real thing.</h2>

                <label>
                  Candidate name
                  <input
                    value={candidate}
                    onChange={e => setCandidate(e.target.value)}
                    placeholder="Enter your name"
                  />
                </label>

                <label>
                  Target job role
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                  >
                    {Object.keys(QUESTION_BANK).map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Experience level
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                  >
                    <option>Entry level</option>
                    <option>1–3 years</option>
                    <option>3–5 years</option>
                    <option>5+ years</option>
                  </select>
                </label>

                <div className="setup-meta">
                  <span>◷ 10–15 minutes</span>
                  <span>◎ 5 questions</span>
                  <span>✦ AI feedback</span>
                </div>

                <button
                  className="primary-btn"
                  onClick={startInterview}
                >
                  Start mock interview →
                </button>

                <p className="tiny">
                  Camera and microphone permissions are requested
                  when you begin.
                </p>
              </div>

              <div className="panel welcome-visual">
                <div className="visual-top">
                  YOUR AI INTERVIEWER
                </div>

                <Avatar speaking={false} />

                <div className="welcome-caption">
                  <b>Meet Alex</b>
                  <span>Your friendly AI interview coach</span>
                </div>
              </div>
            </section>
          )}

        {/* ACTIVE INTERVIEW */}
        {page === "interview" && running && (
          <section className="interview-layout">
            <div className="interview-main panel">
              <div className="interview-head">
                <div>
                  <span className="eyebrow">
                    {role.toUpperCase()}
                  </span>

                  <h2>
                    Question {index + 1} of {questions.length}
                  </h2>

                  <span>{level}</span>
                </div>

                <div className="timer">
                  {Math.floor(seconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {(seconds % 60)
                    .toString()
                    .padStart(2, "0")}
                </div>
              </div>

              <div className="progress">
                <span
                  style={{
                    width: `${
                      ((index + 1) / questions.length) * 100
                    }%`
                  }}
                />
              </div>

              <div className="interview-stage">
                <Avatar speaking={speaking} />

                <div className="question-card">
                  <span className="eyebrow">
                    ALEX · AI INTERVIEWER
                  </span>

                  <p>{currentQuestion}</p>

                  <div className="voice-status">
                    {speaking
                      ? "Asking question..."
                      : status === "recording"
                      ? "Listening to your answer..."
                      : "Saving your answer..."}
                  </div>
                </div>
              </div>

              <div className="answer-box">
                <b>Your answer</b>

                <textarea
                  value={answer}
                  onChange={e => {
                    setAnswer(e.target.value);
                    answerRef.current = e.target.value;
                  }}
                  placeholder="Speak or type your answer here..."
                  rows="5"
                />

                <button
                  className="primary-btn"
                  disabled={status !== "recording"}
                  onClick={() => submitAnswer(false)}
                >
                  Submit answer →
                </button>
              </div>

              <button
                className="end-link"
                onClick={endInterview}
              >
                End interview early
              </button>
            </div>

            <aside className="panel candidate-panel">
              <div className="candidate-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                />

                {!cameraOn && (
                  <p>Camera preview unavailable</p>
                )}
              </div>

              <b>{candidate || "Candidate"}</b>
              <p>{role}</p>
              <p>Camera: {cameraOn ? "On" : "Off"}</p>
              <p>
                Microphone:{" "}
                {status === "recording" ? "Listening" : "Standby"}
              </p>

              <p className="tiny">
                Use clear examples and explain your approach.
              </p>
            </aside>
          </section>
        )}

        {/* INTERVIEW REPORT */}
        {page === "interview" && report && (
          <section className="panel report-panel">
            <h2>Your performance report</h2>

            <h3>
              Overall score: {report.overall_score ?? 0}/100
            </h3>

            <p>{report.summary}</p>

            <h3>Strengths</h3>
            <ul>
              {(report.strengths || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3>Areas to improve</h3>
            <ul>
              {(report.improvements || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3>Question feedback</h3>

            {(report.answers || []).map((item, i) => (
              <div className="question-result" key={i}>
                <b>{item.question}</b>
                <p>Score: {item.score ?? 0}/100</p>
                <p>{item.feedback || item.answer}</p>
              </div>
            ))}

            <button
              className="primary-btn"
              onClick={() => {
                setReport(null);
                setStatus("ready");
                setAnswers([]);
                setAnswer("");
              }}
            >
              New interview
            </button>
          </section>
        )}

        {/* ATS RESUME BUILDER */}
        {page === "ats" && (
          <section className="ats-layout">
            <div className="panel ats-form">
              <span className="eyebrow">
                RESUME OPTIMIZATION
              </span>

              <h2>Make your experience stand out.</h2>

              <p className="muted">
                Compare your resume with a target job description
                and identify skills to improve.
              </p>

              <label>
                Upload resume (PDF, DOCX or TXT)

                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadResume(file);
                  }}
                />

                {resumeName && (
                  <span className="file-name">
                    ✓ {resumeName}
                  </span>
                )}
              </label>

              <label>
                Resume text

                <textarea
                  rows={10}
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Upload your resume or paste its text here..."
                />
              </label>

              <label>
                Target job description

                <textarea
                  rows={8}
                  value={jobDescription}
                  onChange={e =>
                    setJobDescription(e.target.value)
                  }
                  placeholder="Paste the target job description and required skills..."
                />
              </label>

              <button
                type="button"
                className="primary-btn"
                disabled={
                  atsBusy ||
                  !resumeText.trim() ||
                  !jobDescription.trim()
                }
                onClick={analyzeResume}
              >
                {atsBusy
                  ? "Analyzing..."
                  : "Analyze resume match →"}
              </button>
            </div>

            <div className="panel ats-results">
              {!atsResult ? (
                <div className="empty-state">
                  <div className="empty-icon">▤</div>

                  <h3>Your ATS report will appear here</h3>

                  <p>
                    Upload or paste your resume and add a job
                    description to view your match score,
                    keywords, and improvement suggestions.
                  </p>
                </div>
              ) : (
                <>
                  <span className="eyebrow">
                    YOUR ATS ANALYSIS
                  </span>

                  <div className="ats-score">
                    <strong>
                      {atsResult.match_score ?? 0}%
                    </strong>
                    <span>Estimated match</span>
                  </div>

                  <div
                    className="mini-progress"
                    role="progressbar"
                    aria-valuenow={Number(
                      atsResult.match_score ?? 0
                    )}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <i
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            Number(atsResult.match_score ?? 0)
                          )
                        )}%`
                      }}
                    />
                  </div>

                  <h3>Matched keywords</h3>

                  <div className="chips">
                    {(atsResult.matched_keywords || []).map(
                      keyword => (
                        <span
                          className="chip good"
                          key={keyword}
                        >
                          {keyword}
                        </span>
                      )
                    )}
                  </div>

                  <h3>Missing keywords</h3>

                  <div className="chips">
                    {(atsResult.missing_keywords || []).map(
                      keyword => (
                        <span
                          className="chip missing"
                          key={keyword}
                        >
                          {keyword}
                        </span>
                      )
                    )}
                  </div>

                  <h3>Recommendations</h3>

                  <ul className="recommendations">
                    {(atsResult.recommendations || []).map(
                      (item, index) => (
                        <li key={index}>{item}</li>
                      )
                    )}
                  </ul>

                  <label>
                    Improved resume draft

                    <textarea
                      rows={12}
                      value={atsResult.improved_resume || ""}
                      onChange={e =>
                        setAtsResesult({
                          ...atsResult,
                          improved_resume: e.target.value
                        })
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={exportResume}
                  >
                    Download improved resume (.docx)
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* INTERVIEW HISTORY */}
        {page === "history" && (
          <section className="panel history-panel">
            <span className="eyebrow">YOUR PROGRESS</span>
            <h2>Interview History</h2>

            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◷</div>
                <h3>No interviews yet</h3>
                <p>
                  Complete a mock interview to see your
                  interview history here.
                </p>

                <button
                  className="primary-btn"
                  onClick={() => openPage("interview")}
                >
                  Start an interview
                </button>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item, index) => (
                  <div
                    className="history-row"
                    key={
                      item.session_id ||
                      item.id ||
                      index
                    }
                  >
                    <div>
                      <b>
                        {item.role || "Interview"}
                      </b>

                      <p>
                        {item.candidate || "Candidate"}
                      </p>

                      <span className="tiny">
                        {formatDate(
                          item.created_at ||
                          item.date ||
                          item.timestamp
                        )}
                      </span>
                    </div>

                    <div>
                      <b>
                        {item.overall_score ??
                          item.score ??
                          "—"}
                        {item.overall_score != null ||
                        item.score != null
                          ? "/100"
                          : ""}
                      </b>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="secondary-btn"
              onClick={loadHistory}
            >
              Refresh history
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

