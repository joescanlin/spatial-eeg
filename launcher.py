#!/usr/bin/env python3
"""
Spatial EEG System Launcher
Lightweight control service for starting/stopping the main system
Runs on port 3000 (separate from main backend on 5001)
"""

import os
import sys
import subprocess
import signal
import psutil
import json
import time
import socket
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Process tracking
backend_process = None
frontend_process = None

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_WORKING_DIR = os.path.join(BASE_DIR, 'web_working')
BACKEND_SCRIPT = os.path.join(WEB_WORKING_DIR, 'server.py')
LOG_FILE = os.path.join(BASE_DIR, 'launcher.log')

def log(message):
    """Simple logging"""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    log_message = f"[{timestamp}] {message}\n"
    print(log_message.strip())
    with open(LOG_FILE, 'a') as f:
        f.write(log_message)

def is_port_in_use(port):
    """Check if a port is in use using lsof command"""
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True,
            timeout=2
        )
        return result.returncode == 0 and bool(result.stdout.strip())
    except Exception:
        return False

def get_process_using_port(port):
    """Get PID of process using a port"""
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True,
            timeout=2
        )
        if result.returncode == 0 and result.stdout.strip():
            return int(result.stdout.strip().split('\n')[0])
    except Exception:
        pass
    return None

def is_backend_running():
    """Check if backend is running on port 5001"""
    return is_port_in_use(5001)

def is_frontend_running():
    """Check if frontend is running on port 5000"""
    return is_port_in_use(5000)

def start_backend():
    """Start the backend server"""
    global backend_process

    if is_backend_running():
        log("Backend already running")
        return True

    try:
        log("Starting backend...")
        # Start backend in background
        backend_process = subprocess.Popen(
            [sys.executable, BACKEND_SCRIPT],
            cwd=WEB_WORKING_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid  # Create new process group
        )

        # Wait for backend to start
        for i in range(30):  # Wait up to 30 seconds
            if is_backend_running():
                log("Backend started successfully")
                return True
            time.sleep(1)

        log("Backend failed to start (timeout)")
        return False
    except Exception as e:
        log(f"Error starting backend: {e}")
        return False

def start_frontend():
    """Start the frontend dev server"""
    global frontend_process

    if is_frontend_running():
        log("Frontend already running")
        return True

    try:
        log("Starting frontend...")
        # Start frontend in background
        frontend_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=WEB_WORKING_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid  # Create new process group
        )

        # Wait for frontend to start
        for i in range(30):  # Wait up to 30 seconds
            if is_frontend_running():
                log("Frontend started successfully")
                return True
            time.sleep(1)

        log("Frontend failed to start (timeout)")
        return False
    except Exception as e:
        log(f"Error starting frontend: {e}")
        return False

def stop_backend():
    """Stop the backend server"""
    global backend_process

    try:
        pid = get_process_using_port(5001)
        if pid:
            log(f"Stopping backend (PID: {pid})...")
            os.killpg(os.getpgid(pid), signal.SIGTERM)
            time.sleep(2)
            log("Backend stopped")
            return True
        else:
            log("Backend not running")
            return True
    except Exception as e:
        log(f"Error stopping backend: {e}")
        return False

def stop_frontend():
    """Stop the frontend dev server"""
    global frontend_process

    try:
        pid = get_process_using_port(5000)
        if pid:
            log(f"Stopping frontend (PID: {pid})...")
            os.killpg(os.getpgid(pid), signal.SIGTERM)
            time.sleep(2)
            log("Frontend stopped")
            return True
        else:
            log("Frontend not running")
            return True
    except Exception as e:
        log(f"Error stopping frontend: {e}")
        return False

