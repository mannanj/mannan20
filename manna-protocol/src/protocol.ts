export const MANNA_EVENT_KINDS = [
  'session.discovered',
  'agent.working',
  'agent.needs_input',
  'agent.failed',
  'agent.completed',
  'goal.changed',
  'test.started',
  'test.finished',
  'build.started',
  'build.finished',
  'commit.observed',
  'deploy.verified',
  'collector.heartbeat',
] as const;

export type MannaEventKind = (typeof MANNA_EVENT_KINDS)[number];
export type ConnectionState = 'live' | 'stale' | 'disconnected';
export type GoalStatus = 'none' | 'active' | 'complete' | 'blocked';
export type AgentState = 'quiet' | 'working' | 'needs_input' | 'failed' | 'complete';
export type ProofState = 'unknown' | 'running' | 'passed' | 'failed';

type EventPayloads = {
  'session.discovered': {
    branch?: string;
    model?: string;
    reasoningEffort?: string;
  };
  'agent.working': { action: string };
  'agent.needs_input': { reason: 'decision' | 'permission' | 'clarification' | 'unknown' };
  'agent.failed': { stage?: string };
  'agent.completed': Record<string, never>;
  'goal.changed': { objective: string | null; status: GoalStatus };
  'test.started': { commandClass: 'unit' | 'e2e' | 'integration' | 'other' };
  'test.finished': {
    status: 'passed' | 'failed';
    commandClass: 'unit' | 'e2e' | 'integration' | 'other';
    count?: number;
  };
  'build.started': { commandClass: 'production' | 'preview' | 'other' };
  'build.finished': {
    status: 'passed' | 'failed';
    commandClass: 'production' | 'preview' | 'other';
  };
  'commit.observed': { sha: string; subject: string };
  'deploy.verified': { url: string; verifiedAt: string };
  'collector.heartbeat': Record<string, never>;
};

type EventBase = {
  eventId: string;
  projectId: 'meet';
  source: 'codex';
  sourceSessionId: string;
  sourceCursor: number;
  occurredAt: string;
  summary: string;
};

export type MannaEvent = {
  [K in MannaEventKind]: EventBase & { kind: K; payload: EventPayloads[K] };
}[MannaEventKind];

export type SequencedEvent = {
  sequence: number;
  event: MannaEvent;
};

export type ProjectSnapshot = {
  projectId: 'meet';
  sequence: number;
  connection: ConnectionState;
  lastSeen: string | null;
  goal: {
    objective: string | null;
    status: GoalStatus;
  };
  agent: {
    sessionId: string | null;
    state: AgentState;
    currentAction: string | null;
    updatedAt: string | null;
  };
  evidence: {
    tests: ProofState;
    build: ProofState;
    commit: { sha: string; subject: string } | null;
    deployment: { url: string; verifiedAt: string } | null;
  };
  timeline: MannaEvent[];
};

export type ServerMessage =
  | { type: 'snapshot'; snapshot: ProjectSnapshot }
  | { type: 'events'; events: SequencedEvent[]; nextCursor: number }
  | { type: 'reset'; projectId: 'meet' }
  | {
      type: 'error';
      code: 'unauthorized' | 'cursor_expired' | 'invalid_message';
    };

const TOP_LEVEL_KEYS = [
  'eventId',
  'projectId',
  'source',
  'sourceSessionId',
  'sourceCursor',
  'kind',
  'occurredAt',
  'summary',
  'payload',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

function hasAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key)) && required.every((key) => key in value);
}

function boundedString(value: unknown, max: number, allowEmpty = false): value is string {
  return (
    typeof value === 'string' &&
    (allowEmpty || value.length > 0) &&
    value.length <= max &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
  );
}

function exactIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function parsePayload(kind: MannaEventKind, value: unknown): EventPayloads[MannaEventKind] | null {
  if (!isRecord(value)) return null;

  switch (kind) {
    case 'session.discovered': {
      if (!hasAllowedKeys(value, ['branch', 'model', 'reasoningEffort'], [])) return null;
      if (value.branch !== undefined && !boundedString(value.branch, 120)) return null;
      if (value.model !== undefined && !boundedString(value.model, 80)) return null;
      if (value.reasoningEffort !== undefined && !boundedString(value.reasoningEffort, 40)) return null;
      return {
        ...(value.branch === undefined ? {} : { branch: value.branch }),
        ...(value.model === undefined ? {} : { model: value.model }),
        ...(value.reasoningEffort === undefined ? {} : { reasoningEffort: value.reasoningEffort }),
      };
    }
    case 'agent.working':
      if (!hasAllowedKeys(value, ['action'], ['action']) || !boundedString(value.action, 120)) return null;
      return { action: value.action };
    case 'agent.needs_input':
      if (
        !hasAllowedKeys(value, ['reason'], ['reason']) ||
        !oneOf(value.reason, ['decision', 'permission', 'clarification', 'unknown'])
      ) return null;
      return { reason: value.reason };
    case 'agent.failed':
      if (!hasAllowedKeys(value, ['stage'], [])) return null;
      if (value.stage !== undefined && !boundedString(value.stage, 80)) return null;
      return value.stage === undefined ? {} : { stage: value.stage };
    case 'agent.completed':
    case 'collector.heartbeat':
      return hasExactKeys(value, []) ? {} : null;
    case 'goal.changed':
      if (!hasAllowedKeys(value, ['objective', 'status'], ['objective', 'status'])) return null;
      if (value.objective !== null && !boundedString(value.objective, 180)) return null;
      if (!oneOf(value.status, ['none', 'active', 'complete', 'blocked'])) return null;
      return { objective: value.objective, status: value.status };
    case 'test.started':
      if (
        !hasAllowedKeys(value, ['commandClass'], ['commandClass']) ||
        !oneOf(value.commandClass, ['unit', 'e2e', 'integration', 'other'])
      ) return null;
      return { commandClass: value.commandClass };
    case 'test.finished':
      if (!hasAllowedKeys(value, ['status', 'commandClass', 'count'], ['status', 'commandClass'])) return null;
      if (!oneOf(value.status, ['passed', 'failed'])) return null;
      if (!oneOf(value.commandClass, ['unit', 'e2e', 'integration', 'other'])) return null;
      if (value.count !== undefined && (!Number.isSafeInteger(value.count) || (value.count as number) < 0)) return null;
      return {
        status: value.status,
        commandClass: value.commandClass,
        ...(value.count === undefined ? {} : { count: value.count as number }),
      };
    case 'build.started':
      if (
        !hasAllowedKeys(value, ['commandClass'], ['commandClass']) ||
        !oneOf(value.commandClass, ['production', 'preview', 'other'])
      ) return null;
      return { commandClass: value.commandClass };
    case 'build.finished':
      if (!hasAllowedKeys(value, ['status', 'commandClass'], ['status', 'commandClass'])) return null;
      if (!oneOf(value.status, ['passed', 'failed'])) return null;
      if (!oneOf(value.commandClass, ['production', 'preview', 'other'])) return null;
      return { status: value.status, commandClass: value.commandClass };
    case 'commit.observed':
      if (!hasAllowedKeys(value, ['sha', 'subject'], ['sha', 'subject'])) return null;
      if (typeof value.sha !== 'string' || !/^[a-f0-9]{7,64}$/iu.test(value.sha)) return null;
      if (!boundedString(value.subject, 180)) return null;
      return { sha: value.sha.toLowerCase(), subject: value.subject };
    case 'deploy.verified': {
      if (!hasAllowedKeys(value, ['url', 'verifiedAt'], ['url', 'verifiedAt'])) return null;
      if (!boundedString(value.url, 300) || !exactIsoTimestamp(value.verifiedAt)) return null;
      try {
        const url = new URL(value.url);
        if (url.protocol !== 'https:') return null;
      } catch {
        return null;
      }
      return { url: value.url, verifiedAt: value.verifiedAt };
    }
  }
}

export function parseMannaEvent(value: unknown): MannaEvent | null {
  if (!isRecord(value) || !hasExactKeys(value, TOP_LEVEL_KEYS)) return null;
  if (!boundedString(value.eventId, 180)) return null;
  if (value.projectId !== 'meet' || value.source !== 'codex') return null;
  if (!boundedString(value.sourceSessionId, 180)) return null;
  if (!Number.isSafeInteger(value.sourceCursor) || (value.sourceCursor as number) < 0) return null;
  if (!oneOf(value.kind, MANNA_EVENT_KINDS)) return null;
  if (!exactIsoTimestamp(value.occurredAt)) return null;
  if (!boundedString(value.summary, 180, true)) return null;

  const payload = parsePayload(value.kind, value.payload);
  if (payload === null) return null;

  return {
    eventId: value.eventId,
    projectId: 'meet',
    source: 'codex',
    sourceSessionId: value.sourceSessionId,
    sourceCursor: value.sourceCursor as number,
    kind: value.kind,
    occurredAt: value.occurredAt,
    summary: value.summary,
    payload,
  } as MannaEvent;
}
