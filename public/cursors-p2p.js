(function() {
  const API_BASE = '/api';
  const POLL_INTERVAL_MS = 500;
  const HEARTBEAT_INTERVAL_MS = 5000;
  const PEER_TIMEOUT_MS = 10000;
  const CURSOR_SEND_THROTTLE = 50;
  const CONNECTION_TIMEOUT_MS = 15000;
  const MAX_RECONNECT_ATTEMPTS = 3;
  const ENABLE_CHAT = true;

  const cursorElements = new Map();
  const peers = new Map();
  const cursors = new Map();

  let myId = null;
  let pollIntervalId = null;
  let heartbeatIntervalId = null;
  let lastCursorSendTime = 0;
  let chatVisible = false;
  let chatInput = null;
  let lastMessageTime = 0;
  const MESSAGE_COOLDOWN = 10000;
  let myUsername = null;
  let isInCooldown = false;
  let reconnectAttempts = 0;
  let cursorsHidden = false;
  let useFallback = false;
  let fallbackCursors = new Map();

  function generatePeerId() {
    return `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function updateUsername() {
    const newUsername = window.cursorUsername || 'happy possum';
    if (myUsername !== newUsername) {
      myUsername = newUsername;
    }
  }

  async function joinPeerNetwork() {
    try {
      const response = await fetch(`${API_BASE}/peers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: myId })
      });

      if (!response.ok) {
        throw new Error(`Failed to join peer network: ${response.status}`);
      }

      console.log('Joined P2P cursor network');
      window.dispatchEvent(new CustomEvent('cursorPartyConnected', { detail: true }));
      window.dispatchEvent(new CustomEvent('cursorPartyIdAssigned', { detail: myId }));

      startHeartbeat();
      startPolling();
    } catch (error) {
      console.error('Error joining peer network:', error);
      reconnect();
    }
  }

  async function leavePeerNetwork() {
    try {
      await fetch(`${API_BASE}/peers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: myId, action: 'leave' })
      });
    } catch (error) {
      console.error('Error leaving peer network:', error);
    }
  }

  async function sendSignal(to, signal) {
    try {
      const response = await fetch(`${API_BASE}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: myId, to, signal })
      });

      if (!response.ok) {
        throw new Error(`Failed to send signal: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  async function pollSignals() {
    try {
      const response = await fetch(`${API_BASE}/signals?peerId=${myId}`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      data.signals.forEach(signalData => {
        handleSignal(signalData);
      });
    } catch (error) {
      console.error('Error polling signals:', error);
    }
  }

  async function pollPeers() {
    try {
      const response = await fetch(`${API_BASE}/peers`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const activePeerIds = new Set(data.peers.map(p => p.id).filter(id => id !== myId));

      activePeerIds.forEach(peerId => {
        if (!peers.has(peerId)) {
          connectToPeer(peerId);
        }
      });

      peers.forEach((peerData, peerId) => {
        if (!activePeerIds.has(peerId)) {
          disconnectPeer(peerId);
        }
      });
    } catch (error) {
      console.error('Error polling peers:', error);
    }
  }

  function connectToPeer(peerId) {
    if (peers.has(peerId)) {
      return;
    }

    const initiator = myId < peerId;

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    const peerData = {
      peer,
      peerId,
      connected: false,
      connectionTimeout: null,
      reconnectAttempts: 0
    };

    peers.set(peerId, peerData);

    peerData.connectionTimeout = setTimeout(() => {
      if (!peerData.connected) {
        console.log(`Connection timeout for peer ${peerId}, using fallback`);
        useFallback = true;
      }
    }, CONNECTION_TIMEOUT_MS);

    peer.on('signal', signal => {
      sendSignal(peerId, signal);
    });

    peer.on('connect', () => {
      console.log(`Connected to peer ${peerId}`);
      peerData.connected = true;
      reconnectAttempts = 0;

      if (peerData.connectionTimeout) {
        clearTimeout(peerData.connectionTimeout);
        peerData.connectionTimeout = null;
      }
    });

    peer.on('data', data => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'cursor') {
          handleRemoteCursor(peerId, message.cursor);
        } else if (message.type === 'chat' && ENABLE_CHAT) {
          showChatMessage(peerId, message.message);
        }
      } catch (error) {
        console.error('Error parsing peer data:', error);
      }
    });

    peer.on('error', error => {
      console.error(`Peer ${peerId} error:`, error);

      if (!peerData.connected && peerData.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        peerData.reconnectAttempts++;
        console.log(`Reconnecting to peer ${peerId} (attempt ${peerData.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

        setTimeout(() => {
          disconnectPeer(peerId);
          connectToPeer(peerId);
        }, 1000);
      } else {
        useFallback = true;
      }
    });

    peer.on('close', () => {
      console.log(`Peer ${peerId} connection closed`);
      disconnectPeer(peerId);
    });
  }

  function handleSignal(signalData) {
    const { from, signal } = signalData;

    let peerData = peers.get(from);

    if (!peerData) {
      connectToPeer(from);
      peerData = peers.get(from);
    }

    if (peerData && peerData.peer) {
      try {
        peerData.peer.signal(signal);
      } catch (error) {
        console.error(`Error signaling peer ${from}:`, error);
      }
    }
  }

  function disconnectPeer(peerId) {
    const peerData = peers.get(peerId);

    if (peerData) {
      if (peerData.connectionTimeout) {
        clearTimeout(peerData.connectionTimeout);
      }

      if (peerData.peer) {
        peerData.peer.destroy();
      }

      peers.delete(peerId);
    }

    cursors.delete(peerId);
    fallbackCursors.delete(peerId);
    removeCursorElement(peerId);

    window.dispatchEvent(new CustomEvent('cursorPartyDisconnect', {
      detail: { id: peerId }
    }));
  }

  function handleRemoteCursor(peerId, cursorData) {
    cursors.set(peerId, {
      id: peerId,
      x: cursorData.x,
      y: cursorData.y,
      color: cursorData.color || '#' + Math.floor(Math.random()*16777215).toString(16),
      username: cursorData.username,
      country: cursorData.country,
      isLocal: false
    });

    updateCursorDisplay();
  }

  function sendCursorUpdate(x, y) {
    const cursorData = {
      x,
      y,
      pointer: 'mouse',
      username: myUsername,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    let sentViaPeer = false;

    peers.forEach((peerData, peerId) => {
      if (peerData.connected && peerData.peer) {
        try {
          peerData.peer.send(JSON.stringify({
            type: 'cursor',
            cursor: cursorData
          }));
          sentViaPeer = true;
        } catch (error) {
          console.error(`Error sending cursor to peer ${peerId}:`, error);
        }
      }
    });

    if (!sentViaPeer || useFallback) {
      sendCursorFallback(cursorData);
    }
  }

  async function sendCursorFallback(cursorData) {
    try {
      await fetch(`${API_BASE}/cursors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: myId,
          cursor: cursorData,
          timestamp: Date.now()
        })
      });
    } catch (error) {
    }
  }

  async function pollCursorsFallback() {
    if (!useFallback) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/cursors`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.cursors) {
        Object.entries(data.cursors).forEach(([peerId, cursorData]) => {
          if (peerId !== myId && Date.now() - cursorData.timestamp < PEER_TIMEOUT_MS) {
            handleRemoteCursor(peerId, cursorData.cursor);
          }
        });
      }
    } catch (error) {
    }
  }

  function updateCursorDisplay() {
    const allCursors = {};

    cursors.forEach((cursor, id) => {
      allCursors[id] = cursor;
    });

    window.dispatchEvent(new CustomEvent('cursorStateChanged', {
      detail: allCursors
    }));
  }

  function renderCursor(cursorData) {
    let cursorEl = cursorElements.get(cursorData.id);

    if (!cursorEl) {
      cursorEl = document.createElement("div");
      cursorEl.className = cursorData.isLocal ? "cursor-party-cursor local-cursor" : "cursor-party-cursor";
      cursorEl.style.color = cursorData.color;

      const flag = cursorData.country ? getFlagEmoji(cursorData.country) : '';
      const username = cursorData.username || '';
      const displayName = cursorData.isLocal && username ? `${username} (you)` : username;
      const label = flag && displayName ? `${flag} ${displayName}` : flag || displayName;

      cursorEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5.65376 12.3673L5 5L12.3673 5.65376L18.2888 11.5753L12.9728 16.8913L11.5753 18.2888L5.65376 12.3673Z" fill="currentColor"/>
        </svg>
        ${label ? `<span class="cursor-label">${label}</span>` : ''}
      `;
      document.body.appendChild(cursorEl);
      cursorElements.set(cursorData.id, cursorEl);
    } else {
      cursorEl.style.color = cursorData.color;

      const flag = cursorData.country ? getFlagEmoji(cursorData.country) : '';
      const username = cursorData.username || '';
      const displayName = cursorData.isLocal && username ? `${username} (you)` : username;
      const label = flag && displayName ? `${flag} ${displayName}` : flag || displayName;

      const labelEl = cursorEl.querySelector('.cursor-label');
      if (labelEl && label) {
        labelEl.textContent = label;
      }
    }

    cursorEl.style.left = cursorData.x + "px";
    cursorEl.style.top = cursorData.y + "px";
    cursorEl.style.display = cursorsHidden ? "none" : "block";
  }

  function removeCursorElement(id) {
    const cursorEl = cursorElements.get(id);
    if (cursorEl) {
      cursorEl.remove();
      cursorElements.delete(id);
    }
  }

  window.addEventListener('cursorStateChanged', (event) => {
    const cursors = event.detail;

    const currentIds = new Set(Object.keys(cursors));
    const renderedIds = new Set(cursorElements.keys());

    renderedIds.forEach(id => {
      if (!currentIds.has(id)) {
        removeCursorElement(id);
      }
    });

    Object.values(cursors).forEach(cursorData => {
      renderCursor(cursorData);
    });
  });

  function setCursorsVisibility(visible) {
    cursorsHidden = !visible;
    cursorElements.forEach((cursorEl) => {
      cursorEl.style.display = visible ? "block" : "none";
    });
  }

  window.addEventListener('cursorsVisibilityChanged', (event) => {
    setCursorsVisibility(event.detail);
  });

  function getFlagEmoji(countryCode) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  function showChatMessage(id, message) {
    const cursorEl = cursorElements.get(id);
    if (!cursorEl) return;

    const chatBubble = document.createElement("div");
    chatBubble.className = "cursor-chat-bubble";
    chatBubble.textContent = message.text;
    cursorEl.appendChild(chatBubble);

    setTimeout(() => {
      chatBubble.remove();
    }, 12000);
  }

  function initChat() {
    if (!ENABLE_CHAT) return;

    let lastMouseEvent = null;

    document.addEventListener("mousemove", (e) => {
      lastMouseEvent = e;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !chatVisible && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        showChatInput(lastMouseEvent);
      } else if (e.key === "Escape") {
        if (chatVisible) {
          hideChatInput();
        }
      }
    });
  }

  function showChatInput(e) {
    chatVisible = true;
    chatInput = document.createElement("input");
    chatInput.className = "cursor-chat-input";

    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;

    if (lastMessageTime > 0 && timeSinceLastMessage < MESSAGE_COOLDOWN) {
      isInCooldown = true;
      chatInput.disabled = true;
      chatInput.placeholder = `must wait 10s before sending another message`;
      const remainingTime = MESSAGE_COOLDOWN - timeSinceLastMessage;
      setTimeout(() => {
        if (chatInput) {
          chatInput.disabled = false;
          chatInput.placeholder = window.cursorChatPlaceholder || "send a message to your friend";
          isInCooldown = false;
          chatInput.focus();
        }
      }, remainingTime);
    } else {
      chatInput.placeholder = window.cursorChatPlaceholder || "send a message to your friend";
    }

    chatInput.style.left = (e ? e.clientX : window.innerWidth / 2) + 'px';
    chatInput.style.top = (e ? e.clientY + 20 : window.innerHeight / 2) + 'px';
    document.body.appendChild(chatInput);
    if (!chatInput.disabled) {
      chatInput.focus();
    }

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (chatInput.disabled) {
          return;
        }
        const text = chatInput.value.trim();
        if (text) {
          const message = { text, timestamp: Date.now() };

          peers.forEach((peerData, peerId) => {
            if (peerData.connected && peerData.peer) {
              try {
                peerData.peer.send(JSON.stringify({
                  type: 'chat',
                  message
                }));
              } catch (error) {
                console.error(`Error sending chat to peer ${peerId}:`, error);
              }
            }
          });

          showChatMessage(myId, message);
          lastMessageTime = Date.now();
        }
        hideChatInput();
      } else if (e.key === "Escape") {
        hideChatInput();
      }
    });

    chatInput.addEventListener("blur", () => {
      if (!isInCooldown) {
        setTimeout(hideChatInput, 100);
      }
    });
  }

  function hideChatInput() {
    if (chatInput) {
      chatInput.remove();
      chatInput = null;
    }
    chatVisible = false;
    isInCooldown = false;
  }

  document.addEventListener("mousemove", (e) => {
    window.dispatchEvent(new CustomEvent('localCursorMove', {
      detail: { x: e.clientX, y: e.clientY }
    }));

    const now = Date.now();
    if (now - lastCursorSendTime >= CURSOR_SEND_THROTTLE) {
      lastCursorSendTime = now;
      updateUsername();
      sendCursorUpdate(e.clientX, e.clientY);
    }
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    window.dispatchEvent(new CustomEvent('localCursorMove', {
      detail: { x: touch.clientX, y: touch.clientY }
    }));

    const now = Date.now();
    if (now - lastCursorSendTime >= CURSOR_SEND_THROTTLE) {
      lastCursorSendTime = now;
      updateUsername();
      sendCursorUpdate(touch.clientX, touch.clientY);
    }
  });

  function startHeartbeat() {
    if (heartbeatIntervalId) {
      return;
    }

    heartbeatIntervalId = setInterval(async () => {
      try {
        await fetch(`${API_BASE}/peers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peerId: myId })
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function startPolling() {
    if (pollIntervalId) {
      return;
    }

    pollIntervalId = setInterval(async () => {
      await pollSignals();
      await pollPeers();
      await pollCursorsFallback();
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }

    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
  }

  function reconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Reconnecting to P2P network... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        joinPeerNetwork();
      }, 3000);
    } else {
      console.log("Max reconnection attempts reached. P2P cursor party disabled.");
      window.dispatchEvent(new CustomEvent('cursorPartyConnected', { detail: false }));
    }
  }

  function cleanup() {
    stopPolling();

    peers.forEach((peerData, peerId) => {
      disconnectPeer(peerId);
    });

    leavePeerNetwork();
  }

  window.addEventListener('beforeunload', () => {
    cleanup();
  });

  const style = document.createElement("style");
  style.textContent = `
    .cursor-party-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      transition: left 0.1s ease-out, top 0.1s ease-out;
      display: block;
    }

    .cursor-party-cursor.local-cursor {
      transition: none;
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

    .cursor-chat-bubble {
      position: absolute;
      left: 24px;
      top: 18px;
      background: rgba(255, 255, 255, 0.9);
      color: black;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      animation: fadeIn 0.2s ease-in;
    }

    .cursor-chat-input {
      position: fixed;
      z-index: 10001;
      padding: 8px 16px;
      border: 2px solid #ff6b6b;
      border-radius: 8px;
      background: white;
      color: black;
      font-size: 14px;
      outline: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      caret-color: #ff6b6b;
    }

    .cursor-chat-input::placeholder {
      color: rgba(0, 0, 0, 0.5);
    }

    .cursor-chat-input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
      opacity: 0.5;
    }

    .cursor-chat-input:disabled::placeholder {
      color: black;
      opacity: 1;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  myId = generatePeerId();
  updateUsername();
  joinPeerNetwork();
  initChat();
})();
