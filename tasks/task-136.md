### Task 136: Install Simple-Peer and Create Vercel Blob API Endpoints
- [x] Install `simple-peer` package for WebRTC
- [x] Create `/api/peers.ts` Vercel Function for peer registry (GET: list peers, POST: join/leave)
- [x] Create `/api/signals.ts` Vercel Function for WebRTC signaling (POST: write signal, GET: read signals)
- [x] Set up Vercel Blob storage with `@vercel/blob` package
- [x] Implement peer cleanup logic (remove peers inactive >10s)
- Location: `api/peers.ts`, `api/signals.ts`, `package.json`
