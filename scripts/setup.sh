#!/bin/bash

# =============================================================================
# Setup Script for AI VS Code Debug
# =============================================================================
# This script automatically installs all dependencies for the project
# 
# Usage: 
#   ./setup.sh           # Full setup
#   ./setup.sh --test    # Full setup + run tests
#   ./setup.sh --help    # Show help
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# Help Message
# =============================================================================

show_help() {
    cat << EOF
AI VS Code Debug - Setup Script

USAGE:
    ./setup.sh [OPTIONS]

OPTIONS:
    --test      Run full setup and execute tests
    --help      Show this help message

WHAT IT DOES:
    1. Checks prerequisites (Node.js, npm, Git, Make, GCC, Python3)
    2. Creates .env from .env.example
    3. Installs system dependencies (jq, etc.)
    4. Installs VS Code extension dependencies (pnpm/npm)
    5. Installs Playwright browsers (Chromium) for E2E testing
    6. Builds the VS Code extension
    7. Installs Python dependencies (pytest, requests)
    8. Builds the playground (embedded C project)
    9. Sets up Git pre-commit hooks
    10. Optionally runs tests

MANUAL INSTALLATION:
    If you prefer to install dependencies manually:
    
    Ubuntu/Debian:
        sudo apt-get install nodejs npm git make gcc python3 jq
        cd ai-debug-proxy && pnpm install
        npx playwright install --with-deps chromium
    
    Fedora/RHEL:
        sudo dnf install nodejs npm git make gcc python3 jq
        cd ai-debug-proxy && pnpm install
        npx playwright install --with-deps chromium
    
    macOS:
        brew install node git make jq
        cd ai-debug-proxy && pnpm install
        npx playwright install --with-deps chromium

EOF
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_help
    exit 0
fi

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# Prerequisites Check
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    local optional_tools=()
    
    # Check Node.js and npm
    if check_command node; then
        NODE_VERSION=$(node -v)
        log_info "Node.js installed: ${NODE_VERSION}"
    else
        missing_tools+=("Node.js (v18+ required)")
    fi
    
    if check_command npm; then
        NPM_VERSION=$(npm -v)
        log_info "npm installed: ${NPM_VERSION}"
    else
        missing_tools+=("npm")
    fi
    
    # Check Git
    if check_command git; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        log_info "Git installed: ${GIT_VERSION}"
    else
        missing_tools+=("Git")
    fi
    
    # Check Make (for playground)
    if check_command make; then
        MAKE_VERSION=$(make --version | head -n1)
        log_info "Make installed: ${MAKE_VERSION}"
    else
        missing_tools+=("Make")
    fi
    
    # Check GCC (for playground C compilation)
    if check_command gcc; then
        GCC_VERSION=$(gcc --version | head -n1)
        log_info "GCC installed: ${GCC_VERSION}"
    else
        missing_tools+=("GCC")
    fi
    
    # Check Python (required for some scripts)
    if check_command python3; then
        PYTHON_VERSION=$(python3 --version)
        log_info "Python3 installed: ${PYTHON_VERSION}"
    else
        missing_tools+=("Python3")
    fi
    
    # Check jq (optional, for JSON processing)
    if check_command jq; then
        JQ_VERSION=$(jq --version)
        log_info "jq installed: ${JQ_VERSION}"
    else
        optional_tools+=("jq (JSON processor)")
    fi
    
    # Report missing tools
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo -e "  ${RED}✗${NC} $tool"
        done
        echo ""
        log_info "Please install missing tools and run this script again."
        echo ""
        log_info "Installation hints:"
        echo "  - Ubuntu/Debian: sudo apt-get install nodejs npm git make gcc python3 jq"
        echo "  - Fedora: sudo dnf install nodejs npm git make gcc python3 jq"
        echo "  - macOS: brew install node git make jq"
        echo "  - Windows (WSL): wsl --install"
        exit 1
    fi
    
    # Report optional tools
    if [ ${#optional_tools[@]} -ne 0 ]; then
        log_warning "Optional tools not found (will be installed if needed):"
        for tool in "${optional_tools[@]}"; do
            echo -e "  ${YELLOW}○${NC} $tool"
        done
        echo ""
    fi
    
    log_success "All prerequisites met!"
}

# =============================================================================
# Install System Dependencies (Linux/macOS)
# =============================================================================

install_system_deps() {
    log_info "Checking and installing system dependencies..."
    
    # Detect OS
    local OS_TYPE=$(uname -s)
    local NEED_JQ=false
    local NEED_PLAYWRIGHT_DEPS=false
    
    # Check if jq is installed
    if ! check_command jq; then
        NEED_JQ=true
    fi
    
    # Install jq if needed
    if [ "$NEED_JQ" = true ]; then
        log_info "Installing jq..."
        case "$OS_TYPE" in
            Linux*)
                if [ -f /etc/debian_version ]; then
                    sudo apt-get update && sudo apt-get install -y jq
                elif [ -f /etc/redhat-release ]; then
                    sudo dnf install -y jq
                else
                    log_warning "Unknown Linux distribution. Please install jq manually."
                fi
                ;;
            Darwin*)
                brew install jq
                ;;
            *)
                log_warning "Unknown OS. Please install jq manually."
                ;;
        esac
    fi
    
    log_success "System dependencies installed"
}

