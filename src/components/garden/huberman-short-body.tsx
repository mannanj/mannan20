import { AdditionalReading } from "./additional-reading";
import { ArticleViews } from "./article-views";
import { ArticleBody } from "../article-body";
import { YoutubeInlineButton } from "../youtube-inline-button";

const HUBERMAN_LIGHT_VIDEO_ID = "29ArZHkx2Z0";

export function HubermanShortBody() {
  return (
    <>
      <ArticleBody spacing="comfortable">
        <p id="one-thing">
          Andrew Huberman says light is the most important thing to change, if
          you could change just one thing.
          <YoutubeInlineButton
            videoId={HUBERMAN_LIGHT_VIDEO_ID}
            label="Watch Andrew Huberman on light"
          />
        </p>

        <p id="what-he-didnt-say">
          What Andrew Huberman didn&apos;t say, is we used to follow the sun for
          millennia before introducing alarm clocks, artificial lights and
          night-time stimulation that takes over the nervous system. He&apos;s
          aware of the difficulty most people will have controlling noise and
          light pollution in their home environment, as not everyone has the
          capability or luxury to control such things, some people self impose
          them on themselves, and he decides to be sensitive and adapt the
          message for most people. This makes the message less true. If you
          instead &ldquo;Wake up to sunlight&rdquo; and turn off artificial
          light after sunset, you don&apos;t have to do any of the difficult
          willpower centric stuff of deciding when to sleep and turning off the
          light. It just happens automatically.{" "}
          <a
            href="https://sunsignal.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline decoration-white/30 underline-offset-4 transition-colors duration-200 hover:decoration-white"
          >
            sunsignal.app
          </a>{" "}
          tests this hypothesis and provides a clock UI to help out.
        </p>

        <p id="try-it">
          If you can bring the sunrise into your room linked to a light, try
          that for a single day and see an immediate result: you wake up to
          light not alarms or clock time. Have no blue light at night? You
          naturally want to fall asleep and sleep more in the winter and less in
          the summer.
        </p>

        <p id="biology-follows-nature">
          You don&apos;t follow industry, your biology follows nature. Industry
          can mask and hack that, but it hasn&apos;t conquered it yet.
        </p>
      </ArticleBody>

      <ArticleViews slug="what-huberman-didnt-say" />

      <AdditionalReading currentHref="/garden/article/what-huberman-didnt-say" />
    </>
  );
}
