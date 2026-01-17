# Claude Code Web Development Workflow

This document describes a self-testing workflow for Claude Code agents working on web/UI projects. The key principle: **never claim something works without verifying it yourself**.

## Core Philosophy

1. **Build → Run → Verify → Fix → Repeat** - Always complete the full loop
2. **Visual verification is mandatory** - Take screenshots and inspect them
3. **Trust but verify** - Don't assume code changes work; prove they work
4. **Fix before presenting** - If something fails, fix it before telling the user

## Environment Setup

### Prerequisites (macOS)
- Safari with "Allow JavaScript from Apple Events" enabled (Develop menu → Allow JavaScript from Apple Events)
- `screencapture` command (built into macOS)
- Screenshots directory in project root: `./screenshots/` (add to .gitignore)

### Enabling Safari Automation
```bash
# User must enable this once in Safari:
# Safari → Develop menu → "Allow JavaScript from Apple Events"
# If Develop menu not visible: Safari → Settings → Advanced → "Show Develop menu"
```

## Browser Control via AppleScript

### Opening URLs
```bash
# Open URL in Safari (creates new tab if Safari already open)
osascript -e 'tell application "Safari" to open location "http://localhost:3000"'

# Open URL and bring Safari to front
osascript -e 'tell application "Safari"
    open location "http://localhost:3000"
    activate
end tell'
```

### Executing JavaScript in Browser
```bash
# Execute JS and get result
osascript -e 'tell application "Safari" to do JavaScript "document.title" in front document'

# Execute JS on specific tab
osascript -e 'tell application "Safari" to do JavaScript "document.body.innerHTML.length" in document 1'

# Complex JS with proper escaping
osascript -e 'tell application "Safari" to do JavaScript "document.querySelectorAll('\''table tr'\'').length" in front document'
```

### Common Browser Queries
```bash
# Get page title
osascript -e 'tell application "Safari" to do JavaScript "document.title" in front document'

# Check if specific element exists
osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''#my-element'\'') !== null" in front document'

# Get element count
osascript -e 'tell application "Safari" to do JavaScript "document.querySelectorAll('\''.entity-row'\'').length" in front document'

# Get text content
osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''h1'\'')?.textContent || '\''not found'\''" in front document'

# Check for error messages
osascript -e 'tell application "Safari" to do JavaScript "document.body.innerText.includes('\''Error'\'')" in front document'

# Get console errors (limited - only works for errors in page context)
osascript -e 'tell application "Safari" to do JavaScript "window.consoleErrors?.join('\'', '\'') || '\''none'\''" in front document'
```

### Interacting with UI Elements
```bash
# Click a button
osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''button#submit'\'').click()" in front document'

# Fill an input field
osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''input#search'\'').value = '\''test query'\''" in front document'

# Trigger input event (for React controlled components)
osascript -e 'tell application "Safari" to do JavaScript "
    const input = document.querySelector('\''input#search'\'');
    input.value = '\''test'\'';
    input.dispatchEvent(new Event('\''input'\'', { bubbles: true }));
" in front document'

# Select dropdown option
osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''select#category'\'').value = '\''option2'\''" in front document'

# Scroll to element
osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''.target-element'\'').scrollIntoView()" in front document'
```

### Waiting for Page/Elements
```bash
# Wait for page load with timeout
for i in {1..10}; do
    READY=$(osascript -e 'tell application "Safari" to do JavaScript "document.readyState" in front document' 2>/dev/null)
    if [ "$READY" = "complete" ]; then break; fi
    sleep 0.5
done

# Wait for specific element to appear
for i in {1..20}; do
    EXISTS=$(osascript -e 'tell application "Safari" to do JavaScript "document.querySelector('\''.data-loaded'\'') !== null" in front document' 2>/dev/null)
    if [ "$EXISTS" = "true" ]; then break; fi
    sleep 0.5
done
```

## Screenshot Capture

### Basic Screenshot Commands
```bash
# Capture entire screen
screencapture ./screenshots/full_screen.png

# Capture without shadow/border (-x flag)
screencapture -x ./screenshots/clean_capture.png

# Capture specific window (interactive - user clicks window)
screencapture -W ./screenshots/window.png

# Capture after delay (seconds)
screencapture -T 2 ./screenshots/delayed.png
```

