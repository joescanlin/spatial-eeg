#!/bin/bash

# Spatial EEG System - Installation Script
# This script sets up the complete system on Ubuntu
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
    exit 1
fi
print_status "Python3 is installed ($(python3 --version))"

if ! command_exists pip3; then
    print_error "pip3 is not installed. Please install pip3 and try again."
    exit 1
fi
print_status "pip3 is installed"

if ! command_exists npm; then
    print_error "npm is not installed. Please install Node.js and npm, then try again."
    exit 1
fi
print_status "npm is installed ($(npm --version))"

if ! command_exists git; then
    print_error "git is not installed. Please install git and try again."
    exit 1
fi
print_status "git is installed ($(git --version))"

echo ""

# Install Python dependencies
echo "Installing Python dependencies..."
if [ -f "$INSTALL_DIR/requirements.txt" ]; then
    pip3 install -r "$INSTALL_DIR/requirements.txt" --user
    print_status "Python dependencies installed"
else
    print_warning "requirements.txt not found, skipping Python dependencies"
fi
echo ""

# Install additional launcher dependencies
echo "Installing launcher dependencies..."
pip3 install flask flask-cors psutil --user
print_status "Launcher dependencies installed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$INSTALL_DIR/web_working"
npm install
print_status "Frontend dependencies installed"
cd "$INSTALL_DIR"
echo ""

# Create desktop shortcut
echo "Creating desktop shortcut..."

# Replace placeholder with actual install directory in .desktop file
DESKTOP_FILE="$INSTALL_DIR/spatial-eeg.desktop"
DESKTOP_FILE_FINAL="$HOME/Desktop/spatial-eeg.desktop"

if [ -f "$DESKTOP_FILE" ]; then
    # Create a copy with the correct path
    sed "s|%INSTALL_DIR%|$INSTALL_DIR|g" "$DESKTOP_FILE" > "$DESKTOP_FILE_FINAL"
    chmod +x "$DESKTOP_FILE_FINAL"

    # Try to mark as trusted (Ubuntu-specific)
    if command_exists gio; then
        gio set "$DESKTOP_FILE_FINAL" metadata::trusted true 2>/dev/null || true
    fi

    print_status "Desktop shortcut created at: $DESKTOP_FILE_FINAL"
else
    print_warning "Desktop file template not found"
fi
echo ""

# Create start script for convenience
echo "Creating start script..."
cat > "$INSTALL_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Spatial EEG System Launcher..."
echo "Control Panel will be available at: http://localhost:3000"
echo ""
python3 launcher.py
EOF
chmod +x "$INSTALL_DIR/start.sh"
print_status "Start script created: ./start.sh"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$INSTALL_DIR/logs"
print_status "Logs directory created"
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
echo "OR start directly with Python:"
echo "   python3 launcher.py"
echo ""
echo "Once launched:"
echo "   - The launcher control panel will open at http://localhost:3000"
echo "   - Click 'Start System' to start the backend and frontend"
echo "   - Access the main application at http://localhost:5000"
echo ""
echo "To update the system in the future:"
echo "   git pull origin main"
echo "   Or use the 'Check for Updates' button in the control panel"
echo ""
print_status "Setup complete! Ready to use."
