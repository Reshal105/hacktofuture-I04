def analyze(data):
    power = data.get("power", 0)

    if power > 2000:
        return {
            "status": "Anomaly",
            "message": "⚠️ Sudden spike detected!"
        }

    elif power > 1200:
        return {
            "status": "High Usage",
            "message": "Reduce usage to save electricity"
        }

    return {
        "status": "Normal",
        "message": "Usage is stable"
    }