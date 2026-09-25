# Session transcripts

`transcripts.zip` holds the raw Claude Code session logs behind the film, as JSON Lines — the
same format Claude Code writes to `~/.claude/projects/`. The archive is password-protected;
the password is not in this repository. Ask if you want it.

| File | Lines | What happened |
|---|---|---|
| `6a07c05d-…jsonl` | 1,862 | The film. Opens on unrelated landing-page work, then turns into the script, the image generation, the animation and the render. |
| `f357cb69-…jsonl` | 335 | Building the page that shows the film with every prompt and what each step cost. |
| `f719cf4d-…jsonl` | 663 | Explaining how the film was made, then publishing this source and these transcripts. |

The third is a recording of the session that added it, so it stops partway through its own
work — the last thing it contains is roughly the act of writing this file.

## Opening it

On macOS, double-click the archive in Finder and enter the password when Archive Utility asks.
Nothing needs installing.

From a terminal, on any platform:

```bash
unzip transcripts.zip     # prompts for the password
```

Each `.jsonl` file is one JSON record per line:

```bash
python3 -c "import json,sys; [print(json.loads(l).get('type')) for l in open(sys.argv[1])]" 6a07c05d-*.jsonl
```

## What was changed

These are the real logs, not a retelling, but they are not byte-for-byte copies of what was on
disk. `../scrub-transcripts.py` removed:

- **Absolute paths** — `/Users/<username>/…` rewritten to `~/…` (4,376 of them), and the local
  username everywhere else it appeared.
- **Personal email addresses** — replaced with `[email removed]`.
- **Embedded screenshots** — 38 base64 images replaced with a placeholder.
- **Thinking-block signatures** — 349 multi-kilobyte opaque strings carrying nothing a reader
  can use.

No messages were edited, reordered or dropped. Run the script again over the same inputs and
you get the same files.

Scanned with Gitleaks before archiving. No credentials, tokens or keys appear in them — the
generation scripts read the OpenRouter key from the environment and never log its value.
