import { readFile } from "node:fs/promises";
import path from "node:path";

export interface GardenSkill {
  id: string;
  title: string;
  description: string;
  markdown: string;
}

const SKILLS: { id: string; title: string }[] = [
  { id: "storyboard", title: "Storyboard" },
];

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;

function parseSkill(source: string) {
  const match = source.match(FRONTMATTER);
  const frontmatter = match?.[1] ?? "";
  const description =
    frontmatter.match(/^description:\s*(.+)$/m)?.[1].trim() ?? "";
  const markdown = match ? source.slice(match[0].length) : source;
  return { description, markdown: markdown.trim() };
}

export async function loadGardenSkills(): Promise<GardenSkill[]> {
  return Promise.all(
    SKILLS.map(async ({ id, title }) => {
      const source = await readFile(
        path.join(process.cwd(), "skills", id, "SKILL.md"),
        "utf8",
      );
      return { id, title, ...parseSkill(source) };
    }),
  );
}
