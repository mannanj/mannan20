import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeetingPeople, type MeetingRosterParticipant } from './meeting-people';

const participants: MeetingRosterParticipant[] = [
  {
    participantId: 'owner_1',
    role: 'owner',
    identityKind: 'account',
  },
  {
    participantId: 'guest_1',
    role: 'participant',
    identityKind: 'browser_guest',
    displayName: 'River',
  },
  {
    participantId: 'account_2',
    role: 'moderator',
    identityKind: 'account',
  },
];

function render(overrides: Partial<Parameters<typeof MeetingPeople>[0]> = {}) {
  return renderToStaticMarkup(
    <MeetingPeople
      participants={participants}
      currentParticipantId="owner_1"
      currentRole="owner"
      connectedParticipantIds={new Set(['owner_1', 'guest_1'])}
      removingParticipantId={null}
      issue={null}
      onRemove={async () => undefined}
      {...overrides}
    />,
  );
}

describe('meeting people', () => {
  test('renders the authoritative roster with safe labels and connection correlation', () => {
    const markup = render();

    expect(markup).toContain('You');
    expect(markup).toContain('River');
    expect(markup).toContain('Account participant');
    expect(markup).toContain('Owner');
    expect(markup).toContain('2 connected');
    expect(markup).not.toContain('owner_1');
    expect(markup).not.toContain('account_2');
  });

  test('offers moderation only for eligible non-owner rows', () => {
    const ownerMarkup = render();
    expect(ownerMarkup.match(/>Remove<\/button>/gu)).toHaveLength(2);

    const participantMarkup = render({
      currentParticipantId: 'guest_1',
      currentRole: 'participant',
    });
    expect(participantMarkup).not.toContain('>Remove</button>');
  });

  test('keeps a failed target visible with stable retry copy and row-local pending state', () => {
    const markup = render({
      removingParticipantId: 'guest_1',
      issue: 'Could not finish removing this person. Try again.',
    });

    expect(markup).toContain('River');
    expect(markup).toContain('Removing…');
    expect(markup).toContain('Could not finish removing this person. Try again.');
    expect(markup).toContain('Account participant');
  });
});
