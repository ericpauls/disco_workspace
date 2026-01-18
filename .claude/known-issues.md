# Known Issues & Future Work

## Configuration & Setup Notes

### Browser Configuration - Switch to Google Chrome
**Status**: COMPLETED
**Priority**: High
**Created**: 2026-01-08
**Completed**: 2026-01-18

**Description**:
Switched from Safari to Google Chrome for development, testing, and screenshots.

**What was done**:
1. Updated `claude_code_web_dev_workflow.md` with Chrome-based workflow
2. Chrome window size standardized to 900x600 (fits smaller monitors)
3. Updated AppleScript commands for Chrome
4. Added Chrome DevTools Protocol (CDP) instructions for programmatic control

**Chrome Launch Command**:
```bash
# macOS with fixed window size
open -a "Google Chrome" --args --window-size=900,600 http://localhost:3000
```

---

## Active Issues

### Dark/Light Mode Toggle Not Functional
**Status**: Needs Implementation
**Priority**: Medium
**Created**: 2026-01-08

**Description**:
The dark/light mode toggle button is rendered in the header but doesn't actually switch between themes. The button state changes but the CSS variables and map tiles don't update accordingly.

**Current Implementation**:
- Theme toggle button added to header with darkMode state in App.jsx
- Button passes darkMode prop to MapView for tile layer CSS class
- CSS variables defined for dark mode colors

**Issues**:
1. Theme switching logic not fully implemented
2. Light mode color scheme not defined (CSS variables)
3. MapView tile layer className conditional based on darkMode but not effective

**Next Steps**:
1. Define light mode color scheme in CSS variables
2. Implement theme switching that updates document root or app-container classes
3. Apply theme to all UI elements (header, panels, map tiles, text colors)
4. Test both theme modes thoroughly

**Related Files**:
- `client/src/App.jsx` (lines 13, 31-33)
- `client/src/components/MapView.jsx` (line 257)
- `client/src/index.css` (theme variables section)

---

### Color Coding Inconsistency for Entity Types & Disposition
**Status**: Needs Implementation
**Priority**: High
**Created**: 2026-01-08

**Description**:
Entity icons on the map, text in the data table info box, legend badges in the header, and popup info boxes don't use consistent color coding. Colors should follow NATO symbology standards and be consistent across all UI elements.

**Current Implementation**:
- Entity type colors defined (RADAR, COMMUNICATIONS, JAMMER, MISSILE)
- Disposition colors defined (HOSTILE, FRIENDLY, NEUTRAL, UNKNOWN)
- Colors used in map icons, badges, and table styling
- Legend badges shown in header

**Issues**:
1. Colors not consistent across all representations (icon, popup, legend, table)
2. NATO symbology standards not fully applied
3. Some entity types/dispositions missing color definitions
4. Text color in info boxes may not contrast well with selected state

**Requirements**:
- All representations of same entity type/disposition use identical colors
- Colors comply with NATO military symbology
- Text in info boxes properly styled and color-coded
- Sufficient contrast for readability

**Next Steps**:
1. Review NATO symbology color standards
2. Audit all UI elements that display entity type/disposition
3. Create unified color scheme across header, map, table, and popups
4. Test contrast and readability

**Related Files**:
- `client/src/App.jsx` (color helper functions, lines 72-90)
- `client/src/components/MapView.jsx` (entity circle colors)
- `client/src/index.css` (color definitions and usage)

---

### Performance Issues with Large Entity Counts
**Status**: Needs Implementation
**Priority**: High
**Created**: 2026-01-08

**Description**:
Scenario generation and entity updates become inefficient with large numbers of entities (goal: support 10k unique entities). Current implementation updates all entities at full frequency regardless of viewport visibility.

**Current Implementation**:
- All entities updated each simulation tick
- Entity positions calculated for all entities regardless of distance
- No spatial indexing or visibility culling
- Single-threaded JavaScript execution

**Issues**:
1. Frame rate drops significantly with >1000 entities
2. CPU usage scales linearly with entity count
3. No optimization for off-screen entities
4. All trails updated continuously

**Proposed Solutions**:
1. **Spatial Indexing**: Implement quadtree or R-tree for efficient entity queries by location
2. **Level-of-Detail Motion**: Distant entities update less frequently than nearby ones
3. **Entity Pooling**: Reduce garbage collection pressure by reusing entity objects
4. **Chunked Updates**: Spread updates across multiple animation frames
5. **Web Workers**: Move simulation processing to parallel worker threads

**Next Steps**:
1. Profile current implementation to identify bottlenecks
2. Implement spatial indexing for entity queries
3. Add LOD system for update frequencies
4. Consider entity pooling for large counts
5. Evaluate web worker feasibility for simulation

**Related Files**:
- `server/routes/liveWorldModel.js` (entity generation)
- `client/src/hooks/useLiveWorldData.js` (entity updates)
- `client/src/hooks/useEntityHistory.js` (trail management)

---

### Browser Memory Leak with Long-Running Sessions
**Status**: Needs Investigation
**Priority**: High
**Created**: 2026-01-08

**Description**:
Browser memory usage increases indefinitely when the client runs for extended periods. Memory is not released even when entities move off-screen or are no longer relevant. After several hours, browser memory fills up and may cause crashes or automatic page refresh.

