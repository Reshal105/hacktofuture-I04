import time
import random
import requests

URL = "http://127.0.0.1:5000/data"

energy = 0

while True:
    voltage = random.uniform(220, 240)
    current = random.uniform(1, 5)
    power = voltage * current
    energy += power / 1000

    data = {
        "voltage": voltage,
        "current": current,
        "power": power,
        "energy": energy
    }

    requests.post(URL, json=data)
    print("sent:", data)

    time.sleep(2)