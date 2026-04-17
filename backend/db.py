import sqlite3
from pathlib import Path
from flask import current_app, g

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "energy.db"

DATABASE_SCHEMA = [
    "CREATE TABLE IF NOT EXISTS readings ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "voltage REAL NOT NULL, "
    "current REAL NOT NULL, "
    "power REAL NOT NULL, "
    "energy_units REAL NOT NULL"
    ")",
    "CREATE TABLE IF NOT EXISTS alerts ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "level TEXT NOT NULL, "
    "message TEXT NOT NULL"
    ")",
    "CREATE TABLE IF NOT EXISTS users ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "email TEXT NOT NULL UNIQUE, "
    "password TEXT NOT NULL, "
    "name TEXT, "
    "phone TEXT, "
    "location TEXT, "
    "meter_id TEXT, "
    "daily_limit REAL DEFAULT 50"
    ")",
    "CREATE TABLE IF NOT EXISTS payments ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "amount REAL NOT NULL, "
    "status TEXT NOT NULL, "
    "method TEXT NOT NULL, "
    "reference TEXT NOT NULL, "
    "description TEXT"
    ")",
]


def connect_db(database_path=None):
    if not database_path:
        database_path = current_app.config.get("DATABASE", DEFAULT_DB_PATH)
    database_path = Path(database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(database_path), check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def get_db():
    if "db" not in g:
        g.db = connect_db()
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(database_path=None):
    db = connect_db(database_path)
    cursor = db.cursor()
    for statement in DATABASE_SCHEMA:
        cursor.execute(statement)
    
    # Add daily_limit column to existing users table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN daily_limit REAL DEFAULT 50")
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    
    db.commit()
    db.close()
