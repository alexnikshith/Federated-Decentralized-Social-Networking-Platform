# EPIC 1: User Autonomy & Decentralized Accounts

## Goal
Enable users to create, manage, and control their accounts within a single
server instance while preserving privacy and security.

---

## User Stories
- User registration
- Secure login and logout
- Profile viewing and editing
- Account deactivation

---

## Design Decisions
- User accounts are local to each instance
- Authentication uses JWT-based stateless tokens
- Passwords are securely hashed before storage

---

## Phase 1 Scope
- Signup API
- Login API
- Profile fetch and update
- Logout

---

## Out of Scope
- Cross-instance account migration
- Global identity resolution
