# DiSCO C4 Architecture Diagrams

C4 model diagrams showing the DiSCO development environment at four levels of abstraction.

## Level 1: System Context Diagram

Shows DiSCO in its broader context - the people who use it and the systems it interacts with.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '14px'}}}%%
flowchart LR
    subgraph users["&nbsp;&nbsp;Users&nbsp;&nbsp;"]
        direction TB
        dev["<b>Developer</b><br/><i>Builds & tests apps</i>"]
        analyst["<b>EW Analyst</b><br/><i>Views COP data</i>"]
    end

    disco["<b>DiSCO Dev Environment</b><br/><i>Simulates full ecosystem</i>"]

    subgraph external["&nbsp;&nbsp;Production Systems&nbsp;&nbsp;"]
        direction TB
        endpoints["<b>DiSCO Endpoints</b><br/><i>DECEPTOR sensors</i>"]
        prod["<b>Production DiSCO</b><br/><i>L3Harris AWS</i>"]
        tak["<b>TAK Server</b><br/><i>CoT integration</i>"]
    end

    dev -->|develops| disco
    analyst -->|views| disco
    disco -.->|API compatible| prod
    endpoints -->|reports| prod
    prod -->|feeds| tak

    classDef person fill:#08427B,stroke:#052E56,color:#fff,stroke-width:2px
    classDef system fill:#1168BD,stroke:#0B4884,color:#fff,stroke-width:2px
    classDef ext fill:#666,stroke:#444,color:#fff,stroke-width:2px
    classDef userbox fill:#E8F4FD,stroke:#08427B,stroke-width:1px
    classDef extbox fill:#F5F5F5,stroke:#666,stroke-width:1px

    class dev,analyst person
    class disco system
    class prod,endpoints,tak ext
    class users userbox
    class external extbox
```

## Level 2: Container Diagram

Shows the four services and how they communicate.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '13px'}}}%%
flowchart LR
    dev["<b>Developer</b>"]

    subgraph disco["&nbsp;&nbsp;DiSCO Development Environment&nbsp;&nbsp;"]
        direction TB
        dash["<b>Dashboard</b><br/><i>Express.js</i><br/>:8080"]
        client["<b>Client UI</b><br/><i>React 19, Vite</i><br/>:3000"]

        subgraph server["&nbsp;&nbsp;Surrogate Server :8765&nbsp;&nbsp;"]
            direction LR
            entity_db[("Entities")]
            pos_db[("Positions")]
            lw_db[("Live World")]
        end

        subgraph emulator["&nbsp;&nbsp;Data Emulator :8766&nbsp;&nbsp;"]
            sim["Simulation<br/>Engine"]
            scenarios["Scenarios"]
        end
    end

    js_client["<b>JS API Client</b><br/><i>OpenAPI</i>"]

    dev -->|Browser| dash
    dev -->|Browser| client
    client --> js_client
    js_client -->|REST GET| server
    emulator -->|POST reports| server
    dash -.->|manages| server
    dash -.->|manages| emulator
    dash -.->|manages| client

    classDef person fill:#08427B,stroke:#052E56,color:#fff,stroke-width:2px
    classDef container fill:#438DD5,stroke:#2E6295,color:#fff,stroke-width:2px
    classDef db fill:#438DD5,stroke:#2E6295,color:#fff,stroke-width:2px
    classDef ext fill:#666,stroke:#444,color:#fff,stroke-width:2px
    classDef boundary fill:#E8F4FD,stroke:#1168BD,stroke-width:2px
    classDef inner fill:#fff,stroke:#438DD5,stroke-width:1px,stroke-dasharray: 5 5

    class dev person
    class dash,client,sim,scenarios container
    class entity_db,pos_db,lw_db db
    class js_client ext
    class disco boundary
    class server,emulator inner
```

## Level 3: Component Diagram - Surrogate Server

Shows the internal components of the Surrogate DiSCO Server (port 8765).

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '12px'}}}%%
flowchart LR
    subgraph server["Surrogate Server :8765"]
        direction TB
        express["<b>Express App</b><br/><i>HTTP routing</i>"]

        subgraph apis["REST APIs"]
            entities["Entities"]
            positions["Positions"]
            liveworld["LiveWorld"]
            health["Health"]
        end

        subgraph stores["Data Stores"]
            e_db[("E")]
            p_db[("P")]
            lw_db[("LW")]
        end

        express --> apis
        apis --> stores
    end

    emulator["<b>Data Emulator</b><br/><i>:8766</i>"]
    client["<b>Client UI</b><br/><i>:3000</i>"]

    emulator -->|POST reports| apis
    client -->|GET data| apis

    classDef comp fill:#85BBF0,stroke:#5A9BD5,color:#000
    classDef sbox fill:#E8F4FD,stroke:#438DD5,stroke-width:2px
    classDef ext fill:#666,stroke:#444,color:#fff
    classDef inner fill:#fff,stroke:#85BBF0,stroke-width:1px

    class express,entities,positions,liveworld,health comp
    class e_db,p_db,lw_db comp
    class server sbox
    class emulator,client ext
    class apis,stores inner
