#!/usr/bin/env python3
"""Create a safe, separate first deployment copy of the SQLite DB and uploads."""

import os
import shutil
import sqlite3
import sys
from pathlib import Path


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


data_value = os.environ.get("AGRIC_DATA_DIR", "")
if not data_value or not Path(data_value).is_absolute():
    fail("Set AGRIC_DATA_DIR to an absolute persistent directory before running this command.")

data_dir = Path(data_value)
source_db = Path(sys.argv[1] if len(sys.argv) > 1 else "../database.sqlite").resolve()
target_db = data_dir / "database.sqlite"
target_uploads = data_dir / "uploads"
source_uploads = Path("public/uploads").resolve()

if not source_db.is_file():
    fail(f"Source SQLite database not found: {source_db}")
if target_db.exists():
    fail(f"Refusing to overwrite existing deployment database: {target_db}")
if target_uploads.exists() and any(target_uploads.iterdir()):
    fail(f"Refusing to merge into non-empty upload directory: {target_uploads}")
if not source_uploads.is_dir():
    fail(f"Source uploads directory not found: {source_uploads}")

try:
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "private_uploads").mkdir(exist_ok=True)
    (data_dir / "next-cache").mkdir(exist_ok=True)

    source_uri = f"file:{source_db.as_posix()}?mode=ro"
    source = sqlite3.connect(source_uri, uri=True)
    destination = sqlite3.connect(target_db)
    try:
        source.backup(destination)
        check = destination.execute("PRAGMA quick_check").fetchone()
        if not check or check[0] != "ok":
            raise RuntimeError("database quick_check did not return ok")
        tables = {row[0] for row in destination.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for required in ("users", "products", "orders", "notifications"):
            if required not in tables:
                raise RuntimeError(f"database is missing required table {required}")
    finally:
        destination.close()
        source.close()

    if target_uploads.exists():
        target_uploads.rmdir()
    shutil.copytree(source_uploads, target_uploads)
except Exception as error:
    if target_db.exists():
        target_db.unlink()
    fail(f"Deployment data preparation failed: {error}")

print(f"Created deployment database copy at {target_db}")
print(f"Copied public uploads to {target_uploads}")
print("The source database and source uploads were not modified.")