### Automated Screenshot Workflow
```bash
# Create screenshots directory if needed
mkdir -p ./screenshots

# Bring Safari to front and capture
osascript -e 'tell application "Safari" to activate'
sleep 0.5
screencapture -x ./screenshots/ui_verification.png
```

### Best Practices for Screenshots
1. **Always use absolute paths** - Never use relative `./screenshots/` in test scripts (see below)
2. **Archive before new testing** - Use dated subfolders for permanent reference
3. **Use descriptive filenames** - `entity_table_populated.png`, `dark_mode_toggle.png`
4. **Capture before and after** - For UI changes, capture both states
5. **Read screenshots after capture** - Use Claude's vision to verify the UI

### CRITICAL: Always Use Absolute Paths in Test Scripts

Relative paths cause `client/screenshots/` to be created when tests run from `client/` directory:

```javascript
// WRONG - creates client/screenshots/
await page.screenshot({ path: './screenshots/test.png' });

// CORRECT - always resolves to project root
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', '..', 'screenshots');
await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test.png') });
```

### Pre-Testing Archive Workflow
```bash
# Archive to dated subfolder (auto-cleaned after 7 days)
./scripts/screenshot-utils.sh archive "my-test-name"

# Or manually:
DATE=$(date +%Y-%m-%d)
TEST_NAME="my-test-name"
mkdir -p ./screenshots/archive/${DATE}_${TEST_NAME}
mv ./screenshots/*.png ./screenshots/archive/${DATE}_${TEST_NAME}/ 2>/dev/null || true
```

## Complete Verification Workflow

### Step-by-Step Process

```bash
# 1. Start the application
./start.sh &
sleep 3  # Wait for server/client to start

# 2. Open in browser
osascript -e 'tell application "Safari" to open location "http://localhost:3000"'
sleep 2  # Wait for page load

# 3. Verify page loaded
TITLE=$(osascript -e 'tell application "Safari" to do JavaScript "document.title" in front document')
echo "Page title: $TITLE"

# 4. Check for expected elements
ELEMENT_COUNT=$(osascript -e 'tell application "Safari" to do JavaScript "document.querySelectorAll('\''.entity-row'\'').length" in front document')
echo "Found $ELEMENT_COUNT entity rows"

# 5. Take screenshot for visual verification
mkdir -p ./screenshots
osascript -e 'tell application "Safari" to activate'
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
curl -s http://localhost:8080/health | jq .

# Fetch data and verify structure
curl -s http://localhost:8080/api/entities | jq 'length'

# Check specific endpoint with expected data
RESPONSE=$(curl -s http://localhost:8080/api/entities)
ENTITY_COUNT=$(echo "$RESPONSE" | jq 'length')
echo "API returned $ENTITY_COUNT entities"
```

