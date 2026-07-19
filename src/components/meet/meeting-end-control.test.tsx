import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeetingEndControl } from './meeting-end-control';

function render(
  overrides: Partial<Parameters<typeof MeetingEndControl>[0]> = {},
): string {
  return renderToStaticMarkup(
    <MeetingEndControl
      role="owner"
      phase="live"
      pending={false}
      issue={false}
      onEnd={() => undefined}
      onCancel={() => undefined}
      {...overrides}
    />,
  );
}

describe('meeting end control', () => {
  test('offers a distinct end action only to live owners and moderators', () => {
    expect(render()).toContain('End meeting');
    expect(render({ role: 'moderator' })).toContain('End meeting');
    expect(render({ role: 'participant' })).toBe('');
    expect(render({ phase: 'ended' })).toBe('');
    expect(render({ phase: 'open' })).toBe('');
  });

  test('renders stable pending and retry confirmation copy', () => {
    const pending = render({ pending: true });
    expect(pending).toContain('End the live meeting for everyone?');
    expect(pending).toContain('Ending…');
    expect(pending).toContain('Cancel');

    const failed = render({ issue: true });
    expect(failed).toContain('End the live meeting for everyone?');
    expect(failed).toContain('End for everyone');
    expect(failed).toContain('Could not finish ending the meeting. Try again.');
  });
});
