"""StillMind — Full Python 3 Backend (SQLite Persistence, Auth, Guardrails, Gemini AI & Static Serving)."""

from datetime import datetime, timezone
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import urllib.error
import urllib.parse
import urllib.request

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
DB_PATH = Path(os.environ.get("STILLMIND_DB_PATH", str(BASE_DIR / "stillmind.db")))

DEFAULT_MODEL = "gemini-4-hydrogen"
ALLOWED_MODELS = {
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
    "gemini-4-argon",
    "gemini-4-carbon",
}

CRISIS_PATTERNS = [
    # English
    re.compile(r"\bsuicid(e|al)\b", re.I),
    re.compile(r"\bkill\s+myself\b", re.I),
    re.compile(r"\bend\s+(my\s+life|it\s+all)\b", re.I),
    re.compile(r"\bwant\s+to\s+die\b", re.I),
    re.compile(r"\bwanna\s+die\b", re.I),
    re.compile(r"\bdon'?t\s+want\s+to\s+live\b", re.I),
    re.compile(r"\bno\s+reason\s+to\s+live\b", re.I),
    re.compile(r"\bbetter\s+off\s+dead\b", re.I),
    re.compile(r"\bself[-\s]?harm\b", re.I),
    re.compile(r"\bhurt\s+myself\b", re.I),
    re.compile(r"\bcut\s+myself\b", re.I),
    re.compile(r"\bhang\s+myself\b", re.I),
    re.compile(r"\boverdose\b", re.I),
    re.compile(r"\btake\s+my\s+own\s+life\b", re.I),
    # Hindi (Devanagari & Romanized)
    re.compile(r"आत्महत्या"),
    re.compile(r"खुद\s*को\s*मार"),
    re.compile(r"मरना\s*चाहता"),
    re.compile(r"मरना\s*चाहती"),
    re.compile(r"जीना\s*नहीं\s*चाहता"),
    re.compile(r"जीना\s*नहीं\s*चाहती"),
    re.compile(r"जान\s*दे\s*दूंगा"),
    re.compile(r"जान\s*दे\s*दूंगी"),
    re.compile(r"खुद\s*को\s*नुकसान"),
    re.compile(r"\baatmahatya\b", re.I),
    re.compile(r"\bkhud\s+ko\s+mar", re.I),
    re.compile(r"\bmarna\s+chaht[ai]\b", re.I),
    re.compile(r"\bjeena\s+nahi\b", re.I),
    re.compile(r"\bjaan\s+de\s+dung[ai]\b", re.I),
    re.compile(r"\bmar\s+jaun\b", re.I),
    # Marathi (Devanagari & Romanized)
    re.compile(r"स्वतःला\s*मार"),
    re.compile(r"जगायचं\s*नाही"),
    re.compile(r"मरायचं\s*आहे"),
    re.compile(r"जीव\s*द्यावा"),
    re.compile(r"स्वतःला\s*इजा"),
    re.compile(r"\bswatala\s+mar", re.I),
    re.compile(r"\bjagaych[ae]\s+nahi\b", re.I),
    re.compile(r"\bmaraych[ae]\s+aahe\b", re.I),
    re.compile(r"\bjeev\s+dyava\b", re.I),
]

SEED_CONSULTANTS = [
    (
        "c-pune-1",
        "Dr. Aditi Kulkarni",
        "AK",
        "M.Phil Clinical Psychology · RCI Registered",
        "Pune",
        "Shivajinagar, Pune",
        "10 yrs experience",
        "Marathi, Hindi, English",
        "Anxiety · Academic Burnout · CBT & Mindfulness",
        "Available Now",
        1,
    ),
    (
        "c-pune-2",
        "Rohan Deshmukh",
        "RD",
        "M.A. Counseling Psychology",
        "Pune",
        "Kothrud, Pune",
        "7 yrs experience",
        "Marathi, English",
        "Career Transitions · Sleep Hygiene · Stress Management",
        "Next Slot: Today, 5:00 PM",
        0,
    ),
    (
        "c-mumbai-1",
        "Dr. Meera Nair",
        "MN",
        "Ph.D. Counseling Psychology · RCI Registered",
        "Mumbai",
        "Bandra West, Mumbai",
        "12 yrs experience",
        "English, Hindi, Marathi",
        "Relationship Dynamics · Panic & Overwhelm · Trauma-Informed Care",
        "Available Now",
        1,
    ),
    (
        "c-mumbai-2",
        "Siddharth Joshi",
        "SJ",
        "M.Sc. Clinical Psychology",
        "Mumbai",
        "Powai, Mumbai",
        "6 yrs experience",
        "Hindi, English, Marathi",
        "Workplace Stress · Young Adult Counseling · ACT",
        "Next Slot: Today, 6:30 PM",
        0,
    ),
    (
        "c-nagpur-1",
        "Dr. Pallavi Deshpande",
        "PD",
        "M.Phil Clinical Psychology · RCI Registered",
        "Nagpur",
        "Dharampeth, Nagpur",
        "9 yrs experience",
        "Marathi, Hindi, English",
        "Exam Anxiety · Emotional Regulation · Family Support",
        "Available Now",
        1,
    ),
    (
        "c-nagpur-2",
        "Aniket Wankhede",
        "AW",
        "M.A. Applied Psychology",
        "Nagpur",
        "Civil Lines, Nagpur",
        "5 yrs experience",
        "Marathi, Hindi",
        "General Stress · Sleep Difficulties · Behavioral Activation",
        "Next Slot: Tomorrow, 11:00 AM",
        0,
    ),
    (
        "c-nashik-1",
        "Snehal Patil",
        "SP",
        "M.A. Counseling Psychology",
        "Nashik",
        "College Road, Nashik",
        "8 yrs experience",
        "Marathi, Hindi, English",
        "Student Wellbeing · Self-Esteem · Solution-Focused Therapy",
        "Available Now",
        1,
    ),
    (
        "c-nashik-2",
        "Dr. Vikram Gokhale",
        "VG",
        "M.D. Psychiatry · Tele-Consultation",
        "Nashik",
        "Gangapur Road, Nashik",
        "14 yrs experience",
        "Marathi, Hindi, English",
        "Severe Distress · Mood & Sleep Assessment · Clinical Handoff",
        "Next Slot: Today, 7:15 PM",
        0,
    ),
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(6)}"


