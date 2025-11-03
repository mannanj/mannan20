# Cursor Polling Debug Guide

## Summary of Debugging Work

### Issues Identified

1. **Missing API Server**: The `/api/peers` endpoint requires `vercel dev` to be running on port 3000
   - The `cursors-p2p.js` script expects API on `http://localhost:3000/api` during development
   - Without Vercel dev, all API calls fail silently with network errors

2. **Enhanced Debug Logging**: Added comprehensive console logging to `public/cursors-p2p.js`:
   - Initialization details (API base, peer ID, username, color)
   - Polling lifecycle (each request URL, response status, peer count)
   - Cursor rendering (DOM element creation, updates, removal)
   - Mouse movement tracking
   - Error details with stack traces

### Debug Logging Added

#### Initialization
```
[Cursor Party] Initializing...
[Cursor Party] API Base: http://localhost:3000/api
[Cursor Party] My ID: peer-1234567890-abc123
[Cursor Party] My Username: happy possum
[Cursor Party] My Color: #ff5733
[Cursor Party] Poll Interval: 10000 ms
[Cursor Party] Starting polling every 10000 ms
```

#### Polling Lifecycle
```
[Cursor Party] Polling: http://localhost:3000/api/peers?peerId=...
[Cursor Party] Received peers: 2 peers
[Cursor Party] Your peer ID: peer-xxx
[Cursor Party] Your IP: 127.0.0.1
```

#### Cursor Rendering
```
[Cursor Party] Rendering 2 peer cursors
[Cursor Party] Creating cursor for new peer: peer-xxx at 450 320
[Cursor Party] Updating cursor for peer: peer-yyy to 455 325
[Cursor Party] Total cursors in DOM: 2
```

#### Error Handling
```
[Cursor Party] Error polling peers: Failed to fetch
[Cursor Party] Stack: <full stack trace>
```

## How to Test

### 1. Start Development Environment

**IMPORTANT**: You must run `vercel dev` for the cursor polling to work locally.

```bash
vercel dev --listen 3000
```

This will:
- Start Angular on port 4200 (via npm start)
- Start Vercel serverless functions on port 3000
- Enable the `/api/peers` endpoint

### 2. Open Browser Console

1. Navigate to `http://localhost:4200` (or the port Vercel dev shows)
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Look for `[Cursor Party]` logs

### 3. Verify Initialization

You should see:
```
[Cursor Party] Initializing...
[Cursor Party] API Base: http://localhost:3000/api
[Cursor Party] My ID: peer-<timestamp>-<random>
[Cursor Party] Starting polling every 10000 ms
```

### 4. Verify Polling

Every 10 seconds, you should see:
```
[Cursor Party] Polling: http://localhost:3000/api/peers?...
[Cursor Party] Received peers: N peers
```

### 5. Test with Multiple Tabs

1. Open 2-3 browser tabs to `http://localhost:4200`
2. Move your mouse in each tab
3. Watch console logs in each tab
4. You should see peer cursors appearing

### 6. Use Debug Test Page

Open `test-cursor-api.html` directly in your browser:

```bash
open test-cursor-api.html
```

This page:
- Tests the `/api/peers` endpoint directly
- Shows API response in real-time
- Logs all network activity
- Allows manual testing without the full app

## Expected Behavior

### When Working Correctly

1. Script loads and generates a peer ID
2. Polling starts immediately and continues every 10 seconds
3. Each poll:
   - Sends your cursor position to the server
   - Receives list of other active peers
   - Creates/updates DOM elements for peer cursors
4. Peer cursors appear on screen at their reported positions
5. Stale peers (inactive >30s) are removed automatically

### Common Issues

#### Issue: No `[Cursor Party]` logs at all
**Cause**: Script not loading
**Fix**: Check if `cursors-p2p.js` is in `/public` directory and Angular build includes it

#### Issue: Logs show "Error polling peers: Failed to fetch"
**Cause**: Vercel dev not running on port 3000
**Fix**: Run `vercel dev --listen 3000`

#### Issue: Polling works but no cursors appear
**Cause**: Only your own peer in the system (server excludes you from peer list)
**Fix**: Open multiple browser tabs

#### Issue: API returns 500 error
**Cause**: Missing BLOB_READ_WRITE_TOKEN or Vercel Blob API error
**Fix**:
```bash
vercel env pull .env.local
cat .env.local  # Verify BLOB_READ_WRITE_TOKEN exists
```

## API Endpoint Details

### GET /api/peers

**Query Parameters:**
- `peerId` (required): Your unique peer identifier
- `x` (optional): Cursor X position
- `y` (optional): Cursor Y position
- `username` (optional): Display name
- `color` (optional): Hex color code

**Response:**
```json
{
  "peers": [
    {
      "id": "peer-123-abc",
      "x": 450,
      "y": 320,
      "username": "happy possum",
      "color": "#ff5733",
      "lastSeen": 1699000000000,
      "ip": "127.0.0.1"
    }
  ],
  "yourPeerId": "peer-456-def",
  "yourIp": "127.0.0.1"
}
```

**Notes:**
- Server stores peers in Vercel Blob storage (peers.json)
- Peers inactive for >30 seconds are automatically removed
- Your own peer is excluded from the returned `peers` array

## Files Modified

### public/cursors-p2p.js
- Added initialization logging
- Added polling lifecycle logging
- Added cursor rendering logging
- Added first mouse move detection
- Enhanced error logging with stack traces

## Next Steps

1. ✅ Added comprehensive debug logging
2. ✅ Created test-cursor-api.html debug tool
3. ⏭️ Test with multiple browser tabs (manual testing required)
4. ⏭️ Verify cursor DOM elements are created
5. ⏭️ Verify cursor cleanup after 30 seconds
6. ⏭️ Fix any remaining issues
