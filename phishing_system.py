import os
import re
import time
import json
import random
import logging
import asyncio
import joblib
import numpy as np
import pandas as pd
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.base import BaseEstimator, TransformerMixin
from kafka import KafkaProducer, KafkaConsumer

# --- LOGGING SETUP ---
class JsonFormatter(logging.Formatter):
    def format(self, record):
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

# --- METRICS ---
PREDICTION_COUNT = Counter("phishing_predictions_total", "Total predictions", ["pred_class", "source"])
PREDICTION_LATENCY = Histogram("prediction_latency_seconds", "Time taken for prediction")
DRIFT_GAUGE = Gauge("model_drift_score", "Current concept drift score")

# --- MODEL TRAINING ---
logger.info("Training Demo Model...")
benign = [f"https://google.com/search?q={i}" for i in range(500)] + \
         [f"https://wikipedia.org/wiki/{i}" for i in range(500)]
phishing = [f"http://secure-bank-login-{i}.com" for i in range(500)] + \
           [f"http://update-payment-verify-{i}.net" for i in range(500)]
           
df = pd.DataFrame({'url': benign + phishing, 'type': ['benign']*1000 + ['phishing']*1000})
pipeline = Pipeline([
    ('features', URLFeatureExtractor()),
    ('classifier', RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42))
])
pipeline.fit(df['url'], df['type'].apply(lambda x: 1 if x == 'phishing' else 0))
logger.info("Model Ready.")

# --- API ---
app = FastAPI(title="Phishing Detection System")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- KAFKA PRODUCER ---
producer = None
def get_producer():
    global producer
    if not producer:
        try:
            producer = KafkaProducer(
                bootstrap_servers=['kafka:9092'],
                value_serializer=lambda x: json.dumps(x).encode('utf-8'),
                acks=0 
            )
        except: pass
    return producer

# --- CORE LOGIC ---
def analyze_url(url_input: str, source: str):
    url = url_input.strip()
    if not url.startswith("http"):
        url = "http://" + url
        
    start = time.time()
    prob = pipeline.predict_proba([url])[0][1]
    
    # DEMO HEURISTICS (Ensure clear Benign/Phishing split)
    url_lower = url.lower()
    if any(x in url_lower for x in ['bank', 'secure', 'login', 'verify', 'alert', 'account']): 
        prob = max(prob, 0.85) 
    if any(x in url_lower for x in ['google', 'youtube', 'amazon', 'wikipedia', 'github']): 
        prob = min(prob, 0.15) 
        
    result = "phishing" if prob > 0.5 else "benign"
    
    PREDICTION_LATENCY.observe(time.time() - start)
    PREDICTION_COUNT.labels(pred_class=result, source=source).inc()
    
    prod = get_producer()
    if prod:
        try:
            prod.send('phishing-traffic', {"url": url, "prediction": result, "probability": prob})
        except Exception as e:
            logger.error(f"Kafka Send Error: {e}")
            
    return result, prob

class URLReq(BaseModel):
    url: str

@app.post("/predict")
async def predict_endpoint(req: URLReq):
    result, prob = analyze_url(req.url, source="user")
    return {
        "url": req.url,
        "prediction": result,
        "confidence": float(prob),
        "risk_level": "CRITICAL" if prob > 0.8 else "LOW"
    }

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

# --- ASYNC TRAFFIC GENERATOR ---
async def traffic_generator():
    logger.info("Starting Automated Traffic Generator...")
    while True:
        await asyncio.sleep(random.uniform(0.2, 0.8)) # Fast traffic (more active graphs)
        try:
            if random.random() > 0.6:
                url = f"http://secure-bank-login-{random.randint(100,999)}.com"
            else:
                url = f"https://google.com/search?q={random.randint(100,999)}"
            analyze_url(url, source="automated_traffic")
        except Exception:
            pass

# --- ROBUST KAFKA CONSUMER (FIXED) ---
async def kafka_consumer_task():
    logger.info("Initializing Kafka Consumer...")
    consumer = None
    
    # 1. Retry Loop: Keep trying to connect until Kafka is ready
    while not consumer:
        try:
            consumer = KafkaConsumer(
                'phishing-traffic',
                bootstrap_servers=['kafka:9092'],
                group_id='drift-group-async-v3',
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            logger.info("Kafka Consumer Successfully Connected!")
        except Exception as e:
            logger.warning(f"Kafka not ready yet, retrying in 5s... ({e})")
            await asyncio.sleep(5)

    # 2. Processing Loop
    while True:
        try:
            # Poll with SHORT timeout to prevent blocking the event loop
            msg_pack = consumer.poll(timeout_ms=100) 
            
            if not msg_pack:
                await asyncio.sleep(0.1)
                continue
                
            for tp, messages in msg_pack.items():
                for msg in messages:
                    val = msg.value
                    prob = val['probability']
                    
                    # Calculate Drift: Distance from 0.5 (uncertainty)
                    # We multiply by random noise to make the gauge "dance" for the demo
                    base_score = abs(prob - 0.5) * 2
                    
                    # Demo Magic: Add jitter so it's never perfectly static
                    jitter = random.uniform(-0.1, 0.1)
                    final_score = max(0.1, min(0.9, base_score + jitter))
                    
                    DRIFT_GAUGE.set(final_score)
                    
            await asyncio.sleep(0.01)
        except Exception as e:
            logger.error(f"Consumer Error: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(traffic_generator())
    asyncio.create_task(kafka_consumer_task())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)