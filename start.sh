#!/bin/bash
# ==============================================================================
# DiSCO WORKSPACE - UNIFIED START SCRIPT
# ==============================================================================
#
# DESCRIPTION:
#   Starts the DiSCO orchestration dashboard which manages all 3 services:
#   - Surrogate Server (port 8765) - API server + data stores
#   - Data Emulator (port 8766) - Scenario simulation
#   - Client UI (port 3000) - React visualization
#
#   The dashboard (port 8080) auto-starts all services and provides a web UI
#   for monitoring and controlling the workspace.
#
# USAGE:
#   ./start.sh [OPTIONS]
#
# OPTIONS:
#   --dashboard-only      Start only the dashboard (don't auto-start services)
#   --skip-install        Skip npm install prompts
#   --force-install       Force npm install for all projects
#   --no-browser          Don't open browser automatically
#   --help, -h            Show help message
#
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURATION DEFAULTS
# ==============================================================================

DASHBOARD_PORT=8080
SERVER_PORT=8765
EMULATOR_PORT=8766
CLIENT_PORT=3000
SKIP_INSTALL=false
FORCE_INSTALL=false
OPEN_BROWSER=true
DASHBOARD_ONLY=false

# Script directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project directories
DASHBOARD_DIR="${SCRIPT_DIR}/dashboard"
SERVER_DIR="${SCRIPT_DIR}/disco_surrogate_server"
EMULATOR_DIR="${SCRIPT_DIR}/disco_data_emulator"
CLIENT_DIR="${SCRIPT_DIR}/disco_live_world_client_ui"

# Process ID
DASHBOARD_PID=""

