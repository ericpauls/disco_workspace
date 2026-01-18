#!/bin/bash
# ==============================================================================
# DiSCO WORKSPACE - UNIFIED START SCRIPT
# ==============================================================================
#
# DESCRIPTION:
#   Manages both DiSCO components (server and client) from a single command.
#   Handles dependency verification, port cleanup, process startup, and
#   graceful shutdown.
#
# USAGE:
#   ./start.sh [OPTIONS]
#
# OPTIONS:
#   --server-port PORT    Server port (default: 8765)
#   --client-port PORT    Client port (default: 3000)
#   --scenario NAME       Server scenario (default: endpoint-test)
#   --skip-install        Skip npm install prompts
#   --force-install       Force npm install for both projects
#   --no-browser          Don't open browser automatically
#   --help, -h            Show help message
#
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURATION DEFAULTS
# ==============================================================================

SERVER_PORT=8765
CLIENT_PORT=3000
SCENARIO="endpoint-test"
SKIP_INSTALL=false
FORCE_INSTALL=false
OPEN_BROWSER=true

# Script directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project directories
SERVER_DIR="${SCRIPT_DIR}/disco_data_emulator"
CLIENT_DIR="${SCRIPT_DIR}/disco_live_world_client_ui"

# Process IDs (set during startup, used for cleanup)
SERVER_PID=""
CLIENT_PID=""

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

