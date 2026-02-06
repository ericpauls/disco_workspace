@echo off
REM ==============================================================================
REM DiSCO WORKSPACE - UNIFIED START SCRIPT (Windows)
REM ==============================================================================
REM
REM DESCRIPTION:
REM   Starts the DiSCO orchestration dashboard which manages all 3 services:
REM   - Surrogate Server (port 8765) - API server + data stores
REM   - Data Emulator (port 8766) - Scenario simulation
REM   - Client UI (port 3000) - React visualization
REM
REM   The dashboard (port 8080) auto-starts all services and provides a web UI
REM   for monitoring and controlling the workspace.
REM
REM USAGE:
REM   start.bat [OPTIONS]
REM
REM OPTIONS:
REM   --dashboard-only      Start only the dashboard (don't auto-start services)
REM   --scenario NAME       Emulator scenario (default: density-gradient)
REM   --skip-install        Skip npm install prompts
REM   --force-install       Force npm install for all projects
REM   --no-browser          Don't open browser automatically
REM   --help, -h            Show help message
REM
REM ==============================================================================

setlocal EnableDelayedExpansion

REM ==============================================================================
REM CONFIGURATION DEFAULTS
REM ==============================================================================

set "DASHBOARD_PORT=8080"
set "SERVER_PORT=8765"
set "EMULATOR_PORT=8766"
set "CLIENT_PORT=3000"
set "SCENARIO=density-gradient"
set "SKIP_INSTALL=false"
set "FORCE_INSTALL=false"
set "OPEN_BROWSER=true"
set "DASHBOARD_ONLY=false"

REM Script directory (where this script lives)
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Project directories
set "DASHBOARD_DIR=%SCRIPT_DIR%\dashboard"
set "SERVER_DIR=%SCRIPT_DIR%\disco_surrogate_server"
set "EMULATOR_DIR=%SCRIPT_DIR%\disco_data_emulator"
set "CLIENT_DIR=%SCRIPT_DIR%\disco_live_world_client_ui"

REM ==============================================================================
REM ARGUMENT PARSING
REM ==============================================================================

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--dashboard-only" (
    set "DASHBOARD_ONLY=true"
    shift
    goto :parse_args
)
if /i "%~1"=="--scenario" (
    set "SCENARIO=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--skip-install" (
    set "SKIP_INSTALL=true"
    shift
    goto :parse_args
)
if /i "%~1"=="--force-install" (
    set "FORCE_INSTALL=true"
    shift
    goto :parse_args
)
if /i "%~1"=="--no-browser" (
    set "OPEN_BROWSER=false"
    shift
    goto :parse_args
)
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
echo [WARN] Unknown option: %~1
shift
goto :parse_args

:args_done

REM ==============================================================================
REM MAIN EXECUTION
REM ==============================================================================

echo.
echo ========================================
echo      DiSCO Workspace Launcher
echo ========================================
echo.
echo   Dashboard:  :%DASHBOARD_PORT%
echo   Server:     :%SERVER_PORT%
echo   Emulator:   :%EMULATOR_PORT%
echo   Client:     :%CLIENT_PORT%
echo   Scenario:   %SCENARIO%
echo.

REM Pre-flight checks
call :check_dependencies
if errorlevel 1 goto :error_exit

call :check_and_clean_ports
if errorlevel 1 goto :error_exit

REM Start dashboard
call :start_dashboard
if errorlevel 1 goto :error_exit

REM Auto-start services via dashboard API
call :auto_start_services

REM Open browser
call :open_browser

REM Show status
call :show_status

REM Keep script running - wait for user to press Ctrl+C
echo.
echo Press Ctrl+C to stop all services...
echo.

:wait_loop
timeout /t 5 /nobreak >nul 2>&1
goto :wait_loop

goto :eof

REM ==============================================================================
REM HELP FUNCTION
REM ==============================================================================

:show_help
echo DiSCO Workspace - Unified Start Script (Windows)
echo.
echo Usage: start.bat [OPTIONS]
echo.
echo Starts the orchestration dashboard which manages all 3 services:
echo   - Surrogate Server (port 8765)
echo   - Data Emulator (port 8766)
echo   - Client UI (port 3000)
echo.
echo Options:
echo   --dashboard-only      Start only the dashboard (don't auto-start services)
echo   --scenario NAME       Emulator scenario (default: density-gradient)
echo   --skip-install        Skip npm install prompts (fail if deps missing)
echo   --force-install       Force npm install for all projects
echo   --no-browser          Don't open browser automatically
echo   --help, -h            Show this help message
echo.
echo Available Scenarios:
echo   density-gradient      10 endpoints through dense cluster @ 36x speed (default)
echo   endpoint-test         3 DiSCO endpoints + 100 entities
echo   stress-tiny           100 entities
echo   stress-tiny-fast      100 entities @ 1000x speed
echo   stress-small          1,000 entities
echo   stress-small-fast     1,000 entities @ 1000x speed
echo   stress-medium         5,000 entities
echo   stress-large          10,000 entities
echo   stress-extreme        25,000 entities
echo   contested-maritime    80 entities (realistic scenario)
echo.
echo Examples:
echo   start.bat                                  # Default configuration
echo   start.bat --scenario endpoint-test         # Endpoint test scenario
echo   start.bat --dashboard-only                 # Dashboard without auto-start
echo   start.bat --force-install                  # Reinstall all dependencies
echo.
goto :eof

REM ==============================================================================
REM DEPENDENCY MANAGEMENT FUNCTIONS
REM ==============================================================================

:check_dependencies
echo.
echo === Checking Dependencies ===
echo.

REM Check all project directories exist
if not exist "%DASHBOARD_DIR%" (
    echo [ERROR] Dashboard directory not found: %DASHBOARD_DIR%
    exit /b 1
)
if not exist "%SERVER_DIR%" (
    echo [ERROR] Surrogate Server directory not found: %SERVER_DIR%
    echo [INFO] Did you forget to initialize submodules? Run: git submodule update --init
    exit /b 1
)
if not exist "%EMULATOR_DIR%" (
    echo [ERROR] Data Emulator directory not found: %EMULATOR_DIR%
    echo [INFO] Did you forget to initialize submodules? Run: git submodule update --init
    exit /b 1
)
if not exist "%CLIENT_DIR%" (
    echo [ERROR] Client UI directory not found: %CLIENT_DIR%
    echo [INFO] Did you forget to initialize submodules? Run: git submodule update --init
    exit /b 1
)

set "DASHBOARD_NEEDS_INSTALL=false"
set "SERVER_NEEDS_INSTALL=false"
set "CLIENT_NEEDS_INSTALL=false"

REM Check dashboard dependencies
if "%FORCE_INSTALL%"=="true" (
    set "DASHBOARD_NEEDS_INSTALL=true"
) else (
    if exist "%DASHBOARD_DIR%\node_modules" (
        echo [OK] Dashboard dependencies found
    ) else (
        echo [WARN] Dashboard dependencies missing
        set "DASHBOARD_NEEDS_INSTALL=true"
    )
)

REM Check server dependencies
if "%FORCE_INSTALL%"=="true" (
    set "SERVER_NEEDS_INSTALL=true"
) else (
    if exist "%SERVER_DIR%\node_modules" (
        echo [OK] Surrogate Server dependencies found
    ) else (
        echo [WARN] Surrogate Server dependencies missing
        set "SERVER_NEEDS_INSTALL=true"
    )
)

REM Check emulator dependencies (Python .venv)
set "EMULATOR_PYTHON_NEEDS_INSTALL=false"
if "%FORCE_INSTALL%"=="true" (
    set "EMULATOR_PYTHON_NEEDS_INSTALL=true"
) else (
    if exist "%EMULATOR_DIR%\.venv\Scripts\python.exe" (
        echo [OK] Data Emulator Python environment found
    ) else (
        echo [WARN] Data Emulator Python environment missing (.venv)
        set "EMULATOR_PYTHON_NEEDS_INSTALL=true"
    )
)

REM Check client dependencies
if "%FORCE_INSTALL%"=="true" (
    set "CLIENT_NEEDS_INSTALL=true"
) else (
    if exist "%CLIENT_DIR%\node_modules" (
        echo [OK] Client UI dependencies found
    ) else (
        echo [WARN] Client UI dependencies missing
        set "CLIENT_NEEDS_INSTALL=true"
    )
)

if "%FORCE_INSTALL%"=="true" echo [INFO] Force install requested for all projects

REM Check if any npm projects need install
set "ANY_NEED_INSTALL=false"
if "%DASHBOARD_NEEDS_INSTALL%"=="true" set "ANY_NEED_INSTALL=true"
if "%SERVER_NEEDS_INSTALL%"=="true" set "ANY_NEED_INSTALL=true"
if "%CLIENT_NEEDS_INSTALL%"=="true" set "ANY_NEED_INSTALL=true"

if not "%ANY_NEED_INSTALL%"=="true" goto :dependencies_ok

echo.

if "%SKIP_INSTALL%"=="true" (
    echo [ERROR] Dependencies missing and --skip-install was specified
    exit /b 1
)

if not "%FORCE_INSTALL%"=="true" (
    echo Some dependencies need to be installed.
    set /p "REPLY=Install now? (Y/n): "
    if /i "!REPLY!"=="n" (
        echo [ERROR] Cannot proceed without dependencies
        exit /b 1
    )
)

REM Install dashboard dependencies
if "%DASHBOARD_NEEDS_INSTALL%"=="true" (
    echo [INFO] Installing dependencies for Dashboard...
    pushd "%DASHBOARD_DIR%"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Failed to install Dashboard dependencies
        exit /b 1
    )
    popd
    echo [OK] Dashboard dependencies installed
)

REM Install server dependencies
if "%SERVER_NEEDS_INSTALL%"=="true" (
    echo [INFO] Installing dependencies for Surrogate Server...
    pushd "%SERVER_DIR%"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Failed to install Surrogate Server dependencies
        exit /b 1
    )
    popd
    echo [OK] Surrogate Server dependencies installed
)

