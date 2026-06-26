"""Entry point for the embedded local server.

The desktop app spawns this (as a bundled binary) on a private 127.0.0.1 port and
connects the UI to it. All configuration comes from environment variables passed
by the Electron main process (MONGODB_URI, MONGODB_DB, JWT_SECRET, PORT, …) — no
.env file is needed in the packaged app.
"""

import os

import uvicorn


def main() -> None:
    port = int(os.environ.get("PORT", "8099"))
    # app is imported lazily so PyInstaller's import graph still picks it up.
    from app.main import app

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
