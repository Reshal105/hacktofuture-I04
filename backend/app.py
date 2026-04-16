from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import analyze

app = Flask(__name__)
CORS(app)

latest_data = {}

@app.route('/data', methods=['POST'])
def receive():
    global latest_data
    data = request.json

    ai = analyze(data)
    data.update(ai)

    latest_data = data
    return {"status": "ok"}

@app.route('/data', methods=['GET'])
def send():
    return jsonify(latest_data)

app.run(debug=True)