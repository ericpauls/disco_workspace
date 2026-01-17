# DiSCO Notes Summarization Prompt  
  
This is a collection of notes, white papers, Internal Research & Development (IRAD) roadmap, and brainstorming session summaries documenting L3Harris’s DiSCO product. The objective is to create documentation describing what the product is/does, what the R&D product roadmap looks like, and what proposed customer-funded work and partnership projects are going on.  Step 1. Turn these notes into a nicely formatted markdown document. The goal here is not to summarize or reduce, but simply to fix formatting, grammar, acronyms, etc. so there is a consistent style. Use the original wording where appropriate. Step 2. once we are happy with the document, I want you to ask questions and offer suggests where more detail would help explain the product and roadmap.  
  
  
  
# DiSCO (Distributed Spectrum Collaboration & Operations)  
###   
DiSCO is L3Harris’s approach to a tactical internet of things. It is an architecture that describes the messaging, APIs, cloud compute resources, services, and endpoint configurations to facilitate moving tactical, “crowdsourced” ELINT from the forward-deployed systems that discover signals and entities, back to the cloud for storage, analysis, and decision making support. L3Harris maintains the DiSCO architecture, and provides “apps” (business logic) and endpoints (ES, ELINT, EW payloads) that can easily connect to existing DiSCO ecosystems. The “apps” do vital tasks such as edge data reduction: knowing which needle in the spectrum haystack is worth reporting, data fusion: combining many entity reports and vantage points from sensors into a single fused, tracked entity, and will (as a result of new efforts described in this paper) provide situational awareness and decision support tools to understand the consequences of EM spectrum maneuvers.  
  
DiSCO API:  
DiSCO moves data in and out of its internal databases and services via the DiSCO API. DiSCO API endpoints allow services, clients, and payloads to read and write data such as entity reports, signal recordings, fusion results, and C2 messages. The DiSCO API has both a “mission system” communication mode, implementing Universal Command and Control (UCI) messaging, and a “web” communication mode, allowing clients and web apps to communicate via traditional REST API transactions. The mission system scheme prioritizes low data rates and compatibility with Open Mission Systems (OMS), while the web method prioritizes openness to application developers and web UI’s.   
  
DiSCO messages and data:  
DiSCO supports data types and representations to allow sensors and platforms to report the location, characteristics, and actions of friendly platforms, threats, RF emitters, jammers, communications systems, and more. When possible, the DiSCO data types mirror UCI message schema for easy translation in and out of the UCI format. As an example use case, a DiSCO-connected EW payload can sense the RF spectrum, identify a threat radar, and record its RF emissions as Pulse Descriptor Words (PDWs). It then sends 3 DiSCO messages (based on the concepts in the UCI Schema): an Entity Report , which provides a high level summary of the physical entity (radar), its ID, and its operating characteristics, a Pulse Data message, which contains the granular PDW signal measurements, and a Position Report, which captures the reporting platform/payload’s current position and state when it captured the threat signal. These 3 messages are sent to a DiSCO server via one of the DiSCO API modes (Zero MQ or HTTP). The messaging schema supports linking via UUID fields, for example the Entity Report message has an optional field for a Pulse Data message UUID, so the EW system can report which Pulse Data message is associated with a reported Entity. The DiSCO server writes the contents of these messages to database tables, assigning server-side UUIDs and timestamps to facilitate downstream data processing and fusion. The DiSCO database has tables for correlation and fusion to facilitate combining many Entity messages, possibly from separate endpoints, to a single fused entity. The DiSCO API facilitates reading and writing to the database tables, and is the gateway for powerful analytics tools and AI processes.  
  
DiSCO Services:  
DiSCO services are automatic server-side processes that transform and move data in the DiSCO ecosystem. For example, the process that listens for new Entity Reports and correlates them with existing fused tracks is a continuously-running service. Services use the same API controls as clients for accessing and writing data in the DiSCO databases. Services can also be cued when needed. For example, if an analyst is looking at a map interface showing detected threat entities and wants to update a threat library definition to include a new signal, the analyst can click on the threat and initiate a Mission Data File (MDF) service that collects the associated raw signal recordings and updates the RF operating characteristics for that threat.   
  
DiSCO Fusion:  
  
