(function() {
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';
  const POLL_INTERVAL_MS = 10000;

  const cursorElements = new Map();
  let myId = null;
  let pollIntervalId = null;
  let currentX = 0;
  let currentY = 0;
  let myUsername = 'happy possum';
  let myColor = '#' + Math.floor(Math.random()*16777215).toString(16);
  let cursorsHidden = false;

  function generatePeerId() {
    return `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function updateUsername() {
    const newUsername = window.cursorUsername || 'happy possum';
    if (myUsername !== newUsername) {
      myUsername = newUsername;
    }
  }

  async function pollPeers() {
    try {
      updateUsername();

      const params = new URLSearchParams({
        peerId: myId,
        x: currentX.toString(),
        y: currentY.toString(),
        username: myUsername,
        color: myColor
      });

      const url = `${API_BASE}/peers?${params}`;
      console.log('[Cursor Party] Polling:', url);

      const response = await fetch(url);

      if (!response.ok) {
        console.error('[Cursor Party] Failed to poll peers:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      console.log('[Cursor Party] Received peers:', data.peers?.length || 0, 'peers');
      console.log('[Cursor Party] Your peer ID:', data.yourPeerId, 'IP:', data.yourIp);

      renderCursors(data.peers || []);
    } catch (error) {
      console.error('[Cursor Party] Error polling peers:', error.message || error);
      console.error('[Cursor Party] Stack:', error.stack);
    }
  }

  const connectedPeers = new Set();

  function renderCursors(peers) {
    console.log('[Cursor Party] Rendering', peers.length, 'peer cursors');
    const currentIds = new Set(peers.map(p => p.id));

    cursorElements.forEach((cursorEl, id) => {
      if (!currentIds.has(id)) {
        console.log('[Cursor Party] Removing cursor for peer:', id);
        cursorEl.remove();
        cursorElements.delete(id);
        if (connectedPeers.has(id)) {
          connectedPeers.delete(id);
          window.dispatchEvent(new CustomEvent('cursorPartyDisconnect', { detail: { id } }));
        }
      }
    });

    peers.forEach(peer => {
      if (!peer.x || !peer.y) {
        console.warn('[Cursor Party] Skipping peer with no position:', peer.id);
        return;
      }

      let cursorEl = cursorElements.get(peer.id);

      if (!cursorEl) {
        console.log('[Cursor Party] Creating cursor for new peer:', peer.id, 'at', peer.x, peer.y);
        cursorEl = document.createElement("div");
        cursorEl.className = "cursor-party-cursor";
        cursorEl.style.color = peer.color || myColor;

        const username = peer.username || '';
        cursorEl.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5.65376 12.3673L5 5L12.3673 5.65376L18.2888 11.5753L12.9728 16.8913L11.5753 18.2888L5.65376 12.3673Z" fill="currentColor"/>
          </svg>
          ${username ? `<span class="cursor-label">${username}</span>` : ''}
        `;
        document.body.appendChild(cursorEl);
        cursorElements.set(peer.id, cursorEl);

        if (!connectedPeers.has(peer.id)) {
          connectedPeers.add(peer.id);
          window.dispatchEvent(new CustomEvent('peerConnected', { detail: { peerId: peer.id } }));
        }
      } else {
        console.log('[Cursor Party] Updating cursor for peer:', peer.id, 'to', peer.x, peer.y);
      }

      cursorEl.style.left = peer.x + "px";
      cursorEl.style.top = peer.y + "px";
      cursorEl.style.display = cursorsHidden ? "none" : "block";
    });

    console.log('[Cursor Party] Total cursors in DOM:', cursorElements.size);
  }

  function setCursorsVisibility(visible) {
    cursorsHidden = !visible;
    cursorElements.forEach((cursorEl) => {
      cursorEl.style.display = visible ? "block" : "none";
    });
  }

  window.addEventListener('cursorsVisibilityChanged', (event) => {
    setCursorsVisibility(event.detail);
  });

  let moveCount = 0;
  document.addEventListener("mousemove", (e) => {
    currentX = e.clientX;
    currentY = e.clientY;

    if (moveCount === 0) {
      console.log('[Cursor Party] First mouse move detected:', currentX, currentY);
    }
    moveCount++;

    window.dispatchEvent(new CustomEvent('localCursorMove', {
      detail: { x: currentX, y: currentY }
    }));
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    currentX = touch.clientX;
    currentY = touch.clientY;

    window.dispatchEvent(new CustomEvent('localCursorMove', {
      detail: { x: currentX, y: currentY }
    }));
  });

  function startPolling() {
    if (pollIntervalId) {
      console.log('[Cursor Party] Polling already started');
      return;
    }

    console.log('[Cursor Party] Starting polling every', POLL_INTERVAL_MS, 'ms');
    pollPeers();
    pollIntervalId = setInterval(pollPeers, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }

  function cleanup() {
    stopPolling();
    cursorElements.forEach(el => el.remove());
    cursorElements.clear();
  }

  window.addEventListener('beforeunload', cleanup);

  const style = document.createElement("style");
  style.textContent = `
    .cursor-party-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      transition: left 0.3s ease-out, top 0.3s ease-out;
      display: block;
    }

    .cursor-label {
      position: absolute;
      left: 24px;
      top: 2px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      white-space: nowrap;
      font-family: Lucida Grande, sans-serif;
    }
  `;
  document.head.appendChild(style);

  myId = generatePeerId();
  updateUsername();

  console.log('[Cursor Party] Initializing...');
  console.log('[Cursor Party] API Base:', API_BASE);
  console.log('[Cursor Party] My ID:', myId);
  console.log('[Cursor Party] My Username:', myUsername);
  console.log('[Cursor Party] My Color:', myColor);
  console.log('[Cursor Party] Poll Interval:', POLL_INTERVAL_MS, 'ms');

  window.dispatchEvent(new CustomEvent('cursorPartyConnected', { detail: true }));
  window.dispatchEvent(new CustomEvent('cursorPartyIdAssigned', { detail: myId }));

  startPolling();
})();