# =============================================================================
# Install VS Code Extension Dependencies
# =============================================================================

install_extension_deps() {
    log_info "Installing VS Code extension dependencies..."
    
    local EXT_DIR="${PROJECT_ROOT}/ai-debug-proxy"
    
    if [ ! -d "${EXT_DIR}" ]; then
        log_error "Extension directory not found: ${EXT_DIR}"
        exit 1
    fi
    
    cd "${EXT_DIR}"
    
    # Check for .nvmrc and use appropriate Node version
    if [ -f ".nvmrc" ]; then
        REQUIRED_NODE=$(cat .nvmrc)
        CURRENT_NODE=$(node -v)
        log_info "Required Node version: ${REQUIRED_NODE}, Current: ${CURRENT_NODE}"
        
        if [ "${REQUIRED_NODE}" != "${CURRENT_NODE}" ]; then
            log_warning "Node version mismatch. Consider running: nvm install && nvm use"
        fi
    fi
    
    # Install dependencies based on lock file
    if [ -f "pnpm-lock.yaml" ]; then
        log_info "Found pnpm-lock.yaml, using pnpm..."
        if check_command pnpm; then
            pnpm install
            log_success "Installed dependencies with pnpm"
        else
            log_warning "pnpm not found. Installing pnpm globally..."
            npm install -g pnpm
            pnpm install
            log_success "Installed pnpm and project dependencies"
        fi
    elif [ -f "package-lock.json" ]; then
        log_info "Found package-lock.json, using npm..."
        npm ci
        log_success "Installed dependencies with npm"
    elif [ -f "package.json" ]; then
        log_info "Found package.json, using npm..."
        npm install
        log_success "Installed dependencies with npm"
    else
        log_error "No package manager config found in ${EXT_DIR}"
        exit 1
    fi
    
    cd "${PROJECT_ROOT}"
}

# =============================================================================
# Build Extension
# =============================================================================

build_extension() {
    log_info "Building VS Code extension..."
    
    local EXT_DIR="${PROJECT_ROOT}/ai-debug-proxy"
    cd "${EXT_DIR}"
    
    if [ -f "package.json" ]; then
        # Check if build script exists
        if npm run | grep -q "compile"; then
            npm run compile
            log_success "Extension built successfully"
        else
            log_warning "No compile script found, skipping build"
        fi
    fi
    
    cd "${PROJECT_ROOT}"
}

# =============================================================================
# Install Playwright Browsers
# =============================================================================

install_playwright_browsers() {
    log_info "Installing Playwright browsers for E2E testing..."
    
    local EXT_DIR="${PROJECT_ROOT}/ai-debug-proxy"
    cd "${EXT_DIR}"
    
    # Check if Playwright is installed
    if [ -f "package.json" ] && npm run | grep -q "test:e2e"; then
        log_info "Playwright detected. Installing browsers..."
        
        # Install Playwright browsers (Chromium, Firefox, WebKit)
        if check_command pnpm; then
            pnpm exec playwright install --with-deps chromium 2>/dev/null || \
            npx playwright install --with-deps chromium || \
            log_warning "Failed to install Playwright browsers automatically"
        else
            npx playwright install --with-deps chromium || \
            log_warning "Failed to install Playwright browsers automatically"
        fi
        
        log_success "Playwright browsers installed"
    else
        log_info "Playwright not detected, skipping browser installation"
    fi
    
    cd "${PROJECT_ROOT}"
}

# =============================================================================
# Install Playground Dependencies
# =============================================================================

install_playground_deps() {
    log_info "Setting up playground (embedded C project)..."
    
    local PLAYGROUND_DIR="${PROJECT_ROOT}/playground"
    
    if [ ! -d "${PLAYGROUND_DIR}" ]; then
        log_warning "Playground directory not found: ${PLAYGROUND_DIR}"
        return 0
    fi
    
    cd "${PLAYGROUND_DIR}"
    
    # Check if Makefile exists
    if [ -f "Makefile" ]; then
        log_info "Building playground project..."
        make clean 2>/dev/null || true
        make
        log_success "Playground built successfully"
    else
        log_warning "No Makefile found in playground, skipping build"
    fi
    
    cd "${PROJECT_ROOT}"
}

# =============================================================================
# Install Python Dependencies
# =============================================================================

install_python_deps() {
    log_info "Installing Python dependencies..."
    
    # Check if Python 3 is available
    if ! check_command python3; then
        log_warning "Python3 not found, skipping Python dependencies"
        return 0
    fi
    
    # Check for pip
    if ! python3 -m pip --version &>/dev/null; then
        log_warning "pip not found. Installing Python dependencies may fail."
    fi
    
    # Install Python packages for testing
    local PY_PACKAGES=(
        "pytest"
        "requests"
    )
    
    log_info "Installing Python packages: ${PY_PACKAGES[*]}"
    
    if check_command pip3; then
        pip3 install --user "${PY_PACKAGES[@]}" || \
        log_warning "Failed to install some Python packages"
    elif python3 -m pip --version &>/dev/null; then
        python3 -m pip install --user "${PY_PACKAGES[@]}" || \
        log_warning "Failed to install some Python packages"
    else
        log_warning "Cannot install Python packages without pip"
    fi
    
    log_success "Python dependencies installed"
}

