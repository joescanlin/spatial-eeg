# Spatial EEG System - Docker Image
# Python 3.10 base to avoid compatibility issues with newer versions

FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libpq-dev \
    nodejs \
    npm \
    git \
    lsof \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements files first (for better caching)
COPY requirements-launcher.txt requirements-backend-minimal.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements-launcher.txt && \
    pip install --no-cache-dir -r requirements-backend-minimal.txt

# Copy application code
COPY . .

# Install frontend dependencies
WORKDIR /app/web_working
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --verbose || \
    npm install --legacy-peer-deps --verbose

# Back to app root
WORKDIR /app

# Create logs directory
RUN mkdir -p logs web_working/logs

# Expose ports
# 3000 - Launcher control panel
# 5000 - Frontend (Vite)
# 5001 - Backend (Flask)
EXPOSE 3000 5000 5001

# Run the launcher
CMD ["python", "launcher.py"]
