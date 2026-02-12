# Claude Code Web Development Workflow

**⚠️ MANDATORY: This workflow MUST be followed for ALL UI/web changes. No exceptions.**

This document describes a self-testing workflow for Claude Code agents working on web/UI projects. The key principle: **never claim something works without verifying it yourself**.

## CRITICAL: When to Run This Workflow

**You MUST run the verification workflow BEFORE claiming any feature is complete when:**
- Making ANY changes to UI components
- Adding or modifying API endpoints
- Changing styling (CSS)
- Modifying data flow between server and client
- Adding new features to dashboard or client UI

**TypeScript compilation passing is NOT sufficient.** Code that compiles can still:
- Render incorrectly
- Have broken interactions
- Show wrong data
- Have CSS issues
- Fail at runtime

## Core Philosophy

1. **Build → Run → Verify → Fix → Repeat** - Always complete the full loop
2. **Visual verification is mandatory** - Take screenshots and inspect them
3. **Trust but verify** - Don't assume code changes work; prove they work
4. **Fix before presenting** - If something fails, fix it before telling the user
5. **Real UI, not headless** - Always test with a visible browser window
6. **No feature is done until visually verified** - Screenshots prove completion
7. **NEVER commit or push without explicit user permission** - Always wait for user to say "commit" or "push"

## Environment Setup

### Prerequisites (macOS)

- Google Chrome installed
- `screencapture` command (built into macOS)
- Screenshots directory in project root: `./screenshots/` (add to .gitignore)

### Chrome Window Size

**IMPORTANT**: Always launch Chrome with a fixed window size of **900x600** pixels.

This ensures:
- Testing matches what users see on smaller monitors
- UI issues at specific viewport sizes are caught
- Screenshots are consistent and comparable

## Browser Control

### Tab Management (IMPORTANT)

**ALWAYS check for existing tabs before opening new ones.** Opening duplicate tabs clutters the browser and wastes resources.

```bash
# Check if a tab with specific URL already exists and switch to it
# Returns the tab index (1-based) or 0 if not found
osascript -e '
tell application "Google Chrome"
    set targetURL to "localhost:3000"
    repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
            set tabIndex to tabIndex + 1
            if URL of t contains targetURL then
                set active tab index of w to tabIndex
                set index of w to 1
                activate
                return tabIndex
            end if
        end repeat
    end repeat
    return 0
end tell'

# Helper function: Switch to existing tab OR open new one if not found
switch_or_open_tab() {
    local url="$1"
    local found=$(osascript -e "
tell application \"Google Chrome\"
    set targetURL to \"$url\"
    repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
            set tabIndex to tabIndex + 1
            if URL of t contains targetURL then
                set active tab index of w to tabIndex
                set index of w to 1
                activate
                return true
            end if
        end repeat
    end repeat
    return false
end tell")

    if [ "$found" = "false" ]; then
        osascript -e "tell application \"Google Chrome\" to open location \"http://$url\""
    fi
    osascript -e 'tell application "Google Chrome" to activate'
}

# Usage:
# switch_or_open_tab "localhost:3000"
# switch_or_open_tab "localhost:8765/dashboard"
```

### Opening URLs (Only When Tab Doesn't Exist)

```bash
# Open URL in Chrome with fixed window size (900x600) - ONLY for initial launch
open -a "Google Chrome" --args --window-size=900,600 http://localhost:3000

# If Chrome is already running, use AppleScript to open new tab
# NOTE: Prefer checking for existing tabs first (see Tab Management above)
osascript -e 'tell application "Google Chrome" to open location "http://localhost:3000"'

# Open and bring Chrome to front
osascript -e 'tell application "Google Chrome"
    open location "http://localhost:3000"
    activate
end tell'
```

### Chrome with Remote Debugging

For programmatic control via Chrome DevTools Protocol:

```bash
# Start Chrome with remote debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9222 \
    --window-size=900,600 \
    http://localhost:3000

# List available tabs via CDP
curl -s http://localhost:9222/json | jq '.[].url'
```

### Executing JavaScript in Browser

Using AppleScript (simpler, works without remote debugging):

```bash
# Execute JS and get result
osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.title"'

# Check if specific element exists
osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelector('\''#my-element'\'') !== null"'

# Get element count
osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelectorAll('\''.entity-row'\'').length"'

# Get text content
osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelector('\''h1'\'')?.textContent || '\''not found'\''"'
```

### Waiting for Page/Elements

```bash
# Wait for page load with timeout
for i in {1..10}; do
    READY=$(osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.readyState"' 2>/dev/null)
    if [ "$READY" = "complete" ]; then break; fi
    sleep 0.5
done

# Wait for specific element to appear
for i in {1..20}; do
    EXISTS=$(osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelector('\''.data-loaded'\'') !== null"' 2>/dev/null)
    if [ "$EXISTS" = "true" ]; then break; fi
    sleep 0.5
done
```

