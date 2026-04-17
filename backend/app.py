import razorpay
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, UTC
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

# -------------------------
# LOAD ENV
# -------------------------
load_dotenv()

# -------------------------
# RAZORPAY CLIENT
# -------------------------
razorpay_client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID"),
    os.getenv("RAZORPAY_KEY_SECRET")
))

app = Flask(__name__)

CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001"]}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

app.config["DATABASE"] = "backend/data/energy.db"

# -------------------------
# FAKE SENSOR DATA
# -------------------------
fake_sensor_data = {
    "voltage": 230,
    "current": 5.0,
    "power": 1150.0,
    "energy": 1.15,
    "timestamp": datetime.now(UTC).isoformat(),
}

def sensor_loop():
    global fake_sensor_data
    while True:
        voltage = random.randint(210, 239)
        current = round(random.uniform(1.5, 10.0), 2)
        power = round(voltage * current, 2)
        energy = round(power * 0.001, 3)

        fake_sensor_data = {
            "voltage": voltage,
            "current": current,
            "power": power,
            "energy": energy,
            "timestamp": datetime.now(UTC).isoformat(),
        }

        threading.Event().wait(2)

threading.Thread(target=sensor_loop, daemon=True).start()

# -------------------------
# INIT DB
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
# ROOT
# -------------------------
@app.route("/")
def home():
    return jsonify({"message": "Backend is running successfully"})

# -------------------------
# FAKE SENSOR API
# -------------------------
@app.route("/api/data")
def fake_data():
    return jsonify(fake_sensor_data)

# -------------------------
# PASSWORD HELPERS
# -------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(hashed_password: str, password: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed_password.encode())

# -------------------------
# INGEST DATA
# -------------------------
@app.route("/api/ingest", methods=["POST"])
def ingest_reading():
    data = request.get_json(force=True)

    try:
        voltage = float(data.get("voltage", 0))
        current = float(data.get("current", 0))
        power = float(data.get("power", 0))
    except:
        return jsonify({"error": "Invalid input"}), 400

    db = get_db()

    last = db.execute(
        "SELECT timestamp, energy_units FROM readings ORDER BY timestamp DESC LIMIT 1"
    ).fetchone()

    prev_units = last["energy_units"] if last else 0.0
    prev_time = last["timestamp"] if last else None

    new_units = calculate_energy_units(power, prev_time)
    total_units = round(prev_units + new_units, 6)

    cost = calculate_cost(total_units)
    alert = detect_high_usage_alert(power)

    db.execute(
        "INSERT INTO readings (timestamp, voltage, current, power, energy_units) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?)",
        (voltage, current, power, total_units),
    )
    db.commit()

    if alert:
        db.execute(
            "INSERT INTO alerts (timestamp, level, message) VALUES (CURRENT_TIMESTAMP, ?, ?)",
            ("high", f"High power usage: {power}W"),
        )
        db.commit()

    return jsonify({
        "message": "Saved",
        "data": {
            "voltage": voltage,
            "current": current,
            "power": power,
            "energy_units": total_units,
            "cost": cost,
            "alert": alert
        }
    }), 201

# -------------------------
# LIVE DATA
# -------------------------
@app.route("/api/live")
def live():
    db = get_db()

    row = db.execute(
        "SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1"
    ).fetchone()

    if not row:
        return jsonify({"error": "No data"}), 404

    data = format_reading(row)
    data["cost"] = calculate_cost(data["energy_units"])
    data["monthly_units"] = monthly_estimate_units(data["power"])

    return jsonify({"live": data})

# -------------------------
# HISTORY
# -------------------------
@app.route("/api/history")
def history():
    db = get_db()

    rows = db.execute(
        "SELECT * FROM readings ORDER BY timestamp DESC LIMIT 100"
    ).fetchall()

    return jsonify({
        "history": [format_reading(r) for r in rows]
    })

# -------------------------
# SUMMARY
# -------------------------
@app.route("/api/summary")
def summary():
    db = get_db()

    latest = db.execute(
        "SELECT energy_units FROM readings ORDER BY timestamp DESC LIMIT 1"
    ).fetchone()

    avg = db.execute(
        "SELECT AVG(power) as avg_power FROM readings"
    ).fetchone()["avg_power"]

    if not latest:
        return jsonify({"error": "No data"}), 404

    return jsonify({
        "total_units": latest["energy_units"],
        "total_bill": calculate_cost(latest["energy_units"]),
        "average_power": round(avg or 0, 2)
    })

# -------------------------
# ALERTS
# -------------------------
@app.route("/api/alerts")
def alerts():
    db = get_db()

    rows = db.execute(
        "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50"
    ).fetchall()

    return jsonify({
        "alerts": [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "title": "High usage alert" if r["level"] == "high" else "System alert",
                "description": r["message"],
                "severity": "critical" if r["level"] == "high" else "warning",
            }
            for r in rows
        ]
    })

