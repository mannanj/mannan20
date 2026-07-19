import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeetingMediaControls } from './meeting-media-controls';

describe('meeting media controls', () => {
  test('labels input state without relying on icons', () => {
    const markup = renderToStaticMarkup(
      <MeetingMediaControls
        microphoneEnabled={false}
        cameraEnabled
        onToggleMicrophone={() => undefined}
        onToggleCamera={() => undefined}
        onOpenSettings={() => undefined}
      />,
    );

    expect(markup).toContain('Turn microphone on');
    expect(markup).toContain('Turn camera off');
    expect(markup).toContain('Device settings');
    expect(markup).toContain('aria-pressed="false"');
  });
});