A primary example of DiSCO Services working within the DiSCO architecture to provide actionable data products is the use of DiSCO’s Fusion services to go from raw messages and reports from endpoints to a concise “live world” model of the world. The purpose of the fusion service and the live world model is to provide a common operating picture with infeeds from DiSCO-connected sensors, combined with entity information from external sources such as NCCT, other Intelligence sources, and pre-programmed EOB/library databases.  
- entities and other raw messages come in from sensing endpoints, stored in DiSCO database tables.  
- DiSCO correlates, fuses measurements, and summarizes to place or update entities   
    - Step 1: correlation service determines which raw sensor reports “belong together”, which reports over time and across possibly multiple sensors correlate to the same physical entity (for example, if two comms detection sensors both witness the same enemy radio over the course of 5 minutes, we would want all of their reports over that period to correlate to the same unique, specific emitter ID. DiSCO keeps track of unique specific emitters with a server-side “group ID” The actual algorithm used to do correlation can be swapped out, upgraded, and tweaked as needed to meet certain operational criteria.  
    - Step 2: summarization service estimates the state (rf operation, physical location, ID) of the unique physical entity to which we have correlated one or more raw reports. For example, the summarization service might take two lines of bearing and amplitudes from two separate direction-finding sensors and perform triangulation/multilateration to get a more precise geolocation estimate than either report could provide alone. Summarization can also perform tracking and prediction, which helps the correlation service declare correlations with future new reports, and bound the candidate reports to be considered when correlating.   
    - Step 3: a Live World Model service keeps a Live World table (considered the highest, most distilled level of processed data) which maintains a single “row” per active Group ID. Unlike the correlation and summarization tables, which act as historical records of which messages were correlated together, and how those messages were summarized to estimate the fused entity’s state, the live world model should only have one entry per unique physical entity being tracked. Similar to the summarized fused entities, the live world entries still have a unique Group ID, a summarization of most recently measured state of the entity, and metadata to allow extraction of the contributing data to understand how it was summarized, and which messages , raw recordings, and sensors/endpoints contributed to our knowledge of this high-level data artifact <i think this is called provenance?>  
    - The live world model service also maintains a notion of “timing out” signals that do not have any recent updates. This can be modified as desired for certain use cases. Generally a user interface/map would query the live world table via the API, rather than rely on all the underlying raw historical data. However, for certain analytical processes it can be extremely useful to be able to “drill down” from a fused entity on the live world view and access its raw recordings and reports (for example, mission data file/library reprogramming where we need to look at RF signal recordings).  DiSCO makes it easy to look at both the very high abstracted level and the extremely granular level.  
- The goal is to have a 1:1 relationship between entities on the live world map and entities in real life, informed by perhaps millions of raw messages from multiple sensors observing RF emitters.  
  
Data Flow from Endpoints to Server - Information Collection:  
  
The primary signal flow from endpoints up to the server is in the form of collected data, such as “entity reports” (high-level aggregate summaries on signals and systems that the endpoint sensors find out about), “pulsedata” (lower level recordings of Pulse Descriptor Words (PDWs) that were used to generate an entity report, and can optionally be sent back to provide raw mesurements of the signal), and platform “position reports” of where the endpoint was and what state it was at a certain time. Generally these reports are linked and used together to facilitate higher-level data product creation. For example: friendly platform A was at location XYZ (position report) when it recorded signal 5000, classified as the emitter BAD GUY_10 (entity report) , with associated recording of 54 PDWs (pulsedata). These three types of messages mimic the Open Mission Systems - Universal Command & Control Interface (OMS-UCI) message schemas for Entity, PositionReport, and PulseData to make it easy to communicate with OMS-UCI devices. DiSCO also supports other common military message schemas and formats such as moving data to/from TAK servers, and converting to/from Weapon Open Systems Architecture (WOSA) format. The DiSCO server maintains its own data schema in its databases and API. The schema and API are openly published and free 1. to enable easy interoperability and 3rd party integrations, and 2. to ensure the data standards are not tied to or derived from restricted or export controlled standards (like OMS UCI).  
Data Flow between Clients and Server:  
  
DiSCO clients are devices that send and receive data between their local machine and a disco cloud or edge server. Examples of clients include personal computers or tablets, or plugins in other applications that need to access DiSCO to send/receive data. Clients interact with the disco server via disco’s REST API, which provides methods for pushing and pulling data, and commanding the execution and configuration of Services. For example, one might design a common operating picture map user interface, and use the DiSCO API to retrieve information about fused tracked entities by querying DiSCO’s live world model API endpoint. We refer to operations that run server-side to process, filter, and curate data as Services, while we refer to applications running client-side as “apps.” DiSCO Apps generally rely on more user interaction to provide tailored capabilities such as mission data file (MDF) library editing and signal analysis, EMBM decision support tools, platform/payload status and management, and browsing and recording/playback of collected data for post-mission analysis.  
  
Data Flow from Server to Endpoints:   
  
Endpoints specifically refer to DiSCO-connected devices that interact with the EM spectrum. They are sensors and effectors that pull in new information and provide the means of performing EM actions and maneuvers, such as re-tuning a sensor to listen to a certain band, or turning on EA jamming against a threat. DiSCO supports Command & Control (C2) of Endpoints.  
L3Harris often employs Electronic Warfare payloads and ELINT systems as DiSCO Endpoints.   
  
  
# DiSCO-NCCT Bi-Direcitonal Data and Tasking White Paper Prompt  
  
Context for Grok:  
The prior white paper focused on increasing the “depth” of capabilities for NCCT and its ecosystem of platforms. We discussed how we can aid in EMBM decision support by pulling NCCT operating picture data into ad hoc AFSIM models to inform situational awareness, threat keep-out zones, and “what if” analysis of changing mission maneuvers and jamming threats using the NCCT family of platforms. THIS NEW WHITE PAPER will focus on increasing the “breadth” of NCCT, and its ISR platforms. DiSCO provides a tactical “internet of things” of tactical, less exquisite, more distributed EM sensors and effectors. The DiSCO picture of the world based on ES/ELINT from tactical payloads and platforms can be combined with NCCT’s picture of the world from its exquisite ISR platforms. This white paper proposes bidirectional data sharing between NCCT and DiSCO, and bidirectional tasking to allow the systems to inform and cue each others’ actions to achieve mission objectives. Grok should provide the technical portion of the white paper explaining what this project accomplishes. I will separately add a formal statement of work later. The title of this white paper is NCCT DiSCO Integration.  
  
The NCCT-DiSCO bidirectional data and tasking initial capability encompasses  
  
1. Basic ability to access each others’ databases. DiSCO can query NCCT and receive its list of entities and reports. DiSCO downloads NCCT’s data continuously and stores it internally to generate a more thorough and precise fused operating picture. Similarly DiSCO publishes its data to NCCT: DiSCO can send raw entity reports directly from the sensors for use in NCCT fusion workflows, or DiSCO can send post-fusion entities that meet certain confidence criteria.  
  
2. Basic ability to add a task to the NCCT task list via DiSCO. A DiSCO-connected sensor discovers a new signal of interest that meets criteria for adding as an NCCT task. The new signal information is aggregated and fused at DiSCO server. DiSCO server evaluates NCCT tasking criteria/threshold and sends tasking to NCCT server. Similarly, ability to task a DiSCO-connected sensor to change its ES sensing behavior via NCCT commands. An NCCT user should be able to add a new task and assign a DiSCO-connected sensor to execute the task, for example: “look for this specific signal/entity in this area of regard.”  
  
3. Basic ability to task a DiSCO-connected EW system to turn on Electronic Attack (EA) capabilities against a threat via the NCCT user interface.   
  
Under the hood, this will be accomplished by exposing DiSCO server controls for ELINT and EA, via an API endpoint on the DiSCO server. The DiSCO server will receive commands from NCCT and generate/send OMS-UCI commands to the appropriate deployed, connected systems.   
  
There is also the IT/security challenge of instantiating the DiSCO “stack” (virtual server machine, database, api, user apps, etc.) on the same classified network as NCCT. The DiSCO and NCCT engineering teams will need to explore DiSCO SIPRNet deployment to enable the NCCT and DiSCO servers to talk to each other.  
  
Notes on DiSCO and NCCT  
  
- NCCT does not report every signal and entity it sees in the environment, it only reports on entities it was tasked to look for ahead of time, for example: given a list of 200 radar systems and C2 links, an NCCT like the Rivet Joint surveys the environment and discovers 10 signals, 5 of which are in the list of 200 known, whitelisted IDs. The Rivet Joint would only report the 5 known, pre-determined signals.   
- DiSCO, in contrast, reports everything it sees. DiSCO can be used to ADD tasking to NCCT to insert additional signals of interest to look for during a Rivet Joint collection mission. DiSCO-connected sensors can be used to find things NCCT did not originally expect to look for, and can be deployed places where it is too dangerous to deploy an exquisite, high-profile ISR platform.  
  
  
This section describes the tasks in the statement of work. The formal SOW section will be added separately to the white paper, but notes included here for context of the technical section of the white paper:  
  
Tasks in Statement of Work:  
1. Establish bidirectional DiSCO-NCCT data transfer (on unclassified surrogate SW and servers)  
2. Investigate technical & security requirements for SIPRNet deployment. Milestone #1: demonstrate basic data transfer with NCCT  
3. Establish bidirectional DiSCO-NCCT ELINT/EA cross-tasking. Milestone #2: demonstrate task sharing with NCCT on unclassified system  
4. Migrate DiSCO-NCCT data/task sharing to SIPRNet. Milestone #3: execute demonstration event.  
  
  
Final output from Grok:  
  
# NCCT DiSCO Integration  
  
## Executive Summary  
  
Network Centric Collaborative Targeting (NCCT) delivers fused situational awareness derived from advanced ISR platforms, such as the Rivet Joint, Compass Call, and Global Hawk, facilitating real-time target tracking and sensor cross-cueing. In contemporary electromagnetic (EM) environments, however, it is essential to augment this capability with distributed tactical sensors to achieve greater operational scope and adaptability. This white paper proposes the establishment of bidirectional data sharing and tasking between NCCT and L3Harris's Distributed Spectrum Collaboration and Operations (DiSCO) architecture, thereby broadening NCCT's operational reach through the incorporation of crowdsourced electronic intelligence (ELINT) from tactical payloads.  
  
DiSCO functions as a tactical Internet of Things (IoT) framework for EM sensors and effectors, capturing all detected signals—in contrast to NCCT's emphasis on pre-assigned entities—and supporting dynamic tasking of low-profile assets in high-threat areas. The proposed integration enables DiSCO to access NCCT's operating picture for improved fusion, while NCCT incorporates DiSCO's raw or fused reports. Bidirectional tasking facilitates cross-system sensor cueing, such as instructing DiSCO-connected assets to examine specific signals or initiating electronic attack (EA) through NCCT interfaces.  
  
Implemented via DiSCO API endpoints for data retrieval and command conversion to Open Mission Systems-Universal Command and Control Interface (OMS-UCI), this capability aligns with [customer]'s requirements for agile Electromagnetic Battle Management (EMBM). It extends L3Harris's prior EMBM decision support initiatives, yielding a more comprehensive Common Operating Picture (COP) and enhanced operational versatility. Initial demonstrations on unclassified surrogate systems will transition to SIPRNet, ensuring secure implementation.  
  
## L3Harris Expertise and Prior Work  
  
As the developer and maintainer of NCCT, L3Harris maintains unparalleled proficiency in its architecture, operational workflows, and integration with platforms such as the Rivet Joint for signals intelligence (SIGINT) fusion and tasking. NCCT's machine-to-machine interfaces substantially reduce the find-fix-track-target timeline, though its focus remains on predefined tasks utilizing high-end sensors.  
  
DiSCO enhances this foundation by facilitating tactical ELINT from distributed endpoints, including DECEPTOR payloads on unmanned aerial vehicles (UAVs) and unmanned surface vehicles (USVs). Validated in exercises such as Talisman Sabre 2025, DiSCO aggregates raw signals (e.g., Pulse Descriptor Words) and fuses them into tracks, enabling cognitive electronic warfare (EW) capabilities like real-time Mission Data File generation. Our preceding EMBM white paper described DiSCO's application with the Advanced Framework for Simulation, Integration, and Modeling (AFSIM) for "what-if" analysis leveraging NCCT data; the present integration advances that base by unifying the ecosystems to achieve broader ISR coverage.  
  
L3Harris's extensive familiarity with relevant platforms—encompassing the manufacture of the Rivet Joint and significant contributions to the Compass Call and Growler—ensures precise alignment with operational needs. We have consistently demonstrated rapid prototyping, as evidenced by DiSCO's multi-domain fusion in live exercises, rendering this bidirectional capability a low-risk endeavor.  
  
## Proposed Technical Integration  
  
The NCCT-DiSCO integration emphasizes bidirectional data sharing and tasking to establish a cohesive, adaptive EM ecosystem. This approach extends NCCT's coverage by incorporating DiSCO's exhaustive reporting, wherein sensors detect and disseminate all signals, rather than solely those predefined. For example, a DiSCO-connected UAV may identify an unanticipated emitter in a contested region, prompting NCCT platforms to refine geolocation without exposing advanced assets to undue risk.  
  
### Bidirectional Data Sharing  
  
Fundamental database interoperability constitutes the primary mechanism. DiSCO accesses NCCT's fused COP—comprising entities, reports, and tracks—through API queries, continuously retrieving and storing data internally to support enhanced fusion. This process augments DiSCO's situational awareness with NCCT's precise inputs, thereby elevating the overall accuracy for subsequent analytical applications, such as keep-out zone assessments.  
  
In reciprocal fashion, DiSCO provides data to NCCT: raw entity reports from tactical sensors for integration into NCCT fusion processes, or post-fusion entities that satisfy predefined confidence thresholds (e.g., geolocated threats with greater than 80% identification certainty). DiSCO's data schema aligns with UCI standards to facilitate compatibility, ensuring efficient interchange. The resulting hybrid COP integrates NCCT's precision with DiSCO's extensive scope, uncovering signals beyond the initial tasking parameters.  
  
### Bidirectional Tasking  
  
Tasking capabilities promote dynamic collaboration across systems. Upon detecting a new signal, a DiSCO sensor aggregates and fuses the information at the server level, assesses it against NCCT criteria (e.g., threat prioritization), and incorporates it into NCCT's task queue. This enables platforms such as the Rivet Joint to conduct follow-on investigations, thereby adapting missions in response to evolving conditions.  
  
From the NCCT perspective, operators may task DiSCO sensors via the user interface: designating searches for particular signals or entities within specified areas (e.g., "scan for SA-99 radar in grid X"). Commands are relayed through the DiSCO API and converted to OMS-UCI format for execution at the endpoint.  
  
Furthermore, NCCT interfaces enable tasking of DiSCO EW systems for EA operations, such as directing a payload analogous to the Growler to engage a threat. DiSCO facilitates this by providing API access to ELINT and EA controls, orchestrating the dissemination of commands to deployed assets.  
  
### Implementation Approach  
  
The integration is supported by DiSCO API endpoints that manage queries and commands, with server-side translation to OMS-UCI protocols. Development commences on unclassified surrogate systems to validate data and task flows. A principal consideration involves SIPRNet deployment: establishing DiSCO's infrastructure (virtual machines, databases, APIs, applications) on NCCT's classified network necessitates security evaluations to obtain authority to operate (ATO). L3Harris engineering teams will collaborate to address accreditation requirements, ensuring adherence to standards.  
  
Milestones encompass unclassified demonstrations of data transfer and tasking, followed by migration to SIPRNet and comprehensive evaluation events.  
  
## Benefits and Path Forward  
  
This integration advances EMBM by combining advanced and tactical ISR sources, mitigating deficiencies in dynamic operational environments. Operators benefit from enriched situational awareness, responsive tasking, and coordinated EA execution, thereby enhancing survivability in anti-access/area denial (A2AD) scenarios. It establishes a basis for further enhancements, such as artificial intelligence-driven cueing.  
  
L3Harris continues to invest in core intellectual property, while [customer] funding will customize the solution to NCCT-specific missions, expediting fielding.  
  
# DiSCO + Hivemind Project  
  
L3Harris and ShieldAI are co-developing a solution for Command & Control (C2) of autonomous vehicles and munitions.  
  
L3Harris DiSCO provides data sharing/aggregation, decision support, and Course of Action (COA) development for EM Spectrum Operations. DiSCO can maintain an up-to-date Common Operating Picture (COP) combining data from its own sensor/effector ecosystem with other intelligence and tactical operating pictures and databases. DiSCO can dynamically evaluate mission plans and potential actions such as flight routes, weapon employment, and non-kinetic EM effects, using AFSIM and a suite of EW and sensor models to simulate engagements. DiSCO can evaluate whether a pre-planned mission will still be effective given new information about the battlefield, such as new unexpected threats or deviations in enemy positions and behaviors.   
  
Shield AI's Hivemind is an AI-powered autonomy software stack that enables drones and aircraft to perform independent operations in dynamic, contested environments without GPS or communications; it supports missions like intelligence, surveillance, reconnaissance (ISR), swarming, and human-machine teaming.  
  
  
L3Harris and ShieldAI are developing a combined solution that can continuously execute the following loop for superior Command & Control of autonomous systems.  
  
1. DiSCO maintains an up-to-date Common Operating Picture, combining information from external intelligence sources fused with its own DiSCO-connected platforms and payloads. DiSCO continuously, immediately updates the fused COP based on new information, maintaining a digital “live world model.”  
  
2. DiSCO evaluates mission objectives and current Course of Action against new information (unexpected signals, enemy and friendly maneuvers and actions, changes in jamming, spectrum use, weather affecting sensing and RF links, etc. DiSCO continuously evaluates alternate COAs during the mission, as the battlespace changes. This is achieved by building ad hoc AFSIM scenarios from the Common Operating Picture. DiSCO can efficiently run massively parallel simulations to evaluate kinetic and non-kinetic technique effectiveness. DiSCO can determine whether the existing COA will be successful given the current state of the battlefield, and can propose superior COAs ranked by metrics like highest probability of success, or lowest net mission cost at an acceptable probability of success.   
   
3. C2 messages and updates sent over-the-air through DiSCO to Hivemind-enabled platforms (objectives, constraints, costs), and to DiSCO-enabled EW payloads for COA execution  
   
4. Hivemind-enabled platforms autonomously maneuver to establish optimized geometry and control sensing/EA effects.  
  
  
# EMBM Decision Support white paper:  
  
Electromagnetic Battle Management (EMBM) is the field of understanding and acting on the EM spectrum to gain an advantage in combat. It comprises Operator's Intent: the desired outcome of an engagement or mission such as "destroy X enemy asset," a World Model, which enables situational awareness and the ability to evaluate the current situation and the consequences of actions, and Decision Support tools, which do analytics and find optimal Courses of Action (COAs).  
  
The customer is interested in an Early Operation Capability (EOC) focused on Electronic Attack situational awareness, decision support, and target pairing given rapid and unexpected changes in the battlefield that deviate from pre-planned missions.  
  
## Established Technologies and Background Info:   
  
### Platforms:   
The air platforms involved in EMBM are the Rivet Joint ISR platform, Compass Call jamming/EA platform, and the EA18G Growler. A Battle Manager can use these planes to execute the sensing and non-kinetic effecting EW techniques needed for a successful mission, for example, protecting a fighter plane or bomber.   
  
### Network Centric Collaborative Targeting (NCCT):   
L3Harris provides and administers NCCT, the information system connecting data collecting platforms such as the Rivet Joint and Global Hawk, fusing sensor reports, and displaying a Common Operating Picture (COP) for analysis and decision makers. NCCT also provides UI and workflows for sensor tasking, for example scheduling a Rivet Joint to investigate a signal of interest in a certain area of the world. NCCT provides the sensing and situational awareness ISR to do target ID/location and target pairing with weapons systems.   
  
A Grok summary of NCCT follows: Network Centric Collaborative Targeting (NCCT) Overview  
  
NCCT is a U.S. Air Force program designed to integrate Intelligence, Surveillance, and Reconnaissance (ISR) sensor systems across multiple intelligence disciplines, such as SIGINT-to-SIGINT and GMTI-to-SIGINT correlations. It employs machine-to-machine interfaces and IP connectivity to automate sensor cross-cueing, data collection, and fusion into composite tracks for high-value targets. This creates a network-centric architecture that supports time-sensitive operations while aligning with Department of Defense standards and transitioning to service-oriented architectures.  
  
The program connects various ISR platforms, including RC-135 Rivet Joint variants, Cobra Ball, Combat Sent, EC-130H Compass Call, Distributed Common Ground System (DCGS) SIGINT components, Falconer Air Operations Centers, Forward Processing Exploitation and Dissemination (FPED) systems, Gorgon Stare, Operational Intelligence Operations (OIO), and numerous airborne coalition assets. It also networks air, space, ground, and ship-based ISR sensors to enable joint and multi-domain integration.  
  
The fused data significantly enhances real-time battlefield analysis by reducing the find-fix-track-target chain by over 90 percent. It delivers targetable data to tactical edges for Joint All-Domain Command and Control (JADC2) and supports decision-making in exercises like Red Flag through cooperative geolocation and threat modeling. NCCT's capabilities are critical in Advanced Battle Management System (ABMS) events and Anti-Access/Area Denial (A2AD) environments.  
  
### AFSIM:   
a modeling & simulation tool for land, sea, and air engagements. AFSIM allows analysts to represent entities on a map and model the interactions between systems, such as communications, sensing, jamming, and kinetic weapons. Many defense companies, including L3Harris make plugins for AFSIM to provide more granularity on the inter-platform interactions.   
  
L3Harris has significant expertise with AFSIM, and a dedicated group of researchers and analysts who maintain AFSIM plugins and modeling tools to greatly extend the fidelity and scope of AFSIM capabilities. For example, L3Harris has a detailed model for EW system interaction with enemy radar systems. Rather than a simple Jamming/Signal (J/S) ratio calculation, we emulate the signal processing and software logic that determine whether a radar is successful at detecting, identifying, and tracking friendly assets in the presence of jamming. We also model 2nd and 3rd order effects of transmissions. For example, if a Compass Call jammer engages a threat radar system to protect a group of fighter planes, it may be successful in jamming that specific radar, but can illuminate the fighters, making them more detectable to passive systems. Understanding the consequences of EM maneuvers outside the constraints of a “1 vs 1” engagement is vitally important for EM Battle Management.  
  
Description from Grok:  
The Advanced Framework for Simulation, Integration, and Modeling (AFSIM) is a government-owned, object-oriented simulation framework developed by the Air Force Research Laboratory for military analysis in multi-domain environments, spanning air, land, sea, space, and cyber. It enables agent-based modeling of complex warfare scenarios, supporting research, operations analysis, and experimentation through flexible scripting and plug-ins.  
Architecture Overview AFSIM uses a C++-like scripting language to define objects such as platforms, sensors, weapons, communications systems, and processors. Core components include the SAGE engine for discrete-event simulation and the RIPR architecture for reactive agent behaviors via behavior trees and quantum-taskers. Tools like Wizard for scenarios, Mystic for visualization, and plug-ins such as the Fog Analysis Tool (FAT) enhance parameter manipulation for effects like fog of war.  
Capabilities in Key Domains  
* Communications: Models links using the OSI 7-layer stack, with parameters for propagation speed, transfer rates, packet loss, queues, and retransmits to simulate delays or cutouts. Supports internal/external message passing between platforms.  
* Electronic Warfare (EW): Simulates jamming and disruptions via packet loss or transfer rate adjustments, affecting data flow and perception. Integrates with scenarios involving jammers reducing enemy ranges.  
* Sensing: Incorporates sensor types (e.g., RADAR, EOIR) with error sigmas for azimuth, elevation, range; hit probabilities; and on/off controls to model inaccuracies or failures.  
* Command and Control (C2): Uses behavior trees, job boards, and OODA loops for decision-making, task allocation, and hierarchical orders; evaluates disruptions impacting environmental perception and orders.  
Evaluating Links Between Friend and Foe Platforms AFSIM assesses interactions through state vectors reporting positions, headings, and statuses, enabling analysis of coordination in scenarios like SEAD missions with fighters, jammers, and SAMs. It models message passing, network connectivity, and redundancies; FAT allows modifying parameters to study fog effects on links, such as cutouts leading to mission failures. Outputs event records for post-processing, quantifying impacts like target destruction rates.  
  
  
### DECEPTOR:  
  
L3Harris makes an EW ES/EA payload called DECEPTOR. This payload has recently been integrated into unmanned air and sea vehicles for demonstration. It is configured to automatically send DiSCO messages up to a DiSCO server via the comm links available on the unmanned platforms, reporting on where it is and what signals / entities it finds in the environment. DECEPTOR is capable of performing signal de-interleaving, ES signal classification and ID, automatic signal characterization for unknowns (Cognitive EW), and emitter geolocation using differential phase and amplitude measurements across its RF aperture.  
  
## L3Harris Involvement in Talisman Sabre 2025  
During the Talisman Sabre 2025 exercise, L3Harris demonstrated advanced Electromagnetic Battle Management (EMBM) capabilities by assuming the role of the red team, simulating adversary operations to observe and report on an invading U.S. Marine Corps force landing on the northeastern coast of Australia. Leveraging its expertise in electronic warfare (EW) and signals intelligence (SIGINT), L3Harris deployed a multi-domain suite of ES and ELINT systems across air, sea, and land platforms, showcasing the integration of its Distributed Spectrum Collaboration and Operations (DiSCO) architecture and DECEPTOR payload.  
### Deployment and Operations  
L3Harris deployed the DECEPTOR EW payload on an FVR-90 vertical takeoff and landing UAV, two Seasats Lightfish solar-powered unmanned surface vehicles (USVs), and a portable coastal land station. These platforms performed electronic support (ES) and electronic intelligence (ELINT) tasks, geolocating and analyzing emitters on U.S. Marine Corps landing craft. The DECEPTOR payload executed signal de-interleaving, classification, fingerprinting, and geolocation, autonomously reporting findings to a DiSCO server hosted on AWS and accessed via Starlink. This setup enabled real-time data transmission and server-side processing, aligning with L3Harris's DiSCO architecture for tactical data management.  
### Data Fusion and Common Operating Picture  
Using the DiSCO API, L3Harris facilitated the transmission of raw recordings and processed reports, including Pulse Descriptor Words (PDWs), Entity Reports, and Position Reports, to a centralized database. Server-side services fused data from multiple platforms, combining noisy lines of bearing to achieve precise geolocation of emitters. The resulting fused Common Operating Picture (COP), containing a refined set of tracked entities, was continuously pushed to the exercise’s TAK server, enabling AI-driven analytics and human analyst review. This process demonstrated a significant reduction in the find-fix-track-target chain, consistent with L3Harris's NCCT capabilities.  
### Experimental Objectives  
Beyond the primary mission, L3Harris conducted experiments to enhance EMBM capabilities:  
* **Dynamic Mission Data File (MDF) Generation**: Treating all emitters as unknowns, L3Harris successfully built MDFs in real time, both manually (via analyst parameter input) and automatically (using fused entity data). This capability allowed rapid signal identification without pre-existing libraries, showcasing cognitive EW advancements.  
* **Emitter Fingerprinting**: For the first time, L3Harris tested DECEPTOR’s fingerprinting algorithms on embedded hardware, identifying specific emitters based on unintentional hardware modulations. Validation using AIS data and imaging confirmed high accuracy, aligning with prior MATLAB-based lab testing.  
* **Multi-Platform Geolocation**: L3Harris validated geolocation algorithms on disadvantaged sensors, enabling precise multi-ship geolocation by fusing raw PDWs from multiple antenna elements server-side. This approach outperformed single-platform methods, proving scalability in complex environments.  
### Outcomes and Impact  
The deployment was a resounding success, meeting all primary objectives and impressing sponsors and observers. L3Harris's integration of DECEPTOR with DiSCO demonstrated robust, automated data collection, fusion, and dissemination, supporting real-time situational awareness and decision-making. All data was recorded for post-exercise analysis, enabling further refinement of L3Harris's EMBM tools. These results underscore L3Harris's leadership in delivering scalable, multi-domain EW solutions, aligning with the needs of Joint All-Domain Command and Control (JADC2) and Anti-Access/Area Denial (A2AD) operations.  
  
## EMBM IRAD Roadmap:  
  
L3Harris Electromagnetic Battle Management (EMBM) Internal R&D Roadmap and Early Operational Capability (EOC) Solution  
  
### Executive Summary  
  
L3Harris is advancing Electromagnetic Battle Management (EMBM) through internal research and development (IRAD) efforts, focusing on decision support tools that enhance situational awareness and evaluate the consequences of electromagnetic (EM) maneuvers in multi-domain operations. EMBM encompasses understanding the EM spectrum to achieve mission objectives, including operator intent, world modeling for situational awareness, and analytics for optimal Courses of Action (COAs).  
  
Our phased roadmap builds on established technologies such as Network Centric Collaborative Targeting (NCCT) for fused Common Operational Pictures (COPs), the Advanced Framework for Simulation, Integration, and Modeling (AFSIM) for detailed modeling and simulation (M&S), and Distributed Spectrum Collaboration and Operations (DiSCO) for tactical data fusion and messaging. The midpoint of this roadmap—achievable by the end of 2027—is proposed as an EOC for [customer], emphasizing "what-if" analysis to predict EM action outcomes without full automation or command and control (C2) orchestration.  
  
This summary outlines the progression, technical foundations, and value proposition, aligned with [customer]'s feedback prioritizing decision support integrated into existing user interfaces (UIs).  
  
### Current Capabilities and Near-Term Enhancements (2025 IRAD Focus)  
  
L3Harris currently leverages NCCT to integrate data from diverse ISR platforms (e.g., RC-135 Rivet Joint, EC-130H Compass Call) and sensors, forming a fused COP that supports drill-down to raw data for entities like threats or blue force assets. NCCT enables machine-to-machine interfaces for sensor cross-cueing, data fusion, and real-time battlefield analysis, reducing the find-fix-track-target chain significantly.  
  
Building on this foundation, our ongoing IRAD project introduces basic decision support tools:  
  
- Dynamic Detectability Overlays: For any blue platform, generate keep-out zones or detectability ranges based on known threats (from prior intelligence or real-time discoveries via DiSCO feeds) and the platform's own Radar Cross Section (RCS). These zones are visualized as green (safe), yellow (cautionary), and red (high-risk) areas, indicating where operations can proceed with minimal detection risk.  
  
- Spectrum Usage Awareness: Integrate overlays into NCCT platforms to provide immediate insights into spectrum occupancy, current visibility to threats, and operational boundaries. This uses DiSCO's architecture for crowdsourced ELINT from forward-deployed systems (e.g., DECEPTOR payloads on unmanned vehicles), fused server-side for enhanced situational awareness.  
  
These capabilities are demonstrated internally for UAV area-of-operation recommendations, reducing decision spaces. For [customer], this serves as a starting point for dynamic analysis: pausing the COP to perform physics-based spectrum evaluations (e.g., threat models) and assess feasibility.  
  
Integration avoids new screens by embedding into existing UIs, such as MapLarge (used for Rivet Joint COP visualization), ensuring seamless adoption by human battle managers or EM crows (decision-makers directing jamming or maneuvers).  
  
### Midpoint Milestone: "What-If" Decision Support (Proposed EOC by End of 2027)  
  
The core of our EMBM advancement is enabling operators to evaluate hypothetical changes to the battlespace. This midpoint capability, targeted for reliable delivery before the end of 2027, aligns with [customer]'s view of EMBM EOC as focused on decision support rather than C2.  
  
- Scenario Evaluation: From the dynamic COP (updated via DiSCO or NCCT feeds), query "what happens if" scenarios, such as relocating a blue asset or executing an electronic attack (EA) like jamming. AFSIM models predict changes in visibility—for the asset itself or friendlies—accounting for second- and third-order effects (e.g., successful jamming of one radar but unintended illumination of allies to passive systems).  
  
- Simulation Integration: Pause the COP mid-operation, populate an AFSIM instance with current data, and simulate outcomes. AFSIM's agent-based framework, extended by L3Harris plugins, provides high-fidelity EW modeling beyond simple Jammer-to-Signal (J/S) ratios, including signal processing, radar logic, and multi-domain interactions (air, sea, land).  
  
- Operator Efficiency: This reduces mental computation for intuitive operators (e.g., EM crows) by validating potential actions from survivability and detectability perspectives. It avoids rushing to optimal COA suggestions, recognizing the complexity of multi-dimensional EM environments.  
  
[customer] expressed strong interest in this as an EOC, noting its value in making EM consequences immediately obvious without C2 overhead. Feedback from experienced EM battle managers (e.g., Tails) and fighter operators will refine display outputs for maximum utility.  
  
### Long-Term Vision: AI-Driven Optimization (Post-2027)  
  
Post-2027, we envision extending the "what-if" framework with optimization algorithms:  
  
- Automated COA Generation: Operators input high-level intent (e.g., "protect asset X"), and AI/ML processes query the COP, simulate via AFSIM, and propose viable COAs meeting criteria like survivability.  
  
- Scalability: Leverage DiSCO's services for data fusion and analytics, ensuring modular integration with emerging programs.  
  
This phase builds incrementally, maintaining focus on decision support while incorporating advancements from exercises like Talisman Sabre 2025, where L3Harris demonstrated multi-domain EMBM with DiSCO and DECEPTOR for real-time fusion and cognitive EW.  
  
### Technical Value Proposition and Integration Approach  
  
L3Harris's deep expertise in M&S (via AFSIM plugins) and EW system interactions (e.g., with integrated air defenses) underpins this roadmap. Key benefits include:  
  
- Modular and Distributed Design: Tools operate without full EMBM infrastructure but incorporate pipes for seamless addition of new sensors or platforms.  
  
- UI Agnostic Integration: Outputs integrate into preferred UIs (e.g., MapLarge, NCCT workflows), displaying decision aids intuitively for battle managers.  
  
- Alignment with EMBM Pillars: Enhances world modeling (COP fusion via NCCT/DiSCO), analytics (AFSIM evaluations), and intent-driven support, supporting Joint All-Domain Command and Control (JADC2) in Anti-Access/Area Denial (A2AD) scenarios.  
  
## EMBM Decision Support Tool Objectives:  
  
The customer is specifically looking for the “what if” capability described as the Midpoint Milestone. This way, the expert operators doing Battle Management can propose courses of actions they think would be successful and “check” their answers to see what the results would be. This eliminates the infinitely many dimensions of having an AI automatically generate an ideal Course of Action (COA), and still takes a significant step in the right direction toward EMBM Decision Support.   
  
* The customer specifically stated they want to use NCCT as the data source for now.   
* The customer is narrowly focused on the NCCT-connected EW platforms: Rivet Joint, Compass Call, and Growler  
* The customer proposed a reference mission for this EOC prototype where we have a limited number of red vs blue assets. Instead of analyzing a fight near land where there are perhaps thousands of networked sensors and IADS, we can assume this engagement occurs at sea far away from “home turf” defense infrastructure. The objective of each side is to take out high-value long-range ISR platforms so they can safely engage other targets without being tracked and targeted.  
* Customer is content with existing UI solutions and does not need another “map.” Ideally, we would integrate the “what if” UI tools and results into an existing UI owned by MapLarge. We CAN use a custom DiSCO UI for prototyping and demonstration, but the end goal is to integrate into existing UI in the customer’s ecosystem.  
* Customer wants to use an “edge node” local storage and compute device housed on the Rivet Joint to facilitate EMBM capabilities. The Rivet Joint will act as the “quarterback,” receiving and fusing NCCT data and executing the solution described in the Proposed Solution section.  
  
  
## Proposed Solution:  
* Leverage L3Harris’s existing IP and expertise with AFSIM M&S of sensing and EW effects,   
* Use NCCT as the ELINT data source and fused COP  
* Set up a DiSCO server that pulls in real-time data from NCCT. When new threats are detected and the situation changes, immediately evaluate detectability, targetability, and/or kinetic kill range (if applicable) from the new threat to each blue/friendly asset in the engagement. Generate map data artifacts and push them to the UI, for example, keep out zones/volumes.   
* Build new UI tools and underlying DiSCO service applications to allow the EM Battle Manager to do “what if?” analysis. *this is the fundamental concept of the proposed EMBM solution* L3Harris will make a NEW DiSCO application:   
* Front End of EMBM DiSCO application: UI tools to facilitate easy Course of Action manipulation (route planning, moving, turning on various EA techniques, etc.), and the ability to easily see the effects of a given COA on the mission. The new UI should make it easy to understand things like detectability/targetability of blue assets, effect of jamming on friend and foe communications/C2 links, effects on friend and foe radar and passive sensing, etc.   
* Back End of EMBM DiSCO application: facilitates all the API queries to get entity information from the COP databases (NCCT saved to DiSCO databases), dynamic generation and configuration of AFSIM models, including the vital task of importing AFSIM models associated with each red and blue asset. For example, if there is a fused entity on the COP with the ID of “SA-99 Radar,” the application needs to select and configure the AFSIM scenario to include the “SA-99” model, with the observed operating characteristics (mode, RF channels, etc.) and drop that into the scenario. After successfully populating an ad hoc AFSIM model, the DiSCO application needs to evaluate the “what if” scenario, checking the interactions between every pair of entities (red AND blue) in the scenario, and recording the results against the criteria the user is concerned with (survivability, target track quality, etc.). The result is then reported and transformed into some kind of shape or metric that can be pushed to the front end UI.  
* To allow real-time rapid Decision Support during a mission, L3Harris will need to run many AFSIM models in parallel on the DiSCO server. For example, we may spin up a separate copy of AFSIM for each red or each blue entity. For keep-out zone calculations, it may be necessary to run a copy of AFSIM for each grid point on the map to be evaluated. This solution will involve containerizing and orchestrating many simultaneous copies of AFSIM scenarios, running on the edge node computing device, or on cloud servers if they are accessible.   
  
## Work we are already doing on Internal R&D:  
L3Harris is going to develop the DiSCO service to dynamically build AFSIM models based on the latest COP, retrieved via DiSCO API and orchestrated by DiSCO service load balancing on the cloud or edge computing nodes. What we want the CUSTOMER to pay for is the work to make this fundamental technology integrated with NCCT system and NCCT-connected platforms (Rivet Joint, Compass Call, etc.). L3Harris is executing and will execute along its EMBM roadmap, but needs customer funding and sponsorship to tailor these new capabilities to Air Force EMBM problems, platforms and missions.  
  
## Work to be done as funded customer project:  
This will serve as an outline for a Statement of Work  
  
1. Instantiate a DiSCO server stack (databases, API, services, etc.) on the same network as NCCT, integrate DiSCO with NCCT so it can automatically query NCCT live data feeds and see the fused Common Operating Picture. Straightforward since L3Harris owns all the IP, but requires customer support for authority to operate on NCCT network.  
2. Update red and blue AFSIM models with real or representative data (RCS, detection range and RF transmission characteristics, comms capabilities, behavior vs various jamming techniques, etc.). L3Harris can generate its own notional models if needed, but the project would benefit from customer-supplied and validated data.   
3. Integrate L3Harris’s existing DiSCO application for dynamically AFSIM-generated keep-out zones with UI. L3Harris can initially demonstrate this capability as an overlay on an existing DiSCO COP, then integrate with Map Large assets in the future.   
4. Upgrade the keep-out zone capability to graduate to “what-if” analysis, focusing on the variables of flight path re-routing, EA jamming techniques from the Compass Call and Growler (EA target pairing - determining which targets each EA asset should go after). Build front-end user controls/queries and back-end dynamic AFSIM model orchestration tools to facilitate this analysis.   
5. Build test cases based on the customer’s reference mission and platforms of interest.  
6. Demonstrate EOC EMBM capability prototype and document results.  
  
  
  
  
Output from Grok for white paper:  
  
# DiSCO EMBM Decision Support  
  
## Executive Summary  
  
Electromagnetic Battle Management (EMBM) is essential for gaining superiority in the EM spectrum during combat operations, encompassing operator intent, world modeling for situational awareness, and decision support for optimal courses of action (COAs). This white paper proposes an Early Operational Capability (EOC) for EMBM decision support, tailored to [customer] needs, focusing on electronic attack (EA) situational awareness, decision support, and target pairing amid dynamic battlefield changes.  
  
Leveraging L3Harris's expertise in key technologies, the solution integrates Network Centric Collaborative Targeting (NCCT), which we develop and maintain, with the Advanced Framework for Simulation, Integration, and Modeling (AFSIM) for high-fidelity simulations of missions and complex EM effects, and our Distributed Spectrum Collaboration and Operations (DiSCO) architecture for tactical data fusion. The core capability enables "what-if" analysis, allowing EM battle managers to evaluate hypothetical COAs—such as rerouting assets or applying EA techniques—using real-time data from NCCT-connected platforms like Rivet Joint, Compass Call, and EA-18G Growler.  
  
This EOC enhances operator effectiveness by providing rapid insights into EM maneuver consequences, such as detectability, jamming effects, and second-order impacts, without requiring full automation. It makes EA target planning significantly easier, enabling more effective decisions in missions where high-value ISR platforms are targeted at sea, far from integrated air defenses. The solution builds on L3Harris's internal R&D (IRAD) roadmap, delivering immediate value while laying the foundation for future AI-driven COA generation and mission optimization, addressing [customer]'s EMBM challenges in Rivet Joint, Compass Call, and Growler scenarios.  
  
The proposed technical approach uses a DiSCO server on an edge node aboard Rivet Joint to ingest NCCT data, dynamically generate AFSIM models, and visualize outcomes in existing UIs like MapLarge. A notional statement of work outlines funded tasks to integrate and demonstrate this capability, ensuring low-risk adoption. L3Harris will continue investing in foundational EMBM IP, but [customer] funding is required to tailor it to specific platforms, missions, and problems.  
  
## Prior Expertise  
  
L3Harris brings deep experience in electromagnetic warfare (EW) and battle management, with a proven track record of rapidly developing and validating edge- and cloud-connected fused Common Operating Pictures (COPs) and modeling complex EW scenarios. Our expertise in NCCT, core EMBM platforms, AFSIM, and the rapidly maturing DiSCO architecture underpins this low-risk EMBM EOC, ensuring seamless integration and effective solutions.  
  
### NCCT Expertise  
  
As the developer and maintainer of NCCT, L3Harris is uniquely positioned to integrate new capabilities into this established system. NCCT connects ISR platforms like Rivet Joint, Compass Call, and Global Hawk, fusing sensor reports across disciplines (e.g., SIGINT-to-SIGINT, GMTI-to-SIGINT) to create a real-time COP. It automates sensor cross-cueing, data collection, and fusion into composite tracks for high-value targets, reducing the find-fix-track-target chain by over 90%. NCCT supports workflows for sensor tasking, target ID/location, and pairing with weapons systems, all via machine-to-machine interfaces and IP connectivity aligned with DoD standards.  
  
Our intimate knowledge of NCCT's architecture allows us to extend it for EMBM without disruption. For instance, we can pull live data feeds into DiSCO for enhanced analytics, ensuring EMBM tools leverage NCCT's fused COP as the primary data source, per [customer] preferences.  
  
### Platform and Mission Familiarity  
  
L3Harris manufactures the Rivet Joint ISR platform and holds major equities in Compass Call and Growler systems, providing unparalleled insight into their EW operations. Rivet Joint excels in SIGINT collection and ELINT for threat detection; Compass Call delivers jamming and EA to disrupt enemy communications and radars; Growler supports tactical EA in fighter escort roles. We understand mission workflows, such as using these platforms to protect bombers or fighters by sensing threats, geolocating emitters, and executing non-kinetic effects.  
  
This familiarity ensures our EMBM solution aligns with real-world operations, like dynamic responses to unexpected threats at sea, where blue forces aim to neutralize red ISR assets without extensive IADS interference.  
  
### AFSIM Expertise  
  
L3Harris knows how to get the best out of AFSIM, the popular government-owned modeling and simulation tool, to provide useful insights into missions and complex EM effects. We maintain a dedicated team that develops AFSIM plugins and extensions, enhancing its fidelity for EW simulations beyond basic models. AFSIM supports agent-based modeling of multi-domain engagements, including communications, sensing, jamming, and kinetics. Our plugins emulate detailed signal processing, radar logic, and second/third-order effects—e.g., a Compass Call jam succeeding against one radar but illuminating friendly assets to passive sensors.  
  
We use AFSIM to evaluate EM maneuvers in complex scenarios, quantifying impacts like detection probabilities and link disruptions. This expertise enables rapid "what-if" simulations for EMBM, drawing from our models of platforms like Rivet Joint and Growler.  
  
### DiSCO Expertise  
  
DiSCO is L3Harris's tactical IoT architecture that facilitates crowdsourced ELINT from forward systems to cloud/edge for storage, fusion, and decision support. It includes messaging APIs (UCI-compatible and REST), databases for entity reports/PDWs/positions, and services for data reduction, fusion, and analytics. DiSCO endpoints connect payloads like DECEPTOR for automatic reporting, enabling fused COPs and tools like dynamic MDF generation.  
  
DiSCO is rapidly maturing and proven in government exercises, directly addressing [customer]'s EMBM needs. It integrates seamlessly with NCCT, pulling data for EMBM analytics.  
  
### Demonstrated Rapid Capability Development  
  
L3Harris excels at quickly building and proving EMBM prototypes, as shown in Talisman Sabre 2025. Acting as red team, we deployed DiSCO with DECEPTOR on UAVs (FVR-90), USVs (Seasats Lightfish), and land stations to simulate adversary ELINT against U.S. Marine landings. DECEPTOR performed signal de-interleaving, classification, fingerprinting, and geolocation, sending data via DiSCO API to an AWS server for fusion and COP push to TAK.  
  
Experiments included real-time MDF generation for unknowns, emitter fingerprinting on embedded hardware, and multi-platform geolocation fusing PDWs server-side. This achieved precise tracking, reduced timelines, and impressed stakeholders, validating DiSCO's scalability for EMBM in dynamic environments.  
  
These efforts highlight our ability to field prototypes swiftly, integrating DiSCO with AFSIM and NCCT for [customer]-relevant solutions.  
  
## L3Harris’s IRAD EMBM Roadmap  
  
L3Harris's IRAD advances EMBM decision support, focusing on situational awareness and EM maneuver evaluation in EW operations. Our roadmap progresses from current capabilities to a midpoint EOC, then to AI-driven optimization, building on NCCT, AFSIM, and DiSCO.  
  
### Current Capabilities (2025 Focus)  
  
Today, we use NCCT for fused COPs from platforms like Rivet Joint and Compass Call, enabling drill-down to raw data on threats and blue assets. IRAD introduces basic tools like dynamic detectability overlays: for a blue platform, generate keep-out zones based on threats (from DiSCO feeds or intel) and RCS, visualized as green/yellow/red areas.  
  
Spectrum usage awareness integrates into NCCT UIs, providing insights into occupancy and visibility. Demonstrated internally for UAV recommendations, this uses DiSCO for ELINT fusion, reducing decision spaces via physics-based evaluations.  
  
### Midpoint Milestone (End of 2027)  
  
This phase, proposed as [customer] EOC, enables "what-if" analysis from dynamic COPs. Operators query hypotheticals—like relocating assets or EA execution—using AFSIM to predict visibility changes and second-order effects (e.g., jamming one radar but exposing allies).  
  
Pause the COP, populate AFSIM with current data, and simulate outcomes. Our plugins ensure high-fidelity EW modeling, validating operator-proposed COAs for survivability without automation. Integration into existing UIs like MapLarge ensures adoption by EM battle managers.  
  
### Desired End State (Post-2027)  
  
Long-term, we add AI/ML for automated COA generation: input intent (e.g., "protect asset X"), simulate via AFSIM, and propose options meeting criteria. DiSCO scales fusion and analytics, incorporating exercise learnings like Talisman Sabre.  
  
This incremental approach enhances operator tools now while preparing for optimization, with L3Harris investing in core IP.  
  
## Proposed Technical Solution  
  
The proposed EMBM EOC leverages L3Harris's IP in AFSIM modeling of missions and complex EM effects, NCCT data fusion, and DiSCO architecture to deliver "what-if" decision support. Focused on NCCT-connected platforms (Rivet Joint, Compass Call, Growler), it addresses dynamic EA situational awareness and target pairing in reference missions at sea, where sides target high-value ISR assets.  
  
### Solution Architecture  
  
A DiSCO server stack on a Rivet Joint edge node acts as quarterback, ingesting NCCT live feeds for the fused COP. When threats emerge, DiSCO services evaluate detectability/targetability, generating map artifacts like keep-out zones pushed to UIs.  
  
The core innovation is a new DiSCO application for "what-if" analysis:  
  
- **Front End:** UI tools enable COA manipulation—e.g., rerouting flights, selecting EA techniques (jamming modes, target assignments for Compass Call/Growler). Results visualize effects: blue detectability, jamming impacts on comms/C2 links, radar/passive sensing disruptions. Initially prototyped in a custom DiSCO UI, it integrates into MapLarge for seamless use, avoiding new maps.  
  
- **Back End:** Queries COP data from DiSCO databases (mirroring NCCT). Dynamically generates AFSIM models by importing entity-specific models—e.g., for an "SA-99 Radar," configure with observed characteristics (mode, RF channels) and place in scenarios. Evaluate interactions pairwise (red/blue), recording metrics like survivability or track quality. Transform results into UI shapes/metrics.  
  
To enable real-time support, containerize AFSIM for parallel runs on edge/cloud: e.g., one instance per entity or grid point for zones. DiSCO orchestrates load balancing, ensuring rapid simulations.  
  
### Integration with Existing Technologies  
  
NCCT provides the ELINT source and COP, with DiSCO pulling data via API for fusion/enhancement. AFSIM, enhanced by our expertise and plugins, models EW beyond J/S ratios, capturing signal processing and multi-order effects critical for EMBM.  
  
For a notional mission: Blue Rivet Joint senses red ISR threats; operator proposes Growler jamming a radar while rerouting Compass Call. "What-if" simulates: Does jamming succeed? Does it illuminate blue assets? Results inform decisions, enhancing operator intuition.  
  
This midpoint solution empowers EM operators by validating COAs quickly, reducing mental load in multi-dimensional EM spaces. It avoids AI-generated COAs initially to focus on foundational accuracy, but sets up for future upgrades—e.g., feeding simulations into ML for optimization.  
  
L3Harris's IRAD develops the dynamic AFSIM-DiSCO integration; [customer] funding tailors it to NCCT platforms/missions, ensuring relevance.  
  
### Benefits and Risk Mitigation  
  
Operators gain immediate insights, improving EA effectiveness in dynamic scenarios. Modular design allows sensor additions; UI-agnostic outputs fit [customer] ecosystems. Risks are low due to our NCCT/AFSIM/DiSCO expertise and Talisman Sabre validations.  
  
## Statement of Work  
  
This notional SOW outlines [customer]-funded tasks to deliver the EMBM EOC prototype, building on L3Harris IRAD.  
  
1. Instantiate DiSCO server on NCCT network, integrating to query live feeds and COP. Leverage our NCCT IP for straightforward setup, with [customer] support for ATO.  
  
2. Update AFSIM models for red/blue assets with real/representative data (RCS, RF characteristics, jamming behaviors). Use notional models if needed, enhanced by [customer]-supplied data.  
  
3. Integrate existing DiSCO keep-out zone application with UI, demonstrating overlays on DiSCO COP initially, then MapLarge.  
  
4. Upgrade to "what-if" analysis: Develop front-end controls for COA variables (routing, EA techniques, target pairing); back-end tools for AFSIM orchestration. Focus on Compass Call/Growler EA pairings.  
  
5. Build test cases from [customer] reference mission, simulating sea engagements with limited assets.  
  
6. Demonstrate prototype, document results, and refine based on feedback.  
  
These tasks tailor our EMBM IP to [customer] needs, accelerating deployment.  
  
## 2025 C2 Objectives, summarized from conversation notes (see IRAD roadmap):  
  
**Summary of Agreed Goals and End State for C2 of EW Payloads via DiSCO UI**  
The team agreed to focus on developing initial C2 capabilities for EW payloads (e.g., DECEPTOR) via the DiSCO map/UI, building on K9 as a baseline for OMS-UCI exposure of ES/EA controls: update the operator dashboard to show friendly ("blue") platforms with self-reported capabilities (via UCI messages, e.g., basic categorization like "sensor" or "jammer" that can be commanded); enable clickable interactions where users select a blue payload, view its capabilities (cached in database tables from reports), then pair it to a red target/entity (UID-based) for commands.  
For EA/jamming path: threshold is display all available techniques in a menu (even if ineffective), user selects one and sends OMS-UCI command (reactive/preemptive, with temporal/performance constraints, technique overrides if populated; handle replies like non-compliance as future work); objective adds logic to highlight relevant techniques (e.g., via radar taxonomy mapping or "canned" storytelling for effectiveness against the target class, avoiding self-jamming in multi-asset ops). This is separate from MDF (automatic pre-programmed responses): emphasis on deliberate target pairing/assignments for EMBM, not just MDF updates.  
For ES/sensing path: threshold is basic tuning (click blue sensor, see current frequency/range, select new band/frequency to dwell/retune immediately and maintain reporting); objective expands to advanced commands like PDW collection, fingerprinting, or parametric measurements (e.g., modulation, scan; avoid saturation by prioritizing/filtering data).  
Overall goals: prove concept by end-of-year demo (e.g., technique selection, frequency dwell on threats like radars); use assumptions/hand-waves for non-UCI-perfect elements to focus on workflow;  
  
### Exec Summary  
Team aims to enable C2 of EW payloads via DiSCO UI by year-end, focusing on clickable map interactions for blue platforms; capabilities self-report via UCI (e.g., sensor/jammer), with commands sent OMS-UCI; separate from MDF auto-responses, emphasizes deliberate target pairing for EMBM; demo to prove workflow, using K9/Killer Beez as baseline; assumptions for non-UCI parts; periodic syncs with Ryan (UI), Lewis/Zach (API/payload), Chris (demos).  
  
### Threshold Capabilities ES  
Click blue sensor on map to view current frequency/range (self-reported, cached in tables); select new band/frequency for immediate dwell/tuning, maintaining reporting; basic filtering to avoid PDW saturation, as seen in Talisman Sabre.  
  
### Threshold Capabilities EA  
Click blue jammer, pair to red target (UID-based); display full technique menu (numbers per UCI, user interprets); select one, send OMS-UCI command (reactive/preemptive, basic constraints); future non-compliance replies.  
  
### Objective Capabilities ES  
Expand to advanced commands like PDW collection, fingerprinting, or parametrics (e.g., modulation, scan, direction finding); cue via UI for specific subbands or criteria, integrating with multi-ship geolocation.  
  
### Objective Capabilities EA  
Highlight relevant techniques in menu (via taxonomy mapping or canned logic for target class effectiveness, preventing self-jamming); add metadata like temporal/performance limits; support multi-pairings, technique overrides (populating fields to bypass MDF defaults).  
  
  
# DiSCO Technical Roadmap  
  
**Key Objectives 2025:**  
  
Graduate from just handling radar signals to handling a variety of RF emissions and communications, with a focus on communications/C2 links and jammers (GPS, radar, comms)  
  
Provide a reliable, automated common operating picture that maintains an up-to-date view of the EM battlefield, supporting situational awareness, decision support, and EM Battle Management use cases.  
  
Develop initial command and control capabilities, starting with configuration and tasking of ES/EA on EW systems, and constraints (“keep out zones”) for manned and autonomous platforms. Partner with Shield AI to show DiSCO passing new situational awareness, objectives, and constraints to autonomous UAVs in a hardware-in-the-loop test.   
  
  
  
**Key Objectives 2026:**  
  
1. Graduate from DiSCO-Hivemind hardware in the loop test to a true flight test, integrating on L3Harris’s Launched Effects UAV platform Red Wolf, and EW/sensing payload DECEPTOR.  
  
2. Expand nascent C2 capabilities to command distributed sensing and non kinetic effects, culminating in a proof of concept demonstration with small business SoloPulse.   
  
3. Expand EM Battle Management capabilities from basic “keep out” zones to enable “what-if” analysis of maneuvers and non-kinetic effects.  
  
  
  
  
## DiSCO IRAD Objectives Expanded Detail:  
  
**Key Objectives 2025:**  
  
Graduate from just handling radar signals to handling a variety of RF emissions and communications, with a focus on communications/C2 links and jammers (GPS, radar, comms)  
* Work with Distributed Spectrum (partner company), L3Harris UK communications systems, L3Harris Dominate team, and L3Harris IMS-ISR business to collect requirements and needs for representing comint, sigint, jamming, and other non-radar emissions in the disco ecosystem.  
    * Ideally, find a way to represent these signals using the existing UCI Entity Report message schema  
* Plan and implement changes to DiSCO messaging, API endpoints, database tables, and services to provide the expanded information set necessary to represent non-radar signals  
* Unify the DiSCO database tables Entity, Fused Entity Summary, Live World Model to have a shared subset of columns matching the UCI Entity report format and types, so that it’s easy to export rows from that table to formal UCI messages if needed.  
  
Provide a reliable, automated common operating picture that maintains an up-to-date view of the EM battlefield, supporting situational awareness, decision support, and EM Battle Management use cases.  
* Integrate L3Harris IMS-ISR business’s data fusion algorithms as DiSCO services OR improve our own fusion via open-source fusion and tracking libraries (called Stone Soup libraries), path we take depends on IMS-ISR timeline this year.  
* Integrate DiSCO and NCCT so that DiSCO can query NCCT entities and incorporate them on the DiSCO live world model table and UI (note this is the first step in the proposed NCCT-DiSCO white paper, we will seek customer funding for further levels of integration)  
* Improve operator dashboard UI to clearly show entities, fused entity summaries, live world, EOB, and new artifacts we are incorporating this year: keep out zone visualization and command and control (C2) of ES and EA effects.  
* Improve DiSCO endpoint (EW payload) embedded software to facilitate C2 and data filtering  
    * Enable remote DiSCO control (via UI) of ES sensor re-configuration and EA technique selection and target pairing  
    * Enable controls for filtering and prioritizing Entity and Pulse Data from endpoint to server  
* Improve server-side multi-ship geolocation, combining and fusing measurements from multiple endpoint sensors to form a more accurate position estimate. This is achieved by running the InSight geolocation algorithm as a DiSCO service and automating its processing of incoming signals.  
  
Develop initial command and control capabilities, starting with configuration and tasking of ES/EA on EW systems, and constraints (“keep out zones”) for manned and autonomous platforms. Partner with Shield AI to show DiSCO passing new situational awareness, objectives, and constraints to autonomous UAVs in a hardware-in-the-loop test.   
* Perform software-only internal check out, using AFSIM scenario as input stimulus  
* Perform hardware in the loop testing in internal checkout  
* Demonstrate DiSCO+Hivemind functionality in recorded video demo and live demonstration at Association of Old Crows conference December 2025  
  
  
  
**Key Objectives 2026:**  
  
Graduate from DiSCO-Hivemind hardware in the loop test to a true flight test, integrating on L3Harris’s Launched Effects UAV platform Red Wolf, and EW/sensing payload DECEPTOR.  
  
Expand nascent C2 capabilities to command distributed sensing and non kinetic effects, culminating in a proof of concept demonstration with small business SoloPulse.   
  
Expand EM Battle Management capabilities from basic “keep out” zones to enable “what-if” analysis of maneuvers and non-kinetic effects.  
  
# Unify Project  
  
(formerly known as Adaptive Warfare Suite)  
EPGI - Enterprise Profitable Growth Initiative  
  
4 L3Harris software-defined warfare products:  
  
DiSCO - Tactical internet of things for data sharing and C2  
  
DOMINATE - automatic routing of tactical communications. Uses AI/ML to optimize network configurations, making the best use of line of site, SATCOM, and other comms modalities.   
  
AMORPHOUS - edge autonomy for UAS/UAVs, configure autonomous systems or swarms of systems to solve problems without direct remote control. Allows edge devices to receive high-level commands and come up with their own solutions given maneuvering, sensors, and kinetic/non-kinetic effectors.   
  
Radio as a Sensor (RAAS) - software that controls tactical comms equipment to enable communication intelligence and spectrum surveillance, and/or electronic attack jamming of comms bands. Soldier radios can report friend and foe signals they discover to a common operating picture or command center, and can be configured to jam and interfere via remote C2.  
  
In 2026, L3Harris will execute a strategic Internal R&D (IRAD) EPGI project called “Unify” to combine these 4 products. Unify’s 2026 primary focus is to study interfaces between the products and identify any conflicts or needed updates to facilitate data and control sharing. The project will also have a secondary focus or phase to understand co-deployment of these products, for example, setting up a DiSCO software stack on AWS and using it to pass commands to networked AMORPHOUS-enabled UAVs.   
  
Justification:  
All 4 of these products under development will require Amazon Web Services resources (EC2 instances, S3 buckets, etc.) to develop and test the databases, services, and applications that make up their software capabilities. The cloud resources need to be accessible both within the L3Harris private network, and from external sources to test connectivity of non-L3Harris client devices, sensors, UAVs, radios, etc. Managing the cloud infrastructure from an IT architecture and security perspective will be a demanding task requiring expertise with L3Harris systems and policies, and familiarity with AWS. Without a dedicated IT analyst assigned to build and administer the cloud resources required for these projects and the Unify initiative, the engineering teams will struggle to share information and test their systems in realistic use cases. They will instead spend their time and the company’s money battling with IT to circumvent rules and policies they do not understand. Assigning dedicated IT staff and resources to the Unify EPGI is critical to its success.  
  
Benefits:  
- Efficiency and cost saving from pooling AWS usage across the EPGI sub-projects  
- Assigning one full-time person is better than each product (DiSCO, AMORPHOUS, etc.) having its own part-time IT SME. No context switching “tax.”  
- L3Harris can use this project to develop or tailor processes for cloud services. This is something we need to get good at as we graduate from selling hardware and embedded software to mission applications and connected software (as we become more “software-defined”)  
  
  
  
Schedule:  
  
Jan: meetings with each individual EPGI lead to understand existing, independent cloud deployments   
Feb: formal project kickoff, establish requirements for EPGI cloud resources  
Apr: work with EPGI leads to migrate existing software to consolidated cloud resources, test product functionality  
Apr - Dec: maintain cloud environment, provide support to EPGI projects as needed.  
  
