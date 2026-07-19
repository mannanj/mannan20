import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeetingHome } from './meeting-home';

function render(signedInEmail: string | null): string {
  return renderToStaticMarkup(
    <MeetingHome signedInEmail={signedInEmail} joinUnavailable={false} />,
  );
}

describe('meeting home', () => {
  test('preserves the focused signed-out email continuation', () => {
    const markup = render(null);
    expect(markup).toContain('Continue with email');
    expect(markup).not.toContain('Your meetings');
  });

  test('renders the account meeting ledger beside creation when signed in', () => {
    const markup = render('person@example.com');
    expect(markup).toContain('Your meetings');
    expect(markup).toContain('Create a meeting');
    expect(markup).toContain('Signed in as person@example.com');
    expect(markup).not.toContain('Continue with email');
  });
});
