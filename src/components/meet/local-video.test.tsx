import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocalVideo } from './local-video';

describe('local meeting video', () => {
  test('renders a named camera-off fallback without a video element', () => {
    const markup = renderToStaticMarkup(
      <LocalVideo
        stream={null}
        cameraEnabled={false}
        label="Mannan Javid"
      />,
    );

    expect(markup).toContain('M');
    expect(markup).toContain('Camera is off');
    expect(markup).not.toContain('<video');
  });
});

