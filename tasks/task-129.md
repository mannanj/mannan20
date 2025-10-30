### Task 129: Real-Time Personal Status & Activity Sharing System with Screen Activity Tracking
- [ ] Design database schema for status/activity events (activity_type, status, game_info, screen_activity, media_info, location, availability, timestamp, visibility_level)
- [ ] Create mobile event emission endpoint/script for status updates
- [ ] Build screen capture/activity monitoring service for desktop (Discord, YouTube, streaming, coding, etc.)
- [ ] Implement backend REST API for status CRUD operations with privacy filtering
- [ ] Add privacy/access control system (public_limited, authenticated, friends, access_code, trusted)
- [ ] Integrate League of Legends game detection and status tracking
- [ ] Add screen activity detection (Discord voice/text, YouTube videos, Netflix, Twitch streams, IDE/coding)
- [ ] Create command option in consulting system to view current status/activity
- [ ] Build "Join Me" interaction flow for live sessions (request, notification, approval, session link)
- [ ] Add time-based restrictions and auto-expiry for status events
- [ ] Implement real-time status updates via WebSocket
- [ ] Create admin panel for managing access levels and restrictions
- Location: `src/app/components/command-popup`, `src/app/services`, `backend/src/main/java/com/mannan/portfolio`, `src/app/models`

**Feature Overview:**
Real-time status sharing system allowing friends/visitors to see current activities (League of Legends games, coffee meetups, dance sessions, Discord chats, YouTube watching, etc.) and request to join live sessions, with granular privacy controls based on trust levels.

**Privacy Levels:**
- Public: Limited info (generic status only, no screen activity)
- Authenticated: Basic activity details (app names, no content)
- Friends: Full details + join requests enabled (video titles, Discord channels)
- Access Code: Special permissions (screen sharing, live session links)
- Trusted: Full access + location/contact info + direct session join

**Status Types:**
- Gaming (League of Legends with summoner info, rank, current game)
- Screen Activity (Discord voice/text channels, YouTube videos, Netflix shows, Twitch streams, coding sessions)
- Social (coffee, meals, hangouts with location)
- Activities (dance, gym, events)
- Work/Focus (availability limited)
- Available/Unavailable

**Screen Activity Detection:**
- Discord: Voice channel, text channel, server name, active call participants
- YouTube: Video title, channel, watch time, shareable link
- Netflix/Streaming: Show/movie title, episode, watch party capability
- Twitch: Stream watching, streamer name, category
- Coding: IDE/editor, project name, language
- Other: Browser tabs, active applications

**Technical Components:**
1. Mobile event emission (webhook/API endpoint)
2. Desktop activity monitor (screen capture analysis, process detection, window title parsing)
3. Status database (PostgreSQL with time-based cleanup)
4. Privacy engine (access control matrix)
5. Real-time sync (WebSocket broadcasting)
6. Command UI integration (view status + join button + live session link)
7. League of Legends API integration (Riot Games API)
8. Screen activity parser (app-specific metadata extraction)
9. Live session orchestration (Discord invite links, YouTube sync, watch party URLs)

**Reference:** https://claude.site/artifacts/c7c5e887-36aa-41fc-b8a2-be0bf093b2d9
