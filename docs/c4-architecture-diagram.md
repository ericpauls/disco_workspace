# DiSCO C4 Architecture Diagrams

C4 model diagrams showing the DiSCO development environment at four levels of abstraction.

## Level 1: System Context Diagram

Shows DiSCO in its broader context - the people who use it and the systems it interacts with.

```mermaid
C4Context
    title System Context Diagram for DiSCO Development Environment

    Person(developer, "Developer", "Builds and tests DiSCO client applications")
    Person(analyst, "EW Analyst", "Views Common Operating Picture and analyzes entity data")

    System(disco_dev, "DiSCO Development Environment", "Simulates the full DiSCO ecosystem for development and testing")

    System_Ext(real_disco, "Production DiSCO Server", "Real L3Harris DiSCO cloud infrastructure (AWS)")
    System_Ext(real_endpoints, "Real DiSCO Endpoints", "DECEPTOR payloads on UAVs, USVs, land stations")
    System_Ext(tak_server, "TAK Server", "Tactical Assault Kit integration")

    Rel(developer, disco_dev, "Develops against", "localhost")
    Rel(analyst, disco_dev, "Views simulated data", "Browser")

    Rel(disco_dev, real_disco, "API-compatible with", "REST/WebSocket")
    Rel(real_endpoints, real_disco, "Reports to", "UCI Messages")
    Rel(real_disco, tak_server, "Integrates with", "CoT")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Level 2: Container Diagram

Shows the high-level technology choices and how the containers communicate.

```mermaid
C4Container
    title Container Diagram for DiSCO Development Environment

    Person(developer, "Developer", "Builds and tests DiSCO applications")

    System_Boundary(disco_dev, "DiSCO Development Environment") {
        Container(client_ui, "Client UI", "React 19, Vite, TypeScript", "Visualizes entities on maps and tables. Provides Common Operating Picture.")

        Container(surrogate_server, "Surrogate DiSCO Server", "Express.js, TypeScript", "Emulates DiSCO API. Stores entity reports, position reports, and live world model.")

        Container(simulation_engine, "Simulation Engine", "TypeScript", "Generates truth data, simulates endpoint observations with measurement noise.")

        ContainerDb(entity_store, "Entity Store", "In-Memory Array", "Stores raw entity reports from simulated endpoints")

        ContainerDb(position_store, "Position Store", "In-Memory Array", "Stores position reports from simulated endpoints")

        ContainerDb(liveworld_store, "Live World Store", "In-Memory Array", "Canonical view - one row per physical entity")
    }

    System_Ext(js_client, "JavaScript API Client", "Auto-generated OpenAPI client for DiSCO APIs")

    Rel(developer, client_ui, "Views", "Browser :3000")
    Rel(client_ui, surrogate_server, "Fetches data", "HTTP REST :8765")
    Rel(client_ui, js_client, "Uses", "npm package")

    Rel(simulation_engine, entity_store, "Writes entity reports")
    Rel(simulation_engine, position_store, "Writes position reports")
    Rel(simulation_engine, liveworld_store, "Updates live world")

    Rel(surrogate_server, entity_store, "Reads")
    Rel(surrogate_server, position_store, "Reads")
    Rel(surrogate_server, liveworld_store, "Reads")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Level 3: Component Diagram - Surrogate Server

Shows the internal components of the Surrogate DiSCO Server.

