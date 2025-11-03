# P2P Connection Status UI - Testing Guide

## What Was Implemented

### 1. Event Dispatches (cursors-p2p.js)
- `peerConnecting`: Dispatched when attempting to connect to a peer
- `peerConnected`: Dispatched when successfully connected to a peer
- `peerFailed`: Dispatched when peer connection fails
- `connectionTimeout`: Dispatched when connection times out (15s)
- `fallbackModeEnabled`: Dispatched when switching to HTTP polling fallback

### 2. Connection Status Component
Located in the header, displays:
- Visual status indicator (colored dot with pulse animation)
- Connection state text
- Peer count with mode distinction (P2P vs Fallback)

### 3. Status Indicator Colors
- **Yellow (Connecting)**: Attempting to connect to peers
- **Green (Connected)**: Successfully connected via P2P
- **Orange (Fallback)**: Using HTTP polling fallback
- **Red (Failed)**: Connection issues detected

### 4. Vercel Blob Monitoring
All API calls to Vercel Blob endpoints are logged with `[Vercel Blob]` prefix in console.

## Testing Instructions

### Test 1: P2P Connections with Multiple Browser Windows

1. Open http://localhost:4200/ in Chrome
2. Open DevTools Console (F12) and look for:
   - `[Vercel Blob] Joining peer network...`
   - Connection status in header should show "Connecting..."

3. Open http://localhost:4200/ in another Chrome window
4. Check console for:
   - `[Vercel Blob] Found N active peer(s)`
   - `[Vercel Blob] Sending signal`
   - `[Vercel Blob] Received N signal(s)`
   - `Connected to peer peer-...`

5. Verify header status shows:
   - "1 peer via P2P" (green indicator)

6. Open a third window
7. Verify status updates to "2 peers via P2P"

8. Move cursor in each window and verify cursors appear in other windows

**Expected Results:**
- Green status indicator
- Accurate peer count
- Real-time cursor updates across windows

### Test 2: Across Different Devices on Same Network

1. Find your local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   # Look for 192.168.x.x or 10.0.x.x
   ```

2. On your main computer:
   - Keep http://localhost:4200/ open
   - Note your local IP (e.g., 192.168.1.100)

3. On another device (phone/tablet/laptop) on same WiFi:
   - Navigate to http://[YOUR_IP]:4200/ (e.g., http://192.168.1.100:4200/)
   - Open DevTools if possible

4. Check console logs on both devices for:
   - `[Vercel Blob]` messages indicating signal exchange
   - Peer connection messages

5. Verify status shows correct peer count on both devices

6. Move cursor on each device and verify it appears on the other

**Expected Results:**
- Both devices connect via P2P
- Status shows "1 peer via P2P" on each
- Cursors sync between devices

### Test 3: Verify Fallback Behavior

To test fallback mode, we need to simulate P2P connection failure:

#### Option A: Block WebRTC
1. Install a browser extension that blocks WebRTC (or use Chrome flags)
2. Reload http://localhost:4200/
3. Wait 15 seconds (CONNECTION_TIMEOUT_MS)
4. Check console for:
   - `Connection timeout for peer..., using fallback`
   - `[Vercel Blob]` showing fallback cursor polling

5. Verify status shows:
   - Orange indicator
   - "Fallback mode (N viewers)"

#### Option B: Simulate Network Issues
1. In DevTools, go to Network tab
2. Set throttling to "Slow 3G"
3. Open multiple windows
4. Watch as connections time out and fallback engages

**Expected Results:**
- Status indicator turns orange
- Text shows "Fallback mode"
- Cursors still sync via HTTP polling
- Console shows `[Vercel Blob]` API calls

### Test 4: Monitor Vercel Blob Usage

1. Open http://localhost:4200/ with DevTools Console open
2. Filter console by `[Vercel Blob]`
3. Observe the following during connection phase:

**Initial Connection:**
```
[Vercel Blob] Joining peer network... { peerId: "peer-..." }
[Vercel Blob] Successfully joined P2P cursor network
```

**Signal Exchange (when peer joins):**
```
[Vercel Blob] Found 1 active peer(s)
[Vercel Blob] Sending signal { from: "peer-A", to: "peer-B", signalType: "offer" }
[Vercel Blob] Signal sent successfully
[Vercel Blob] Received 1 signal(s)
```

**Polling (ongoing):**
- Signals polled every 500ms
- Peers polled every 500ms
- Only logs when there are changes

4. Count API calls during first 30 seconds
5. Note when polling reduces after P2P connection established

**Expected Vercel Blob API Usage:**
- High initially during WebRTC signaling (offer/answer exchange)
- Reduces significantly after P2P established
- If fallback mode: continuous polling for cursor updates

### Test 5: Connection State Transitions

1. Open http://localhost:4200/
2. Watch status indicator transitions:
   - Yellow "Connecting..." (initial state)
   - Yellow "Connecting to peers..." (when peer detected)
   - Green "1 peer via P2P" (when connected)

3. Close the peer window
4. Watch status return to:
   - Yellow "Connecting..." or
   - Remain connected if other peers present

5. Test rapid open/close of multiple windows
6. Verify status accurately reflects current connections

**Expected Results:**
- Smooth status transitions
- Accurate peer count at all times
- No UI flickering or errors

## Known Behaviors

1. **Connection Timeout**: 15 seconds before fallback
2. **Reconnection Attempts**: 3 attempts per peer before fallback
3. **Polling Interval**: 500ms for signals and peers
4. **Heartbeat**: Every 5 seconds to maintain presence

## Debugging Tips

1. **Cursors not appearing?**
   - Check console for WebRTC errors
   - Verify STUN servers are accessible
   - Try fallback mode

2. **Status not updating?**
   - Check if events are being dispatched
   - Verify NgRx state updates in Redux DevTools
   - Check selector values in console

3. **Vercel Blob errors?**
   - Ensure API endpoints are running
   - Check network tab for 404/500 errors
   - Verify environment configuration

## Success Criteria

- [ ] Multiple browser windows connect via P2P
- [ ] Status accurately shows peer count
- [ ] Green indicator for P2P, orange for fallback
- [ ] Cursors sync across all connections
- [ ] Cross-device connection works
- [ ] Fallback mode activates on connection failure
- [ ] Vercel Blob logs show expected API usage pattern
- [ ] Status transitions are smooth and accurate
