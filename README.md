🛡️ End-to-End DevSecOps Phishing Detection System

📋 Project Overview

This project is a production-ready Phishing Detection Pipeline that utilizes Machine Learning, Real-time Event Streaming, and comprehensive Observability tools. It demonstrates a full DevSecOps lifecycle, from data acquisition to streaming inference and model drift detection.

The system analyzes URLs in real-time to classify them as Benign or Phishing, utilizing a heuristic-enhanced Random Forest model.

🏗️ Architecture

The system follows an event-driven microservices architecture:

User Interface (React): Submits URLs for scanning.

API Gateway (FastAPI): Handles requests, performs inference, and produces events.

Message Broker (Kafka): Decouples the API from analytical tasks for high throughput.

Consumer Worker (Python): Consumes Kafka streams to calculate Model Drift and analytics.

Observability (Prometheus & Grafana): Visualizes system health, traffic rates, and drift scores.

🚀 Features (The 12 Modules)

Module 1 & 2: Data Acquisition & Feature Engineering (Lexical URL analysis).

Module 3: Model Development (Random Forest Classifier).

Module 4: Model Serialization (joblib).

Module 5: High-Performance API (FastAPI with Async support).

Module 6: Containerization (Docker & Docker Compose).

Module 7: Monitoring (Prometheus Metrics).

Module 8: Interactive Dashboard (React + Tailwind CSS).

Module 9: CI/CD Pipeline (GitHub Actions).

Module 10: Streaming Inference (Apache Kafka Producer/Consumer).

Module 11: Concept Drift Detection (Real-time statistical analysis).

Module 12: Automated Traffic Simulation (Asyncio background tasks).

🛠️ Tech Stack

Language: Python 3.9, JavaScript (ES6+)

ML Libraries: Scikit-Learn, Pandas, NumPy

Infrastructure: Docker, Docker Compose

Streaming: Apache Kafka, Zookeeper

Monitoring: Prometheus, Grafana

⚡ Quick Start

Prerequisites

Docker Desktop installed and running.

Node.js installed (for local frontend dev).

Installation

Clone the repository:


Start the Infrastructure (Backend, Kafka, Monitoring):

docker-compose up --build


Note: The Python container includes a "Self-Healing" mechanism and will wait for Kafka to be ready.

Start the Frontend:

cd frontend
npm install
npm run dev


🕒 Access Points

React Dashboard: http://localhost:5173

Grafana (Login: admin/admin): http://localhost:3000

FastAPI Docs: http://localhost:8000/docs

Prometheus: http://localhost:9090

📊 Monitoring & Dashboards

To view the active metrics:

Log into Grafana.

Import the grafana_fixed.json file located in the monitoring/ folder.

You will see real-time traffic splits (User vs. Automated) and Drift Scores.

🛡️ License

This project is licensed under the MIT License.
