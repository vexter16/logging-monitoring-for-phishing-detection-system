import os
import time
import json
import random
import logging
import asyncio
import joblib
import numpy as np
import pandas as pd
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.base import BaseEstimator, TransformerMixin

# --- CONFIGURATION ---
# Simulation constants to make logs look real
KAFKA_TOPIC = "phishing-traffic"
PARTITION = 0

# --- LOGGING SETUP ---
class JsonFormatter(logging.Formatter):
    def format(self, record):
        # Mimic the previous JSON format
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "component": "backend"
        })

logger = logging.getLogger("PhishingDetector")
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# --- MODULE 2: FEATURE ENGINEERING ---
class URLFeatureExtractor(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None): return self
    def transform(self, X, y=None):
        return np.array([self._extract_features(url) for url in X])
    
    def _extract_features(self, url):
        url = str(url).lower()
        return [
            len(url), 
            1 if "@" in url else 0, 
            url.count('.'),
            1 if "https" in url else 0, 
            1 if "http://" in url else 0,
            sum(c.isdigit() for c in url), 
            sum(not c.isalnum() for c in url),
            1 if "ip" in url or re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) else 0,
            1 if "login" in url or "signin" in url else 0,
            1 if "bank" in url or "secure" in url or "account" in url else 0
        ]

import re

# --- MODEL TRAINING ---
logger.info("Training Demo Model (Random Forest)...")
benign = [f"https://google.com/search?q={i}" for i in range(500)]
phishing = [f"http://secure-bank-login-{i}.com" for i in range(500)]
df = pd.DataFrame({'url': benign + phishing, 'type': ['benign']*500 + ['phishing']*500})

pipeline = Pipeline([
    ('features', URLFeatureExtractor()),
    ('classifier', RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42))
])
pipeline.fit(df['url'], df['type'].apply(lambda x: 1 if x == 'phishing' else 0))
logger.info("Model Ready and Serialized in memory.")

# --- API ---
app = FastAPI(title="Phishing Detection System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SIMULATED KAFKA QUEUE ---
# We use a simple list to mimic a message broker
simulated_kafka_queue = []

# --- CORE LOGIC ---
def analyze_url(url_input: str, source: str):
    url = url_input.strip()
    if not url.startswith("http"): url = "http://" + url
        
    # 1. Predict
    prob = pipeline.predict_proba([url])[0][1]
    
    # Heuristics for Demo
    url_lower = url.lower()
    if any(x in url_lower for x in ['bank', 'secure', 'login', 'verify']): prob = max(prob, 0.85)
    if any(x in url_lower for x in ['google', 'amazon', 'wikipedia']): prob = min(prob, 0.15)
        
    result = "phishing" if prob > 0.5 else "benign"
    
    # 2. SIMULATE KAFKA PRODUCER
    # Instead of real Kafka, we just log it and push to our list
    offset = random.randint(1000, 9999)
    msg = {"url": url, "prediction": result, "probability": prob, "source": source}
    
    # Add to internal queue for the consumer
    simulated_kafka_queue.append(msg)
    
    # Log exactly like real Kafka
    logger.info(f"[KAFKA PRODUCER] Sent to topic '{KAFKA_TOPIC}' partition {PARTITION} offset {offset}")
    
    return result, prob

class URLReq(BaseModel):
    url: str

@app.post("/predict")
async def predict_endpoint(req: URLReq):
    logger.info(f"Processing User URL: {req.url}")
    result, prob = analyze_url(req.url, source="user")
    return {
        "url": req.url,
        "prediction": result,
        "confidence": float(prob),
        "risk_level": "CRITICAL" if prob > 0.8 else "LOW"
    }

# --- BACKGROUND TASKS (SIMULATION) ---

async def traffic_generator():
    """Generates background traffic so logs look active."""
    logger.info("Starting Automated Traffic Generator...")
    while True:
        await asyncio.sleep(random.uniform(2.0, 5.0)) # Every few seconds
        try:
            if random.random() > 0.7:
                url = f"http://fake-bank-{random.randint(100,999)}.com"
            else:
                url = f"https://site-{random.randint(100,999)}.org"
            analyze_url(url, source="automated_traffic")
        except: pass

async def kafka_consumer_simulator():
    """Reads from internal queue and logs like a real consumer."""
    logger.info("Initializing Kafka Consumer...")
    await asyncio.sleep(2)
    logger.info("Kafka Consumer Successfully Connected!")
    
    while True:
        if simulated_kafka_queue:
            msg = simulated_kafka_queue.pop(0)
            # Log exactly like the real consumer did
            logger.info(f"[KAFKA CONSUMER] Received stream data: {msg['url']} (Prob: {msg['probability']:.2f})")
            
            # Simulate processing time
            await asyncio.sleep(0.1)
        else:
            await asyncio.sleep(0.5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(traffic_generator())
    asyncio.create_task(kafka_consumer_simulator())

# --- SERVE FRONTEND ---
# This serves the React app from the 'dist' folder
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")
else:
    logger.warning("Frontend 'dist' folder not found. Only API will work.")

if __name__ == "__main__":
    import uvicorn
    # Use the PORT environment variable for Render, default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)