REM Install client dependencies
if "%CLIENT_NEEDS_INSTALL%"=="true" (
    echo [INFO] Installing dependencies for Client UI...
    pushd "%CLIENT_DIR%"
    REM Skip Puppeteer browser downloads - avoids SSL issues on corporate networks
    set "PUPPETEER_SKIP_DOWNLOAD=true"
    set "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Failed to install Client UI dependencies
        exit /b 1
    )
    popd
    echo [OK] Client UI dependencies installed
)

:dependencies_ok

REM --- Check Python dependencies for Data Emulator ---
if not "%EMULATOR_PYTHON_NEEDS_INSTALL%"=="true" goto :python_deps_ok

echo.
echo [INFO] Data Emulator requires Python. Checking...

REM Check Python is available
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3 is not installed or not in PATH.
    echo [INFO] Install Python 3.10+ from https://www.python.org/downloads/
    exit /b 1
)

if "%SKIP_INSTALL%"=="true" (
    echo [ERROR] Python environment missing and --skip-install was specified
    exit /b 1
)

if not "%FORCE_INSTALL%"=="true" (
    echo Data Emulator Python environment needs to be set up.
    set /p "REPLY=Create .venv and install dependencies now? (Y/n): "
    if /i "!REPLY!"=="n" (
        echo [ERROR] Cannot proceed without Python dependencies
        exit /b 1
    )
)

