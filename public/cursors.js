(function() {
  const WS_HOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:8080'
    : 'wss://' + window.location.host;
  const ENABLE_CHAT = true;

  const cursors = new Map();
  const cursorOrder = [];
  let ws = null;
  let myId = null;
  let chatVisible = false;
  let chatInput = null;
  let lastMessageTime = 0;
  const MESSAGE_COOLDOWN = 10000;
  let myUsername = null;
  let isInCooldown = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY = 3000;
  let cursorsHidden = false;
  const colorMap = window.cursorColors || ['#FF6B6B'];
  let lastCursorSendTime = 0;
  const CURSOR_SEND_THROTTLE = 50;

  function updateUsername() {
    const newUsername = window.cursorUsername || 'happy possum';
    if (myUsername !== newUsername) {
      myUsername = newUsername;
    }
  }

  function initializeMyCursor() {
    if (!myId || cursors.has(myId)) return;

    const colorIndex = cursorOrder.indexOf(myId) % colorMap.length;
    const color = colorMap[colorIndex];

    const cursorEl = document.createElement("div");
    cursorEl.className = "cursor-party-cursor";
    cursorEl.style.color = color;

    const username = myUsername || window.cursorUsername || 'happy possum';
    const displayName = `${username} (you)`;
    const label = displayName;

    cursorEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5.65376 12.3673L5 5L12.3673 5.65376L18.2888 11.5753L12.9728 16.8913L11.5753 18.2888L5.65376 12.3673Z" fill="currentColor"/>
      </svg>
      <span class="cursor-label">${label}</span>
    `;
    cursorEl.style.display = cursorsHidden ? "none" : "block";
    document.body.appendChild(cursorEl);
    cursors.set(myId, cursorEl);
    updateActiveViewerCount();
  }

  function updateMyCursor(x, y) {
    if (!myId) return;

    const cursorEl = cursors.get(myId);
    if (!cursorEl) {
      initializeMyCursor();
      return;
    }

    cursorEl.style.left = x + "px";
    cursorEl.style.top = y + "px";
    cursorEl.style.display = cursorsHidden ? "none" : "block";
  }

  function connect() {
    ws = new WebSocket(WS_HOST);

    ws.addEventListener("open", () => {
      console.log("Connected to cursor party");
      reconnectAttempts = 0;
      updateUsername();
      sendMessage({ type: "ping" });
    });

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "id") {
        myId = msg.id;
        if (!cursorOrder.includes(myId)) {
          cursorOrder.push(myId);
        }
        initializeMyCursor();
      }

      if (msg.type === "sync") {
        if (msg.id !== myId) {
          updateCursor(msg.id, msg.cursor);
        }
      }

      if (msg.type === "chat" && ENABLE_CHAT) {
        showChatMessage(msg.id, msg.message);
      }

      if (msg.type === "disconnect") {
        removeCursor(msg.id);
      }
    });

    ws.addEventListener("close", () => {
      console.log("Disconnected from cursor party");
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(connect, RECONNECT_DELAY);
      } else {
        console.log("Max reconnection attempts reached. Cursor party disabled.");
      }
    });
  }

  function sendMessage(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function updateCursor(id, cursor) {
    if (!cursors.has(id)) {
      if (!cursorOrder.includes(id)) {
        cursorOrder.push(id);
      }

      const colorIndex = cursorOrder.indexOf(id) % colorMap.length;
      const color = colorMap[colorIndex];

      const cursorEl = document.createElement("div");
      cursorEl.className = "cursor-party-cursor";
      cursorEl.style.color = color;

      const flag = cursor.country ? getFlagEmoji(cursor.country) : '';
      const username = cursor.username || '';
      const isMe = id === myId;
      const displayName = isMe && username ? `${username} (you)` : username;
      const label = flag && displayName ? `${flag} ${displayName}` : flag || displayName;

      cursorEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5.65376 12.3673L5 5L12.3673 5.65376L18.2888 11.5753L12.9728 16.8913L11.5753 18.2888L5.65376 12.3673Z" fill="currentColor"/>
        </svg>
        ${label ? `<span class="cursor-label">${label}</span>` : ''}
      `;
      document.body.appendChild(cursorEl);
      cursors.set(id, cursorEl);
      updateActiveViewerCount();
    }

    const cursorEl = cursors.get(id);
    cursorEl.style.left = cursor.x + "px";
    cursorEl.style.top = cursor.y + "px";
    cursorEl.style.display = cursorsHidden ? "none" : "block";
  }

  function removeCursor(id) {
    const cursorEl = cursors.get(id);
    if (cursorEl) {
      cursorEl.remove();
      cursors.delete(id);
      updateActiveViewerCount();
    }
  }

  function updateActiveViewerCount() {
    let activeCount = 0;
    cursors.forEach((cursorEl) => {
      if (cursorEl.style.display !== "none") {
        activeCount++;
      }
    });
    window.activeViewerCount = activeCount;
    window.dispatchEvent(new CustomEvent('viewerCountUpdate', { detail: activeCount }));
  }

  function toggleCursors() {
    cursorsHidden = !cursorsHidden;
    cursors.forEach((cursorEl) => {
      cursorEl.style.display = cursorsHidden ? "none" : "block";
    });
    updateActiveViewerCount();
  }

  function getFlagEmoji(countryCode) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  function showChatMessage(id, message) {
    const cursorEl = cursors.get(id);
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
        } else {
          toggleCursors();
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
          sendMessage({
            type: "chat",
            message: { text, timestamp: Date.now() }
          });
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
    updateMyCursor(e.clientX, e.clientY);

    const now = Date.now();
    if (now - lastCursorSendTime >= CURSOR_SEND_THROTTLE) {
      lastCursorSendTime = now;
      updateUsername();
      sendMessage({
        type: "sync",
        cursor: {
          x: e.clientX,
          y: e.clientY,
          pointer: "mouse",
          username: myUsername
        }
      });
    }
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    updateMyCursor(touch.clientX, touch.clientY);

    const now = Date.now();
    if (now - lastCursorSendTime >= CURSOR_SEND_THROTTLE) {
      lastCursorSendTime = now;
      updateUsername();
      sendMessage({
        type: "sync",
        cursor: {
          x: touch.clientX,
          y: touch.clientY,
          pointer: "touch",
          username: myUsername
        }
      });
    }
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

  connect();
  initChat();
})();
