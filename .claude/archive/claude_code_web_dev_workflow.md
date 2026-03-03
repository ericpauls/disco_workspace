# Claude Code Web Development Workflow

**MANDATORY: This workflow MUST be followed for ALL UI/web changes. No exceptions.**

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

## Environment

- **macOS** with Google Chrome installed
- Claude Code running from **VSCode extension** (no Chrome DevTools Protocol access)
- Browser control via **AppleScript** (tab switching, window capture)
- Page-context JavaScript via **DOM script injection** (for `window.__testAPI__`)
- Screenshots via **screencapture** with window-ID detection

## DiSCO Web UIs (4 total)

| UI | Port | URL |
|----|------|-----|
| Orchestration Dashboard | 8880 | `http://localhost:8880` |
| Client UI | 3000 | `http://localhost:3000` |
| Surrogate Server Dashboard | 8765 | `http://localhost:8765/dashboard` |
| Emulator Dashboard | 8766 | `http://localhost:8766/dashboard` |

## Browser Control

### Tab Switching and Screenshots

Use the `capture_chrome_tab` function for all screenshot operations. It switches to the correct tab (or opens the URL if not found), then captures via window-ID:

```bash
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

**IMPORTANT**: Never use bare `screencapture -x` or `screencapture -w` — these trigger the macOS interactive screenshot tool. Always use the window-ID method.

### Executing JavaScript in Page Context (CRITICAL)

AppleScript's `execute javascript` runs in Chrome's **isolated world** — a sandboxed context that **cannot** access `window` properties set by page ES modules (like `window.__testAPI__`). DOM queries (`querySelector`, etc.) DO work.

To call `window.__testAPI__` or any page-context JavaScript, you MUST inject a `<script>` element:

```bash
# page_exec: Execute JS in the page context and return the result
# Usage: page_exec "return __testAPI__.getEntityCount();"
page_exec() {
    local js_code="$1"
    osascript << EOF
tell application "Google Chrome"
    set theTab to active tab of front window
    execute theTab javascript "
        var __s = document.createElement('script');
        __s.textContent = \\\`
            try {
                var __result = (function() { ${js_code} })();
                document.body.setAttribute('data-page-result', JSON.stringify(__result != null ? __result : 'void'));
            } catch(e) {
                document.body.setAttribute('data-page-result', JSON.stringify({error: e.message}));
            }
        \\\`;
        document.head.appendChild(__s);
        document.head.removeChild(__s);
        document.body.getAttribute('data-page-result');
    "
end tell
EOF
}
```

**Why this is needed:** React/Vite modules set `window.__testAPI__` in the page's main JavaScript context. AppleScript runs in a separate isolated context that shares the DOM but not `window` properties. The `<script>` injection executes in the page context where `__testAPI__` lives.

### Reading DOM State (No Bridge Needed)

For simple DOM queries (no `window.__testAPI__` needed), AppleScript works directly:

```bash
# Read DOM elements directly — this works without the bridge
osascript << 'EOF'
tell application "Google Chrome"
    set theTab to active tab of front window
    execute theTab javascript "document.querySelector('.header').textContent"
end tell
EOF
```

## Client UI Test API Reference (`window.__testAPI__`)

The Client UI exposes a comprehensive programmatic control API on `window.__testAPI__`. All calls must go through the `page_exec` bridge (see above).

**Map Controls:**
```bash
page_exec "return __testAPI__.getMapCenter();"      # {lat, lng}
page_exec "return __testAPI__.getMapZoom();"         # number
page_exec "return __testAPI__.getMapBounds();"       # {north, south, east, west}
page_exec "__testAPI__.fitBounds([[13, 113], [17, 117]]); return 'done';"
page_exec "__testAPI__.setZoom(6); return 'done';"
```

**Note:** Use `fitBounds` instead of `panTo` — `panTo` has an animation delay that makes immediate reads unreliable. `fitBounds` repositions instantly.

**UI Controls:**
```bash
page_exec "__testAPI__.toggleDataPanel(); return 'done';"
page_exec "return __testAPI__.isPanelOpen();"
page_exec "__testAPI__.switchToTab('entity_reports'); return 'done';"
# Wait ~1s for React state update before reading:
sleep 1
page_exec "return __testAPI__.getActiveTab();"
page_exec "__testAPI__.toggleDarkMode(); return 'done';"
page_exec "__testAPI__.setSearchFilter('HOSTILE'); return 'done';"
page_exec "__testAPI__.clearSearchFilter(); return 'done';"
```

**Entity Interactions:**
```bash
page_exec "return __testAPI__.getEntityCount();"
page_exec "return __testAPI__.getFilteredEntityCount();"
page_exec "__testAPI__.selectEntity('some-uuid', true); return 'done';"
page_exec "__testAPI__.deselectEntity(); return 'done';"
```

**Data Access & Validation:**
```bash
page_exec "return __testAPI__.getEntityCount();"
page_exec "return __testAPI__.getFilteredEntityCount();"
page_exec "return __testAPI__.getVisibleMarkerCount();"
page_exec "return __testAPI__.getMemoryStats();"
page_exec "return __testAPI__.getLastUpdateTime();"
page_exec "__testAPI__.forceUpdate(); return 'done';"
```

### Other Dashboard Interaction

For dashboards without a testAPI, use AppleScript DOM queries directly (no bridge needed):

**Orchestration Dashboard (port 8880):**
- Service status: read `.service-card` elements
- DOM IDs: `#server-status-dot`, `#btn-start-all`, etc.

**Server Dashboard (port 8765/dashboard):**
- Store stats: read `.store-bar` elements
- Status: read `.status-badge` content

**Emulator Dashboard (port 8766/dashboard):**
- Simulation status: read tick count, FPS displays
- Controls: interact with sliders and buttons

## Screenshot Lifecycle (IMPORTANT)

- **Clean BEFORE** capturing — wipe old PNGs at the start of each verification run: `rm -rf ./screenshots/*.png`
- **NEVER clean AFTER** — leave screenshots in place when done so the user can review them
- Screenshots persist in `./screenshots/` until the next verification run clears them

### Best Practices

1. **Use descriptive filenames** — `entity_reports_tab.png`, `lob_area_zoomed.png`
2. **Capture before and after** — For UI changes, capture both states
3. **Read screenshots after capture** — Use Claude's vision (Read tool) to verify the UI
4. **Never delete screenshots after verification** — The user may want to inspect them

## Complete Verification Workflow

### Step-by-Step Process

1. **Start services** (if not already running):
   ```bash
   ./start.sh &
   sleep 10
   ```

2. **Verify services are healthy**:
   ```bash
   curl -s http://localhost:8880/api/health | python3 -m json.tool
   curl -s http://localhost:8765/api/v1/health | python3 -m json.tool
   curl -s http://localhost:8766/api/health | python3 -m json.tool
   ```

3. **Clean screenshots directory**:
   ```bash
   rm -rf ./screenshots/*.png 2>/dev/null
   mkdir -p ./screenshots
   ```

4. **Resize Chrome and capture all four UIs**:
   ```bash
   osascript -e 'tell application "Google Chrome" to set bounds of front window to {100, 100, 1000, 700}'
   capture_chrome_tab "localhost:8880" ./screenshots/dashboard.png
   capture_chrome_tab "localhost:3000" ./screenshots/client_ui.png
   capture_chrome_tab "localhost:8765/dashboard" ./screenshots/server_dashboard.png
   capture_chrome_tab "localhost:8766/dashboard" ./screenshots/emulator_dashboard.png
   ```

5. **Read and inspect each screenshot** using the Read tool

6. **Verify specific features** on Client UI using page_exec + testAPI:
   ```bash
   # Switch to Client UI tab first
   capture_chrome_tab "localhost:3000" /dev/null  # just switch tab

   # Verify data is loaded
   page_exec "return __testAPI__.getEntityCount();"

   # Verify map is rendered
   page_exec "return __testAPI__.getMapBounds();"

   # Open data panel and switch to entity reports
   page_exec "__testAPI__.toggleDataPanel(); return 'done';"
   sleep 1
   page_exec "__testAPI__.switchToTab('entity_reports'); return 'done';"
   sleep 1

   # Zoom to LOB area for LOB verification
   page_exec "__testAPI__.fitBounds([[13, 113], [17, 117]]); return 'done';"
   sleep 2

   # Take screenshot of LOB view
   capture_chrome_tab "localhost:3000" ./screenshots/client_ui_lob.png
   ```

### Verification Checklist

- [ ] All four services are healthy (curl checks pass)
- [ ] Page loads successfully in all four UIs
- [ ] Expected UI elements are present in screenshots
- [ ] Data is being displayed (not empty states)
- [ ] Specific feature being verified works correctly

### Common Verification Scenarios

**Verifying entity reports are flowing:**
```bash
page_exec "
    if (!__testAPI__.isPanelOpen()) __testAPI__.toggleDataPanel();
    return 'panel opened';
"
sleep 1
page_exec "__testAPI__.switchToTab('entity_reports'); return 'done';"
sleep 1
capture_chrome_tab "localhost:3000" ./screenshots/entity_reports.png
# Read screenshot — should show reports with recent timestamps
```

**Verifying LOB visualization:**
```bash
page_exec "__testAPI__.fitBounds([[13, 113], [17, 117]]); return 'done';"
sleep 2
# Enable LOB lines via DOM (click the LOB controls)
page_exec "
    var checkbox = document.querySelector('.map-toggle input');
    if (checkbox && !checkbox.checked) checkbox.click();
    var allBtn = Array.from(document.querySelectorAll('.lob-btn')).find(function(b) { return b.textContent === 'ALL'; });
    if (allBtn) allBtn.click();
    return 'LOB enabled';
"
sleep 2
capture_chrome_tab "localhost:3000" ./screenshots/lob_lines.png
# Read screenshot — should show LOB lines from sensor endpoints
```

**Verifying entity selection:**
```bash
page_exec "
    var entities = __testAPI__.getEntities();
    if (entities.length > 0) {
        __testAPI__.selectEntity(entities[0].liveworldmodel_uuid, true);
        return 'selected: ' + entities[0].name;
    }
    return 'no entities';
"
sleep 1
capture_chrome_tab "localhost:3000" ./screenshots/entity_selected.png
# Read screenshot — should show entity centered and highlighted
```

## API Verification

### Testing Backend Endpoints

```bash
# Check server health
curl -s http://localhost:8765/api/v1/health | python3 -m json.tool

# Entity report count
curl -s "http://localhost:8765/api/v1/entities/getLatest?max_count=5" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Reports: {len(data.get(\"tasks\", []))}')
"
```

## What "Done" Means

- App is running and verified working
- **Screenshots taken and INSPECTED** (not just captured)
- **Specific feature verified visually** (not just "it loads")
- Data confirmed correct via API inspection
- No console errors
- User can immediately use the feature

## What "Done" Does NOT Mean

- "This should work"
- "Try running it"
- "The code looks correct"
- "TypeScript compiles"
- Untested assumptions
- Screenshots captured but not read/inspected