### Verifying Data Flow (API → UI)
```bash
# Get count from API
API_COUNT=$(curl -s http://localhost:8080/api/entities | jq 'length')

# Get count from UI
UI_COUNT=$(osascript -e 'tell application "Safari" to do JavaScript "document.querySelectorAll('\''.entity-row'\'').length" in front document')

# Compare
if [ "$API_COUNT" = "$UI_COUNT" ]; then
    echo "✓ Data flow verified: $API_COUNT entities"
else
    echo "✗ Mismatch: API=$API_COUNT, UI=$UI_COUNT"
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

### Checking React Component State (if exposed)
```bash
# If using React DevTools globals or exposed state
osascript -e 'tell application "Safari" to do JavaScript "
    const fiber = document.querySelector('\''#app'\'')._reactRootContainer?._internalRoot?.current;
    fiber ? '\''React detected'\'' : '\''No React'\''
" in front document'
```

## Troubleshooting

### Common Issues

**AppleScript permission denied**
- Enable "Allow JavaScript from Apple Events" in Safari Develop menu
- May need to grant Terminal/iTerm accessibility permissions in System Settings

**Safari not responding to commands**
- Ensure Safari is running: `osascript -e 'tell application "Safari" to activate'`
- Check if correct document/tab is targeted

**Screenshot is black or wrong window**
- Add delay before capture: `sleep 1`
- Bring Safari to front: `osascript -e 'tell application "Safari" to activate'`

**JavaScript execution returns empty**
- Element may not exist yet - add wait loop
- Check selector syntax and escaping
- Verify page has finished loading

### Debug Mode
```bash
# Verbose output for debugging
set -x  # Enable bash debug mode

# Check Safari state
osascript -e 'tell application "Safari"
    set windowCount to count of windows
    set docCount to count of documents
    return "Windows: " & windowCount & ", Documents: " & docCount
end tell'
```

## Example: Full Feature Verification

```bash
#!/bin/bash
# verify_feature.sh - Complete verification workflow

FEATURE_NAME="entity_filtering"
SCREENSHOTS_DIR="./screenshots"
mkdir -p "$SCREENSHOTS_DIR"

echo "=== Verifying: $FEATURE_NAME ==="

# 1. Start app if not running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Starting application..."
    ./start.sh &
    sleep 5
fi

# 2. Open browser
echo "Opening browser..."
osascript -e 'tell application "Safari" to open location "http://localhost:3000"'
sleep 2

# 3. Wait for page load
echo "Waiting for page load..."
for i in {1..20}; do
    READY=$(osascript -e 'tell application "Safari" to do JavaScript "document.readyState" in front document' 2>/dev/null)
    [ "$READY" = "complete" ] && break
    sleep 0.5
done

# 4. Verify initial state
echo "Checking initial state..."
INITIAL_COUNT=$(osascript -e 'tell application "Safari" to do JavaScript "document.querySelectorAll('\''.entity-row'\'').length" in front document')
echo "Initial entity count: $INITIAL_COUNT"

# 5. Capture before screenshot
osascript -e 'tell application "Safari" to activate'
sleep 0.3
screencapture -x "$SCREENSHOTS_DIR/${FEATURE_NAME}_before.png"

# 6. Interact with feature (e.g., apply filter)
echo "Applying filter..."
osascript -e 'tell application "Safari" to do JavaScript "
    document.querySelector('\''input[placeholder*=\"filter\"]'\'').value = '\''radar'\'';
    document.querySelector('\''input[placeholder*=\"filter\"]'\'').dispatchEvent(new Event('\''input'\'', {bubbles: true}));
" in front document'
sleep 1

# 7. Verify filtered state
FILTERED_COUNT=$(osascript -e 'tell application "Safari" to do JavaScript "document.querySelectorAll('\''.entity-row'\'').length" in front document')
echo "Filtered entity count: $FILTERED_COUNT"

# 8. Capture after screenshot
screencapture -x "$SCREENSHOTS_DIR/${FEATURE_NAME}_after.png"

# 9. Report results
echo ""
echo "=== Results ==="
echo "Before filter: $INITIAL_COUNT entities"
echo "After filter: $FILTERED_COUNT entities"
echo "Screenshots saved to: $SCREENSHOTS_DIR/"

if [ "$FILTERED_COUNT" -lt "$INITIAL_COUNT" ]; then
    echo "✓ Filter appears to be working"
else
    echo "⚠ Filter may not be working as expected"
fi
```

## Integration with Claude Code

### In Your CLAUDE.md
Add these instructions to your project's CLAUDE.md:

```markdown
## IMPORTANT: Testing Requirements

**Claude Code MUST run and test everything it builds before claiming completion.**

### Validation Protocol
1. Start the application
2. Verify server responds (curl endpoints)
3. Verify client renders (take screenshot, inspect visually)
4. Check for errors in console/terminal
5. Fix issues before presenting to user

### Screenshots Directory
Save all screenshots to `./screenshots/` (git-ignored).

### Browser Automation
Use Safari AppleScript commands to:
- Open URLs
- Execute JavaScript queries
- Interact with UI elements
- Verify element presence and content
```

## Alternative: Chrome DevTools Protocol

For Chrome-based automation (requires additional setup):

```bash
# Start Chrome with remote debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Use curl to interact with DevTools Protocol
curl http://localhost:9222/json  # List tabs
```

Chrome DevTools Protocol offers more capabilities but requires more complex setup. Safari AppleScript is simpler for basic verification workflows on macOS.

---

## Summary

This workflow enables Claude Code agents to:
1. **Autonomously verify** their code changes work
2. **Visually inspect** UI without user intervention
3. **Interact with** web applications programmatically
4. **Document** the verification with screenshots
5. **Fix issues** before presenting results to users

The key insight: treating verification as a required step (not optional) dramatically improves the quality and reliability of Claude Code's output on web/UI projects.
