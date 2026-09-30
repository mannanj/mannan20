import { FilmPromptPage } from './film-prompt-page';
import transcript from './rates-went-up-transcript.json';

const MEDIA = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/civic-signal';

export function RatesWentUpPage() {
  return (
    <FilmPromptPage
      transcript={transcript}
      idPrefix="civic"
      title="Rates went up. What can I do?"
      video={`${MEDIA}/rates-went-up.mp4`}
      poster={`${MEDIA}/poster.jpg`}
      captions="/videos/rates-went-up/captions.vtt"
      durationLabel="1:22"
      durationWords="82 seconds"
      externalNote="voice, images, music"
      videoTestId="civic-video"
      gate={{
        film: 'civic-signal',
        note: 'Made available for the Civic Signal team',
        hints: ['hint: say who you are', 'hint: say where you are from'],
      }}
    />
  );
}
