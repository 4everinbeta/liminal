FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run uvicorn directly. Railway sets PORT, so we use it.
# If strict variable expansion is needed, we can fall back to shell, 
# but let's try to be explicit or use the shell form safer.
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