# =============================================================================
# Setup Git Hooks (Optional)
# =============================================================================

setup_git_hooks() {
    log_info "Setting up Git hooks..."
    
    if [ -d "${PROJECT_ROOT}/.git" ]; then
        # Create pre-commit hook if it doesn't exist
        local HOOKS_DIR="${PROJECT_ROOT}/.git/hooks"
        local PRE_COMMIT_HOOK="${HOOKS_DIR}/pre-commit"
        
        if [ ! -f "${PRE_COMMIT_HOOK}" ]; then
            cat > "${PRE_COMMIT_HOOK}" << 'EOF'
#!/bin/bash
# Pre-commit hook: Run linting before commit

echo "Running pre-commit checks..."

# Check if ai-debug-proxy has lint script
if [ -f "ai-debug-proxy/package.json" ]; then
    cd ai-debug-proxy
    if npm run | grep -q "lint"; then
        npm run lint || {
            echo "Linting failed. Commit aborted."
            exit 1
        }
    fi
    cd ..
fi

echo "Pre-commit checks passed."
exit 0
EOF
            chmod +x "${PRE_COMMIT_HOOK}"
            log_success "Pre-commit hook installed"
        else
            log_warning "Pre-commit hook already exists"
        fi
    else
        log_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# =============================================================================
# Create .env from .env.example
# =============================================================================

setup_env() {
    log_info "Setting up environment variables..."
    
    if [ -f "${PROJECT_ROOT}/.env.example" ] && [ ! -f "${PROJECT_ROOT}/.env" ]; then
        cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"
        log_success "Created .env from .env.example"
        log_warning "Please review and update ${PROJECT_ROOT}/.env with your settings"
    elif [ -f "${PROJECT_ROOT}/.env" ]; then
        log_info ".env already exists, skipping"
    else
        log_warning "No .env.example found"
    fi
}

# =============================================================================
# Run Tests (Optional)
# =============================================================================

run_tests() {
    if [ "$1" == "--test" ]; then
        log_info "Running tests..."
        
        # Extension unit tests
        local EXT_DIR="${PROJECT_ROOT}/ai-debug-proxy"
        cd "${EXT_DIR}"
        
        if npm run | grep -q "test"; then
            log_info "Running unit tests..."
            npm test || log_warning "Some unit tests failed"
        fi
        
        if npm run | grep -q "test:e2e"; then
            log_info "Running E2E tests..."
            npm run test:e2e || log_warning "Some E2E tests failed"
        fi
        
        cd "${PROJECT_ROOT}"
        
        # Playground tests
        if [ -d "${PROJECT_ROOT}/playground" ]; then
            cd "${PROJECT_ROOT}/playground"
            if [ -f "Makefile" ] && make run --dry-run &>/dev/null; then
                log_info "Running playground simulation..."
                timeout 5 make run || log_warning "Playground simulation failed"
            fi
            cd "${PROJECT_ROOT}"
        fi
        
        log_success "Tests completed"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=================================================="
    echo "  AI VS Code Debug - Setup Script"
    echo "=================================================="
    echo ""
    
    log_info "Project root: ${PROJECT_ROOT}"
    echo ""
    
    # Step 1: Check prerequisites
    check_prerequisites
    echo ""
    
    # Step 2: Setup environment
    setup_env
    echo ""
    
    # Step 3: Install system dependencies (jq, etc.)
    install_system_deps
    echo ""
    
    # Step 4: Install extension dependencies
    install_extension_deps
    echo ""
    
    # Step 5: Install Playwright browsers
    install_playwright_browsers
    echo ""
    
    # Step 6: Build extension
    build_extension
    echo ""
    
    # Step 7: Install Python dependencies
    install_python_deps
    echo ""
    
    # Step 8: Setup playground
    install_playground_deps
    echo ""
    
    # Step 9: Setup Git hooks
    setup_git_hooks
    echo ""
    
    # Step 10: Optional tests
    run_tests "$1"
    echo ""
    
    # Summary
    echo "=================================================="
    log_success "Setup completed successfully!"
    echo "=================================================="
    echo ""
    echo "Next steps:"
    echo "  1. Review .env file and update with your settings"
    echo "  2. Open ai-debug-proxy in VS Code"
    echo "  3. Press F5 to run the extension in development mode"
    echo "  4. Or run: cd ai-debug-proxy && npm run watch"
    echo ""
    echo "For playground:"
    echo "  - cd playground && make run"
    echo "  - cd playground && make debug"
    echo ""
    echo "Testing:"
    echo "  - Unit tests: cd ai-debug-proxy && npm test"
    echo "  - E2E tests: cd ai-debug-proxy && npm run test:e2e"
    echo ""
    echo "Documentation:"
    echo "  - README.md"
    echo "  - docs/"
    echo ""
}

# Run main function with all arguments
main "$@"
