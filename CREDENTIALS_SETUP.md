# Credentials Setup for Docker Deployment

The application requires credentials that are NOT stored in the Git repository for security.

## Required Credentials on Ubuntu

After cloning the repo, create these files on your Ubuntu laptop:

### 1. Create `.env.emotiv` (Emotiv EEG credentials)

```bash
cd ~/spatial-eeg
nano .env.emotiv
```

Add:
```env
EMOTIV_CLIENT_ID=your_client_id_here
EMOTIV_CLIENT_SECRET=your_client_secret_here
EMOTIV_LICENSE_ID=your_license_id_here
```

Save and exit (Ctrl+X, Y, Enter).

### 2. Create `web_working/.env` (Backend configuration)

```bash
cd ~/spatial-eeg/web_working
nano .env
```

Add:
```env
MOBILE_TEXT_ALERTS_KEY=your_key_here
MOBILE_TEXT_ALERTS_V3_URL=https://api.mobile-text-alerts.com/v3/messages
MOBILE_TEXT_ALERTS_FROM=+18448859796
MOBILE_TEXT_ALERTS_GROUP=289499
```

**Note:** Mobile Text Alerts is optional. If you don't use it, create the file but leave values blank or omit them.

Save and exit.

## Docker will automatically mount these files

The `docker-compose.yml` is configured to mount:
- `.env.emotiv` → Available to backend
- `web_working/.env` → Available to server.py

## Security Notes

- These files are in `.gitignore` and never committed to Git
- Keep your credentials secure
- Don't share these files publicly
- Each deployment (Ubuntu laptop) needs its own credential files

## Quick Test

After creating the files, verify they exist:
```bash
cd ~/spatial-eeg
ls -la .env.emotiv
ls -la web_working/.env
```

Then rebuild and start Docker:
```bash
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
```
