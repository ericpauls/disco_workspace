@echo off
REM ==============================================================================
REM DiSCO WORKSPACE - UNIFIED START SCRIPT (Windows)
REM ==============================================================================
REM
REM DESCRIPTION:
REM   Manages both DiSCO components (server and client) from a single command.
REM   Handles dependency verification, port cleanup, process startup, and
REM   graceful shutdown.
REM
REM USAGE:
REM   start.bat [OPTIONS]
REM
REM OPTIONS:
REM   --server-port PORT    Server port (default: 8765)
REM   --client-port PORT    Client port (default: 3000)
REM   --scenario NAME       Server scenario (default: density-gradient)
REM   --skip-install        Skip npm install prompts
REM   --force-install       Force npm install for both projects
REM   --no-browser          Don't open browser automatically
REM   --help, -h            Show help message
REM
REM ==============================================================================

setlocal EnableDelayedExpansion

REM ==============================================================================
REM CONFIGURATION DEFAULTS
REM ==============================================================================

set "SERVER_PORT=8765"
set "CLIENT_PORT=3000"
set "SCENARIO=density-gradient"
set "SKIP_INSTALL=false"
set "FORCE_INSTALL=false"
set "OPEN_BROWSER=true"

REM Script directory (where this script lives)
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Project directories
set "SERVER_DIR=%SCRIPT_DIR%\disco_data_emulator"
set "CLIENT_DIR=%SCRIPT_DIR%\disco_live_world_client_ui"

