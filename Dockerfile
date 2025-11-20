# Module 6: Containerization
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# CRITICAL FIX: We install kafka-python explicitly here to force Docker to pick it up
# independent of the requirements file cache.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir fastapi uvicorn scikit-learn pandas prometheus-client joblib pydantic httpx kafka-python

# Copy app code
COPY phishing_system.py .

# Expose API port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "phishing_system:app", "--host", "0.0.0.0", "--port", "8000"]