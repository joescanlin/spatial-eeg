# Docker Deployment Guide

This guide helps you deploy the Spatial EEG System using Docker, avoiding Python version and dependency issues.

## One-Time Setup on Ubuntu Laptop

### 1. Install Docker
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
```

**Important:** Log out and back in after adding yourself to the docker group.

### 2. Clone Repository
```bash
cd ~
git clone https://github.com/joescanlin/spatial-eeg.git
cd spatial-eeg
```

### 3. Build Docker Image
```bash
docker-compose build
```
This takes 5-10 minutes the first time (downloads Python 3.10, installs all dependencies).

## Running the System

### Start Everything
```bash
docker-compose up -d
```

The `-d` flag runs it in the background (detached mode).

### Access the Application
- **Control Panel:** http://localhost:3000
- **Main Application:** http://localhost:5000
- **Backend API:** http://localhost:5001

### View Logs
```bash
# All logs
docker-compose logs -f

# Just backend logs
docker logs spatial-eeg-system
```

### Stop the System
```bash
docker-compose down
```

### Restart
```bash
docker-compose restart
```

## Updating the Application

When code changes are pushed to GitHub:

```bash
cd ~/spatial-eeg
git pull
docker-compose build  # Rebuild with new code
docker-compose up -d  # Restart with new image
```

## Troubleshooting

### Can't connect to basestations
Docker uses `network_mode: host` to access mDNS/Bonjour for basestation discovery. This should work automatically.

### Port already in use
Stop any locally running instances:
```bash
# Find processes on ports 3000, 5000, 5001
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

### Rebuild from scratch
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Benefits of Docker Deployment

✅ Consistent Python 3.10 environment
✅ All dependencies pre-installed
✅ No version conflicts with system Python
✅ One command to start/stop entire system
✅ Easy to deploy to multiple laptops
✅ Logs and data persist outside container