REM ==============================================================================
REM ARGUMENT PARSING
REM ==============================================================================

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--server-port" (
    set "SERVER_PORT=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--client-port" (
    set "CLIENT_PORT=%~2"
    shift
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
echo   Server Port:  %SERVER_PORT%
echo   Client Port:  %CLIENT_PORT%
echo   Scenario:     %SCENARIO%
echo.

REM Pre-flight checks
call :check_dependencies
if errorlevel 1 goto :error_exit

call :check_and_clean_ports
if errorlevel 1 goto :error_exit

REM Start services
call :start_server
if errorlevel 1 goto :error_exit

call :start_client
if errorlevel 1 goto :error_exit

REM Open browser
call :open_browser

REM Show status
call :show_status

REM Keep script running - wait for user to press Ctrl+C
echo.
echo Press Ctrl+C to stop both services...
echo.

REM Wait indefinitely (user presses Ctrl+C to exit)
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
echo Options:
echo   --server-port PORT    Server port (default: 8765)
echo   --client-port PORT    Client port (default: 3000)
echo   --scenario NAME       Server scenario (default: density-gradient)
echo   --skip-install        Skip npm install prompts (fail if deps missing)
echo   --force-install       Force npm install for both projects
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
echo   start.bat --scenario stress-tiny           # Quick test with 100 entities
echo   start.bat --server-port 9000               # Custom server port
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

REM Check server directory
if not exist "%SERVER_DIR%" (
    echo [ERROR] Server directory not found: %SERVER_DIR%
    echo [INFO] Did you forget to initialize submodules? Run: git submodule update --init
    exit /b 1
)

REM Check client directory
if not exist "%CLIENT_DIR%" (
    echo [ERROR] Client directory not found: %CLIENT_DIR%
    echo [INFO] Did you forget to initialize submodules? Run: git submodule update --init
    exit /b 1
)

set "SERVER_NEEDS_INSTALL=false"
set "CLIENT_NEEDS_INSTALL=false"

REM Check server dependencies
if exist "%SERVER_DIR%\node_modules" goto :server_deps_ok
echo [WARN] Server dependencies missing (node_modules not found)
set "SERVER_NEEDS_INSTALL=true"
goto :check_client_deps

:server_deps_ok
echo [OK] Server dependencies found

:check_client_deps
REM Check client dependencies
if exist "%CLIENT_DIR%\node_modules" goto :client_deps_ok
echo [WARN] Client dependencies missing (node_modules not found)
set "CLIENT_NEEDS_INSTALL=true"
goto :check_force_install

:client_deps_ok
echo [OK] Client dependencies found

:check_force_install
REM Handle force install
if not "%FORCE_INSTALL%"=="true" goto :check_if_install_needed
set "SERVER_NEEDS_INSTALL=true"
set "CLIENT_NEEDS_INSTALL=true"
echo [INFO] Force install requested

:check_if_install_needed
REM Install if needed
if "%SERVER_NEEDS_INSTALL%"=="true" goto :needs_install
if "%CLIENT_NEEDS_INSTALL%"=="true" goto :needs_install
goto :dependencies_ok

:needs_install
echo.

if "%SKIP_INSTALL%"=="true" goto :skip_install_error
goto :prompt_install

:skip_install_error
echo [ERROR] Dependencies missing and --skip-install was specified
echo [INFO] Run 'npm install' in both projects first, or omit --skip-install
exit /b 1

:prompt_install
REM Prompt user unless force install
if "%FORCE_INSTALL%"=="true" goto :do_install

echo Some dependencies need to be installed.
set /p "REPLY=Install now? (Y/n): "

REM Default to Y if empty, check for N to decline
if /i "%REPLY%"=="n" goto :install_declined
goto :do_install

:install_declined
echo [ERROR] Cannot proceed without dependencies
echo [INFO] Run the following commands manually:
if "%SERVER_NEEDS_INSTALL%"=="true" echo   cd %SERVER_DIR% ^&^& npm install
if "%CLIENT_NEEDS_INSTALL%"=="true" echo   cd %CLIENT_DIR% ^&^& npm install
exit /b 1

:do_install

REM Install server dependencies
if not "%SERVER_NEEDS_INSTALL%"=="true" goto :install_client
echo [INFO] Installing dependencies for Server (disco_data_emulator)...
pushd "%SERVER_DIR%"
call npm install
if errorlevel 1 goto :server_install_failed
popd
echo [OK] Server dependencies installed
goto :install_client

:server_install_failed
popd
echo [ERROR] Failed to install Server dependencies
exit /b 1

:install_client
REM Install client dependencies
if not "%CLIENT_NEEDS_INSTALL%"=="true" goto :dependencies_ok
echo [INFO] Installing dependencies for Client (disco_live_world_client_ui)...
pushd "%CLIENT_DIR%"
REM Skip Puppeteer browser downloads - avoids SSL issues on corporate networks
set "PUPPETEER_SKIP_DOWNLOAD=true"
set "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
call npm install
if errorlevel 1 goto :client_install_failed
popd
echo [OK] Client dependencies installed
goto :dependencies_ok

:client_install_failed
popd
echo [ERROR] Failed to install Client dependencies
exit /b 1

:dependencies_ok
exit /b 0

REM ==============================================================================
REM PORT MANAGEMENT FUNCTIONS
REM ==============================================================================

:check_and_clean_ports
echo.
echo === Checking Ports ===
echo.

set "ANY_IN_USE=false"

REM Check server port
call :check_port %SERVER_PORT%
if not "%PORT_IN_USE%"=="true" goto :server_port_ok
set "ANY_IN_USE=true"
echo [WARN] Port %SERVER_PORT% is in use
goto :check_client_port

:server_port_ok
echo [OK] Port %SERVER_PORT% is available

:check_client_port
REM Check client port
call :check_port %CLIENT_PORT%
if not "%PORT_IN_USE%"=="true" goto :client_port_ok
set "ANY_IN_USE=true"
echo [WARN] Port %CLIENT_PORT% is in use
goto :ports_checked

:client_port_ok
echo [OK] Port %CLIENT_PORT% is available

:ports_checked
if not "%ANY_IN_USE%"=="true" goto :ports_done
echo.
echo [INFO] Stopping existing processes for clean start...
call :kill_port %SERVER_PORT%
call :kill_port %CLIENT_PORT%

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
REM PROCESS MANAGEMENT FUNCTIONS
REM ==============================================================================

:start_server
echo.
echo === Starting Server ===
echo.

echo [INFO] Starting DiSCO Data Emulator on port %SERVER_PORT%...
echo [INFO] Scenario: %SCENARIO%

REM Start server in new window
start "DiSCO Server" /D "%SERVER_DIR%" cmd /c "set PORT=%SERVER_PORT% && npx tsx server.ts %SCENARIO%"

REM Wait for server to be ready
call :wait_for_server
if errorlevel 1 (
    echo [ERROR] Failed to start server
    exit /b 1
)

exit /b 0

:wait_for_server
echo [INFO] Waiting for server to be ready...

set "MAX_ATTEMPTS=30"
set "ATTEMPT=0"

:wait_loop_server
if %ATTEMPT% geq %MAX_ATTEMPTS% (
    echo [ERROR] Server failed to start within %MAX_ATTEMPTS% seconds
    exit /b 1
)

REM Try to connect to health endpoint
curl -s --connect-timeout 1 "http://127.0.0.1:%SERVER_PORT%/apidocs/health" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Server is ready!
    exit /b 0
)