def load_dotenv(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def hash_password(password: str, salt_hex: str | None = None) -> str:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    if ":" not in stored_hash:
        return False
    salt_hex, _ = stored_hash.split(":", 1)
    candidate = hash_password(password, salt_hex)
    return hmac.compare_digest(candidate, stored_hash)


def resolve_model(requested: object) -> str:
    if isinstance(requested, str) and requested in ALLOWED_MODELS:
        return requested
    return DEFAULT_MODEL


def detect_crisis_keywords(text: str) -> bool:
    if not text:
        return False
    return any(pattern.search(text) for pattern in CRISIS_PATTERNS)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_db()
    try:
        with conn:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    is_guest INTEGER NOT NULL DEFAULT 0,
                    preferred_model TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    mood TEXT NOT NULL,
                    concern TEXT NOT NULL,
                    language TEXT NOT NULL,
                    style TEXT NOT NULL,
                    crisis_locked INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS stress_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    score INTEGER NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS clinical_notes (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    source TEXT NOT NULL,
                    intake_json TEXT NOT NULL,
                    chief_concerns TEXT NOT NULL,
                    emotional_state TEXT NOT NULL,
                    stress_score TEXT NOT NULL,
                    key_triggers_json TEXT NOT NULL,
                    suggested_focus_json TEXT NOT NULL,
                    generated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS consultants (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    initials TEXT NOT NULL,
                    credentials TEXT NOT NULL,
                    city TEXT NOT NULL,
                    area TEXT NOT NULL,
                    experience TEXT NOT NULL,
                    languages TEXT NOT NULL,
                    specializations TEXT NOT NULL,
                    availability TEXT NOT NULL,
                    available_now INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS appointments (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    consultant_id TEXT NOT NULL REFERENCES consultants(id),
                    share_note INTEGER NOT NULL DEFAULT 1,
                    note_id TEXT,
                    status TEXT NOT NULL DEFAULT 'waiting',
                    created_at TEXT NOT NULL
                );
                """
            )

            for c in SEED_CONSULTANTS:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO consultants (
                        id, name, initials, credentials, city, area,
                        experience, languages, specializations, availability, available_now
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    c,
                )
    finally:
        conn.close()


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def get_api_key() -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ApiError(
            status=503,
            code="API_KEY_MISSING",
            message="Server Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.",
        )
    return api_key


def map_http_error(status: int, raw_body: str) -> ApiError:
    message = f"HTTP {status}"
    try:
        parsed = json.loads(raw_body)
        message = parsed.get("error", {}).get("message") or message
    except Exception:
        if raw_body:
            message = raw_body[:300]

    if status in (400, 403) or "API_KEY_INVALID" in message or "PERMISSION_DENIED" in message:
        return ApiError(
            status=400 if status == 400 else 403,
            code="INVALID_KEY",
            message="Gemini API access was denied or the server key is invalid. Please check your key in Settings > Secrets.",
        )
    if status == 429 or "RESOURCE_EXHAUSTED" in message:
        return ApiError(
            status=429,
            code="RATE_LIMIT",
            message="Gemini API quota limit reached. Please wait briefly or select a billing-enabled key in Settings > Secrets.",
        )
    if status == 404 or "NOT_FOUND" in message:
        return ApiError(
            status=404,
            code="MODEL_NOT_FOUND",
            message=f"Requested model is unavailable ({message}).",
        )
    return ApiError(status=status if 400 <= status < 600 else 500, code="UPSTREAM_ERROR", message=message)


def build_gemini_payload(
    contents: list | str,
    system_instruction: str | None = None,
    response_mime_type: str | None = None,
    model: str = DEFAULT_MODEL,
) -> dict:
    formatted_contents = (
        [{"role": "user", "parts": [{"text": contents}]}] if isinstance(contents, str) else contents
    )
    payload: dict = {"contents": formatted_contents}
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    gen_config: dict = {}
    if response_mime_type:
        gen_config["responseMimeType"] = response_mime_type
    if model.startswith("gemini-4-"):
        gen_config["thinkingConfig"] = {"thinkingLevel": "LOW"}
    if gen_config:
        payload["generationConfig"] = gen_config
    return payload


def call_gemini_generate(
    model: str,
    contents: list | str,
    system_instruction: str | None = None,
    response_mime_type: str | None = None,
) -> str:
    api_key = get_api_key()
    resolved = resolve_model(model)
    safe_model = urllib.parse.quote(resolved, safe="")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{safe_model}:generateContent"
    body_bytes = json.dumps(
        build_gemini_payload(contents, system_instruction, response_mime_type, resolved)
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body_bytes,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
            "User-Agent": "aistudio-build",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw_err = exc.read().decode("utf-8", errors="replace")
        raise map_http_error(exc.code, raw_err) from exc
    except urllib.error.URLError as exc:
        raise ApiError(502, "NETWORK_ERROR", f"Unable to reach Gemini API: {exc.reason}") from exc

    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise ApiError(502, "EMPTY_RESPONSE", "Gemini returned an empty response.")
    return text


def get_localized_welcome_message(mood: str, concern: str, language: str, style: str) -> str:
    is_practical = style == "Practical Coping Exercises"

    if language == "Hindi":
        if is_practical:
            return (
                f"नमस्ते। StillMind में आपका स्वागत है। आपने बताया कि आप अभी **{mood}** महसूस कर रहे हैं और **{concern}** को लेकर चिंतित हैं।\n\n"
                "हम छोटे, व्यावहारिक कदमों से शुरुआत कर सकते हैं। क्या आप बताना चाहेंगे कि इस समय सबसे ज़्यादा दबाव किस बात से महसूस हो रहा है?"
            )
        return (
            f"नमस्ते। मैं आपकी बात बिना किसी जजमेंट के सुनने के लिए यहाँ हूँ। **{concern}** के कारण **{mood}** महसूस करना पूरी तरह स्वाभाविक है।\n\n"
            "जब भी आप सहज हों, जो मन में चल रहा है वह साझा करें।"
        )

    if language == "Marathi":
        if is_practical:
            return (
                f"नमस्कार. StillMind मध्ये तुमचे स्वागत आहे. तुम्ही सध्या **{mood}** वाटत असल्याचे आणि **{concern}** बद्दल विचार करत असल्याचे नमूद केले आहे.\n\n"
                "आपण सोप्या आणि व्यावहारिक उपायांपासून सुरुवात करू शकतो. सध्या नेमका कशाचा जास्त ताण येत आहे ते सांगाल का?"
            )
        return (
            f"नमस्कार. मी तुमचे म्हणणे शांतपणे आणि कोणताही न्याय न करता ऐकण्यासाठी येथे आहे. **{concern}** मुळे **{mood}** वाटणे समजण्यासारखे आहे.\n\n"
            "तुम्हाला जे वाटते आहे ते मोकळेपणाने शेअर करा."
        )

    if is_practical:
        return (
            f"Welcome to StillMind. Thank you for sharing that you're feeling **{mood.lower()}** around **{concern.lower()}**.\n\n"
            "Since you prefer practical coping exercises, we can break things down into manageable steps together. What feels like the heaviest part right now?"
        )
    return (
        f"Welcome to StillMind. I'm glad you're taking a quiet moment for yourself. Feeling **{mood.lower()}** when navigating **{concern.lower()}** is completely understandable.\n\n"
        "Take your time—what's been weighing on your mind today?"
    )


def build_chat_system_instruction(chat_row: sqlite3.Row, latest_stress: int | None) -> str:
    stress_line = (
        f"Latest logged stress level: {latest_stress}/10."
        if latest_stress is not None
        else "No stress check-in logged yet."
    )
    style_guidance = (
        "Prioritize grounded, step-by-step coping techniques (such as box breathing, cognitive reframing, or 5-4-3-2-1 sensory grounding) tailored to their concern."
        if chat_row["style"] == "Practical Coping Exercises"
        else "Prioritize empathetic validation, reflective listening, gentle open-ended questions, and emotional warmth."
    )
    return "\n".join(
        [
            "You are StillMind, a calm, culturally sensitive mental health support and pre-consultation companion.",
            "Your role is supportive reflection and preparation for human counseling—never diagnose medical conditions or prescribe medication.",
            "User Check-In Profile:",
            f"- Current Mood: {chat_row['mood']}",
            f"- Primary Concern: {chat_row['concern']}",
            f"- Preferred Language: {chat_row['language']} (You MUST reply naturally and warmly in {chat_row['language']}. If Hindi, use clear Hindi Devanagari or gentle conversational Hindi; if Marathi, use natural Marathi Devanagari.)",
            f"- Support Style: {chat_row['style']}",
            f"- {stress_line}",
            style_guidance,
            "Keep responses concise (2–4 short paragraphs or bullet points), clear, and soothing.",
        ]
    )


def stress_descriptor(score: int) -> str:
    if score <= 3:
        return "Calm / Low Stress"
    if score <= 6:
        return "Moderate Tension"
    if score <= 8:
        return "Elevated Stress"
    return "High Distress"


def build_fallback_note_payload(
    intake: dict,
    user_messages: list[str],
    stress_rows: list[sqlite3.Row],
    crisis_locked: bool,
) -> dict:
    mood = intake.get("mood", "Anxious")
    concern = intake.get("concern", "General Stress")
    language = intake.get("language", "English")
    style = intake.get("style", "Empathetic Listener")

    if user_messages:
        first = user_messages[0]
        snippet = first[:180] + ("..." if len(first) > 180 else "")
        chief_concerns = f'Primary area reported as {concern}. User shared: "{snippet}"'
    else:
        chief_concerns = f"Primary area selected during pre-screening: {concern}. No detailed conversation messages recorded yet."

    if crisis_locked:
        emotional_state = f"{mood} with flagged high-distress / crisis phrasing during session. Immediate safety helpline resources were presented."
    else:
        emotional_state = f"Self-reported current mood is {mood} (preferred communication in {language})."

    if stress_rows:
        latest = int(stress_rows[0]["score"])
        avg = sum(int(r["score"]) for r in stress_rows) / len(stress_rows)
        stress_score = (
            f"Latest check-in: {latest}/10 ({stress_descriptor(latest)}). "
            f"Session average across {len(stress_rows)} log(s): {avg:.1f}/10."
        )
    else:
        stress_score = "No numeric stress check-ins logged yet (recommend collecting baseline 1–10 rating at session start)."

    combined = " ".join(user_messages).lower()
    triggers = []
    if re.search(r"exam|study|college|grade|academic|assignment", combined) or concern == "Academics":
        triggers.append("Academic workload, deadlines, or performance expectations")
    if re.search(r"job|work|boss|career|interview|office", combined) or concern == "Career":
        triggers.append("Career direction or workplace pressure")
    if re.search(r"family|partner|friend|relationship|alone|fight", combined) or concern == "Relationships":
        triggers.append("Interpersonal communication or relationship strain")
    if re.search(r"sleep|insomnia|tired|night|wake", combined) or concern == "Sleep":
        triggers.append("Disrupted sleep schedule or nighttime restlessness")
    if not triggers:
        triggers.append(f"Ongoing {concern.lower()} pressures impacting daily calm")

    focus_areas = [
        (
            "Introduce structured grounding and actionable coping routines"
            if style == "Practical Coping Exercises"
            else "Provide supportive reflective listening and emotional validation"
        ),
        f"Explore coping strategies tailored to {concern.lower()}",
        f"Conduct consultation in {language} to support comfort and clarity",
    ]
    if crisis_locked or (stress_rows and int(stress_rows[0]["score"]) >= 8):
        focus_areas.insert(0, "Prioritize immediate safety assessment and stabilization plan")

    return {
        "source": "Offline Structured Summary (Python Local Fallback)",
        "chiefConcerns": chief_concerns,
        "emotionalState": emotional_state,
        "stressScore": stress_score,
        "keyTriggers": triggers,
        "suggestedFocusAreas": focus_areas,
    }


def serialize_user(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "email": row["email"] or "Anonymous Guest",
        "isGuest": bool(row["is_guest"]),
        "preferredModel": row["preferred_model"],
    }


def serialize_chat(conn: sqlite3.Connection, chat_row: sqlite3.Row) -> dict:
    msg_rows = conn.execute(
        "SELECT id, role, text, timestamp FROM messages WHERE chat_id = ? ORDER BY rowid ASC",
        (chat_row["id"],),
    ).fetchall()
    return {
        "id": chat_row["id"],
        "title": chat_row["title"],
        "intake": {
            "mood": chat_row["mood"],
            "concern": chat_row["concern"],
            "language": chat_row["language"],
            "style": chat_row["style"],
        },
        "crisisLocked": bool(chat_row["crisis_locked"]),
        "createdAt": chat_row["created_at"],
        "updatedAt": chat_row["updated_at"],
        "messages": [
            {
                "id": m["id"],
                "role": m["role"],
                "text": m["text"],
                "timestamp": m["timestamp"],
            }
            for m in msg_rows
        ],
    }


def serialize_note(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "chatId": row["chat_id"],
        "source": row["source"],
        "intake": json.loads(row["intake_json"]),
        "chiefConcerns": row["chief_concerns"],
        "emotionalState": row["emotional_state"],
        "stressScore": row["stress_score"],
        "keyTriggers": json.loads(row["key_triggers_json"]),
        "suggestedFocusAreas": json.loads(row["suggested_focus_json"]),
        "generatedAt": row["generated_at"],
    }


def format_note_plain_text(note: dict) -> str:
    intake = note["intake"]
    lines = [
        "STILLMIND — PRE-CONSULTATION SUMMARY NOTE",
        f"Generated: {note['generatedAt']}",
        f"Source: {note['source']}",
        f"Preferred Language: {intake.get('language', 'English')} | Support Style: {intake.get('style', '')}",
        "------------------------------------------------------------",
        "",
        "1. CHIEF CONCERNS",
        note["chiefConcerns"],
        "",
        "2. EMOTIONAL STATE",
        note["emotionalState"],
        "",
        "3. STRESS SCORE",
        note["stressScore"],
        "",
        "4. KEY TRIGGERS",
        *[f"- {t}" for t in note["keyTriggers"]],
        "",
        "5. SUGGESTED FOCUS AREAS",
        *[f"- {f}" for f in note["suggestedFocusAreas"]],
        "",
        "------------------------------------------------------------",
        "Disclaimer: Prepared for counselor pre-consultation review. Not a medical diagnosis.",
    ]
    return "\n".join(lines)


class StillMindHandler(BaseHTTPRequestHandler):
    server_version = "StillMindPython/2.0"

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_json(self, status: int, payload: dict) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def send_text_download(self, filename: str, text: str) -> None:
        encoded = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def read_json_body(self, allow_empty: bool = False) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length == 0 and allow_empty:
            return {}
        if length <= 0 or length > 2_000_000:
            raise ApiError(400, "BAD_REQUEST", "Invalid request body size.")
        raw = self.rfile.read(length).decode("utf-8", errors="replace")
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ApiError(400, "BAD_REQUEST", "Malformed JSON body.") from exc
        if not isinstance(data, dict):
            raise ApiError(400, "BAD_REQUEST", "JSON object expected.")
        return data

    def get_bearer_token(self) -> str | None:
        auth = self.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
            return token or None
        return None

    def require_user(self, conn: sqlite3.Connection) -> sqlite3.Row:
        token = self.get_bearer_token()
        if not token:
            raise ApiError(401, "UNAUTHORIZED", "Authentication required.")
        row = conn.execute(
            """
            SELECT u.* FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            raise ApiError(401, "UNAUTHORIZED", "Invalid or expired session.")
        return row

    def resolve_static_root(self) -> Path:
        if os.environ.get("NODE_ENV") == "production" and DIST_DIR.exists():
            return DIST_DIR
        return BASE_DIR

    def serve_static(self, req_path: str) -> None:
        clean_path = req_path.split("?", 1)[0].lstrip("/") or "index.html"
        static_root = self.resolve_static_root()
        target = (static_root / clean_path).resolve()

        if static_root not in target.parents and target != static_root:
            self.send_json(403, {"error": "Forbidden"})
            return

        if not target.is_file():
            target = static_root / "index.html"
            if not target.is_file():
                self.send_json(404, {"error": "Not found"})
                return

        mime_type, _ = mimetypes.guess_type(str(target))
        if not mime_type:
            mime_type = "application/octet-stream"
        content_type = (
            f"{mime_type}; charset=utf-8"
            if mime_type.startswith("text/") or mime_type in ("application/javascript", "application/json")
            else mime_type
        )
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    # =========================================================================
    # HTTP Method Dispatch
    # =========================================================================
    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/health":
            self.send_json(200, {"ok": True, "runtime": "python", "database": "sqlite3"})
            return

        if not path.startswith("/api/"):
            self.serve_static(path)
            return

        conn = get_db()
        try:
            if path == "/api/consultants":
                self.handle_list_consultants(conn, query)
                return

            user = self.require_user(conn)

            if path == "/api/auth/me":
                self.send_json(200, {"user": serialize_user(user)})
            elif path == "/api/chats":
                rows = conn.execute(
                    "SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC",
                    (user["id"],),
                ).fetchall()
                self.send_json(200, {"chats": [serialize_chat(conn, r) for r in rows]})
            elif path == "/api/stress":
                self.handle_get_stress(conn, user["id"])
            elif path == "/api/notes/latest":
                chat_id = query.get("chatId", [None])[0]
                self.handle_get_latest_note(conn, user["id"], chat_id)
            elif match := re.fullmatch(r"/api/notes/([^/]+)/export", path):
                self.handle_export_note(conn, user["id"], match.group(1))
            else:
                self.send_json(404, {"error": "API route not found"})
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
        except Exception as exc:
            self.send_json(500, {"error": str(exc), "code": "SERVER_ERROR"})
        finally:
            conn.close()

    def do_POST(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        conn = get_db()
        try:
            if path == "/api/auth/login":
                self.handle_auth_login(conn)
            elif path == "/api/auth/guest":
                self.handle_auth_guest(conn)
            elif path == "/api/auth/logout":
                self.handle_auth_logout(conn)
            elif path == "/api/gemini/chat":
                self.handle_direct_gemini_chat()
            elif path == "/api/gemini/note":
                self.handle_direct_gemini_note()
            else:
                user = self.require_user(conn)
                if path == "/api/chats":
                    self.handle_create_chat(conn, user)
                elif match := re.fullmatch(r"/api/chats/([^/]+)/messages/stream", path):
                    self.handle_chat_message_stream(conn, user, match.group(1))
                elif path == "/api/stress":
                    self.handle_log_stress(conn, user)
                elif path == "/api/notes/generate":
                    self.handle_generate_note(conn, user)
                elif path == "/api/appointments":
                    self.handle_create_appointment(conn, user)
                else:
                    self.send_json(404, {"error": "API route not found"})
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
        except Exception as exc:
            self.send_json(500, {"error": str(exc), "code": "SERVER_ERROR"})
        finally:
            conn.close()

    def do_PATCH(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        conn = get_db()
        try:
            user = self.require_user(conn)
            if path == "/api/auth/preferences":
                self.handle_update_preferences(conn, user)
            elif match := re.fullmatch(r"/api/chats/([^/]+)", path):
                self.handle_update_chat(conn, user, match.group(1))
            elif match := re.fullmatch(r"/api/appointments/([^/]+)", path):
                self.handle_update_appointment(conn, user, match.group(1))
            else:
                self.send_json(404, {"error": "API route not found"})
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
        except Exception as exc:
            self.send_json(500, {"error": str(exc), "code": "SERVER_ERROR"})
        finally:
            conn.close()

    def do_DELETE(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        conn = get_db()
        try:
            user = self.require_user(conn)
            if match := re.fullmatch(r"/api/chats/([^/]+)", path):
                chat_id = match.group(1)
                with conn:
                    res = conn.execute(
                        "DELETE FROM chats WHERE id = ? AND user_id = ?",
                        (chat_id, user["id"]),
                    )
                if res.rowcount == 0:
                    raise ApiError(404, "NOT_FOUND", "Conversation not found.")
                self.send_json(200, {"deleted": True})
            else:
                self.send_json(404, {"error": "API route not found"})
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
        except Exception as exc:
            self.send_json(500, {"error": str(exc), "code": "SERVER_ERROR"})
        finally:
            conn.close()

    # =========================================================================
    # Route Handlers
    # =========================================================================
    def handle_auth_login(self, conn: sqlite3.Connection) -> None:
        body = self.read_json_body()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        model = resolve_model(body.get("model"))

        if not email or "@" not in email:
            raise ApiError(400, "VALIDATION_ERROR", "Please enter a valid pseudonymous email address.")
        if len(password) < 4:
            raise ApiError(400, "VALIDATION_ERROR", "Password must be at least 4 characters.")

        now = utc_now_iso()
        existing = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

        with conn:
            if existing:
                if not existing["password_hash"] or not verify_password(password, existing["password_hash"]):
                    raise ApiError(401, "INVALID_CREDENTIALS", "Incorrect password for this account.")
                user_id = existing["id"]
                created = False
            else:
                user_id = gen_id("usr")
                conn.execute(
                    """
                    INSERT INTO users (id, email, password_hash, is_guest, preferred_model, created_at)
                    VALUES (?, ?, ?, 0, ?, ?)
                    """,
                    (user_id, email, hash_password(password), model, now),
                )
                created = True

            token = secrets.token_urlsafe(32)
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
                (token, user_id, now),
            )

        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        self.send_json(200, {"token": token, "user": serialize_user(user_row), "created": created})

    def handle_auth_guest(self, conn: sqlite3.Connection) -> None:
        body = self.read_json_body(allow_empty=True)
        requested_guest_id = body.get("guestId")
        model = resolve_model(body.get("model"))
        now = utc_now_iso()

        existing = None
        if isinstance(requested_guest_id, str) and requested_guest_id.strip():
            existing = conn.execute(
                "SELECT * FROM users WHERE id = ? AND is_guest = 1",
                (requested_guest_id.strip(),),
            ).fetchone()

        with conn:
            if existing:
                user_id = existing["id"]
            else:
                user_id = gen_id("guest")
                conn.execute(
                    """
                    INSERT INTO users (id, email, password_hash, is_guest, preferred_model, created_at)
                    VALUES (?, NULL, NULL, 1, ?, ?)
                    """,
                    (user_id, model, now),
                )
            token = secrets.token_urlsafe(32)
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
                (token, user_id, now),
            )

        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        self.send_json(200, {"token": token, "user": serialize_user(user_row)})

    def handle_auth_logout(self, conn: sqlite3.Connection) -> None:
        token = self.get_bearer_token()
        if token:
            with conn:
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        self.send_json(200, {"ok": True})

    def handle_update_preferences(self, conn: sqlite3.Connection, user: sqlite3.Row) -> None:
        body = self.read_json_body()
        model = resolve_model(body.get("model"))
        with conn:
            conn.execute("UPDATE users SET preferred_model = ? WHERE id = ?", (model, user["id"]))
        updated = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        self.send_json(200, {"user": serialize_user(updated)})

    def handle_create_chat(self, conn: sqlite3.Connection, user: sqlite3.Row) -> None:
        body = self.read_json_body()
        mood = str(body.get("mood") or "Anxious")
        concern = str(body.get("concern") or "General Stress")
        language = str(body.get("language") or "English")
        style = str(body.get("style") or "Empathetic Listener")

        chat_id = gen_id("chat")
        msg_id = gen_id("msg")
        now = utc_now_iso()
        welcome = get_localized_welcome_message(mood, concern, language, style)

        with conn:
            conn.execute(
                """
                INSERT INTO chats (id, user_id, title, mood, concern, language, style, crisis_locked, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """,
                (chat_id, user["id"], f"{concern} Check-In", mood, concern, language, style, now, now),
            )
            conn.execute(
                "INSERT INTO messages (id, chat_id, role, text, timestamp) VALUES (?, ?, 'assistant', ?, ?)",
                (msg_id, chat_id, welcome, now),
            )

        chat_row = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
        self.send_json(201, {"chat": serialize_chat(conn, chat_row)})

    def handle_update_chat(self, conn: sqlite3.Connection, user: sqlite3.Row, chat_id: str) -> None:
        chat_row = conn.execute(
            "SELECT * FROM chats WHERE id = ? AND user_id = ?", (chat_id, user["id"])
        ).fetchone()
        if not chat_row:
            raise ApiError(404, "NOT_FOUND", "Conversation not found.")

        body = self.read_json_body()
        mood = str(body.get("mood") or chat_row["mood"])
        concern = str(body.get("concern") or chat_row["concern"])
        language = str(body.get("language") or chat_row["language"])
        style = str(body.get("style") or chat_row["style"])
        crisis_locked = (
            int(bool(body["crisisLocked"])) if "crisisLocked" in body else chat_row["crisis_locked"]
        )
        now = utc_now_iso()

        with conn:
            conn.execute(
                """
                UPDATE chats
                SET mood = ?, concern = ?, language = ?, style = ?, crisis_locked = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (mood, concern, language, style, crisis_locked, now, chat_id, user["id"]),
            )

        updated = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
        self.send_json(200, {"chat": serialize_chat(conn, updated)})

    def handle_chat_message_stream(
        self, conn: sqlite3.Connection, user: sqlite3.Row, chat_id: str
    ) -> None:
        chat_row = conn.execute(
            "SELECT * FROM chats WHERE id = ? AND user_id = ?", (chat_id, user["id"])
        ).fetchone()
        if not chat_row:
            raise ApiError(404, "NOT_FOUND", "Conversation not found.")
        if chat_row["crisis_locked"]:
            raise ApiError(409, "CRISIS_LOCKED", "Chat is paused for safety.")

        body = self.read_json_body()
        user_text = str(body.get("text", "")).strip()
        if not user_text:
            raise ApiError(400, "BAD_REQUEST", "Message text cannot be empty.")

        model = resolve_model(body.get("model") or user["preferred_model"])
        now = utc_now_iso()
        user_msg_id = gen_id("msg")

        existing_user_msgs = conn.execute(
            "SELECT COUNT(*) AS cnt FROM messages WHERE chat_id = ? AND role = 'user'",
            (chat_id,),
        ).fetchone()["cnt"]

        new_title = chat_row["title"]
        if existing_user_msgs == 0:
            new_title = f"{user_text[:38].strip()}..." if len(user_text) > 38 else user_text

        with conn:
            conn.execute(
                "INSERT INTO messages (id, chat_id, role, text, timestamp) VALUES (?, ?, 'user', ?, ?)",
                (user_msg_id, chat_id, user_text, now),
            )
            conn.execute(
                "UPDATE chats SET title = ?, updated_at = ? WHERE id = ?",
                (new_title, now, chat_id),
            )

        user_msg_obj = {"id": user_msg_id, "role": "user", "text": user_text, "timestamp": now}

        # Authoritative Server-Side Crisis Detection Guardrail BEFORE calling Gemini
        if detect_crisis_keywords(user_text):
            crisis_text = (
                "I hear how much pain you are carrying right now. Because your safety matters most, "
                "I have paused AI chat so you can connect directly with trained crisis support "
                "(**Tele-MANAS: 14416 / 1800-891-4416** or **Vandrevala Foundation: +91 9999 666 555**) "
                "or a Maharashtra counselor."
            )
            assistant_id = gen_id("msg")
            crisis_ts = utc_now_iso()
            with conn:
                conn.execute(
                    "UPDATE chats SET crisis_locked = 1, updated_at = ? WHERE id = ?",
                    (crisis_ts, chat_id),
                )
                conn.execute(
                    "INSERT INTO messages (id, chat_id, role, text, timestamp) VALUES (?, ?, 'assistant', ?, ?)",
                    (assistant_id, chat_id, crisis_text, crisis_ts),
                )

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.end_headers()
            event_payload = {
                "crisisLocked": True,
                "chatTitle": new_title,
                "userMessage": user_msg_obj,
                "assistantMessage": {
                    "id": assistant_id,
                    "role": "assistant",
                    "text": crisis_text,
                    "timestamp": crisis_ts,
                },
            }
            self.wfile.write(f"data: {json.dumps(event_payload)}\n\n".encode("utf-8"))
            self.wfile.flush()
            return

        # Build conversation history & system instruction on server
        history_rows = conn.execute(
            "SELECT role, text FROM messages WHERE chat_id = ? AND role IN ('user', 'assistant') ORDER BY rowid ASC",
            (chat_id,),
        ).fetchall()
        latest_stress_row = conn.execute(
            "SELECT score FROM stress_logs WHERE user_id = ? ORDER BY rowid DESC LIMIT 1",
            (user["id"],),
        ).fetchone()
        latest_stress = int(latest_stress_row["score"]) if latest_stress_row else None

        system_instruction = build_chat_system_instruction(chat_row, latest_stress)
        contents = [
            {
                "role": "user" if r["role"] == "user" else "model",
                "parts": [{"text": r["text"]}],
            }
            for r in history_rows
        ]

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-transform")
        self.end_headers()

        def write_sse(payload: dict) -> None:
            self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode("utf-8"))
            self.wfile.flush()

        write_sse({"meta": True, "chatTitle": new_title, "userMessage": user_msg_obj})

        try:
            api_key = get_api_key()
            safe_model = urllib.parse.quote(model, safe="")
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{safe_model}:streamGenerateContent?alt=sse"
            )
            req_bytes = json.dumps(
                build_gemini_payload(contents, system_instruction, None, model)
            ).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_bytes,
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                    "User-Agent": "aistudio-build",
                },
            )

            full_chunks: list[str] = []
            with urllib.request.urlopen(req, timeout=90) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line.startswith("data:"):
                        continue
                    json_str = line[5:].strip()
                    if not json_str or json_str == "[DONE]":
                        continue
                    try:
                        chunk_data = json.loads(json_str)
                    except json.JSONDecodeError:
                        continue
                    parts = chunk_data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    chunk_text = "".join(p.get("text", "") for p in parts)
                    if chunk_text:
                        full_chunks.append(chunk_text)
                        write_sse({"chunk": chunk_text})

            full_reply = "".join(full_chunks).strip()
            if not full_reply:
                raise ApiError(502, "EMPTY_RESPONSE", "Gemini returned an empty response.")

            assistant_id = gen_id("msg")
            reply_ts = utc_now_iso()
            with conn:
                conn.execute(
                    "INSERT INTO messages (id, chat_id, role, text, timestamp) VALUES (?, ?, 'assistant', ?, ?)",
                    (assistant_id, chat_id, full_reply, reply_ts),
                )
                conn.execute("UPDATE chats SET updated_at = ? WHERE id = ?", (reply_ts, chat_id))

            write_sse(
                {
                    "done": True,
                    "chatTitle": new_title,
                    "assistantMessage": {
                        "id": assistant_id,
                        "role": "assistant",
                        "text": full_reply,
                        "timestamp": reply_ts,
                    },
                }
            )
        except ApiError as err:
            err_id = gen_id("msg")
            err_ts = utc_now_iso()
            with conn:
                conn.execute(
                    "INSERT INTO messages (id, chat_id, role, text, timestamp) VALUES (?, ?, 'system-error', ?, ?)",
                    (err_id, chat_id, err.message, err_ts),
                )
            write_sse({"error": err.message, "code": err.code, "errorId": err_id, "timestamp": err_ts})
        except urllib.error.HTTPError as exc:
            raw_err = exc.read().decode("utf-8", errors="replace")
            mapped = map_http_error(exc.code, raw_err)
            err_id = gen_id("msg")
            err_ts = utc_now_iso()
            with conn:
                conn.execute(
                    "INSERT INTO messages (id, chat_id, role, text, timestamp) VALUES (?, ?, 'system-error', ?, ?)",
                    (err_id, chat_id, mapped.message, err_ts),
                )
            write_sse({"error": mapped.message, "code": mapped.code, "errorId": err_id, "timestamp": err_ts})
        except urllib.error.URLError as exc:
            msg = f"Unable to reach Gemini API: {exc.reason}"
            write_sse({"error": msg, "code": "NETWORK_ERROR"})
        except Exception as exc:
            write_sse({"error": str(exc), "code": "UPSTREAM_ERROR"})

    def handle_get_stress(self, conn: sqlite3.Connection, user_id: str) -> None:
        rows = conn.execute(
            "SELECT id, score, timestamp FROM stress_logs WHERE user_id = ? ORDER BY rowid DESC LIMIT 30",
            (user_id,),
        ).fetchall()
        logs = [{"id": r["id"], "score": int(r["score"]), "timestamp": r["timestamp"]} for r in rows]
        avg = round(sum(item["score"] for item in logs) / len(logs), 1) if logs else None
        self.send_json(200, {"logs": logs, "average": avg})

    def handle_log_stress(self, conn: sqlite3.Connection, user: sqlite3.Row) -> None:
        body = self.read_json_body()
        try:
            score = int(body.get("score"))
        except (TypeError, ValueError) as exc:
            raise ApiError(400, "BAD_REQUEST", "Stress score must be an integer between 1 and 10.") from exc
        if score < 1 or score > 10:
            raise ApiError(400, "BAD_REQUEST", "Stress score must be between 1 and 10.")

        entry_id = gen_id("stress")
        now = utc_now_iso()
        with conn:
            conn.execute(
                "INSERT INTO stress_logs (id, user_id, score, timestamp) VALUES (?, ?, ?, ?)",
                (entry_id, user["id"], score, now),
            )
        self.handle_get_stress(conn, user["id"])

    def handle_get_latest_note(
        self, conn: sqlite3.Connection, user_id: str, chat_id: str | None
    ) -> None:
        if chat_id:
            row = conn.execute(
                "SELECT * FROM clinical_notes WHERE user_id = ? AND chat_id = ? ORDER BY rowid DESC LIMIT 1",
                (user_id, chat_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM clinical_notes WHERE user_id = ? ORDER BY rowid DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        self.send_json(200, {"note": serialize_note(row) if row else None})

    def handle_generate_note(self, conn: sqlite3.Connection, user: sqlite3.Row) -> None:
        body = self.read_json_body(allow_empty=True)
        chat_id = body.get("chatId")
        model = resolve_model(body.get("model") or user["preferred_model"])

        chat_row = None
        if isinstance(chat_id, str) and chat_id.strip():
            chat_row = conn.execute(
                "SELECT * FROM chats WHERE id = ? AND user_id = ?",
                (chat_id.strip(), user["id"]),
            ).fetchone()

        stress_rows = conn.execute(
            "SELECT score, timestamp FROM stress_logs WHERE user_id = ? ORDER BY rowid DESC LIMIT 30",
            (user["id"],),
        ).fetchall()

        if chat_row:
            intake = {
                "mood": chat_row["mood"],
                "concern": chat_row["concern"],
                "language": chat_row["language"],
                "style": chat_row["style"],
            }
            msg_rows = conn.execute(
                "SELECT role, text FROM messages WHERE chat_id = ? AND role IN ('user', 'assistant') ORDER BY rowid ASC",
                (chat_row["id"],),
            ).fetchall()
            user_messages = [m["text"] for m in msg_rows if m["role"] == "user"]
            crisis_locked = bool(chat_row["crisis_locked"])
        else:
            intake = {
                "mood": str(body.get("mood") or "Anxious"),
                "concern": str(body.get("concern") or "General Stress"),
                "language": str(body.get("language") or "English"),
                "style": str(body.get("style") or "Empathetic Listener"),
            }
            msg_rows = []
            user_messages = []
            crisis_locked = False

        note_payload = None
        if chat_row and len(user_messages) > 0:
            try:
                latest_stress_str = f"{stress_rows[0]['score']}/10" if stress_rows else "Not logged"
                transcript = "\n".join(
                    f"{'Client' if m['role'] == 'user' else 'Assistant'}: {m['text']}"
                    for m in msg_rows
                )
                prompt = "\n\n".join(
                    [
                        "Generate a concise, objective Pre-Consultation Clinical Summary Note in valid JSON based on this check-in and transcript.",
                        f"Profile: Mood={intake['mood']}, Concern={intake['concern']}, Language={intake['language']}, Preferred Style={intake['style']}, Latest Stress={latest_stress_str}, Crisis Flag={crisis_locked}",
                        "Transcript:",
                        transcript,
                        'Return strictly JSON with keys: "chiefConcerns" (string), "emotionalState" (string), "stressScore" (string), "keyTriggers" (array of 2-4 concise strings), "suggestedFocusAreas" (array of 2-4 concise strings). Always write the clinical note in clear professional English.',
                    ]
                )
                raw_json = call_gemini_generate(
                    model=model,
                    contents=prompt,
                    system_instruction=(
                        "You are a clinical documentation assistant creating structured, "
                        "non-diagnostic pre-consultation briefs for counselors."
                    ),
                    response_mime_type="application/json",
                )
                cleaned = re.sub(r"^```json\s*|\s*```$", "", raw_json.strip())
                parsed = json.loads(cleaned)
                note_payload = {
                    "source": f"Gemini AI ({model} via Python)",
                    "chiefConcerns": parsed.get("chiefConcerns") or "See conversation summary.",
                    "emotionalState": parsed.get("emotionalState") or intake["mood"],
                    "stressScore": parsed.get("stressScore") or latest_stress_str,
                    "keyTriggers": parsed.get("keyTriggers")
                    if isinstance(parsed.get("keyTriggers"), list)
                    else [],
                    "suggestedFocusAreas": parsed.get("suggestedFocusAreas")
                    if isinstance(parsed.get("suggestedFocusAreas"), list)
                    else [],
                }
            except Exception:
                note_payload = None

        if note_payload is None:
            note_payload = build_fallback_note_payload(intake, user_messages, stress_rows, crisis_locked)

        note_id = gen_id("note")
        now = utc_now_iso()
        with conn:
            conn.execute(
                """
                INSERT INTO clinical_notes (
                    id, chat_id, user_id, source, intake_json, chief_concerns,
                    emotional_state, stress_score, key_triggers_json, suggested_focus_json, generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    note_id,
                    chat_row["id"] if chat_row else None,
                    user["id"],
                    note_payload["source"],
                    json.dumps(intake),
                    note_payload["chiefConcerns"],
                    note_payload["emotionalState"],
                    note_payload["stressScore"],
                    json.dumps(note_payload["keyTriggers"]),
                    json.dumps(note_payload["suggestedFocusAreas"]),
                    now,
                ),
            )

        saved_row = conn.execute("SELECT * FROM clinical_notes WHERE id = ?", (note_id,)).fetchone()
        self.send_json(201, {"note": serialize_note(saved_row)})

    def handle_export_note(self, conn: sqlite3.Connection, user_id: str, note_id: str) -> None:
        row = conn.execute(
            "SELECT * FROM clinical_notes WHERE id = ? AND user_id = ?",
            (note_id, user_id),
        ).fetchone()
        if not row:
            raise ApiError(404, "NOT_FOUND", "Clinical note not found.")
        note = serialize_note(row)
        date_part = note["generatedAt"][:10]
        self.send_text_download(
            f"StillMind_PreConsultation_Note_{date_part}.txt",
            format_note_plain_text(note),
        )

    def handle_list_consultants(self, conn: sqlite3.Connection, query: dict) -> None:
        city = query.get("city", ["All"])[0]
        availability = query.get("availability", ["All"])[0]

        sql = "SELECT * FROM consultants WHERE 1=1"
        params: list[object] = []
        if city and city != "All":
            sql += " AND city = ?"
            params.append(city)
        if availability == "Available Now":
            sql += " AND available_now = 1"
        elif availability == "Today":
            sql += " AND (available_now = 1 OR availability LIKE '%Today%')"

        sql += " ORDER BY available_now DESC, city ASC, name ASC"
        rows = conn.execute(sql, params).fetchall()
        consultants = [
            {
                "id": r["id"],
                "name": r["name"],
                "initials": r["initials"],
                "credentials": r["credentials"],
                "city": r["city"],
                "area": r["area"],
                "experience": r["experience"],
                "languages": r["languages"],
                "specializations": r["specializations"],
                "availability": r["availability"],
                "availableNow": bool(r["available_now"]),
            }
            for r in rows
        ]
        self.send_json(200, {"consultants": consultants})

    def handle_create_appointment(self, conn: sqlite3.Connection, user: sqlite3.Row) -> None:
        body = self.read_json_body()
        consultant_id = str(body.get("consultantId", "")).strip()
        consultant = conn.execute(
            "SELECT * FROM consultants WHERE id = ?", (consultant_id,)
        ).fetchone()
        if not consultant:
            raise ApiError(404, "NOT_FOUND", "Consultant not found.")

        share_note = 1 if body.get("shareNote", True) else 0
        note_id = body.get("noteId")
        appt_id = gen_id("appt")
        now = utc_now_iso()

        with conn:
            conn.execute(
                """
                INSERT INTO appointments (id, user_id, consultant_id, share_note, note_id, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'waiting', ?)
                """,
                (appt_id, user["id"], consultant_id, share_note, note_id, now),
            )

        self.send_json(
            201,
            {
                "appointment": {
                    "id": appt_id,
                    "consultantId": consultant_id,
                    "shareNote": bool(share_note),
                    "noteId": note_id,
                    "status": "waiting",
                    "createdAt": now,
                }
            },
        )

    def handle_update_appointment(
        self, conn: sqlite3.Connection, user: sqlite3.Row, appt_id: str
    ) -> None:
        body = self.read_json_body()
        status = str(body.get("status", "")).strip()
        if status not in ("waiting", "connected", "ended"):
            raise ApiError(400, "BAD_REQUEST", "Invalid appointment status.")

        with conn:
            res = conn.execute(
                "UPDATE appointments SET status = ? WHERE id = ? AND user_id = ?",
                (status, appt_id, user["id"]),
            )
        if res.rowcount == 0:
            raise ApiError(404, "NOT_FOUND", "Appointment not found.")
        self.send_json(200, {"id": appt_id, "status": status})

    def handle_direct_gemini_chat(self) -> None:
        body = self.read_json_body()
        contents = body.get("contents")
        if not isinstance(contents, list) or len(contents) == 0:
            raise ApiError(400, "BAD_REQUEST", "Conversation contents are required.")
        text = call_gemini_generate(
            model=body.get("model"),
            contents=contents,
            system_instruction=body.get("systemInstruction"),
        )
        self.send_json(200, {"text": text})

    def handle_direct_gemini_note(self) -> None:
        body = self.read_json_body()
        prompt = body.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            raise ApiError(400, "BAD_REQUEST", "Prompt is required.")
        text = call_gemini_generate(
            model=body.get("model"),
            contents=prompt,
            system_instruction=body.get("systemInstruction"),
            response_mime_type="application/json",
        )
        self.send_json(200, {"text": text})


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    load_dotenv(BASE_DIR / ".env")
    init_db()
    port = int(os.environ.get("PORT", "3000"))
    server = ReusableThreadingHTTPServer(("0.0.0.0", port), StillMindHandler)
    print(f"StillMind full Python backend listening on http://0.0.0.0:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
