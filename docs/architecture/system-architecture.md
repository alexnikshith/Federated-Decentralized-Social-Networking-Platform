# System Architecture

## Overview
The Federated Social Platform is a decentralized networking system where independent server instances communicate via a peer-to-peer federation protocol. Each instance is a self-contained unit with its own database, users, and content.

## High-Level Component Diagram
1.  **Frontend (React/Vite)**: A modern web interface that interacts with the local instance's API.
2.  **API Gateway (Go/Mux)**: Handles authentication, routing, and serves as the entry point for both users and federated instances.
3.  **Epic Services**: Modularized business logic organized into Epics (Identity, Content Sharing, Federation, Safety, Reports).
4.  **Database (MongoDB)**: Per-instance data storage ensuring data sovereignty.
5.  **Federation Worker**: A background process that manages the outgoing activity queue and processes incoming activities.

## Architecture Patterns
-   **Epic-Based Modularization**: The backend is organized by "Epics" rather than just technical layers (e.g., `backend/epics/identity`). Each epic contains its own handlers, services, repositories, and models.
-   **Repository Pattern**: Data access is abstracted behind repositories to allow for easy testing and swapping of data stores.
-   **Dependency Injection**: Services and Handlers are initialized with their dependencies, facilitating modular testing.

## Federation Communication Model
-   **Protocol**: ActivityPub-inspired REST protocol.
-   **Mechanism**:
    -   **Outbound**: Events are queued as `FederationEvent` and processed by a background worker.
    -   **Inbound**: Instances expose a `/federation/inbox` endpoint to receive activities from trusted peers.
-   **Discovery**: The `/.well-known/instance-info` endpoint allows instances to exchange capability and connection metadata.

## Design Principles
1.  **Data Sovereignty**: Instances own their user data; remote content is only cached locally.
2.  **Scalability**: Stateless Go backend services designed for containerized deployment.
3.  **Resilience**: Retry logic for federation ensures eventual consistency across the network.
4.  **Security**: JWT-based authentication for users and trust-based validation for federated instances.