echo [INFO] Creating Python virtual environment for Data Emulator...
pushd "%EMULATOR_DIR%"
python -m venv .venv
if errorlevel 1 (
    popd
    echo [ERROR] Failed to create virtual environment
    exit /b 1
)
echo [INFO] Installing Python dependencies...
.venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 (
    popd
    echo [ERROR] Failed to install Python dependencies
    exit /b 1
)
popd
echo [OK] Data Emulator Python dependencies installed

:python_deps_ok
exit /b 0

REM ==============================================================================
REM PORT MANAGEMENT FUNCTIONS
REM ==============================================================================

:check_and_clean_ports
echo.
echo === Checking Ports ===
echo.

set "ANY_IN_USE=false"

REM Check all 4 ports
for %%P in (%DASHBOARD_PORT% %SERVER_PORT% %EMULATOR_PORT% %CLIENT_PORT%) do (
    call :check_port %%P
    if "!PORT_IN_USE!"=="true" (
        set "ANY_IN_USE=true"
        echo [WARN] Port %%P is in use
    ) else (
        echo [OK] Port %%P is available
    )
)

if not "%ANY_IN_USE%"=="true" goto :ports_done

echo.
echo [INFO] Stopping existing processes for clean start...

for %%P in (%DASHBOARD_PORT% %SERVER_PORT% %EMULATOR_PORT% %CLIENT_PORT%) do (
    call :check_port %%P
    if "!PORT_IN_USE!"=="true" call :kill_port %%P
)

:ports_done
exit /b 0

