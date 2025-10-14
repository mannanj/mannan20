(function() {
  const WS_HOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:8080'
    : 'wss://' + window.location.host;
  const ENABLE_CHAT = true;

  const cursors = new Map();
  let ws = null;
  let myId = null;
  let chatVisible = false;
  let chatInput = null;
  let lastMessageTime = 0;
  const MESSAGE_COOLDOWN = 5000;

  function connect() {
    ws = new WebSocket(WS_HOST);

    ws.addEventListener("open", () => {
      console.log("Connected to cursor party");
      sendMessage({ type: "ping" });
    });

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "sync") {
        updateCursor(msg.id, msg.cursor);
      }

      if (msg.type === "chat" && ENABLE_CHAT) {
        showChatMessage(msg.id, msg.message);
      }
    });

    ws.addEventListener("close", () => {
      console.log("Disconnected from cursor party");
      setTimeout(connect, 1000);
    });
  }

  function sendMessage(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function updateCursor(id, cursor) {
    if (!cursors.has(id)) {
      const cursorEl = document.createElement("div");
      cursorEl.className = "cursor-party-cursor";
      cursorEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5.65376 12.3673L5 5L12.3673 5.65376L18.2888 11.5753L12.9728 16.8913L11.5753 18.2888L5.65376 12.3673Z" fill="currentColor"/>
        </svg>
        ${cursor.country ? `<span class="cursor-flag">${getFlagEmoji(cursor.country)}</span>` : ''}
      `;
      document.body.appendChild(cursorEl);
      cursors.set(id, cursorEl);
    }

    const cursorEl = cursors.get(id);
    cursorEl.style.left = cursor.x + "px";
    cursorEl.style.top = cursor.y + "px";
    cursorEl.style.display = "block";

    clearTimeout(cursorEl.timeout);
    cursorEl.timeout = setTimeout(() => {
      cursorEl.style.display = "none";
    }, 3000);
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
    }, 3000);
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
      } else if (e.key === "Escape" && chatVisible) {
        hideChatInput();
      }
    });
  }

  function showChatInput(e) {
    chatVisible = true;
    chatInput = document.createElement("input");
    chatInput.className = "cursor-chat-input";
    chatInput.placeholder = window.cursorChatPlaceholder || "send a message to your friend";
    chatInput.style.left = (e ? e.clientX : window.innerWidth / 2) + 'px';
    chatInput.style.top = (e ? e.clientY + 20 : window.innerHeight / 2) + 'px';
    document.body.appendChild(chatInput);
    chatInput.focus();

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const text = chatInput.value.trim();
        if (text) {
          const now = Date.now();
          const timeSinceLastMessage = now - lastMessageTime;

          if (timeSinceLastMessage < MESSAGE_COOLDOWN) {
            chatInput.disabled = true;
            chatInput.placeholder = `slow down happy possum`;
            const remainingTime = MESSAGE_COOLDOWN - timeSinceLastMessage;
            setTimeout(() => {
              if (chatInput) {
                chatInput.disabled = false;
                chatInput.placeholder = window.cursorChatPlaceholder || "send a message to your friend";
              }
            }, remainingTime);
            return;
          }

          sendMessage({
            type: "chat",
            message: { text, timestamp: now }
          });
          lastMessageTime = now;
        }
        hideChatInput();
      } else if (e.key === "Escape") {
        hideChatInput();
      }
    });

    chatInput.addEventListener("blur", () => {
      setTimeout(hideChatInput, 100);
    });
  }

  function hideChatInput() {
    if (chatInput) {
      chatInput.remove();
      chatInput = null;
    }
    chatVisible = false;
  }

  document.addEventListener("mousemove", (e) => {
    sendMessage({
      type: "sync",
      cursor: {
        x: e.clientX,
        y: e.clientY,
        pointer: "mouse"
      }
    });
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    sendMessage({
      type: "sync",
      cursor: {
        x: touch.clientX,
        y: touch.clientY,
        pointer: "touch"
      }
    });
  });

  const style = document.createElement("style");
  style.textContent = `
    .cursor-party-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      color: #ff6b6b;
      transition: left 0.1s ease-out, top 0.1s ease-out;
      display: none;
    }

    .cursor-flag {
      position: absolute;
      left: 20px;
      top: 0;
      font-size: 16px;
    }

    .cursor-chat-bubble {
      position: absolute;
      left: 24px;
      top: 0;
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

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  connect();
  initChat();
})();
