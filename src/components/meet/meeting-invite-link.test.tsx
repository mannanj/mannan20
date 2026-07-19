import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeetingInviteLink } from './meeting-invite-link';

describe('meeting invite link control', () => {
  test('explains the private expiring link before creating it', () => {
    const markup = renderToStaticMarkup(
      <MeetingInviteLink
        meetingId="meeting_0123456789abcdef"
        version={1}
        expiresAt="2026-07-19T15:00:00.000Z"
        onVersionChange={() => undefined}
      />,
    );

    expect(markup).toContain('Invite people');
    expect(markup).toContain('Private link expires when this meeting ends.');
    expect(markup).not.toContain('private_guest_secret');
    expect(markup).not.toContain('/meet/j/');
  });
});