**Current Implementation**:
- Entity trails stored in `useEntityHistory` hook
- All historical positions maintained in memory
- No limits on trail data size
- Entity history never purged

**Issues**:
1. Trails retain all historical positions indefinitely
2. Memory usage grows unbounded over time
3. No garbage collection of old/orphaned trail data
4. Unknown memory leaks in entity or trail references

**Suspected Causes**:
1. Trail data retention (primary suspect)
2. Entity object references not being cleaned up
3. Event listener or callback memory leaks
4. Leaflet layer/popup memory accumulation

**Requirements**:
- Memory usage must remain constant or grow very slowly
- Implement hard limit on trail data (e.g., max 100MB or 1M position points)
- Detect and fix memory leaks
- Graceful degradation when memory approaches limit

**Next Steps**:
1. Profile memory usage over time with Chrome DevTools
2. Investigate trail data retention and implement sampling/downsampling
3. Add memory monitoring and limits
4. Check for event listener leaks in map/popup rendering
5. Implement data cleanup routines

**Related Files**:
- `client/src/hooks/useEntityHistory.js` (trail storage)
- `client/src/components/MapView.jsx` (trail rendering)
- `client/src/App.jsx` (entity management)

---

### Popup Positioning Not Working Correctly
**Status**: In Progress
**Priority**: High
**Created**: 2026-01-08

**Description**:
The smart popup positioning system is not correctly preventing popups from being cut off by the header bar or map edges. When clicking on entities near the top of the viewport, the popup info box gets partially obscured by the DiSCO header bar.

**Current Implementation**:
- `SmartPopup` component in `MapView.jsx` calculates dynamic offsets
- `calculatePopupOffset()` function attempts to detect viewport boundaries
- Arrow/tip removed from popups via CSS
- `autoPan={false}` to prevent map movement

**Issues**:
1. Offset calculation logic doesn't correctly account for popup positioning
2. Popups still get cut off at the top edge despite margin calculations
3. The relationship between Leaflet's offset parameter and actual popup position needs better understanding

**Requirements**:
- Popup must NEVER be cut off by any edge of the viewport
- Popup should reposition up/down/left/right as needed
- Map should NOT pan when popup opens (already implemented)
- No directional arrow since popup can appear from any direction (already implemented)

**Next Steps**:
1. Debug actual popup dimensions after rendering
2. Test Leaflet's offset behavior more thoroughly
3. Consider alternative approaches (CSS transforms, absolute positioning, etc.)
4. Add visual debugging to show calculated boundaries

**Related Files**:
- `client/src/components/MapView.jsx` (lines 147-235)
- `client/src/index.css` (lines 863-883)

---

### Table Row Hover Highlighting Not Implemented
**Status**: Needs Implementation
**Priority**: Medium
**Created**: 2026-01-08

**Description**:
Hovering over a row in the entity data table should highlight/select that entity on the map, making it easy to locate the entity among many others in a cluttered visualization.

**Current Implementation**:
- Data table rows are clickable to select and center on entity
- Entity highlighting works on click
- No hover interaction implemented

**Requirements**:
- Hovering over table row highlights entity on map (visual change)
- Highlighting should be distinct from click selection
- May include a glow, outline, or scaling effect
- Should work smoothly without performance impact
- Unhighlighting on mouse leave

**Next Steps**:
1. Add onMouseEnter/onMouseLeave handlers to table rows
2. Pass hover state to MapView component
3. Implement visual highlighting on map (glow, scale, outline)
4. Test with many entities for performance

**Related Files**:
- `client/src/App.jsx` (table row rendering, lines 319-345)
- `client/src/components/MapView.jsx` (entity rendering)
- `client/src/index.css` (table and map styling)

---

### Entity Filtering Not Implemented
**Status**: Needs Implementation
**Priority**: Medium
**Created**: 2026-01-08

**Description**:
Add new filtering features to allow users to view only specific types of entities or dispositions. Currently, only text search filtering exists. Need UI for filtering by:
- Entity type (RADAR, COMMUNICATIONS, JAMMER, MISSILE)
- Disposition (HOSTILE, FRIENDLY, NEUTRAL, UNKNOWN)
- Other metadata (frequency range, signal strength, etc.)

**Current Implementation**:
- Text search filtering on entity name and type
- No UI for categorical filtering
- All entities shown on map by default

**Requirements**:
- Filter controls in data panel
- Multiple filter types can be combined (AND logic)
- Filter affects both table and map display
- Quick toggle buttons for common filters
- Persist filter state during session

**Proposed Approach**:
1. Add filter state to App.jsx
2. Create FilterPanel component with checkboxes/toggles
3. Implement filter logic for entities
4. Apply filters to both table and map rendering
5. Show count of filtered vs total entities

**Next Steps**:
1. Design filter UI layout
2. Implement filter state management
3. Create filter UI controls
4. Apply filters to entity display
5. Test with large entity sets

**Related Files**:
- `client/src/App.jsx` (state and filtering logic)
- `client/src/components/MapView.jsx` (map rendering)
- `client/src/index.css` (filter UI styling)

---

## Completed Features

### Entity Selection Without Map Centering
**Completed**: 2026-01-08

Clicking entities on the map shows info box without panning. Clicking entity rows in the data table centers the map on that entity.

### Historical Trails Display
**Completed**: 2026-01-08

Entity movement trails with color-coded disposition and orphaned trail handling.
