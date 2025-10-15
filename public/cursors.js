(function() {
  const WS_HOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:8080'
    : 'wss://' + window.location.host;
  const ENABLE_CHAT = true;

  const cursorElements = new Map();
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
  let lastCursorSendTime = 0;
  const CURSOR_SEND_THROTTLE = 50;

  function updateUsername() {
    const newUsername = window.cursorUsername || 'happy possum';
    if (myUsername !== newUsername) {
      myUsername = newUsername;
    }
  }

  function connect() {
    ws = new WebSocket(WS_HOST);

    ws.addEventListener("open", () => {
      console.log("Connected to cursor party");
      reconnectAttempts = 0;
      updateUsername();
      sendMessage({ type: "ping" });
      window.dispatchEvent(new CustomEvent('cursorPartyConnected', { detail: true }));
    });

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "id") {
        myId = msg.id;
        window.dispatchEvent(new CustomEvent('cursorPartyIdAssigned', { detail: msg.id }));
      }

      if (msg.type === "sync") {
        window.dispatchEvent(new CustomEvent('cursorPartySync', {
          detail: { id: msg.id, cursor: msg.cursor }
        }));
      }

      if (msg.type === "chat" && ENABLE_CHAT) {
        showChatMessage(msg.id, msg.message);
      }

      if (msg.type === "disconnect") {
        window.dispatchEvent(new CustomEvent('cursorPartyDisconnect', {
          detail: { id: msg.id }
        }));
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
        window.dispatchEvent(new CustomEvent('cursorPartyConnected', { detail: false }));
      }
    });
  }

  function sendMessage(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
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
          sendMessage({
            type: "chat",
            message: message
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
    window.dispatchEvent(new CustomEvent('localCursorMove', {
      detail: { x: touch.clientX, y: touch.clientY }
    }));

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

  connect();
  initChat();
})();
