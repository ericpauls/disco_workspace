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

### Basic Screenshot Commands

```bash
# Create screenshots directory if needed
mkdir -p ./screenshots

# Capture entire screen
screencapture ./screenshots/full_screen.png

# Capture without shadow/border (-x flag)
screencapture -x ./screenshots/clean_capture.png

# Capture after delay (seconds)
screencapture -T 2 ./screenshots/delayed.png
```

### Automated Screenshot Workflow

```bash
# Bring Chrome to front and capture
osascript -e 'tell application "Google Chrome" to activate'
sleep 0.5
screencapture -x ./screenshots/ui_verification.png
```

### Best Practices for Screenshots

1. **Use absolute paths in test scripts** - Avoid `./screenshots/` which resolves differently based on CWD
2. **Archive before new testing** - Use dated subfolders for permanent reference
3. **Use descriptive filenames** - `entity_table_populated.png`, `dark_mode_toggle.png`
4. **Capture before and after** - For UI changes, capture both states
5. **Read screenshots after capture** - Use Claude's vision to verify the UI

## Complete Verification Workflow

### Step-by-Step Process

```bash
# 1. Start the application
./start.sh &
sleep 3  # Wait for server/client to start

# 2. Open in Chrome with correct window size
open -a "Google Chrome" --args --window-size=900,600 http://localhost:3000
sleep 2  # Wait for page load

# 3. Verify page loaded
TITLE=$(osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.title"')
echo "Page title: $TITLE"

# 4. Check for expected elements
ELEMENT_COUNT=$(osascript -e 'tell application "Google Chrome" to execute front window'\''s active tab javascript "document.querySelectorAll('\''.entity-row'\'').length"')
echo "Found $ELEMENT_COUNT entity rows"

# 5. Take screenshot for visual verification
mkdir -p ./screenshots
osascript -e 'tell application "Google Chrome" to activate'
sleep 0.5
screencapture -x ./screenshots/verification.png

# 6. Read and inspect the screenshot (Claude vision)
# Use the Read tool to examine ./screenshots/verification.png
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

1. **Run `./start.sh`** to start both server and client
2. **Wait for startup** - Give server and client time to initialize (~5 seconds)
3. **Verify server is running**: `curl -s http://localhost:8765/health | jq .`
4. **Take screenshots** of BOTH:
   - Client UI at http://localhost:3000
   - Server dashboard at http://localhost:8765/dashboard
5. **Read and inspect screenshots** using the Read tool - actually look at them
6. **Verify the specific feature you changed** - don't just check "it loads"
7. **If anything is wrong, fix it** before reporting to user

### Complete Verification Script

Run this BEFORE claiming any feature is complete:

```bash
# 1. Start the servers (if not already running)
./start.sh &
sleep 5

# 2. Verify server health
curl -s http://localhost:8765/health | jq .

# 3. Create screenshots directory
mkdir -p ./screenshots

# 4. Switch to existing client tab OR open if not found, then capture
osascript -e '
tell application "Google Chrome"
    set found to false
    repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
            set tabIndex to tabIndex + 1
            if URL of t contains "localhost:3000" then
                set active tab index of w to tabIndex
                set index of w to 1
                set found to true
                exit repeat
            end if
        end repeat
        if found then exit repeat
    end repeat
    if not found then open location "http://localhost:3000"
    activate
end tell'
sleep 2
screencapture -x ./screenshots/client_ui.png

# 5. Switch to existing dashboard tab OR open if not found, then capture
osascript -e '
tell application "Google Chrome"
    set found to false
    repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
            set tabIndex to tabIndex + 1
            if URL of t contains "localhost:8765/dashboard" then
                set active tab index of w to tabIndex
                set index of w to 1
                set found to true
                exit repeat
            end if
        end repeat
        if found then exit repeat
    end repeat
    if not found then open location "http://localhost:8765/dashboard"
    activate
end tell'
sleep 2
screencapture -x ./screenshots/server_dashboard.png

# 6. Use Read tool to inspect both screenshots
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