# ==============================================================================
# TERMINAL OUTPUT COLORS
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
print_header()  { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

# ==============================================================================
# PORT MANAGEMENT FUNCTIONS
# ==============================================================================

is_port_in_use() {
    local port=$1
    lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1
}

get_pid_on_port() {
    local port=$1
    lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null || echo ""
}

get_process_name() {
    local pid=$1
    ps -p "$pid" -o comm= 2>/dev/null || echo "unknown"
}

kill_process_on_port() {
    local port=$1
    local pid
    pid=$(get_pid_on_port "$port")

    if [[ -n "$pid" ]]; then
        local process_name
        process_name=$(get_process_name "$pid")
        print_warning "Killing process '$process_name' (PID: $pid) on port $port"
        kill "$pid" 2>/dev/null || true

        local count=0
        while is_port_in_use "$port" && [[ $count -lt 50 ]]; do
            sleep 0.1
            ((count++))
        done

        if is_port_in_use "$port"; then
            print_warning "Process not responding, force killing..."
            kill -9 "$pid" 2>/dev/null || true
            sleep 0.5
        fi

        if is_port_in_use "$port"; then
            print_error "Failed to free port $port"
            return 1
        fi

        print_success "Port $port is now free"
    fi
    return 0
}

check_and_clean_ports() {
    print_header "Checking Ports"

    local ports_to_check=("$DASHBOARD_PORT" "$SERVER_PORT" "$EMULATOR_PORT" "$CLIENT_PORT")
    local any_in_use=false

    for port in "${ports_to_check[@]}"; do
        if is_port_in_use "$port"; then
            any_in_use=true
            local pid process_name
            pid=$(get_pid_on_port "$port")
            process_name=$(get_process_name "$pid")
            print_warning "Port $port is in use by '$process_name' (PID: $pid)"
        else
            print_success "Port $port is available"
        fi
    done

    if [[ "$any_in_use" == true ]]; then
        echo ""
        print_info "Stopping existing processes for clean start..."

        for port in "${ports_to_check[@]}"; do
            if is_port_in_use "$port"; then
                if ! kill_process_on_port "$port"; then
                    print_error "Cannot free port $port. Please close the application manually."
                    exit 1
                fi
            fi
        done
    fi
}

# ==============================================================================
# SUBMODULE MANAGEMENT
# ==============================================================================

check_submodules() {
    # Only relevant inside a git repo
    if [[ ! -d "${SCRIPT_DIR}/.git" ]]; then
        return 0
    fi

    print_header "Checking Git Submodules"

    local submodules=("disco_data_emulator" "disco_live_world_client_ui" "disco_surrogate_server")
    local needs_init=false

    for sub in "${submodules[@]}"; do
        local sub_dir="${SCRIPT_DIR}/${sub}"
        # A properly initialized submodule has a .git file (not directory) pointing to parent
        if [[ ! -f "${sub_dir}/.git" ]] && [[ ! -d "${sub_dir}/.git" ]]; then
            print_warning "Submodule '${sub}' is not initialized"
            needs_init=true
        elif [[ -z "$(ls -A "${sub_dir}" 2>/dev/null)" ]]; then
            print_warning "Submodule '${sub}' directory is empty"
            needs_init=true
        else
            print_success "Submodule '${sub}' is initialized"
        fi
    done

    if [[ "$needs_init" == true ]]; then
        echo ""
        echo -e "${YELLOW}Some git submodules need to be initialized.${NC}"
        echo -e "${YELLOW}This is normal for a first-time clone or after switching branches.${NC}"
        read -p "Run 'git submodule update --init --recursive'? (Y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            print_info "Initializing submodules..."
            if (cd "$SCRIPT_DIR" && git submodule update --init --recursive); then
                print_success "Submodules initialized successfully"
            else
                print_error "Failed to initialize submodules"
                exit 1
            fi
        else
            print_warning "Continuing without submodule init - some services may fail to start"
        fi
    fi
}

# ==============================================================================
# DEPENDENCY MANAGEMENT
# ==============================================================================

has_dependencies() {
    local dir=$1
    [[ -d "${dir}/node_modules" ]] && [[ -n "$(ls -A "${dir}/node_modules" 2>/dev/null)" ]]
}

install_dependencies() {
    local dir=$1
    local name=$2

    print_info "Installing dependencies for $name..."
    if (cd "$dir" && npm install); then
        print_success "$name dependencies installed"
        return 0
    else
        print_error "Failed to install $name dependencies"
        return 1
    fi
}

has_python_dependencies() {
    local dir=$1
    [[ -d "${dir}/.venv" ]] && [[ -f "${dir}/.venv/bin/activate" ]]
}

install_python_dependencies() {
    local dir=$1
    local name=$2

    if [[ ! -d "${dir}/.venv" ]]; then
        print_info "Creating Python virtual environment for $name..."
        if ! python3 -m venv "${dir}/.venv"; then
            print_error "Failed to create virtual environment for $name"
            return 1
        fi
    fi

    print_info "Installing Python dependencies for $name..."
    if (source "${dir}/.venv/bin/activate" && pip install -r "${dir}/requirements.txt"); then
        print_success "$name Python dependencies installed"
        return 0
    else
        print_error "Failed to install $name Python dependencies"
        return 1
    fi
}

check_node_version() {
    local min_major=18
    local recommended="25.2.1"

    if ! command -v node &>/dev/null; then
        print_error "Node.js is not installed or not in PATH"
        print_info "Install Node.js ${min_major}+ from https://nodejs.org/"
        exit 1
    fi

    local node_version
    node_version=$(node --version 2>/dev/null | sed 's/^v//')
    local node_major
    node_major=$(echo "$node_version" | cut -d. -f1)

    if [[ "$node_major" -lt "$min_major" ]]; then
        print_error "Node.js ${node_version} is too old (minimum: ${min_major}.x)"
        print_info "Install Node.js ${min_major}+ from https://nodejs.org/"
        exit 1
    fi

    # Compare against recommended version (used in package.json engines)
    local rec_major rec_minor rec_patch cur_minor cur_patch
    rec_major=$(echo "$recommended" | cut -d. -f1)
    rec_minor=$(echo "$recommended" | cut -d. -f2)
    rec_patch=$(echo "$recommended" | cut -d. -f3)
    cur_minor=$(echo "$node_version" | cut -d. -f2)
    cur_patch=$(echo "$node_version" | cut -d. -f3)

    local below_recommended=false
    if [[ "$node_major" -lt "$rec_major" ]]; then
        below_recommended=true
    elif [[ "$node_major" -eq "$rec_major" ]] && [[ "$cur_minor" -lt "$rec_minor" ]]; then
        below_recommended=true
    elif [[ "$node_major" -eq "$rec_major" ]] && [[ "$cur_minor" -eq "$rec_minor" ]] && [[ "$cur_patch" -lt "$rec_patch" ]]; then
        below_recommended=true
    fi

    if [[ "$below_recommended" == true ]]; then
        print_warning "Node.js ${node_version} (recommended: ${recommended}+)"
        print_info "npm may show EBADENGINE warnings — this is usually fine"
    else
        print_success "Node.js ${node_version}"
    fi
}

check_dependencies() {
    print_header "Checking Dependencies"

    # --- Check Node.js version ---
    check_node_version

    # --- Check that all project directories exist ---
    local all_dirs=(
        "$DASHBOARD_DIR:Dashboard"
        "$SERVER_DIR:Surrogate Server"
        "$EMULATOR_DIR:Data Emulator"
        "$CLIENT_DIR:Client UI"
    )

    for entry in "${all_dirs[@]}"; do
        local dir="${entry%%:*}"
        local name="${entry##*:}"
        if [[ ! -d "$dir" ]]; then
            print_error "$name directory not found: $dir"
            print_info "Did you forget to initialize submodules? Run: git submodule update --init"
            exit 1
        fi
    done

    # --- Check npm dependencies (Dashboard, Surrogate Server, Client UI) ---
    local npm_dirs_to_check=(
        "$DASHBOARD_DIR:Dashboard"
        "$SERVER_DIR:Surrogate Server"
        "$CLIENT_DIR:Client UI"
    )

    local needs_install=()

    for entry in "${npm_dirs_to_check[@]}"; do
        local dir="${entry%%:*}"
        local name="${entry##*:}"

        if has_dependencies "$dir" && [[ "$FORCE_INSTALL" != true ]]; then
            print_success "$name dependencies found"
        else
            if [[ "$FORCE_INSTALL" == true ]]; then
                print_info "Force install: $name"
            else
                print_warning "$name dependencies missing"
            fi
            needs_install+=("$dir:$name")
        fi
    done

    if [[ ${#needs_install[@]} -gt 0 ]]; then
        echo ""

        if [[ "$SKIP_INSTALL" == true ]]; then
            print_error "npm dependencies missing and --skip-install was specified"
            exit 1
        fi

        if [[ "$FORCE_INSTALL" != true ]]; then
            echo -e "${YELLOW}Some npm dependencies need to be installed.${NC}"
            read -p "Install now? (Y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
                print_error "Cannot proceed without dependencies"
                exit 1
            fi
        fi

        for entry in "${needs_install[@]}"; do
            local dir="${entry%%:*}"
            local name="${entry##*:}"
            if ! install_dependencies "$dir" "$name"; then
                exit 1
            fi
        done
    fi

    # --- Check Python dependencies (Data Emulator) ---
    if ! command -v python3 &>/dev/null; then
        print_error "Python 3 is not installed or not in PATH (required for Data Emulator)"
        print_info "Install Python 3.10+ from https://www.python.org/downloads/"
        exit 1
    fi

    if has_python_dependencies "$EMULATOR_DIR" && [[ "$FORCE_INSTALL" != true ]]; then
        # Verify key packages are importable
        local missing_pkgs=""
        for pkg in flask requests shapely; do
            if ! "${EMULATOR_DIR}/.venv/bin/python3" -c "import $pkg" 2>/dev/null; then
                missing_pkgs="$missing_pkgs $pkg"
            fi
        done
        if [[ -n "$missing_pkgs" ]]; then
            print_warning "Data Emulator missing Python packages:${missing_pkgs}"
        else
            print_success "Data Emulator Python dependencies found"
        fi

        if [[ -n "$missing_pkgs" ]]; then
            if [[ "$SKIP_INSTALL" == true ]]; then
                print_error "Python dependencies missing and --skip-install was specified"
                exit 1
            fi
            echo -e "${YELLOW}Some Python packages need to be installed.${NC}"
            read -p "Install now? (Y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
                print_error "Cannot proceed without Python dependencies"
                exit 1
            fi
            if ! install_python_dependencies "$EMULATOR_DIR" "Data Emulator"; then
                exit 1
            fi
        fi
    else
        if [[ "$FORCE_INSTALL" == true ]]; then
            print_info "Force install: Data Emulator (Python)"
        else
            print_warning "Data Emulator Python environment missing (.venv)"
            print_info "First-time setup: The emulator runs on Python/Flask and needs a virtual environment."
            print_info "This will create .venv/ and install: flask, flask-cors, requests, shapely"
        fi

        if [[ "$SKIP_INSTALL" == true ]]; then
            print_error "Python environment missing and --skip-install was specified"
            exit 1
        fi

        if [[ "$FORCE_INSTALL" != true ]]; then
            echo -e "${YELLOW}Data Emulator Python environment needs to be set up.${NC}"
            read -p "Create .venv and install dependencies now? (Y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
                print_error "Cannot proceed without Python dependencies"
                exit 1
            fi
        fi

        if ! install_python_dependencies "$EMULATOR_DIR" "Data Emulator"; then
            exit 1
        fi
    fi
}

# ==============================================================================
# PROCESS MANAGEMENT
# ==============================================================================

cleanup() {
    echo ""
    print_header "Shutting Down"

    if [[ -n "$DASHBOARD_PID" ]] && kill -0 "$DASHBOARD_PID" 2>/dev/null; then
        print_info "Stopping dashboard (PID: $DASHBOARD_PID)..."
        # Dashboard handles cascading shutdown of child services
        kill "$DASHBOARD_PID" 2>/dev/null || true
        sleep 2

        if kill -0 "$DASHBOARD_PID" 2>/dev/null; then
            kill -9 "$DASHBOARD_PID" 2>/dev/null || true
        fi
    fi

    # Clean up any remaining processes on known ports
    for port in "$SERVER_PORT" "$EMULATOR_PORT" "$CLIENT_PORT"; do
        if is_port_in_use "$port"; then
            kill_process_on_port "$port" 2>/dev/null || true
        fi
    done

    print_success "Shutdown complete"
    exit 0
}

start_dashboard() {
    print_header "Starting Dashboard"

    print_info "Starting DiSCO orchestration dashboard on port $DASHBOARD_PORT..."

    (
        cd "$DASHBOARD_DIR"
        DASHBOARD_PORT=$DASHBOARD_PORT npx tsx server.ts
    ) &
    DASHBOARD_PID=$!

    # Wait for dashboard to be ready
    local max_attempts=15
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s --connect-timeout 1 "http://127.0.0.1:${DASHBOARD_PORT}/api/health" >/dev/null 2>&1; then
            print_success "Dashboard is ready!"
            return 0
        fi

        if ! kill -0 "$DASHBOARD_PID" 2>/dev/null; then
            print_error "Dashboard process terminated unexpectedly"
            return 1
        fi

        sleep 1
        ((attempt++))
    done

    print_error "Dashboard failed to start within ${max_attempts} seconds"
    return 1
}

auto_start_services() {
    if [[ "$DASHBOARD_ONLY" == true ]]; then
        print_info "Dashboard-only mode - services will not be auto-started"
        return 0
    fi

    print_header "Auto-Starting Services"

    print_info "Starting all services via dashboard API..."

    local response
    response=$(curl -s -X POST "http://127.0.0.1:${DASHBOARD_PORT}/api/services/startAll" 2>&1)

    if [[ $? -eq 0 ]]; then
        print_success "Services start initiated"
    else
        print_warning "Could not auto-start services: $response"
    fi

    # Wait for services to become healthy
    print_info "Waiting for services to become ready..."
    local max_wait=30
    local waited=0
    local all_ready=false

    while [[ $waited -lt $max_wait ]]; do
        local health
        health=$(curl -s "http://127.0.0.1:${DASHBOARD_PORT}/api/health" 2>/dev/null || echo "{}")

        local server_status emulator_status
        server_status=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('services',{}).get('server','unknown'))" 2>/dev/null || echo "unknown")
        emulator_status=$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('services',{}).get('emulator','unknown'))" 2>/dev/null || echo "unknown")

        if [[ "$server_status" == "running" ]] && [[ "$emulator_status" == "running" ]]; then
            all_ready=true
            break
        fi

        sleep 2
        ((waited += 2))

        if (( waited % 10 == 0 )); then
            print_info "Still waiting... (server: $server_status, emulator: $emulator_status)"
        fi
    done

    if [[ "$all_ready" == true ]]; then
        print_success "All services are running!"
    else
        print_warning "Some services may still be starting. Check the dashboard for status."
    fi
}

open_browser() {
    local dashboard_url="http://127.0.0.1:${DASHBOARD_PORT}"

    if [[ "$OPEN_BROWSER" != true ]]; then
        return 0
    fi

    print_info "Opening Chrome browser..."

    if [[ "$(uname)" == "Darwin" ]]; then
        open -a "Google Chrome" "$dashboard_url" 2>/dev/null || open "$dashboard_url" 2>/dev/null || true
    elif command -v google-chrome &>/dev/null; then
        google-chrome "$dashboard_url" &>/dev/null &
    elif command -v chromium &>/dev/null; then
        chromium "$dashboard_url" &>/dev/null &
    elif command -v xdg-open &>/dev/null; then
        xdg-open "$dashboard_url" &>/dev/null &
    fi
}

show_status() {
    print_header "DiSCO Workspace Running"

    echo -e "  ${GREEN}Dashboard:${NC}  http://127.0.0.1:${DASHBOARD_PORT}"
    echo -e "  ${GREEN}Server:${NC}     http://127.0.0.1:${SERVER_PORT}/apidocs"
    echo -e "  ${GREEN}Emulator:${NC}   http://127.0.0.1:${EMULATOR_PORT}/api"
    echo -e "  ${GREEN}Client:${NC}     http://127.0.0.1:${CLIENT_PORT}"
    echo ""
    echo -e "  ${CYAN}Server Dashboard:${NC}  http://127.0.0.1:${SERVER_PORT}/dashboard"
    echo ""
    echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
}

# ==============================================================================
# ARGUMENT PARSING
# ==============================================================================

show_help() {
    echo "DiSCO Workspace - Unified Start Script"
    echo ""
    echo "Usage: ./start.sh [OPTIONS]"
    echo ""
    echo "Starts the orchestration dashboard which manages all 3 services:"
    echo "  - Surrogate Server (port 8765)"
    echo "  - Data Emulator (port 8766)"
    echo "  - Client UI (port 3000)"
    echo ""
    echo "Options:"
    echo "  --dashboard-only      Start only the dashboard (don't auto-start services)"
    echo "  --skip-install        Skip npm install prompts (fail if deps missing)"
    echo "  --force-install       Force npm install for all projects"
    echo "  --no-browser          Don't open browser automatically"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "The emulator starts idle. Use the dashboard dropdown to select and start"
    echo "a JSON config file. Generate configs with: cd disco_data_emulator && ./generate-config.sh"
    echo ""
    echo "Examples:"
    echo "  ./start.sh                                  # Default configuration"
    echo "  ./start.sh --dashboard-only                 # Dashboard without auto-start"
    echo "  ./start.sh --force-install                  # Reinstall all dependencies"
    echo ""
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dashboard-only)
                DASHBOARD_ONLY=true
                shift
                ;;
            --skip-install)
                SKIP_INSTALL=true
                shift
                ;;
            --force-install)
                FORCE_INSTALL=true
                shift
                ;;
            --no-browser)
                OPEN_BROWSER=false
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_warning "Unknown option: $1"
                shift
                ;;
        esac
    done
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

main() {
    parse_arguments "$@"

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}     DiSCO Workspace Launcher          ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "  Dashboard:  ${GREEN}:${DASHBOARD_PORT}${NC}"
    echo -e "  Server:     ${GREEN}:${SERVER_PORT}${NC}"
    echo -e "  Emulator:   ${GREEN}:${EMULATOR_PORT}${NC}"
    echo -e "  Client:     ${GREEN}:${CLIENT_PORT}${NC}"
    echo ""

    trap cleanup SIGINT SIGTERM

    check_submodules
    check_dependencies
    check_and_clean_ports

    if ! start_dashboard; then
        print_error "Failed to start dashboard"
        cleanup
        exit 1
    fi

    auto_start_services
    open_browser
    show_status

    wait
}

main "$@"
