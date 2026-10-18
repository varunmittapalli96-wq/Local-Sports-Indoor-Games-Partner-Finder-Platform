# PlayNear - Product Requirements Document (PRD)

**Product Name:** PlayNear  
**Tagline:** Local Sports & Indoor Games Partner Finder Platform  
**Target Market:** Urban neighborhoods, residential societies, and sports clubs  
**Status:** MVP v1.0 Production-Ready  

---

## 1. Executive Summary & Problem Statement
Recreational sports and indoor games (badminton, table tennis, chess, carrom, box cricket, football) foster physical well-being, mental agility, and social cohesion. However, in urban settings, discovering compatible playing partners remains inefficient:
- **No Visibility of Nearby Players**: Residents don't know who in their apartment tower or street plays badminton, chess, or cricket.
- **Informal Chaos**: Coordination occurs through chaotic, noisy WhatsApp groups where invites get buried and responses are delayed.
- **Skill & Schedule Mismatches**: Beginners get discouraged playing advanced players, and coordinating free time slots requires dozens of back-and-forth messages.
- **Privacy & Safety Concerns**: Players (particularly women and families) hesitate to share private phone numbers with strangers on public forums.

### The Solution: PlayNear
PlayNear is a dedicated neighborhood web platform that replaces word-of-mouth with **location-based discovery, weighted compatibility scoring (0–100), automated play requests, zero double-booking guards, and community society hubs**.

---

## 2. Product Goals & Objectives

### Primary Objectives
1. **Effortless Discovery**: Discover compatible partners within a customizable radius (0.5 km to 30 km) in under 3 seconds.
2. **Reduced Coordination Friction**: Propose game, date, time, duration, and venue type in a single request.
3. **Safety & Privacy Assurance**: Fuzz exact coordinates on public maps and unlock direct phone/WhatsApp handles only after both players accept.
4. **Community Cohesion**: Enable apartment societies and sports clubs to organize weekly recurring sessions and pickup games.

### Secondary Objectives
1. Multi-sport flexibility: Support both fast racquet sports and casual tabletop indoor games.
2. High repeat engagement: Build player reliability and encourage regular weekly play streaks.
3. Scalability: City-agnostic data models to expand across multiple metropolitan areas.

---

## 3. User Personas

| Persona | Role | Needs & Goals | Pain Points |
|---|---|---|---|
| **Aarav (28)** | Young Working Professional | Wants to play intermediate badminton on weekday evenings after 7 PM near Indiranagar. | Friends live far away; clubhouse courts go unused without a fourth player. |
| **Ananya (26)** | Safety-Conscious Player | Wants weekend morning chess or table tennis exclusively with women or in verified clubhouse venues. | Reluctant to post phone number in public groups; fears uncomfortable encounters. |
| **Rajesh (42)** | Society Sports Secretary | Wants to keep apartment clubhouse courts bustling, organize weekend box cricket, and verify residents. | Managing paper court registers and manual WhatsApp announcements is tedious. |
| **Platform Admin** | Platform Steward | Needs real-time visibility into active users, match completion rate, user reports, and platform activity. | Needs quick moderation tools to suspend bad actors and review society verification. |

---

## 4. User Stories

### Discovery & Profile
- *As a player*, I want to specify my preferred games (badminton, chess, carrom) and my casual skill rating so I can be matched with players of similar capability.
- *As a player*, I want to set my weekly availability slots (morning/afternoon/evening) so I only get invited when I am actually free.
- *As a female player*, I want to toggle a "Women-Only Play" preference so my profile is only discoverable by other female players.
- *As a resident*, I want to see approximate distance (e.g. "~1.5 km") without having my exact building address exposed to strangers.

### Play Requests & Sessions
- *As a sender*, I want to send a play invite with game, proposed time, duration, and venue type so the receiver has all necessary context upfront.
- *As a receiver*, I want to review incoming requests and accept or decline with one click.
- *As a player*, I want to be blocked from accepting overlapping sessions so I never double-book myself accidentally.
- *As a player*, I want direct contact info (WhatsApp/Phone) revealed *only* after an invite is mutually confirmed.
- *As a player*, I want to mark matches completed or flag a no-show to build community trust.

### Community Hubs
- *As a society organizer*, I want to create a verified group for our apartment complex with custom clubhouse rules.
- *As a member*, I want to join open play posts (e.g. "Need 2 more for badminton tonight") with a single tap.
- *As an organizer*, I want to publish recurring weekly sessions (e.g. Sunday Morning Turf Cricket).

### Platform Administration
- *As an admin*, I want an executive KPI dashboard tracking registered users, active requests, successful match rates, and repeat engagement rates.
- *As an admin*, I want to review reported users, inspect audit logs, and suspend violators immediately.

---

## 5. Key Performance Indicators (KPIs)
The platform tracks 5 core health metrics built directly into the Admin Suite:

$$\text{Successful Match Rate (\%)} = \frac{\text{Accepted Requests} + \text{Completed Requests}}{\text{Total Sent Requests}} \times 100$$

$$\text{Repeat Engagement Rate (\%)} = \frac{\text{Users with } \ge 2\text{ Completed Sessions}}{\text{Total Active Users}} \times 100$$

1. **Registered Users**: Total player accounts onboarded.
2. **Monthly Active Users (MAU)**: Unique players active within the past 30 days.
3. **Active Play Requests**: Volume of pending and accepted sessions currently active.
4. **Successful Match Rate**: Platform conversion efficiency.
5. **Repeat Engagement Rate**: Measure of player retention and habit formation.

---

## 6. Scope & Non-Goals

### In Scope (v1.0)
- Full-stack responsive web application (Desktop, Tablet, Mobile 360px–1440px)
- Geospatial 2dsphere indexing and weighted matching score (0–100)
- Request state machine (`pending` $\rightarrow$ `accepted` $\rightarrow$ `completed` / `declined` / `cancelled` / `expired`)
- Double-booking prevention algorithm (2-hour conflict window)
- Automatic session expiry background worker
- Society community hubs, open pickup feeds, and recurring sessions
- Administrative analytics, user moderation, and audit trail

### Out of Scope (Non-Goals for v1.0)
- Native iOS/Android apps (PWA / responsive web satisfies current needs)
- Tournament brackets, competitive ladders, and Elo rating systems
- Paid coaching or court booking payment gateways
- In-app audio/video calling or real-time instant messaging (Phase 1 intentionally delegates confirmed messaging to WhatsApp/phone to avoid coordination bloat)