# -------------------------
# 🔥 RAZORPAY CREATE ORDER
# -------------------------
@app.route("/api/payments/create-order", methods=["POST"])
def create_order():
    data = request.get_json(force=True)

    amount_paise = int(data["amount"] * 100)

    order = razorpay_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": str(uuid4()),
        "notes": {"meter_id": data.get("meter_id", "")},
    })

    return jsonify({
        "order_id": order["id"],
        "amount": amount_paise,
        "key": os.getenv("RAZORPAY_KEY_ID")
    })

# -------------------------
# 🔥 RAZORPAY VERIFY
# -------------------------
@app.route("/api/payments/verify", methods=["POST"])
def verify_payment():
    data = request.get_json(force=True)

    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_signature": data["razorpay_signature"],
        })
    except Exception:
        return jsonify({"error": "Signature mismatch"}), 400

    db = get_db()

    db.execute(
        "INSERT INTO payments (amount, status, method, reference, description) VALUES (?,?,?,?,?)",
        (data["amount"] / 100, "success", "razorpay",
         data["razorpay_payment_id"], "Utility bill payment")
    )
    db.commit()

    return jsonify({"message": "Payment verified", "status": "success"})

# -------------------------
# FETCH PAYMENT HISTORY
# -------------------------
@app.route("/api/payments", methods=["GET"])
def fetch_payments():
    db = get_db()
    
    rows = db.execute(
        "SELECT id, timestamp, amount, status, method, reference, description FROM payments ORDER BY timestamp DESC LIMIT 50"
    ).fetchall()
    
    payments = [
        {
            "id": r["id"],
            "timestamp": r["timestamp"],
            "amount": r["amount"],
            "status": r["status"],
            "method": r["method"],
            "reference": r["reference"],
            "description": r["description"],
        }
        for r in rows
    ]
    
    return jsonify({"payments": payments})

# -------------------------
# CREATE PAYMENT (Frontend entry point)
# -------------------------
@app.route("/api/payments", methods=["POST"])
def create_payment():
    data = request.get_json(force=True)
    
    amount = float(data.get("amount", 0))
    meter_id = data.get("meter_id", "")
    
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    
    try:
        # Create Razorpay order internally
        amount_paise = int(amount * 100)
        
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": str(uuid4()),
            "notes": {"meter_id": meter_id},
        })
        
        # Return order details for frontend to use with Razorpay checkout
        return jsonify({
            "payment": {
                "id": order["id"],
                "reference": order["id"],
                "amount": amount,
                "status": "pending",
                "method": "razorpay",
                "timestamp": datetime.now(UTC).isoformat(),
                "description": data.get("description", "Utility bill payment"),
                "order_id": order["id"],
                "key": os.getenv("RAZORPAY_KEY_ID"),
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------
# UPDATE USER SETTINGS
# -------------------------
@app.route("/api/users/update", methods=["PUT"])
def update_user():
    data = request.get_json(force=True)
    
    user_id = data.get("user_id", "").strip()
    daily_limit = data.get("daily_limit", 50)
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    try:
        db = get_db()
        
        # Update the user's daily limit
        db.execute(
            "UPDATE users SET daily_limit = ? WHERE email = ?",
            (daily_limit, user_id)
        )
        db.commit()
        
        return jsonify({"message": "Settings updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    meter_id = data.get("meter_id", "").strip()
    
    # Validation
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    try:
        # Hash password
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        
        db = get_db()
        db.execute(
            "INSERT INTO users (email, password, name, phone, location, meter_id) VALUES (?, ?, ?, ?, ?, ?)",
            (email, hashed, name, phone, location, meter_id)
        )
        db.commit()
        
        return jsonify({
            "user": {
                "id": email,
                "email": email,
                "name": name,
                "meter_id": meter_id,
                "location": location,
            }
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
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
        return jsonify({"error": "Email and password required"}), 400
    
    try:
        db = get_db()
        user = db.execute(
            "SELECT id, email, password, name, meter_id, location, COALESCE(daily_limit, 50) as daily_limit FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Verify password
        if not bcrypt.checkpw(password.encode(), user["password"]):
            return jsonify({"error": "Invalid credentials"}), 401
        
        return jsonify({
            "user": {
                "id": user["email"],
                "email": user["email"],
                "name": user["name"],
                "meter_id": user["meter_id"],
                "location": user["location"],
                "daily_limit": user["daily_limit"],
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------
# RUN
# -------------------------
if __name__ == "__main__":
    app.run(debug=True)