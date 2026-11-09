"""Local web server and SQLite API for the Team Spirit fan site."""

from __future__ import annotations

import json
import mimetypes
import sqlite3
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DATABASE_PATH = ROOT / "data" / "feedback.db"
SCHEMA_PATH = ROOT / "database" / "schema.sql"
HOST = "127.0.0.1"
PORT = 8000

BLOCKED_PATHS = {
    ".git",
    ".gitignore",
    "data",
    "database",
    "server.py",
}


def connect_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    if not SCHEMA_PATH.is_file():
        raise FileNotFoundError("File database/schema.sql was not found.")

    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    with connect_database() as connection:
        connection.executescript(schema)


def feedback_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "message": row["message"],
        "created_at": row["created_at"],
    }


class FanSiteHandler(BaseHTTPRequestHandler):
    server_version = "TeamSpiritFan/1.0"

    def send_json(self, value: object, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 20_000:
                raise ValueError
            value = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(value, dict):
                raise ValueError
            return value
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("Invalid JSON request.") from None

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/feedback":
            self.get_feedback()
            return
        if path.startswith("/api/"):
            self.send_json({"error": "API route not found."}, HTTPStatus.NOT_FOUND)
            return
        self.serve_static(path)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/feedback":
            self.send_json({"error": "API route not found."}, HTTPStatus.NOT_FOUND)
            return

        try:
            data = self.read_json()
        except ValueError as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
            return

        name = str(data.get("name", "")).strip()
        message = str(data.get("message", "")).strip()

        if not name or not message:
            self.send_json(
                {"error": "Name and message are required."},
                HTTPStatus.BAD_REQUEST,
            )
            return
        if len(name) > 60 or len(message) > 500:
            self.send_json(
                {"error": "Name or message is too long."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        with connect_database() as connection:
            cursor = connection.execute(
                "INSERT INTO feedback (name, message) VALUES (?, ?)",
                (name, message),
            )
            row = connection.execute(
                "SELECT id, name, message, created_at FROM feedback WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()

        self.send_json(feedback_to_dict(row), HTTPStatus.CREATED)

    def get_feedback(self) -> None:
        with connect_database() as connection:
            rows = connection.execute(
                """SELECT id, name, message, created_at
                   FROM feedback
                   ORDER BY id DESC
                   LIMIT 100"""
            ).fetchall()
        self.send_json([feedback_to_dict(row) for row in rows])

    def serve_static(self, request_path: str) -> None:
        relative = "index.html" if request_path in {"", "/"} else unquote(request_path.lstrip("/"))
        first_part = Path(relative).parts[0] if Path(relative).parts else ""

        if first_part in BLOCKED_PATHS or relative.startswith("."):
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        requested_file = (ROOT / relative).resolve()
        try:
            requested_file.relative_to(ROOT)
        except ValueError:
            self.send_error(HTTPStatus.FORBIDDEN)
            return

        if not requested_file.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        body = requested_file.read_bytes()
        content_type = mimetypes.guess_type(requested_file.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {
            "application/javascript",
            "application/json",
        }:
            content_type += "; charset=utf-8"

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    initialize_database()
    server = ThreadingHTTPServer((HOST, PORT), FanSiteHandler)
    print("Team Spirit fan site is running.")
    print(f"Open in browser: http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop the server.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