```mermaid
C4Component
    title Component Diagram for Surrogate DiSCO Server

    Container_Boundary(server, "Surrogate DiSCO Server") {

        Component(express_app, "Express Application", "Express.js", "HTTP server, routing, middleware")

        Component(entities_api, "Entities API", "REST Controller", "/apidocs/entities/* endpoints for entity report CRUD")

        Component(position_api, "Position Reports API", "REST Controller", "/apidocs/positionReports/* endpoints")

        Component(liveworld_api, "Live World API", "REST Controller", "/apidocs/liveWorldModel/* endpoints")

        Component(sim_control_api, "Simulation Control API", "REST Controller", "/apidocs/simulation/* pause/resume/clear")

        Component(endpoint_mgmt_api, "Endpoint Management API", "REST Controller", "/apidocs/endpoints/* pause/resume individual endpoints")

        Component(health_api, "Health & Metrics API", "REST Controller", "/apidocs/health, /apidocs/metrics")

        ComponentDb(entity_store, "Entity Store", "In-Memory", "Stores entity reports with history limit")

        ComponentDb(position_store, "Position Store", "In-Memory", "Stores position reports with history limit")

        ComponentDb(liveworld_store, "Live World Store", "In-Memory", "Current state of all entities")
    }

    Container_Boundary(simulation, "Simulation Engine") {
        Component(sim_engine, "Simulation Engine", "TypeScript Class", "Main loop: updates positions, generates reports")

        Component(entity_manager, "Entity Manager", "TypeScript Class", "Manages truth entities and endpoints separately")

        Component(measurement_model, "Measurement Model", "TypeScript Module", "Visibility checks, noise application")

        Component(scenario_loader, "Scenario Loader", "TypeScript Module", "Loads scenario configs (EndpointTestScenario, etc.)")
    }

    Rel(express_app, entities_api, "Routes to")
    Rel(express_app, position_api, "Routes to")
    Rel(express_app, liveworld_api, "Routes to")
    Rel(express_app, sim_control_api, "Routes to")
    Rel(express_app, endpoint_mgmt_api, "Routes to")
    Rel(express_app, health_api, "Routes to")

    Rel(entities_api, entity_store, "Reads/Writes")
    Rel(position_api, position_store, "Reads/Writes")
    Rel(liveworld_api, liveworld_store, "Reads/Writes")

    Rel(sim_engine, entity_manager, "Updates entities")
    Rel(sim_engine, measurement_model, "Generates observations")
    Rel(sim_engine, entity_store, "Writes reports")
    Rel(sim_engine, position_store, "Writes reports")
    Rel(sim_engine, liveworld_store, "Updates")

    Rel(scenario_loader, entity_manager, "Configures")
    Rel(sim_control_api, sim_engine, "Controls")
    Rel(endpoint_mgmt_api, entity_manager, "Controls endpoints")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="2")
```

## Level 3: Component Diagram - Client UI

Shows the internal components of the Client UI application.

```mermaid
C4Component
    title Component Diagram for Client UI

    Container_Boundary(client, "Client UI Application") {

        Component(app_shell, "App Shell", "React Component", "Main layout, tab navigation, theme switching")

        Component(map_view, "Map View", "React + Leaflet", "Interactive map with entity markers, uncertainty ellipses")

        Component(data_table, "Data Table", "React + TanStack Table", "Sortable, filterable entity grid")

        Component(entity_details, "Entity Details Panel", "React Component", "Selected entity information display")

        Component(sim_controls, "Simulation Controls", "React Component", "Pause/resume, endpoint management")

        Component(liveworld_tab, "Live World Tab", "React Component", "Displays liveWorldModel data")

        Component(entities_tab, "Entity Reports Tab", "React Component", "Displays raw entity reports")

        Component(positions_tab, "Position Reports Tab", "React Component", "Displays endpoint position reports")

        Component(api_service, "API Service", "TypeScript Module", "HTTP client for server communication")

        Component(polling_hook, "Polling Hook", "React Hook", "useInterval for real-time updates")

        Component(test_api, "Test API", "Browser Global", "window.__testAPI__ for Playwright automation")
    }

    Container_Ext(server, "Surrogate DiSCO Server", "Express.js")
    Container_Ext(js_client, "JavaScript API Client", "OpenAPI Generated")

    Rel(app_shell, liveworld_tab, "Renders")
    Rel(app_shell, entities_tab, "Renders")
    Rel(app_shell, positions_tab, "Renders")
    Rel(app_shell, sim_controls, "Renders")

    Rel(liveworld_tab, map_view, "Uses")
    Rel(liveworld_tab, data_table, "Uses")
    Rel(entities_tab, data_table, "Uses")
    Rel(positions_tab, data_table, "Uses")

    Rel(map_view, entity_details, "Opens on click")

    Rel(polling_hook, api_service, "Triggers fetches")
    Rel(api_service, js_client, "Uses")
    Rel(js_client, server, "HTTP REST", ":8765")

    Rel(test_api, app_shell, "Controls for E2E tests")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

## Level 3: Component Diagram - Simulation Engine

Shows the internal components of the Simulation Engine in detail.

```mermaid
C4Component
    title Component Diagram for Simulation Engine

    Container_Boundary(simulation, "Simulation Engine") {

        Component(sim_loop, "Simulation Loop", "setInterval", "Ticks every 100ms, updates all entities")

        Component(entity_manager, "Entity Manager", "TypeScript Class", "Tracks truth entities separately from endpoints")

        Component(truth_entities, "Truth Entities", "Entity Classes", "Land, Maritime, Air entities with motion models")

        Component(disco_endpoints, "DiSCO Endpoints", "Endpoint Classes", "DECEPTOR-LAND, SEA, AIR with sensor configs")

        Component(motion_models, "Motion Models", "TypeScript Module", "Patrol, Transit, Waypoint, Stationary patterns")

        Component(emitter_profiles, "Emitter Profiles", "TypeScript Data", "Realistic RF signal characteristics by type")

        Component(visibility_check, "Visibility Check", "TypeScript Function", "Range and line-of-sight calculations")

        Component(geo_noise, "Geolocation Noise", "TypeScript Function", "Bearing/range error with Gaussian distribution")

        Component(signal_noise, "Signal Noise", "TypeScript Function", "Frequency/PRI/PW/amplitude noise")

        Component(report_generator, "Report Generator", "TypeScript Class", "Creates EntityReport and PositionReport objects")

        Component(scenario_config, "Scenario Configuration", "TypeScript Data", "EndpointTestScenario, ContestedMaritimeScenario")
    }

    ComponentDb(entity_store, "Entity Store", "External")
    ComponentDb(position_store, "Position Store", "External")

    Rel(sim_loop, entity_manager, "Updates each tick")
    Rel(entity_manager, truth_entities, "Manages")
    Rel(entity_manager, disco_endpoints, "Manages")

    Rel(truth_entities, motion_models, "Uses")
    Rel(disco_endpoints, motion_models, "Uses")
    Rel(truth_entities, emitter_profiles, "Uses")

    Rel(sim_loop, visibility_check, "For each endpoint-entity pair")
    Rel(visibility_check, geo_noise, "If visible")
    Rel(geo_noise, signal_noise, "Apply noise chain")
    Rel(signal_noise, report_generator, "Create report")

    Rel(report_generator, entity_store, "Writes entity reports")
    Rel(disco_endpoints, position_store, "Writes position reports")

    Rel(scenario_config, entity_manager, "Initializes")
    Rel(scenario_config, disco_endpoints, "Configures sensors")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

