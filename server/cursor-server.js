const WebSocket = require('ws');
const http = require('http');
const geoip = require('geoip-lite');

const PORT = process.env.WS_PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cursor Party WebSocket Server');
});

const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateId();

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const geo = geoip.lookup(ip);

  let country = geo?.country || null;
  if (!country && (ip === '::1' || ip === '127.0.0.1' || ip?.includes('::ffff:127.0.0.1'))) {
    country = 'US';
  }

  clients.set(clientId, { ws, country });

  console.log(`Client connected: ${clientId} from ${country || 'unknown'} (Total: ${clients.size})`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'ping') {
        return;
      }

      if (message.type === 'sync') {
        const client = clients.get(clientId);
        broadcast({
          type: 'sync',
          id: clientId,
          cursor: {
            ...message.cursor,
            country: client?.country
          }
        }, clientId);
      }

      if (message.type === 'chat') {
        broadcast({
          type: 'chat',
          id: clientId,
          message: message.message
        }, clientId);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId} (Total: ${clients.size})`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

function broadcast(message, excludeId) {
  const data = JSON.stringify(message);
  clients.forEach((client, id) => {
    if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

server.listen(PORT, () => {
  console.log(`Cursor Party WebSocket server running on port ${PORT}`);
});
