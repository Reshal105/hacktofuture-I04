from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from db import init_db, get_db, close_db
from utils import (
    calculate_energy_units,
    calculate_cost,
    detect_high_usage_alert,
    monthly_estimate_units,
    format_reading,
)
from uuid import uuid4
import bcrypt
import random
import threading

app = Flask(__name__)

# ✅ FIXED CORS
app.config["CORS_HEADERS"] = "Content-Type"
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000"]}},
    supports_credentials=True,
)

app.config["DATABASE"] = "backend/data/energy.db"

fake_sensor_data = {
    "voltage": 230,
    "current": 5.0,
    "power": 1150.0,
    "energy": 1.15,
    "timestamp": datetime.utcnow().isoformat() + "Z",
}


def refresh_fake_sensor_data():
    global fake_sensor_data

    voltage = random.randint(210, 239)
    current = round(random.uniform(1.5, 10.0), 2)
    power = round(voltage * current, 2)
    energy = round(power * 0.001, 3)

    fake_sensor_data = {
        "voltage": voltage,
        "current": current,
        "power": power,
        "energy": energy,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    threading.Timer(2.0, refresh_fake_sensor_data).start()


# -------------------------
# INIT DB ON START
# -------------------------
with app.app_context():
    init_db()


# -------------------------
# CLOSE DB
# -------------------------
@app.teardown_appcontext
def teardown(exception):
    close_db()


# -------------------------
# ROOT ROUTE
# -------------------------
@app.route("/")
def home():
    return jsonify({"message": "Backend is running successfully"})


# -------------------------
# FAKE SENSOR DATA
# -------------------------
@app.route("/api/data")
def fake_data():
    return jsonify(fake_sensor_data)


# -------------------------
# PASSWORD HELPERS
# -------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(hashed_password: str, password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


# -------------------------
# AUTH SIGNUP
# -------------------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(force=True)

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    location = data.get("location", "").strip()
    meter_id = data.get("meterId", data.get("meter_id", "")).strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        db = get_db()
        db.execute(
            "INSERT INTO users (email, password, name, phone, location, meter_id, daily_limit) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (email, hash_password(password), name, phone, location, meter_id, 50),
        )
        db.commit()

        return jsonify({
            "message": "Signup successful",
            "user": {
                "id": email,
                "email": email,
                "name": name,
                "phone": phone,
                "location": location,
                "meterId": meter_id,
                "daily_limit": 50,
            },
        }), 201
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            return jsonify({"error": "Email already registered"}), 409
        return jsonify({"error": str(e)}), 500


# -------------------------
# AUTH LOGIN
# -------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True)

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        db = get_db()
        user = db.execute(
            "SELECT email, password, name, phone, location, meter_id, COALESCE(daily_limit, 50) AS daily_limit FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if not user or not check_password(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["email"],
                "email": user["email"],
                "name": user["name"],
                "phone": user["phone"],
                "location": user["location"],
                "meterId": user["meter_id"],
                "daily_limit": user["daily_limit"],
            },
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# USER SETTINGS UPDATE
# -------------------------
@app.route("/api/users/update", methods=["PUT"])
def update_user():
    data = request.get_json(force=True)

    user_id = data.get("user_id", "").strip()
    daily_limit = data.get("daily_limit", None)

    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    if daily_limit is None:
        return jsonify({"error": "daily_limit is required"}), 400

    try:
        db = get_db()
        db.execute(
            "UPDATE users SET daily_limit = ? WHERE email = ?",
            (daily_limit, user_id),
        )
        db.commit()

        return jsonify({"message": "Settings updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# -------------------------

# -------------------------
# RUN APP
# -------------------------
if __name__ == "__main__":
    refresh_fake_sensor_data()  # ✅ START SENSOR HERE
    app.run(debug=True)