## Deployment Diagram

Shows how the system is deployed for local development.

```mermaid
C4Deployment
    title Deployment Diagram for DiSCO Development Environment

    Deployment_Node(dev_machine, "Developer Machine", "macOS/Windows/Linux") {

        Deployment_Node(browser, "Web Browser", "Chrome/Firefox/Safari") {
            Container(client_instance, "Client UI", "React App", "http://localhost:3000")
        }

        Deployment_Node(node_runtime, "Node.js Runtime", "Node 18+") {

            Deployment_Node(vite_server, "Vite Dev Server", "Port 3000") {
                Container(client_build, "Client Build", "React 19 + TypeScript", "Hot module replacement")
            }

            Deployment_Node(express_server, "Express Server", "Port 8765") {
                Container(server_instance, "Surrogate Server", "Express.js + TypeScript", "DiSCO API emulation")
                Container(sim_instance, "Simulation Engine", "TypeScript", "Entity simulation")
            }
        }

        Deployment_Node(filesystem, "File System", "Local") {
            Container(screenshots, "Screenshots", "./screenshots/", "Visual test artifacts")
            Container(js_client_pkg, "JavaScript Client", "./javascript-client/", "Generated API client")
        }
    }

    Rel(client_instance, client_build, "Loads from", "HTTP")
    Rel(client_instance, server_instance, "Fetches data", "HTTP REST")
    Rel(client_build, js_client_pkg, "Imports", "npm")

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

## Summary: C4 Levels

| Level | Diagram | Audience | Shows |
|-------|---------|----------|-------|
| **1 - Context** | System Context | Everyone | DiSCO dev environment in relation to real DiSCO and users |
| **2 - Container** | Container | Developers | Major technology blocks and their interactions |
| **3 - Component** | Component (x3) | Developers | Internal structure of Server, Client, and Simulation |
| **4 - Code** | (See ERD) | Developers | Data structures and relationships |

## Key Architectural Decisions

1. **Separate Truth from Observations**: The simulation maintains "truth data" (actual entity positions) separate from "observations" (what endpoints report with noise)

2. **API Compatibility**: The surrogate server implements the same REST API as production DiSCO, enabling seamless transition to real infrastructure

3. **In-Memory Storage**: Development uses in-memory arrays instead of a database for simplicity and fast iteration

4. **Measurement Model Abstraction**: Visibility checks and noise models are isolated, making it easy to tune sensor characteristics

5. **Component Isolation**: Clear boundaries between UI, API layer, and simulation enable independent testing and development
