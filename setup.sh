#!/bin/bash

# Spatial EEG System - Installation Script
# This script sets up the launcher and frontend first, then backend dependencies
# Usage: ./setup.sh

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

# Install system dependencies for heavy Python packages (optional, don't fail if can't install)
echo "Checking system dependencies for Python packages..."
if command_exists apt-get; then
    echo "Attempting to install system dependencies (requires sudo)..."
    echo "If this fails, the launcher will still work but backend may need manual dependency installation."
    sudo apt-get update -qq 2>/dev/null || print_warning "Could not update apt cache"
    sudo apt-get install -y build-essential python3-dev libpq-dev 2>/dev/null && print_status "System dependencies installed" || print_warning "Could not install all system dependencies (this is OK for now)"
else
    print_warning "apt-get not available, skipping system dependencies"
fi
echo ""

# Create Python virtual environment
echo "Creating Python virtual environment for launcher..."
if [ -d "$INSTALL_DIR/venv" ]; then
    print_warning "Virtual environment already exists, skipping creation"
else
    python3 -m venv "$INSTALL_DIR/venv" || {
        print_error "Failed to create virtual environment"
        exit 1
    }
    print_status "Virtual environment created"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source "$INSTALL_DIR/venv/bin/activate" || {
    print_error "Failed to activate virtual environment"
    exit 1
}
print_status "Virtual environment activated"
echo ""

# Upgrade pip in venv
echo "Upgrading pip..."
pip install --upgrade pip --quiet || print_warning "Could not upgrade pip (continuing anyway)"
print_status "pip ready"
echo ""

# Install LAUNCHER dependencies first (minimal, must succeed)
echo "Installing launcher dependencies (essential)..."
if [ -f "$INSTALL_DIR/requirements-launcher.txt" ]; then
    pip install -r "$INSTALL_DIR/requirements-launcher.txt" || {
        print_error "Failed to install launcher dependencies. Cannot continue."
        exit 1
    }
    print_status "Launcher dependencies installed successfully"
else
    print_warning "requirements-launcher.txt not found, installing manually..."
    pip install flask flask-cors psutil requests || {
        print_error "Failed to install launcher dependencies. Cannot continue."
        exit 1
    }
    print_status "Launcher dependencies installed successfully"
fi
echo ""

# Install BACKEND dependencies (optional, can fail)
echo "Installing backend dependencies (optional - may take 5-10 minutes)..."
echo "Note: If this fails, the launcher will still work but backend may not start."
echo "You can manually install backend dependencies later by running:"
echo "  source venv/bin/activate && pip install -r requirements.txt"
if [ -f "$INSTALL_DIR/requirements.txt" ]; then
    echo "This may take a while (TensorFlow, numpy, pandas, etc.)..."
    pip install -r "$INSTALL_DIR/requirements.txt" && print_status "Backend dependencies installed successfully" || {
        print_warning "Some backend dependencies failed to install"
        print_warning "The launcher will work, but you may need to manually install backend dependencies."
        print_warning "Try: sudo apt install build-essential python3-dev && source venv/bin/activate && pip install -r requirements.txt"
    }
else
    print_warning "requirements.txt not found, skipping backend dependencies"
fi
echo ""

# Install additional backend requirements if they exist
if [ -f "$INSTALL_DIR/src/backend/requirements.txt" ]; then
    echo "Installing additional backend dependencies..."
    pip install -r "$INSTALL_DIR/src/backend/requirements.txt" && print_status "Additional backend dependencies installed" || print_warning "Some additional dependencies failed (this is OK)"
fi

# Deactivate venv (setup is done)
deactivate

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$INSTALL_DIR/web_working" || {
    print_error "web_working directory not found"
    exit 1
}

# Check npm version
NPM_VERSION=$(npm --version)
NODE_VERSION=$(node --version)
echo "Using npm $NPM_VERSION and node $NODE_VERSION"

# Try npm install
echo "This may take a few minutes (installing React, TypeScript, Vite, etc.)..."
if npm install; then
    print_status "Frontend dependencies installed"
else
    print_warning "npm install failed, trying with cache clean..."
    npm cache clean --force 2>/dev/null || true

    if npm install --legacy-peer-deps; then
        print_status "Frontend dependencies installed (with --legacy-peer-deps)"
    else
        print_error "npm install failed"
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check your npm version (recommended: npm 9+, node 18+)"
        echo "   Current: npm $NPM_VERSION, node $NODE_VERSION"
        echo "2. Try manually:"
        echo "   cd $INSTALL_DIR/web_working"
        echo "   npm cache clean --force"
        echo "   npm install --legacy-peer-deps"
        echo "3. If using old Node.js, update it:"
        echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "   sudo apt install -y nodejs"
        exit 1
    fi
fi

cd "$INSTALL_DIR"
echo ""

# Create desktop shortcut
echo "Creating desktop shortcut..."
mkdir -p "$HOME/Desktop" 2>/dev/null
DESKTOP_FILE="$HOME/Desktop/Spatial-EEG-System.desktop"

cat > "$DESKTOP_FILE" << 'DESKTOPEOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Spatial EEG System
Comment=Launch Spatial EEG Research Platform
Exec=bash -c "cd %INSTALL_DIR% && source venv/bin/activate && python launcher.py"
Icon=applications-science
Terminal=false
Categories=Science;Education;
DESKTOPEOF

# Replace placeholder with actual path
sed -i "s|%INSTALL_DIR%|$INSTALL_DIR|g" "$DESKTOP_FILE"
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
echo ""
echo "Control Panel will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop the launcher"
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
echo "✓ Launcher dependencies: Installed"
echo "✓ Frontend dependencies: Installed"
echo "✓ Desktop shortcut: Created"
echo "✓ Virtual environment: Ready"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the launcher:"
echo "   ./start.sh"
echo ""
echo "   OR double-click the 'Spatial EEG System' icon on your desktop"
echo ""
echo "2. Open your browser to: http://localhost:3000"
echo ""
echo "3. Click 'Start System' to launch backend and frontend"
echo ""
echo "4. View basestation connection status in the control panel"
echo ""
echo "5. Access the main application at: http://localhost:5000"
echo ""
print_status "Setup complete! Ready to launch."
echo ""