timeout /t 1 /nobreak >nul 2>&1
set /a "ATTEMPT+=1"

REM Show progress every 5 seconds
set /a "MOD=ATTEMPT %% 5"
if %MOD%==0 echo [INFO] Still waiting... (%ATTEMPT%s)

goto :wait_loop_server

:start_client
echo.
echo === Starting Client ===
echo.

echo [INFO] Starting DiSCO Client UI on port %CLIENT_PORT%...
echo [INFO] Connecting to server at http://127.0.0.1:%SERVER_PORT%/apidocs

REM Start client in new window
start "DiSCO Client" /D "%CLIENT_DIR%" cmd /c "npm run dev -- --port %CLIENT_PORT%"

REM Wait for client to be ready
call :wait_for_client
if errorlevel 1 (
    echo [ERROR] Failed to start client
    exit /b 1
)

exit /b 0

:wait_for_client
echo [INFO] Waiting for client to be ready...

set "MAX_ATTEMPTS=30"
set "ATTEMPT=0"

:wait_loop_client
if %ATTEMPT% geq %MAX_ATTEMPTS% (
    echo [ERROR] Client failed to start within %MAX_ATTEMPTS% seconds
    exit /b 1
)

REM Try to connect to client
curl -s --connect-timeout 1 "http://127.0.0.1:%CLIENT_PORT%/" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Client is ready!
    exit /b 0
)

timeout /t 1 /nobreak >nul 2>&1
set /a "ATTEMPT+=1"

REM Show progress every 5 seconds
set /a "MOD=ATTEMPT %% 5"
if %MOD%==0 echo [INFO] Still waiting... (%ATTEMPT%s)

goto :wait_loop_client

REM ==============================================================================
REM BROWSER FUNCTION
REM ==============================================================================

:open_browser
if not "%OPEN_BROWSER%"=="true" goto :eof

echo [INFO] Opening browser...

set "CLIENT_URL=http://127.0.0.1:%CLIENT_PORT%"

REM Open client (dashboard is now accessible via the client's server config popover)
start "" "%CLIENT_URL%"

goto :eof

REM ==============================================================================
REM STATUS FUNCTION
REM ==============================================================================

:show_status
echo.
echo === DiSCO Workspace Running ===
echo.
echo   Server:     http://127.0.0.1:%SERVER_PORT%/apidocs
echo   Dashboard:  http://127.0.0.1:%SERVER_PORT%/dashboard
echo   Client:     http://127.0.0.1:%CLIENT_PORT%
echo.
echo   API Health: http://127.0.0.1:%SERVER_PORT%/apidocs/health
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
