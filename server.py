"""StillMind — Python 3 Backend Server for Gemini AI & Static Assets."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
DEFAULT_MODEL = "gemini-4-hydrogen"
ALLOWED_MODELS = {
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
    "gemini-4-argon",
    "gemini-4-carbon",
}


def load_dotenv(env_path: Path) -> None:
    """Load key=value pairs from .env without overriding existing env vars."""
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


def resolve_model(requested: object) -> str:
    if isinstance(requested, str) and requested in ALLOWED_MODELS:
        return requested
    return DEFAULT_MODEL


def get_api_key() -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ApiError(
            status=503,
            code="API_KEY_MISSING",
            message="Server Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.",
        )
    return api_key


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


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
) -> dict:
    if isinstance(contents, str):
        formatted_contents = [{"role": "user", "parts": [{"text": contents}]}]
    else:
        formatted_contents = contents

    payload: dict = {"contents": formatted_contents}
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    if response_mime_type:
        payload["generationConfig"] = {"responseMimeType": response_mime_type}
    return payload


def call_gemini_generate(
    model: str,
    contents: list | str,
    system_instruction: str | None = None,
    response_mime_type: str | None = None,
) -> str:
    api_key = get_api_key()
    safe_model = urllib.parse.quote(resolve_model(model), safe="")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{safe_model}:generateContent"
    body_bytes = json.dumps(
        build_gemini_payload(contents, system_instruction, response_mime_type)
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
        with urllib.request.urlopen(req, timeout=60) as resp:
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


class StillMindHandler(BaseHTTPRequestHandler):
    server_version = "StillMindPython/1.0"

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

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
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

    def resolve_static_root(self) -> Path:
        if os.environ.get("NODE_ENV") == "production" and DIST_DIR.exists():
            return DIST_DIR
        return BASE_DIR

    def serve_static(self, req_path: str) -> None:
        clean_path = req_path.split("?", 1)[0].lstrip("/")
        if not clean_path:
            clean_path = "index.html"

        static_root = self.resolve_static_root()
        target = (static_root / clean_path).resolve()

        # Prevent path traversal outside static root
        if static_root not in target.parents and target != static_root:
            self.send_json(403, {"error": "Forbidden"})
            return

        if not target.is_file():
            # SPA fallback to index.html for unknown routes
            target = static_root / "index.html"
            if not target.is_file():
                self.send_json(404, {"error": "Not found"})
                return

        mime_type, _ = mimetypes.guess_type(str(target))
        if not mime_type:
            mime_type = "application/octet-stream"
        if mime_type.startswith("text/") or mime_type in ("application/javascript", "application/json"):
            content_type = f"{mime_type}; charset=utf-8"
        else:
            content_type = mime_type

        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        path_only = self.path.split("?", 1)[0]
        if path_only == "/api/health":
            self.send_json(200, {"ok": True, "runtime": "python"})
            return
        self.serve_static(path_only)

    def do_POST(self) -> None:
        path_only = self.path.split("?", 1)[0]
        if path_only == "/api/gemini/chat":
            self.handle_chat()
        elif path_only == "/api/gemini/chat/stream":
            self.handle_chat_stream()
        elif path_only == "/api/gemini/note":
            self.handle_note()
        else:
            self.send_json(404, {"error": "API route not found"})

    def handle_chat(self) -> None:
        try:
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
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
        except Exception as exc:
            self.send_json(500, {"error": str(exc), "code": "UPSTREAM_ERROR"})

    def handle_chat_stream(self) -> None:
        try:
            body = self.read_json_body()
            contents = body.get("contents")
            if not isinstance(contents, list) or len(contents) == 0:
                raise ApiError(400, "BAD_REQUEST", "Conversation contents are required.")
            api_key = get_api_key()
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-transform")
        self.end_headers()

        def write_sse(payload: dict) -> None:
            self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode("utf-8"))
            self.wfile.flush()

        safe_model = urllib.parse.quote(resolve_model(body.get("model")), safe="")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{safe_model}:streamGenerateContent?alt=sse"
        )
        req_bytes = json.dumps(
            build_gemini_payload(contents, body.get("systemInstruction"))
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

        try:
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
                        write_sse({"chunk": chunk_text})
            write_sse({"done": True})
        except urllib.error.HTTPError as exc:
            raw_err = exc.read().decode("utf-8", errors="replace")
            mapped = map_http_error(exc.code, raw_err)
            write_sse({"error": mapped.message, "code": mapped.code})
        except urllib.error.URLError as exc:
            write_sse({"error": f"Unable to reach Gemini API: {exc.reason}", "code": "NETWORK_ERROR"})
        except Exception as exc:
            write_sse({"error": str(exc), "code": "UPSTREAM_ERROR"})

    def handle_note(self) -> None:
        try:
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
        except ApiError as err:
            self.send_json(err.status, {"error": err.message, "code": err.code})
        except Exception as exc:
            self.send_json(500, {"error": str(exc), "code": "UPSTREAM_ERROR"})


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    load_dotenv(BASE_DIR / ".env")
    port = int(os.environ.get("PORT", "3000"))
    server = ReusableThreadingHTTPServer(("0.0.0.0", port), StillMindHandler)
    print(f"StillMind Python server listening on http://0.0.0.0:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
