# Claude Code Web Development Workflow

This document describes a self-testing workflow for Claude Code agents working on web/UI projects. The key principle: **never claim something works without verifying it yourself**.

## Core Philosophy

1. **Build → Run → Verify → Fix → Repeat** - Always complete the full loop
2. **Visual verification is mandatory** - Take screenshots and inspect them
3. **Trust but verify** - Don't assume code changes work; prove they work
4. **Fix before presenting** - If something fails, fix it before telling the user
5. **Real UI, not headless** - Always test with a visible browser window

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

### Opening URLs

```bash
# Open URL in Chrome with fixed window size (900x600)
open -a "Google Chrome" --args --window-size=900,600 http://localhost:3000

# If Chrome is already running, use AppleScript to open new tab
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

**Every change MUST be validated before completion. No exceptions.**

1. **Run `./start.sh`** to start both server and client
2. **Verify server data**: `curl http://localhost:8765/api/liveWorldModel/getLatest | jq .`
3. **Take a screenshot** of the running app at http://localhost:3000
4. **Visually inspect** the screenshot - confirm UI renders correctly
5. **Verify entities** appear on map and in table with correct data
6. **Check console** for any errors or warnings
7. **Fix issues** before reporting completion to user

### What "Done" Means

- App is running and verified working
- Screenshot taken and inspected
- Data confirmed correct via API inspection
- No console errors
- User can immediately use the feature

### What "Done" Does NOT Mean

- "This should work"
- "Try running it"
- "The code looks correct"
- Untested assumptions

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