## Screenshot Capture

### IMPORTANT: Use Window-ID Capture (Non-Interactive)

**Never use bare `screencapture -x` or `screencapture -w`** — on modern macOS these can trigger the interactive screenshot tool, requiring user clicks. This breaks closed-loop automated testing.

**Always use window-ID-based capture** via `screencapture -l <windowID> -x`, which is guaranteed non-interactive.

### Non-Interactive Screenshot Function

```bash
# Switch to a Chrome tab matching a URL pattern, then capture its window
# Uses CGWindowID via Swift for guaranteed non-interactive capture
capture_chrome_tab() {
    local url_pattern="$1"
    local output_file="$2"

    # Switch to tab matching URL pattern (or open if not found)
    local found
    found=$(osascript -e "
tell application \"Google Chrome\"
    repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
            set tabIndex to tabIndex + 1
            if URL of t contains \"$url_pattern\" then
                set active tab index of w to tabIndex
                set index of w to 1
                activate
                return true
            end if
        end repeat
    end repeat
    return false
end tell")

    if [ "$found" = "false" ]; then
        osascript -e "tell application \"Google Chrome\"
            open location \"http://$url_pattern\"
            activate
        end tell"
        sleep 2
    else
        sleep 0.5
    fi

    # Get frontmost Chrome window ID via Swift (CGWindowID)
    local wid
    wid=$(swift -e '
import CoreGraphics
if let windowList = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] {
    for window in windowList {
        if let owner = window["kCGWindowOwnerName"] as? String, owner == "Google Chrome",
           let layer = window["kCGWindowLayer"] as? Int, layer == 0,
           let wid = window["kCGWindowNumber"] as? Int {
            print(wid)
            break
        }
    }
}
' 2>/dev/null)

    if [[ -n "$wid" ]]; then
        screencapture -l "$wid" -x "$output_file"
    else
        echo "ERROR: Could not find Chrome window for $url_pattern"
        return 1
    fi
}
```

### Usage

```bash
# Clean screenshots BEFORE capturing (so previous results don't linger)
rm -rf ./screenshots/*.png 2>/dev/null
mkdir -p ./screenshots

# Capture all three DiSCO UIs
capture_chrome_tab "localhost:8880" ./screenshots/dashboard.png
capture_chrome_tab "localhost:3000" ./screenshots/client_ui.png
capture_chrome_tab "localhost:8765/dashboard" ./screenshots/server_dashboard.png

# Then use the Read tool to inspect each screenshot
```

### Screenshot Lifecycle (IMPORTANT)

- **Clean BEFORE** capturing — wipe old PNGs at the start of each verification run
- **NEVER clean AFTER** — leave screenshots in place when done so the user can review them
- Screenshots persist in `./screenshots/` until the next verification run clears them

### Best Practices for Screenshots

1. **Always use `capture_chrome_tab`** - Never use bare `screencapture` commands
2. **Use absolute paths in test scripts** - Avoid `./screenshots/` which resolves differently based on CWD
3. **Use descriptive filenames** - `entity_table_populated.png`, `dark_mode_toggle.png`
4. **Capture before and after** - For UI changes, capture both states
5. **Read screenshots after capture** - Use Claude's vision to verify the UI
6. **Never delete screenshots after verification** - The user may want to inspect them

## Complete Verification Workflow

### Step-by-Step Process

```bash
# 1. Start the application
./start.sh &
sleep 10  # Wait for all services to start

# 2. Verify services are healthy
curl -s http://localhost:8880/api/health | python3 -m json.tool

# 3. Resize Chrome window
osascript -e 'tell application "Google Chrome" to set bounds of front window to {100, 100, 1000, 700}'

# 4. Check for expected elements
ELEMENT_COUNT=$(osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelectorAll('\''.entity-row'\'').length"')
echo "Found $ELEMENT_COUNT entity rows"

# 5. Take screenshots using non-interactive window-ID capture
mkdir -p ./screenshots
capture_chrome_tab "localhost:8880" ./screenshots/dashboard.png
capture_chrome_tab "localhost:3000" ./screenshots/client_ui.png
capture_chrome_tab "localhost:8765/dashboard" ./screenshots/server_dashboard.png

# 6. Read and inspect the screenshots (Claude vision)
# Use the Read tool to examine each screenshot
```

### Verification Checklist

- [ ] Application starts without errors
- [ ] Page loads successfully (check document.readyState)
- [ ] Expected UI elements are present
- [ ] Data is being displayed (not empty states)
- [ ] No JavaScript errors in console
- [ ] Visual appearance matches expectations (via screenshot)
- [ ] Interactive elements work (buttons, inputs, etc.)

## API Verification

### Testing Backend Endpoints

