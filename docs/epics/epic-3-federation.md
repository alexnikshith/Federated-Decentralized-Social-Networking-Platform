# EPIC 3: Federation & Cross-Instance Interaction

## Goal
Demonstrate decentralized communication between independently managed
server instances without centralized coordination.

---

## Federation Protocol

Federation is implemented using a **custom REST-based protocol**, where
server instances communicate using **JSON over HTTP**.

This approach was chosen to:
- Keep the implementation lightweight and feasible
- Maintain instance-level trust and governance
- Avoid dependence on heavy external standards

---

## Federation Model
- Instances maintain a list of trusted peer instances
- Content is forwarded asynchronously via REST APIs
- Origin metadata is preserved

---

## Phase 1 Implementation
- Two-instance federation demo
- REST endpoint for receiving federated posts
- No bidirectional consistency guarantees

---
