import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';

interface Peer {
  id: string;
  lastSeen: number;
}

const PEER_TIMEOUT_MS = 10000;
const BLOB_PREFIX = 'peers/';

async function getActivePeers(): Promise<Peer[]> {
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  const now = Date.now();
  const activePeers: Peer[] = [];

  for (const blob of blobs) {
    const peerId = blob.pathname.replace(BLOB_PREFIX, '');
    const response = await fetch(blob.url);
    const peer: Peer = await response.json();

    if (now - peer.lastSeen < PEER_TIMEOUT_MS) {
      activePeers.push(peer);
    } else {
      await del(blob.url);
    }
  }

  return activePeers;
}

async function updatePeer(peerId: string): Promise<void> {
  const peer: Peer = {
    id: peerId,
    lastSeen: Date.now()
  };

  await put(`${BLOB_PREFIX}${peerId}`, JSON.stringify(peer), {
    access: 'public',
    addRandomSuffix: false
  });
}

async function removePeer(peerId: string): Promise<void> {
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${peerId}` });
  for (const blob of blobs) {
    await del(blob.url);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const peers = await getActivePeers();
      return res.status(200).json({ peers });
    }

    if (req.method === 'POST') {
      const { peerId, action } = req.body;

      if (!peerId) {
        return res.status(400).json({ error: 'peerId is required' });
      }

      if (action === 'leave') {
        await removePeer(peerId);
        return res.status(200).json({ message: 'Peer removed' });
      }

      await updatePeer(peerId);
      return res.status(200).json({ message: 'Peer updated' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Peers API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
