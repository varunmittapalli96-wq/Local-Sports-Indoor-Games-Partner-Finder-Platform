# PlayNear - Architectural & Design Decisions

This document records architectural, functional, and engineering decisions made during development to fulfill the casual-friendly-games vision with maximum clarity, reliability, and security.

---

### Decision 1: Monorepo Architecture
- **Choice**: Multi-package monorepo containing `/client` (Next.js App Router), `/server` (Express.js REST API), and `/docs`.
- **Rationale**: Keeps full-stack development organized, makes cross-service testing easy, while enabling completely decoupled deployment (e.g. Next.js on Vercel, Express API on Render/Fly/AWS).

### Decision 2: Database Connectivity & In-Memory Fallback
- **Choice**: Mongoose with MongoDB URI config, paired with an automated `mongodb-memory-server` fallback when no external daemon is running in local development or test mode.
- **Rationale**: Guarantees zero friction for developers and evaluators running tests or demoing the app without requiring an active local MongoDB daemon or Docker Desktop service, while seamlessly connecting to standard MongoDB Atlas or Docker in production.

### Decision 3: Geospatial Indexing & Privacy-First Fuzzing
- **Choice**: Store user locations as GeoJSON `Point` coordinates `[longitude, latitude]` with a 2dsphere index. In all public APIs (player search, profile previews):
  - Exact coordinates are NEVER sent to the client.
  - Public coordinates are slightly fuzzed (within ~300m jitter) for map display.
  - Calculated distance is rounded to friendly text (e.g. "~1.2 km").
- **Rationale**: Protects user privacy, especially for women-only and home play preferences.

### Decision 4: Weighted Matching Score Algorithm
- **Choice**: Formula yielding 0–100 score:
  - **Distance (40%)**: Max radius default 20 km. Score decreases linearly with distance.
  - **Availability Overlap (30%)**: Matches on day-of-week and time slot (Morning, Afternoon, Evening, Custom).
  - **Skill Closeness (20%)**: Identical skill = 20 pts, 1 level difference (e.g. Beginner vs Intermediate) = 12 pts, 2 levels = 5 pts.
  - **Shared Games / Communities (10%)**: Mutual game preferences and/or shared community memberships.
- **Rationale**: Delivers intuitive "Best Matches" sorting while keeping computation fast (< 50ms) via indexed queries and in-memory scoring.

### Decision 5: Request State Machine & Double-Booking Guard
- **Choice**: Request states: `pending` -> `accepted` | `declined` | `cancelled` | `expired` -> `completed`.
- **Double-booking rule**: When accepting a request for time slot $T$, the system checks if the receiver OR sender already has another session in `accepted` status within a 2-hour window. If so, acceptance is rejected with an explanatory conflict message.
- **Auto-expiry**: A periodic job (or on-demand sweep before retrieval) transitions any `pending` request whose `proposedDateTime` has passed into `expired`.

### Decision 6: Contact Reveal on Acceptance
- **Choice**: Contact preference (WhatsApp, Phone, or Email) and value are masked in all public endpoints and search results. They are revealed in request details ONLY if the request status is `accepted` or `completed`, and only to the participating sender and receiver.
- **Rationale**: Satisfies the safety and privacy constraint while enabling effortless post-acceptance coordination.
