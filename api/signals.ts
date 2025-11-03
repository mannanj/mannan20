import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';

interface Signal {
  from: string;
  to: string;
  signal: any;
  timestamp: number;
}

const SIGNAL_TIMEOUT_MS = 30000;
const BLOB_PREFIX = 'signals/';

async function getSignalsForPeer(peerId: string): Promise<Signal[]> {
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${peerId}/` });
  const now = Date.now();
  const signals: Signal[] = [];

  for (const blob of blobs) {
    const response = await fetch(blob.url);
    const signal: Signal = await response.json();

    if (now - signal.timestamp < SIGNAL_TIMEOUT_MS) {
      signals.push(signal);
      await del(blob.url);
    } else {
      await del(blob.url);
    }
  }

  return signals;
}

async function writeSignal(from: string, to: string, signal: any): Promise<void> {
  const signalData: Signal = {
    from,
    to,
    signal,
    timestamp: Date.now()
  };

  const signalId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await put(`${BLOB_PREFIX}${to}/${signalId}`, JSON.stringify(signalData), {
    access: 'public',
    addRandomSuffix: false
  });
}

async function cleanupOldSignals(): Promise<void> {
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  const now = Date.now();

  for (const blob of blobs) {
    const response = await fetch(blob.url);
    const signal: Signal = await response.json();

    if (now - signal.timestamp >= SIGNAL_TIMEOUT_MS) {
      await del(blob.url);
    }
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
      const { peerId } = req.query;

      if (!peerId || typeof peerId !== 'string') {
        return res.status(400).json({ error: 'peerId is required' });
      }

      const signals = await getSignalsForPeer(peerId);
      return res.status(200).json({ signals });
    }

    if (req.method === 'POST') {
      const { from, to, signal } = req.body;

      if (!from || !to || !signal) {
        return res.status(400).json({ error: 'from, to, and signal are required' });
      }

      await writeSignal(from, to, signal);
      await cleanupOldSignals();

      return res.status(200).json({ message: 'Signal sent' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Signals API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
