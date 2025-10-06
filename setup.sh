#!/bin/bash

# Spatial EEG System - Installation Script
# This script sets up the complete system on Ubuntu with proper virtual environment
# Usage: ./setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Spatial EEG System - Installation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the absolute path of the installation directory
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Installation directory: $INSTALL_DIR"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists python3; then
    print_error "Python3 is not installed. Please install Python3 and try again."
    echo "  Run: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi
print_status "Python3 is installed ($(python3 --version))"

if ! command_exists pip3; then
    print_error "pip3 is not installed. Please install pip3 and try again."
    echo "  Run: sudo apt install python3-pip"
    exit 1
fi
print_status "pip3 is installed"

if ! command_exists npm; then
    print_error "npm is not installed. Please install Node.js and npm, then try again."
    echo "  Run: sudo apt install nodejs npm"
    exit 1
fi
print_status "npm is installed ($(npm --version))"

if ! command_exists git; then
    print_error "git is not installed. Please install git and try again."
    echo "  Run: sudo apt install git"
    exit 1
fi
print_status "git is installed ($(git --version))"

echo ""

# Create Python virtual environment
echo "Creating Python virtual environment..."
if [ -d "$INSTALL_DIR/venv" ]; then
    print_warning "Virtual environment already exists, skipping creation"
else
    python3 -m venv "$INSTALL_DIR/venv"
    print_status "Virtual environment created"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source "$INSTALL_DIR/venv/bin/activate"
print_status "Virtual environment activated"
echo ""

# Upgrade pip in venv
echo "Upgrading pip..."
pip install --upgrade pip
print_status "pip upgraded"
echo ""

# Install Python dependencies
echo "Installing Python dependencies..."
if [ -f "$INSTALL_DIR/requirements.txt" ]; then
    pip install -r "$INSTALL_DIR/requirements.txt"
    print_status "Main Python dependencies installed"
else
    print_warning "requirements.txt not found, skipping main dependencies"
fi

# Install backend dependencies if they exist
if [ -f "$INSTALL_DIR/src/backend/requirements.txt" ]; then
    pip install -r "$INSTALL_DIR/src/backend/requirements.txt"
    print_status "Backend dependencies installed"
fi

# Install launcher dependencies (always needed)
echo "Installing launcher dependencies..."
pip install flask flask-cors psutil requests
print_status "Launcher dependencies installed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$INSTALL_DIR/web_working"
npm install
print_status "Frontend dependencies installed"
cd "$INSTALL_DIR"
echo ""

# Deactivate venv (setup is done)
deactivate

# Create desktop shortcut
echo "Creating desktop shortcut..."
DESKTOP_FILE="$HOME/Desktop/Spatial-EEG-System.desktop"

cat > "$DESKTOP_FILE" << DESKTOPEOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Spatial EEG System
Comment=Launch Spatial EEG Research Platform
Exec=bash -c "cd $INSTALL_DIR && source venv/bin/activate && python launcher.py"
Icon=applications-science
Terminal=false
Categories=Science;Education;
DESKTOPEOF

chmod +x "$DESKTOP_FILE"

# Try to mark as trusted (Ubuntu-specific)
if command_exists gio; then
    gio set "$DESKTOP_FILE" metadata::trusted true 2>/dev/null || true
fi

print_status "Desktop shortcut created at: $DESKTOP_FILE"
echo ""

# Create start script for convenience
echo "Creating start script..."
cat > "$INSTALL_DIR/start.sh" << 'STARTEOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Spatial EEG System Launcher..."
echo "Activating virtual environment..."
source venv/bin/activate
echo "Control Panel will be available at: http://localhost:3000"
echo ""
python launcher.py
STARTEOF
chmod +x "$INSTALL_DIR/start.sh"
print_status "Start script created: ./start.sh"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$INSTALL_DIR/web_working/logs"
print_status "Logs directories created"
echo ""

echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Desktop shortcut has been created on your desktop"
echo "   Double-click 'Spatial EEG System' icon to launch"
echo ""
echo "OR manually start the launcher:"
echo "   ./start.sh"
echo ""
echo "OR start directly with Python (remember to activate venv first):"
echo "   source venv/bin/activate"
echo "   python launcher.py"
echo ""
echo "Once launched:"
echo "   - The launcher control panel will open at http://localhost:3000"
echo "   - Click 'Start System' to start the backend and frontend"
echo "   - Basestation connection status will be displayed"
echo "   - Access the main application at http://localhost:5000"
echo ""
echo "To update the system in the future:"
echo "   git pull origin main"
echo "   ./setup.sh  (to update dependencies)"
echo "   Or use the 'Check for Updates' button in the control panel"
echo ""
print_status "Setup complete! Ready to use."