```bash
# Check server health
curl -s http://localhost:8765/health | jq .

# Fetch data and verify structure
curl -s http://localhost:8765/api/liveWorldModel/getLatest | jq 'length'

# Check specific endpoint with expected data
RESPONSE=$(curl -s http://localhost:8765/api/entities/getLatest)
ENTITY_COUNT=$(echo "$RESPONSE" | jq 'length')
echo "API returned $ENTITY_COUNT entities"
```

### Verifying Data Flow (API → UI)

```bash
# Get count from API
API_COUNT=$(curl -s http://localhost:8765/api/liveWorldModel/getLatest | jq 'length')

# Get count from UI
UI_COUNT=$(osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelectorAll('\''.entity-row'\'').length"')

# Compare
if [ "$API_COUNT" = "$UI_COUNT" ]; then
    echo "Data flow verified: $API_COUNT entities"
else
    echo "Mismatch: API=$API_COUNT, UI=$UI_COUNT"
fi
```

## React-Specific Patterns

### Triggering React State Updates

```javascript
// For controlled inputs, dispatch proper events
const input = document.querySelector('input');
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
nativeInputValueSetter.call(input, 'new value');
input.dispatchEvent(new Event('input', { bubbles: true }));
```

### Checking Component State

```bash
# Check if React app has loaded
osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "
    document.querySelector('\''#root'\'')?.children.length > 0 ? '\''React loaded'\'' : '\''Not loaded'\''
"'
```

## Troubleshooting

### Common Issues

**Chrome not responding to AppleScript**
- Ensure Chrome is running: `osascript -e 'tell application "Google Chrome" to activate'`
- Check if the correct window/tab is targeted

**Screenshot is black or wrong window**
- Add delay before capture: `sleep 1`
- Bring Chrome to front first: `osascript -e 'tell application "Google Chrome" to activate'`

**JavaScript execution returns empty**
- Element may not exist yet - add wait loop
- Check selector syntax and escaping
- Verify page has finished loading

### Debug Mode

```bash
# Verbose output for debugging
set -x  # Enable bash debug mode

# Check Chrome state
osascript -e 'tell application "Google Chrome"
    set windowCount to count of windows
    return "Windows: " & windowCount
end tell'
```

## Integration with Claude Code

### Required Validation Steps

**⚠️ MANDATORY: Every UI/web change MUST be validated before completion. No exceptions.**

**This is the MINIMUM required verification for ANY UI change:**

1. **Run `./start.sh`** to start all services
2. **Wait for startup** - Give services time to initialize (~10 seconds)
3. **Verify services are running**: `curl -s http://localhost:8880/api/health`
4. **Take screenshots** of ALL THREE using `capture_chrome_tab` (non-interactive):
   - Orchestration Dashboard at http://localhost:8880
   - Client UI at http://localhost:3000
   - Surrogate Server Dashboard at http://localhost:8765/dashboard
5. **Read and inspect screenshots** using the Read tool - actually look at them
6. **Verify the specific feature you changed** - don't just check "it loads"
7. **If anything is wrong, fix it** before reporting to user

### Complete Verification Script

Run this BEFORE claiming any feature is complete:

```bash
# 1. Start the servers (if not already running)
./start.sh &
sleep 5

# 2. Verify service health
curl -s http://localhost:8880/api/health | python3 -m json.tool
curl -s http://localhost:8765/api/v1/health | python3 -m json.tool
curl -s http://localhost:8766/api/health | python3 -m json.tool

# 3. Define the capture function (see "Screenshot Capture" section above)
# ... (paste capture_chrome_tab function here)

# 4. Resize Chrome window to 900x600
osascript -e 'tell application "Google Chrome" to set bounds of front window to {100, 100, 1000, 700}'

# 5. Capture all three UIs (non-interactive, no user clicks needed)
mkdir -p ./screenshots
capture_chrome_tab "localhost:8880" ./screenshots/dashboard.png
capture_chrome_tab "localhost:3000" ./screenshots/client_ui.png
capture_chrome_tab "localhost:8765/dashboard" ./screenshots/server_dashboard.png

# 6. Use Read tool to inspect all three screenshots
```

### What "Done" Means

- App is running and verified working
- **Screenshots taken and INSPECTED** (not just captured)
- **Specific feature verified visually** (not just "it loads")
- Data confirmed correct via API inspection
- No console errors
- User can immediately use the feature

### What "Done" Does NOT Mean

- "This should work"
- "Try running it"
- "The code looks correct"
- "TypeScript compiles"
- Untested assumptions
- Screenshots captured but not read/inspected

---

## Summary

This workflow enables Claude Code agents to:
1. **Autonomously verify** their code changes work
2. **Visually inspect** UI without user intervention
3. **Interact with** web applications programmatically
4. **Document** the verification with screenshots
5. **Fix issues** before presenting results to users

The key insight: treating verification as a required step (not optional) dramatically improves the quality and reliability of Claude Code's output on web/UI projects.

**Critical settings:**
- Chrome window size: **900x600** (fits smaller monitors)
- Always use **real browser** (not headless)
- Always **visually verify** with screenshots