# Check if a port is in use
is_port_in_use() {
    local port=$1
    if lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Get the PID of process using a port
get_pid_on_port() {
    local port=$1
    lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null || echo ""
}

# Get process name for a PID
get_process_name() {
    local pid=$1
    ps -p "$pid" -o comm= 2>/dev/null || echo "unknown"
}

# Kill process on a specific port
kill_process_on_port() {
    local port=$1
    local pid
    pid=$(get_pid_on_port "$port")

    if [[ -n "$pid" ]]; then
        local process_name
        process_name=$(get_process_name "$pid")
        print_warning "Killing process '$process_name' (PID: $pid) on port $port"

        # Try graceful termination first
        kill "$pid" 2>/dev/null || true

        # Wait up to 5 seconds for process to die
        local count=0
        while is_port_in_use "$port" && [[ $count -lt 50 ]]; do
            sleep 0.1
            ((count++))
        done

        # Force kill if still running
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

# Check and clean ports
check_and_clean_ports() {
    print_header "Checking Ports"

    local ports_to_check=("$SERVER_PORT" "$CLIENT_PORT")
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
# DEPENDENCY MANAGEMENT FUNCTIONS
# ==============================================================================

# Check if node_modules exists and has content
has_dependencies() {
    local dir=$1
    [[ -d "${dir}/node_modules" ]] && [[ -n "$(ls -A "${dir}/node_modules" 2>/dev/null)" ]]
}

# Install dependencies for a project
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

# Check and install dependencies
check_dependencies() {
    print_header "Checking Dependencies"

    local server_needs_install=false
    local client_needs_install=false

    # Check server directory
    if [[ ! -d "$SERVER_DIR" ]]; then
        print_error "Server directory not found: $SERVER_DIR"
        print_info "Did you forget to initialize submodules? Run: git submodule update --init"
        exit 1
    fi

    # Check client directory
    if [[ ! -d "$CLIENT_DIR" ]]; then
        print_error "Client directory not found: $CLIENT_DIR"
        print_info "Did you forget to initialize submodules? Run: git submodule update --init"
        exit 1
    fi

    # Check server dependencies
    if has_dependencies "$SERVER_DIR"; then
        print_success "Server dependencies found"
    else
        print_warning "Server dependencies missing (node_modules not found)"
        server_needs_install=true
    fi

    # Check client dependencies
    if has_dependencies "$CLIENT_DIR"; then
        print_success "Client dependencies found"
    else
        print_warning "Client dependencies missing (node_modules not found)"
        client_needs_install=true
    fi

    # Handle force install
    if [[ "$FORCE_INSTALL" == true ]]; then
        server_needs_install=true
        client_needs_install=true
        print_info "Force install requested"
    fi

    # Install if needed
    if [[ "$server_needs_install" == true ]] || [[ "$client_needs_install" == true ]]; then
        echo ""

        if [[ "$SKIP_INSTALL" == true ]]; then
            print_error "Dependencies missing and --skip-install was specified"
            print_info "Run 'npm install' in both projects first, or omit --skip-install"
            exit 1
        fi

        # Prompt user unless force install
        if [[ "$FORCE_INSTALL" != true ]]; then
            echo -e "${YELLOW}Some dependencies need to be installed.${NC}"
            read -p "Install now? (Y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
                print_error "Cannot proceed without dependencies"
                print_info "Run the following commands manually:"
                [[ "$server_needs_install" == true ]] && echo "  cd $SERVER_DIR && npm install"
                [[ "$client_needs_install" == true ]] && echo "  cd $CLIENT_DIR && npm install"
                exit 1
            fi
        fi

        # Install dependencies
        if [[ "$server_needs_install" == true ]]; then
            if ! install_dependencies "$SERVER_DIR" "Server (disco_data_emulator)"; then
                exit 1
            fi
        fi

        if [[ "$client_needs_install" == true ]]; then
            if ! install_dependencies "$CLIENT_DIR" "Client (disco_live_world_client_ui)"; then
                exit 1
            fi
        fi
    fi
}

# ==============================================================================
# PROCESS MANAGEMENT FUNCTIONS
# ==============================================================================

# Cleanup function called on exit
cleanup() {
    echo ""
    print_header "Shutting Down"

    # Kill client first (depends on server)
    if [[ -n "$CLIENT_PID" ]] && kill -0 "$CLIENT_PID" 2>/dev/null; then
        print_info "Stopping client (PID: $CLIENT_PID)..."
        kill "$CLIENT_PID" 2>/dev/null || true
    fi

    # Kill server
    if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        print_info "Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
    fi

    # Wait for processes to terminate
    sleep 1

    # Force kill if still running
    if [[ -n "$CLIENT_PID" ]] && kill -0 "$CLIENT_PID" 2>/dev/null; then
        kill -9 "$CLIENT_PID" 2>/dev/null || true
    fi

    if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill -9 "$SERVER_PID" 2>/dev/null || true
    fi

    print_success "Shutdown complete"
    exit 0
}

# Wait for server to be ready
wait_for_server() {
    local max_attempts=30
    local attempt=0
    local url="http://127.0.0.1:${SERVER_PORT}/apidocs/health"

    print_info "Waiting for server to be ready..."

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s --connect-timeout 1 "$url" >/dev/null 2>&1; then
            print_success "Server is ready!"
            return 0
        fi

        # Check if server process died
        if ! kill -0 "$SERVER_PID" 2>/dev/null; then
            print_error "Server process terminated unexpectedly"
            return 1
        fi

        sleep 1
        ((attempt++))

        # Show progress every 5 seconds
        if (( attempt % 5 == 0 )); then
            print_info "Still waiting... (${attempt}s)"
        fi
    done

    print_error "Server failed to start within ${max_attempts} seconds"
    return 1
}

# Start the server
start_server() {
    print_header "Starting Server"

    print_info "Starting DiSCO Data Emulator on port $SERVER_PORT..."
    print_info "Scenario: $SCENARIO"

    # Start server in background
    (
        cd "$SERVER_DIR"
        PORT=$SERVER_PORT npx tsx server.ts "$SCENARIO"
    ) &
    SERVER_PID=$!

    # Wait for server to be ready
    if ! wait_for_server; then
        print_error "Failed to start server"
        cleanup
        exit 1
    fi
}

# Start the client
start_client() {
    print_header "Starting Client"

    local server_url="http://127.0.0.1:${SERVER_PORT}/apidocs"

    print_info "Starting DiSCO Client UI on port $CLIENT_PORT..."
    print_info "Connecting to server at $server_url"

    # Start client in background
    (
        cd "$CLIENT_DIR"
        npm run dev -- --port "$CLIENT_PORT"
    ) &
    CLIENT_PID=$!

    # Brief wait to ensure process started
    sleep 2

    # Check if client process is still running
    if ! kill -0 "$CLIENT_PID" 2>/dev/null; then
        print_error "Client failed to start"
        cleanup
        exit 1
    fi

    print_success "Client started!"
}

# Open browser to client UI
open_browser() {
    local url="http://127.0.0.1:${CLIENT_PORT}"

    if [[ "$OPEN_BROWSER" != true ]]; then
        return 0
    fi

    print_info "Opening Chrome browser..."

    # macOS: use open with Chrome
    if [[ "$(uname)" == "Darwin" ]]; then
        open -a "Google Chrome" "$url" 2>/dev/null || open "$url" 2>/dev/null || true
    # Linux: try chrome, then chromium, then xdg-open
    elif command -v google-chrome &>/dev/null; then
        google-chrome "$url" &>/dev/null &
    elif command -v chromium &>/dev/null; then
        chromium "$url" &>/dev/null &
    elif command -v xdg-open &>/dev/null; then
        xdg-open "$url" &>/dev/null &
    fi
}

# Show final status
show_status() {
    print_header "DiSCO Workspace Running"

    echo -e "  ${GREEN}Server:${NC}  http://127.0.0.1:${SERVER_PORT}/apidocs"
    echo -e "  ${GREEN}Client:${NC}  http://127.0.0.1:${CLIENT_PORT}"
    echo ""
    echo -e "  ${CYAN}API Health:${NC}  http://127.0.0.1:${SERVER_PORT}/apidocs/health"
    echo ""
    echo -e "  ${YELLOW}Press Ctrl+C to stop both services${NC}"
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
    echo "Options:"
    echo "  --server-port PORT    Server port (default: 8765)"
    echo "  --client-port PORT    Client port (default: 3000)"
    echo "  --scenario NAME       Server scenario (default: endpoint-test)"
    echo "  --skip-install        Skip npm install prompts (fail if deps missing)"
    echo "  --force-install       Force npm install for both projects"
    echo "  --no-browser          Don't open browser automatically"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Available Scenarios:"
    echo "  endpoint-test         3 DiSCO endpoints + 100 entities (default)"
    echo "  stress-tiny           100 entities"
    echo "  stress-tiny-fast      100 entities @ 1000x speed"
    echo "  stress-small          1,000 entities"
    echo "  stress-small-fast     1,000 entities @ 1000x speed"
    echo "  stress-medium         5,000 entities"
    echo "  stress-large          10,000 entities"
    echo "  stress-extreme        25,000 entities"
    echo "  contested-maritime    80 entities (realistic scenario)"
    echo ""
    echo "Examples:"
    echo "  ./start.sh                                  # Default configuration"
    echo "  ./start.sh --scenario stress-tiny           # Quick test with 100 entities"
    echo "  ./start.sh --server-port 9000               # Custom server port"
    echo "  ./start.sh --force-install                  # Reinstall all dependencies"
    echo ""
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --server-port)
                SERVER_PORT="$2"
                shift 2
                ;;
            --client-port)
                CLIENT_PORT="$2"
                shift 2
                ;;
            --scenario)
                SCENARIO="$2"
                shift 2
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
    # Parse command line arguments
    parse_arguments "$@"

    # Display banner
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}     DiSCO Workspace Launcher          ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "  Server Port:  ${GREEN}$SERVER_PORT${NC}"
    echo -e "  Client Port:  ${GREEN}$CLIENT_PORT${NC}"
    echo -e "  Scenario:     ${GREEN}$SCENARIO${NC}"
    echo ""

    # Set up cleanup trap for Ctrl+C and script exit
    trap cleanup SIGINT SIGTERM

    # Pre-flight checks
    check_dependencies
    check_and_clean_ports

    # Start services
    start_server
    start_client

    # Open browser
    open_browser

    # Show status
    show_status

    # Keep script running and wait for child processes
    wait
}

# Run main function with all arguments
main "$@"
