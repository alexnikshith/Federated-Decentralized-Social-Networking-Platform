# Database Schema (MongoDB)

## Users Collection
- _id
- username
- password_hash
- profile
- created_at

---

## Posts Collection
- _id
- content
- author
- instance_origin
- created_at

---

## Reports Collection
- _id
- post_id
- reason
- reported_by
- created_at

---

## Design Notes
- Each instance stores its own data
- Federation metadata is preserved
- Schema is flexible for future extensions