:check_port
set "PORT_IN_USE=false"
netstat -ano | findstr /r ":%~1 .*LISTENING" >nul 2>&1
if not errorlevel 1 set "PORT_IN_USE=true"
goto :eof

:kill_port
REM Find and kill process on port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r ":%~1 .*LISTENING" 2^>nul') do (
    echo [WARN] Killing process on port %~1 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>&1
goto :eof

REM ==============================================================================
REM DASHBOARD MANAGEMENT
REM ==============================================================================

:start_dashboard
echo.
echo === Starting Dashboard ===
echo.

echo [INFO] Starting DiSCO orchestration dashboard on port %DASHBOARD_PORT%...

REM Start dashboard in a new window
start "DiSCO Dashboard" /D "%DASHBOARD_DIR%" cmd /c "set DASHBOARD_PORT=%DASHBOARD_PORT% && npx tsx server.ts"

REM Wait for dashboard to be ready
echo [INFO] Waiting for dashboard to be ready...

set "MAX_ATTEMPTS=15"
set "ATTEMPT=0"

:wait_loop_dashboard
if %ATTEMPT% geq %MAX_ATTEMPTS% (
    echo [ERROR] Dashboard failed to start within %MAX_ATTEMPTS% seconds
    exit /b 1
)

curl -s --connect-timeout 1 "http://127.0.0.1:%DASHBOARD_PORT%/api/health" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Dashboard is ready!
    exit /b 0
)

timeout /t 1 /nobreak >nul 2>&1
set /a "ATTEMPT+=1"
goto :wait_loop_dashboard

REM ==============================================================================
REM AUTO-START SERVICES
REM ==============================================================================

:auto_start_services
if "%DASHBOARD_ONLY%"=="true" (
    echo [INFO] Dashboard-only mode - services will not be auto-started
    goto :eof
)

echo.
echo === Auto-Starting Services ===
echo.

echo [INFO] Starting all services via dashboard API...

curl -s -X POST "http://127.0.0.1:%DASHBOARD_PORT%/api/services/startAll" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Services start initiated
) else (
    echo [WARN] Could not auto-start services
)

REM Wait for services to become healthy
echo [INFO] Waiting for services to become ready...

set "MAX_WAIT=30"
set "WAITED=0"

:wait_services_loop
if %WAITED% geq %MAX_WAIT% goto :services_timeout

REM Check health via dashboard
for /f "delims=" %%i in ('curl -s "http://127.0.0.1:%DASHBOARD_PORT%/api/health" 2^>nul') do set "HEALTH=%%i"

REM Simple check: see if both "server" and "emulator" report as "running"
echo !HEALTH! | findstr /c:"\"server\":\"running\"" >nul 2>&1
if errorlevel 1 goto :services_not_ready

echo !HEALTH! | findstr /c:"\"emulator\":\"running\"" >nul 2>&1
if errorlevel 1 goto :services_not_ready

echo [OK] All services are running!
goto :eof

:services_not_ready
timeout /t 2 /nobreak >nul 2>&1
set /a "WAITED+=2"

set /a "MOD=WAITED %% 10"
if %MOD%==0 echo [INFO] Still waiting... (%WAITED%s)

goto :wait_services_loop

:services_timeout
echo [WARN] Some services may still be starting. Check the dashboard for status.
goto :eof

REM ==============================================================================
REM BROWSER FUNCTION
REM ==============================================================================

:open_browser
if not "%OPEN_BROWSER%"=="true" goto :eof

echo [INFO] Opening browser...

set "DASHBOARD_URL=http://127.0.0.1:%DASHBOARD_PORT%"

REM Open dashboard in default browser
start "" "%DASHBOARD_URL%"

goto :eof

REM ==============================================================================
REM STATUS FUNCTION
REM ==============================================================================

:show_status
echo.
echo === DiSCO Workspace Running ===
echo.
echo   Dashboard:  http://127.0.0.1:%DASHBOARD_PORT%
echo   Server:     http://127.0.0.1:%SERVER_PORT%/apidocs
echo   Emulator:   http://127.0.0.1:%EMULATOR_PORT%/api
echo   Client:     http://127.0.0.1:%CLIENT_PORT%
echo.
echo   Server Dashboard:  http://127.0.0.1:%SERVER_PORT%/dashboard
echo.
goto :eof

REM ==============================================================================
REM ERROR EXIT
REM ==============================================================================

:error_exit
echo.
echo [ERROR] Startup failed. Please check the errors above.
pause
exit /b 1