```

## Level 3: Component Diagram - Client UI

Shows the internal components of the Client UI application.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '12px'}}}%%
flowchart LR
    subgraph client["Client UI Application"]
        direction TB
        shell["<b>App Shell</b><br/><i>Layout & tabs</i>"]

        subgraph tabs["Tab Views"]
            lw_tab["LiveWorld"]
            ent_tab["Entities"]
            pos_tab["Positions"]
        end

        subgraph views["Shared Components"]
            map["Map View"]
            table["Data Table"]
            details["Details Panel"]
        end

        subgraph data["Data Layer"]
            polling["Polling Hook"]
            api_svc["API Service"]
        end

        shell --> tabs
        tabs --> views
        polling --> api_svc
    end

    js_client["<b>JS API Client</b><br/><i>OpenAPI</i>"]
    server["<b>Server</b><br/><i>:8765</i>"]

    api_svc --> js_client
    js_client --> server

    classDef comp fill:#85BBF0,stroke:#5A9BD5,color:#000
    classDef cbox fill:#E8F4FD,stroke:#438DD5,stroke-width:2px
    classDef ext fill:#666,stroke:#444,color:#fff
    classDef inner fill:#fff,stroke:#85BBF0,stroke-width:1px

    class shell,lw_tab,ent_tab,pos_tab,map,table,details,polling,api_svc comp
    class client cbox
    class js_client,server ext
    class tabs,views,data inner
```

## Level 3: Component Diagram - Data Emulator

Shows the internal components of the Data Emulator (port 8766).

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '12px'}}}%%
flowchart LR
    subgraph emu["Data Emulator :8766"]
        direction TB
        emu_api["<b>Emulator API</b><br/><i>Express.js</i>"]

        subgraph sim["Simulation Engine"]
            loop["Sim Loop"]
            mgr["Entity Manager"]
            truth["Truth Entities"]
            endpoints["Endpoints"]
        end

        subgraph measurement["Measurement Model"]
            visibility["Visibility"]
            geo_noise["Geo Noise"]
            sig_noise["Signal Noise"]
        end

        subgraph scenarios_box["Scenarios"]
            scenario_cfg["Scenario Config"]
        end

        emu_api -->|start/stop| sim
        loop --> mgr
        loop --> measurement
        scenario_cfg --> mgr
    end

    server["<b>Surrogate Server</b><br/><i>:8765</i>"]
    dashboard["<b>Dashboard</b><br/><i>:8080</i>"]

    endpoints -->|POST reports| server
    truth -->|POST sync| server
    dashboard -.->|scenario control| emu_api

    classDef comp fill:#85BBF0,stroke:#5A9BD5,color:#000
    classDef sbox fill:#FFF3E0,stroke:#E65100,stroke-width:2px
    classDef ext fill:#666,stroke:#444,color:#fff
    classDef inner fill:#fff,stroke:#85BBF0,stroke-width:1px

    class emu_api,loop,mgr,truth,endpoints,visibility,geo_noise,sig_noise,scenario_cfg comp
    class emu sbox
    class server,dashboard ext
    class sim,measurement,scenarios_box inner
```

## Deployment Diagram

Shows how the system is deployed for local development.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '12px'}}}%%
flowchart TB
    subgraph machine["Developer Machine"]
        direction LR

        subgraph browser["Browser"]
            dash_ui["<b>Dashboard</b><br/><i>localhost:8080</i>"]
            client_ui["<b>Client UI</b><br/><i>localhost:3000</i>"]
        end

        subgraph node["Node.js Processes"]
            direction TB
            dash_srv["<b>Dashboard Server</b><br/><i>:8080 Process Mgmt</i>"]
            express["<b>Surrogate Server</b><br/><i>:8765 API + Stores</i>"]
            emu_srv["<b>Data Emulator</b><br/><i>:8766 Simulation</i>"]
            vite["<b>Vite Dev Server</b><br/><i>:3000 HMR</i>"]
        end

        subgraph files["File System"]
            js_client["JS Client"]
            screenshots["Screenshots"]
        end
    end

    dash_ui -->|manages| dash_srv
    client_ui -->|loads| vite
    client_ui -->|REST| express
    vite --> js_client
    dash_srv -.->|spawns| express
    dash_srv -.->|spawns| emu_srv
    dash_srv -.->|spawns| vite
    emu_srv -->|POST| express

    classDef runtime fill:#85BBF0,stroke:#5A9BD5,color:#000
    classDef browser fill:#438DD5,stroke:#2E6295,color:#fff
    classDef file fill:#888,stroke:#666,color:#fff
    classDef machine fill:#E8F4FD,stroke:#1168BD,stroke-width:2px
    classDef inner fill:#fff,stroke:#85BBF0,stroke-width:1px

    class dash_ui,client_ui browser
    class dash_srv,express,emu_srv,vite runtime
    class js_client,screenshots file
    class machine machine
    class browser,node,files inner
```

## Summary: C4 Levels

| Level | Diagram | Audience | Shows |
|-------|---------|----------|-------|
| **1 - Context** | System Context | Everyone | DiSCO dev environment in relation to real DiSCO and users |
| **2 - Container** | Container | Developers | Four services (Dashboard, Server, Emulator, Client) and their interactions |
| **3 - Component** | Component (x3) | Developers | Internal structure of Server, Client, and Emulator |
| **4 - Code** | (See ERD) | Developers | Data structures and relationships |

## Key Architectural Decisions

1. **Three-Service Architecture**: Dashboard (8080) orchestrates Surrogate Server (8765), Data Emulator (8766), and Client UI (3000) as independent processes

2. **Emulator is Server-Agnostic**: The emulator POSTs reports to a configurable target URL, working with the surrogate server locally or a real DiSCO server remotely

3. **Separate Truth from Observations**: The simulation maintains "truth data" (actual entity positions) separate from "observations" (what endpoints report with noise)

4. **API Compatibility**: The surrogate server implements the same REST API as production DiSCO, enabling seamless transition to real infrastructure

5. **In-Memory Storage**: Development uses in-memory stores instead of a database for simplicity and fast iteration

6. **Idle-Start Emulator**: The emulator starts without a running simulation; users select a scenario via the dashboard before data flows
