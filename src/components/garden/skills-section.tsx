"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { DraggablePopout } from "@/components/garden/draggable-popout";
import { AiDesignedDisclosure } from "@/components/garden/ai-designed-disclosure";
import type { GardenSkill } from "@/lib/garden-skills";

const POPOUT_WIDTH = 520;
const POPOUT_BODY_HEIGHT = "250px";
const AI_GENERATED_SKILL_DISCLOSURE =
  "This skill was written primarily with AI and has received limited human review or refinement.";

const MARKDOWN_COMPONENTS: Components = {
  h1: () => null,
  h2: ({ children }) => (
    <h4 className="mt-6 mb-2 text-sm font-medium text-white">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="mt-4 mb-2 text-[13px] font-medium text-white">{children}</h5>
  ),
  p: ({ children }) => <p className="mb-3">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-white/85">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-white/20 pl-3 text-white/55">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#4fc3f7] underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-5 border-white/10" />,
  code: ({ className, children }) =>
    className?.includes("language-") ? (
      <code className={`${className} block`}>{children}</code>
    ) : (
      <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-[#e0e0e0]">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md border border-white/5 bg-black/60 p-3 text-[11px] leading-relaxed text-neutral-300">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-white/15 text-left text-white">
      {children}
    </thead>
  ),
  th: ({ children }) => <th className="px-2 py-1.5 font-medium">{children}</th>,
  td: ({ children }) => (
    <td className="border-b border-white/5 px-2 py-1.5 align-top">
      {children}
    </td>
  ),
};

function SkillCard({
  skill,
  onOpen,
}: {
  skill: GardenSkill;
  onOpen: (skill: GardenSkill, e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`garden-skill-${skill.id}`}
      onClick={(e) => onOpen(skill, e)}
      className="group flex w-full cursor-pointer flex-col rounded-lg border border-white/10 px-3 py-3 text-left transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:bg-white/[0.03]"
    >
      <span className="text-sm font-medium text-white transition-colors duration-200 group-hover:text-red-500">
        SKILL.md
      </span>
      <span className="mt-1 line-clamp-2 text-xs leading-tight text-white/40">
        {skill.description}
      </span>
    </button>
  );
}

export function SkillsSection({ skills }: { skills: GardenSkill[] }) {
  const [openSkill, setOpenSkill] = useState<GardenSkill | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | undefined>();

  const openPopout = useCallback((skill: GardenSkill, e: MouseEvent) => {
    setOpenSkill(skill);
    setAnchor({ x: e.clientX, y: e.clientY });
  }, []);

  const closePopout = useCallback(() => setOpenSkill(null), []);

  if (skills.length === 0) return null;

  return (
    <>
      <section
        data-testid="garden-skills"
        className="mt-12 flex flex-col gap-4"
        aria-labelledby="garden-skills-heading"
      >
        <h3
          id="garden-skills-heading"
          className="text-xs font-medium uppercase tracking-wider text-white"
        >
          Skills
        </h3>
        {skills.map((skill) => (
          <div key={skill.id} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-normal uppercase tracking-wider text-white/60">
                {skill.title}
              </h4>
              <AiDesignedDisclosure
                label="AI-Generated"
                subject="AI-generated skills"
                disclosure={AI_GENERATED_SKILL_DISCLOSURE}
                labelClassName="text-[10px] font-normal uppercase tracking-wider text-white/40"
              />
            </div>
            <SkillCard skill={skill} onOpen={openPopout} />
          </div>
        ))}
      </section>

      {openSkill &&
        createPortal(
          <DraggablePopout
            open
            onClose={closePopout}
            anchorPosition={anchor}
            width={POPOUT_WIDTH}
            bodyMaxHeight={POPOUT_BODY_HEIGHT}
            header={
              <h3 className="mb-4 text-sm font-medium text-white">
                {openSkill.title}
              </h3>
            }
          >
            <div
              data-testid="garden-skill-markdown"
              className="text-[13px] leading-relaxed text-white/75"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MARKDOWN_COMPONENTS}
              >
                {openSkill.markdown}
              </ReactMarkdown>
            </div>
          </DraggablePopout>,
          document.body,
        )}
    </>
  );
}
