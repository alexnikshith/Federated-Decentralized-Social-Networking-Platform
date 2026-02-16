# Federation Reports

## Overview
Federation reports track the interconnectivity of the instance with the broader decentralized network. It monitors traffic flow and server health.

## Tracked Metrics
-   **Inbound Count**: Number of activities received from other instances.
-   **Outbound Count**: Number of activities successfully sent to other instances.
-   **Connected Servers**: A list of unique domains that this instance has successfully communicated with.

## Data Model
Federation stats are summarized in the `FederationStats` model:
-   `InboundCount`: Accumulated count of activities processed via the inbox.
-   `OutboundCount`: Accumulated count of activities sent via the federation worker.
-   `Servers`: Array of domain strings.

## Features
-   **Health Monitoring**: Helps identify if an instance is becoming isolated (e.g., high outbound failure rate).
-   **Network Reach**: Visualizes the growth of the federated network from the perspective of the local instance.

## API Access
-   `GET /reports/federation`: Returns the `FederationStats` object for the instance.
