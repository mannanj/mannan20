import { FilmPromptPage } from './film-prompt-page';
import transcript from './transcript.json';

const MEDIA = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/sun-signal';

export function SunPromptPage() {
  return (
    <FilmPromptPage
      transcript={transcript}
      idPrefix="sun"
      title="The Light We Lost"
      video={`${MEDIA}/light-we-lost.mp4`}
      poster={`${MEDIA}/poster.jpg`}
      captions="/videos/sun-signal-light/captions.vtt"
      durationLabel="0:33"
      durationWords="33 seconds"
      externalNote="voice, images, music, research"
      videoTestId="sun-video"
    />
  );
}
