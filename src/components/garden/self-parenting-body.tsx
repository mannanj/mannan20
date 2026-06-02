"use client";

import { useState, type ReactNode } from "react";
import { ArticleBody } from "../article-body";
import { AdditionalReading } from "./additional-reading";

const IFS_URL = "https://ifs-institute.com";
const SOURCE_URL =
  "https://x.com/BonesawMD/status/2061523220151361610?s=20";

const BELIEFS: string[] = [
  "You are gifted intellectually.",
  "You can unlock your supreme athleticism.",
  "Work diligently on skills and education that nobody can take away from you. That is the secret to everlasting confidence.",
  "You are the type of person who can achieve whatever you want when you discipline yourself to work for it. It does not just happen.",
  "You have an unending capacity to work, you are not lazy.",
  "You set your standard. Others are to fit in with you.",
  "Never worry about making friends, once you truly get comfortable being alone, people are drawn to you.",
  "Everything is a skill. You can learn anything; anything becomes more interesting the more you learn about it.",
  "Whatever you're interested in, be excellent in your chosen path. You will be supported.",
  "Genius is a state accessible to you.",
  "Nobody has the right to disrespect you, even at your young age. In any room you find yourself in, you have valuable contributions. They have inherent value because the words come through someone like you.",
  "Do not shrink yourself. You deserve to take up space.",
  "You can come to me for anything, even if you think I'll be upset — which I might be. But with me, you can unburden your conscience with the truth. I'm with you always.",
];

const PRACTICES: string[] = [
  "Always ask your child, once they can speak, if they would do what you want them to do. If they don't want to do it, it's your responsibility to figure out the most high-agency, high-dignity way to urge them to do the thing. For example, show it via example. Or walk and move and see if they follow. Really mean what you say. Shift the state and introduce a positive emotion and fun and joy. (This is enough to have the child along for your desires and wants — usually they just want joy and play, and need to feel safe first.)",
  "Breathe deep, and after relaxing your body and attention away from collapse and constriction, then ask. And/or then lead. Leading by example (above) works great here. Don't have them do something you wouldn't do or haven't done before. Show rather than tell.",
];

function Chevron({ open, muted = false }: { open: boolean; muted?: boolean }) {
  return (
    <svg
      className={`mt-0.5 shrink-0 transition-transform duration-300 ${
        muted ? "text-white/15" : "text-white/40"
      } ${open ? "rotate-180" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CollapsibleSection({
  title,
  description,
  disabled = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = open && !disabled;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-200 ${
          disabled
            ? "cursor-not-allowed"
            : "cursor-pointer hover:bg-white/[0.03]"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm font-medium ${
              disabled ? "text-white/35" : "text-white"
            }`}
          >
            {title}
          </span>
          {description && (
            <span
              className={`mt-1 block text-xs leading-snug ${
                disabled ? "text-white/25" : "text-white/40"
              }`}
            >
              {description}
            </span>
          )}
        </span>
        {disabled ? (
          <Chevron open={false} muted />
        ) : (
          <Chevron open={isOpen} />
        )}
      </button>

      {!disabled && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SelfParentingBody() {
  return (
    <>
      <ArticleBody spacing="comfortable">
        <p>
          I&apos;m no biological parent yet of human children, yet I
          self-parent myself all the time. In me I have a child and various
          personalities formed over the years of growth, as described in the{" "}
          <a
            href={IFS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70 text-white/70 hover:text-white transition-colors duration-200"
          >
            Internal Family Systems
          </a>{" "}
          methodology &mdash; and these ways of speaking to myself help garner
          confidence and accomplishment.
        </p>
        <p>Here are some ways to practice better self-parenting and relating.</p>
      </ArticleBody>

      <div className="mt-10 space-y-3">
        <CollapsibleSection
          title="Practices for Respect, Agency and Dignity"
          description="How to invite a child into what you want — by example, by shifting state, and by earning a genuine yes."
        >
          <div className="space-y-4 text-sm leading-relaxed text-white/70">
            {PRACTICES.map((practice) => (
              <p key={practice}>{practice}</p>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Self-parenting">
          <ul className="space-y-3 text-sm leading-relaxed text-white/70">
            {BELIEFS.map((belief) => (
              <li key={belief} className="flex gap-3">
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span>{belief}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/70">
            <p>
              I will always be the fortress that supports you until my dying
              days; and when I&apos;m gone, gaze upon the spread of the heavens.
            </p>
            <p>Know that I support you still.</p>
          </div>

          <p className="mt-5">
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#039be5] hover:text-[#4fc3f7] transition-colors duration-200"
            >
              As described in
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="RAS Opportunity Framing"
          description="The Reticular Activating System, programmed for opportunity."
          disabled
        />
      </div>

      <AdditionalReading currentHref="/garden/article/self-parenting" />
    </>
  );
}