def check_for_updates():
    """Check if there are updates available from GitHub"""
    try:
        # Fetch latest from remote
        result = subprocess.run(
            ['git', 'fetch'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        # Check if local is behind remote
        result = subprocess.run(
            ['git', 'rev-list', '--count', 'HEAD..origin/main'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        commits_behind = int(result.stdout.strip())

        if commits_behind > 0:
            # Get commit messages
            result = subprocess.run(
                ['git', 'log', '--oneline', 'HEAD..origin/main'],
                cwd=BASE_DIR,
                capture_output=True,
                text=True
            )
            return {
                'available': True,
                'commits': commits_behind,
                'changes': result.stdout.strip()
            }
        else:
            return {
                'available': False,
                'message': 'You are up to date!'
            }
    except Exception as e:
        log(f"Error checking for updates: {e}")
        return {
            'error': str(e)
        }

def install_updates():
    """Pull latest updates from GitHub"""
    try:
        log("Installing updates...")
        result = subprocess.run(
            ['git', 'pull'],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            log("Updates installed successfully")
            return {'success': True, 'message': result.stdout}
        else:
            log(f"Update failed: {result.stderr}")
            return {'success': False, 'error': result.stderr}
    except Exception as e:
        log(f"Error installing updates: {e}")
        return {'success': False, 'error': str(e)}

# === API ENDPOINTS ===

@app.route('/')
def index():
    """Serve the control panel HTML"""
    return send_file(os.path.join(BASE_DIR, 'launcher.html'))

@app.route('/api/status')
def status():
    """Get system status"""
    return jsonify({
        'backend': is_backend_running(),
        'frontend': is_frontend_running(),
        'launcher': True
    })

@app.route('/api/system/start', methods=['POST'])
def start_system():
    """Start backend and frontend"""
    backend_ok = start_backend()
    frontend_ok = start_frontend()

    return jsonify({
        'success': backend_ok and frontend_ok,
        'backend': backend_ok,
        'frontend': frontend_ok
    })

@app.route('/api/system/stop', methods=['POST'])
def stop_system():
    """Stop backend and frontend"""
    backend_ok = stop_backend()
    frontend_ok = stop_frontend()

    return jsonify({
        'success': backend_ok and frontend_ok,
        'backend': backend_ok,
        'frontend': frontend_ok
    })

@app.route('/api/system/restart', methods=['POST'])
def restart_system():
    """Restart backend and frontend"""
    log("Restarting system...")
    stop_backend()
    stop_frontend()
    time.sleep(2)
    backend_ok = start_backend()
    frontend_ok = start_frontend()

    return jsonify({
        'success': backend_ok and frontend_ok,
        'backend': backend_ok,
        'frontend': frontend_ok
    })

@app.route('/api/system/update/check', methods=['GET'])
def check_update():
    """Check for available updates"""
    return jsonify(check_for_updates())

@app.route('/api/system/update/install', methods=['POST'])
def update_system():
    """Install updates and restart"""
    result = install_updates()

    if result.get('success'):
        # Restart system after update
        log("Restarting system after update...")
        stop_backend()
        stop_frontend()
        time.sleep(2)
        start_backend()
        start_frontend()

    return jsonify(result)

@app.route('/api/logs')
def get_logs():
    """Get recent log entries"""
    try:
        with open(LOG_FILE, 'r') as f:
            lines = f.readlines()
            # Return last 100 lines
            return jsonify({'logs': ''.join(lines[-100:])})
    except Exception as e:
        return jsonify({'error': str(e)})

def cleanup():
    """Cleanup on exit"""
    log("Launcher shutting down...")
    stop_backend()
    stop_frontend()

if __name__ == '__main__':
    # Register cleanup handler
    import atexit
    atexit.register(cleanup)

    log("="*50)
    log("Spatial EEG System Launcher Starting")
    log("="*50)
    log(f"Base directory: {BASE_DIR}")
    log(f"Backend script: {BACKEND_SCRIPT}")
    log("Starting launcher on http://localhost:3000")

    try:
        app.run(host='0.0.0.0', port=3000, debug=False)
    except KeyboardInterrupt:
        log("Launcher interrupted by user")
        cleanup()
