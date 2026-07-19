import type { MannaEvent, ProjectSnapshot } from './protocol';

export function emptyProjectSnapshot(): ProjectSnapshot {
  return {
    projectId: 'meet',
    sequence: 0,
    connection: 'disconnected',
    lastSeen: null,
    goal: { objective: null, status: 'none' },
    agent: {
      sessionId: null,
      state: 'quiet',
      currentAction: null,
      updatedAt: null,
    },
    evidence: {
      tests: 'unknown',
      build: 'unknown',
      commit: null,
      deployment: null,
    },
    timeline: [],
  };
}

function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    ...snapshot,
    goal: { ...snapshot.goal },
    agent: { ...snapshot.agent },
    evidence: {
      ...snapshot.evidence,
      commit: snapshot.evidence.commit ? { ...snapshot.evidence.commit } : null,
      deployment: snapshot.evidence.deployment ? { ...snapshot.evidence.deployment } : null,
    },
    timeline: [...snapshot.timeline],
  };
}

export function projectMannaEvent(snapshot: ProjectSnapshot, event: MannaEvent): ProjectSnapshot {
  if (snapshot.timeline.some((item) => item.eventId === event.eventId)) return snapshot;

  const next = cloneSnapshot(snapshot);
  next.sequence += 1;

  if (event.kind !== 'collector.heartbeat') next.timeline.push(event);

  switch (event.kind) {
    case 'session.discovered':
      next.agent.sessionId = event.sourceSessionId;
      next.agent.updatedAt = event.occurredAt;
      break;
    case 'agent.working':
      next.agent = {
        sessionId: event.sourceSessionId,
        state: 'working',
        currentAction: event.payload.action,
        updatedAt: event.occurredAt,
      };
      break;
    case 'agent.needs_input':
      next.agent = {
        sessionId: event.sourceSessionId,
        state: 'needs_input',
        currentAction: event.summary || 'Needs your input',
        updatedAt: event.occurredAt,
      };
      break;
    case 'agent.failed':
      next.agent = {
        sessionId: event.sourceSessionId,
        state: 'failed',
        currentAction: event.summary || event.payload.stage || 'Work failed',
        updatedAt: event.occurredAt,
      };
      break;
    case 'agent.completed':
      next.agent = {
        sessionId: event.sourceSessionId,
        state: 'complete',
        currentAction: null,
        updatedAt: event.occurredAt,
      };
      break;
    case 'goal.changed':
      next.goal = { ...event.payload };
      break;
    case 'test.started':
      next.evidence.tests = 'running';
      break;
    case 'test.finished':
      next.evidence.tests = event.payload.status;
      break;
    case 'build.started':
      next.evidence.build = 'running';
      break;
    case 'build.finished':
      next.evidence.build = event.payload.status;
      break;
    case 'commit.observed':
      next.evidence.commit = { ...event.payload };
      break;
    case 'deploy.verified':
      next.evidence.deployment = { ...event.payload };
      break;
    case 'collector.heartbeat':
      next.lastSeen = event.occurredAt;
      next.connection = 'live';
      break;
  }

  return next;
}

export function projectEvents(events: readonly MannaEvent[]): ProjectSnapshot {
  const seen = new Set<string>();
  let snapshot = emptyProjectSnapshot();

  for (const event of events) {
    if (seen.has(event.eventId)) continue;
    seen.add(event.eventId);
    snapshot = projectMannaEvent(snapshot, event);
  }

  return snapshot;
}
