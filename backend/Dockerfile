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

# Use shell form to allow variable expansion for $PORT
# Railway (and others) set PORT dynamically. Default to 8000 if not set.
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"