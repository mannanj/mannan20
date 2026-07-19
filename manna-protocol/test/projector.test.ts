import { describe, expect, test } from 'bun:test';
import {
  emptyProjectSnapshot,
  projectEvents,
  projectMannaEvent,
} from '../src/projector';
import type { MannaEvent } from '../src/protocol';

function event(
  sourceCursor: number,
  kind: MannaEvent['kind'],
  payload: Record<string, unknown>,
  summary: string = kind,
): MannaEvent {
  return {
    eventId: `codex:session-1:${sourceCursor}:${kind}`,
    projectId: 'meet',
    source: 'codex',
    sourceSessionId: 'session-1',
    sourceCursor,
    kind,
    occurredAt: new Date(Date.UTC(2026, 6, 18, 22, 0, sourceCursor)).toISOString(),
    summary,
    payload,
  } as MannaEvent;
}

describe('projectMannaEvent', () => {
  test('projects goal, agent, proof, and liveness state', () => {
    const events = [
      event(1, 'session.discovered', { branch: 'feat/meeting-consent' }),
      event(2, 'goal.changed', { objective: 'Ship consent flow', status: 'active' }),
      event(3, 'agent.working', { action: 'Running browser tests' }),
      event(4, 'test.started', { commandClass: 'e2e' }),
      event(5, 'test.finished', { status: 'passed', commandClass: 'e2e', count: 12 }),
      event(6, 'commit.observed', { sha: 'a'.repeat(40), subject: 'Add consent stage' }),
      event(7, 'collector.heartbeat', {}),
    ];

    const snapshot = projectEvents(events);

    expect(snapshot).toMatchObject({
      projectId: 'meet',
      sequence: 7,
      connection: 'live',
      lastSeen: events[6]?.occurredAt,
      goal: { objective: 'Ship consent flow', status: 'active' },
      agent: {
        sessionId: 'session-1',
        state: 'working',
        currentAction: 'Running browser tests',
      },
      evidence: {
        tests: 'passed',
        commit: { sha: 'a'.repeat(40), subject: 'Add consent stage' },
      },
    });
    expect(snapshot.timeline.map((item) => item.kind)).not.toContain('collector.heartbeat');
  });

  test('assistant activity cannot mark tests or builds passed', () => {
    const snapshot = projectEvents([
      event(1, 'agent.working', { action: 'Tests and build passed' }, 'Tests and build passed'),
      event(2, 'agent.completed', {}),
    ]);

    expect(snapshot.evidence.tests).toBe('unknown');
    expect(snapshot.evidence.build).toBe('unknown');
    expect(snapshot.agent.state).toBe('complete');
  });

  test('duplicate event ids are neutral and replay is deterministic', () => {
    const proof = event(1, 'build.finished', {
      status: 'passed',
      commandClass: 'production',
    });
    const once = projectEvents([proof]);
    const duplicated = projectEvents([proof, proof]);
    const replayed = projectEvents([proof]);

    expect(duplicated).toEqual(once);
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(once));
  });

  test('does not mutate an existing snapshot', () => {
    const initial = emptyProjectSnapshot();
    const next = projectMannaEvent(initial, event(1, 'agent.needs_input', { reason: 'decision' }));

    expect(initial.agent.state).toBe('quiet');
    expect(next.agent.state).toBe('needs_input');
  });
});
