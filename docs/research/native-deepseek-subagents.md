# Native DeepSeek Subagents in Codex

Date: 2026-07-21

## Conclusion

Codex CLI 0.144.6 can explicitly select an OpenAI model and reasoning effort for a native subagent, but the current `spawn_agent` surface cannot select a provider or named profile. DeepSeek therefore cannot yet be selected as a child of an OpenAI parent through the native subagent tool.

This is a product/runtime limitation, not a missing local configuration. Standalone Codex already supports custom providers, and the existing OpenRouter profile successfully runs DeepSeek V4 Flash through `codex exec`. The missing bridge is per-child provider selection in native multi-agent orchestration.

Use a hybrid architecture for now:

- Native `spawn_agent` for explicitly routed OpenAI children.
- The monitored `routed-exec` compatibility layer for DeepSeek/OpenRouter children.
- Keep `routed-exec` only for non-native providers, checkpoint/resume, or stronger process isolation.
- Treat DeepSeek V4 Flash as a general affordable worker for suitable tasks, not merely as a cheap fallback.

## Evidence

### Native surface

The active `spawn_agent` schema exposes `model` and `reasoning_effort`, but no `model_provider` or `profile`. Its advertised models are OpenAI models only.

A bounded native verification run explicitly requested `gpt-5.6-luna` at `high` effort. The child rollout persisted:

```text
model=gpt-5.6-luna
effort=high
agent_role=default
```

This verifies native model and effort control on the current surface. It does not establish non-OpenAI provider control.

Upstream source matches the live schema. `SpawnAgentArgs` and the generated tool specification include model, reasoning effort, and service tier, but not provider or profile:

- [V1 spawn handler](https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/src/tools/handlers/multi_agents/spawn.rs)
- [Native multi-agent tool specification](https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/src/tools/handlers/multi_agents_spec.rs)

OpenAI's public request for per-subagent provider/profile selection remains open: [openai/codex issue #14039](https://github.com/openai/codex/issues/14039). A separate open bug reproduces native subagent failures with non-OpenAI custom providers: [openai/codex issue #17598](https://github.com/openai/codex/issues/17598).

### Standalone custom-provider support

Codex supports user-defined `model_providers`, `model_provider`, and startup-loaded `model_catalog_json` for ordinary sessions. The wire protocol for custom providers is the Responses API: [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

The local OpenRouter profile already has the right basic shape:

```toml
model_provider = "openrouter"
model_catalog_json = "/Users/manblack/Documents/codex-agent-routing/config/openrouter-model-catalog.json"

[model_providers.openrouter]
base_url = "https://openrouter.ai/api/v1"
wire_api = "responses"
requires_openai_auth = false
```

OpenRouter exposes DeepSeek V4 Flash through a Responses endpoint and advertises tools, reasoning, and a one-million-token context window: [DeepSeek V4 Flash on OpenRouter](https://openrouter.ai/deepseek/deepseek-v4-flash/api).

## Smallest Upstream Change

A complete native implementation needs more than adding a model slug to an allowlist.

1. Add optional `model_provider` and preferably `profile` fields to both V1 and V2 `spawn_agent` schemas.
2. Deserialize those fields in the spawn argument structures.
3. Resolve the requested provider before resolving the child model catalog.
4. Apply role configuration first, then apply explicit provider, model, and effort overrides so role reloads cannot erase them.
5. Validate the model against the selected provider's catalog rather than the parent's catalog.
6. Preserve and report requested and effective provider, model, and effort in child metadata.
7. Register multi-agent tools when the parent itself runs on a compatible custom provider.
8. Add tests for OpenAI parent to custom-provider child, custom-provider parent to child, role/profile overrides, and persisted routing provenance.

This change must land in the Codex runtime that owns the tool surface. Patching a local wrapper cannot change the hosted `spawn_agent` schema in an already-running tool-backed session.

## Practical Local Options

### Recommended now: hybrid native plus routed execution

Use native subagents for OpenAI routes and `routed-exec` for DeepSeek. This preserves native messaging where available without giving up affordable non-OpenAI compute.

The compatibility layer should remain explicit and monitored:

- Require provider, model, and effort on every new run.
- Require `verified=true` and matching observed model/effort.
- Use task-proportional maximum runtime and heartbeat output.
- Disable unrelated MCP servers by default.
- Use checkpoint/resume for feedback-sensitive work.

### Native-like MCP worker service

A local MCP server can expose `spawn`, `send`, `wait`, `status`, and `close` tools backed by OpenRouter workers. This can improve lifecycle and messaging over shell execution, but it will not create first-class Codex subagent threads in the app UI. It is an adapter, not true native provider support.

### Local Codex fork

A source build can add provider/profile fields to the native tool and child configuration path. This can enable DeepSeek-native orchestration in local CLI sessions launched from that custom binary. It will not alter the hosted tool surface used by another Codex client unless that client is configured to run the custom app server/runtime.

## DeepSeek V4 Flash Tuning

### Positioning

DeepSeek V4 Flash is an efficiency-optimized general agent model with strong coding, reasoning, tool use, long-context processing, and high-throughput characteristics. Route it based on capability fit and verifiability, not only price.

Good default work includes:

- Repository exploration and synthesis.
- Research against supplied sources.
- Test generation and test triage.
- Documentation and structured extraction.
- Well-scoped implementation with independent checks.
- Bounded debugging and performance investigation.
- Broad code review where a stronger reviewer handles subtle security or architectural judgments.
- Long-context comparison and classification.
- Checkpointed multi-turn work.

Keep stronger or specialized review for sole security sign-off, irreversible production decisions, ambiguous load-bearing architecture, and recursive orchestration.

### Reasoning

Use `high` for normal agent work and `xhigh` only for difficult planning, debugging, or review. DeepSeek documents that `low` and `medium` map to `high`, while `xhigh` maps to maximum reasoning. There is no useful four-level tuning ladder for this model: [DeepSeek thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/).

Reasoning tokens are output tokens. Prefer bounded prompts, explicit acceptance criteria, and `high` before increasing to `xhigh`.

### Sampling

Do not tune temperature, top-p, presence penalty, or frequency penalty in thinking mode. DeepSeek documents that these parameters have no effect there.

### Tool-loop compatibility

DeepSeek supports tool calls in thinking mode, but `reasoning_content` must be preserved across subsequent tool-call requests. Any native or MCP adapter must round-trip this field correctly or the provider can reject later requests.

Use concise, well-described tool schemas. Avoid exposing unrelated tools. OpenRouter recommends tracking provider tool-call reliability and supports normal and parallel tool calls: [OpenRouter tool-calling guide](https://openrouter.ai/docs/guides/features/tool-calling).

### Context and output

The provider advertises a one-million-token context window, while the current local catalog intentionally starts at 262,144 tokens with a 1,048,576 maximum. Keep the conservative default until long-context tool-use and compaction tests pass. A large advertised window is not a reason to send irrelevant repository content.

Raise the current 10,000-token truncation limit only for tasks that demonstrably need longer output. Prefer checkpointed phases and durable files over very large final messages.

### Runtime budgets

DeepSeek's local latency has been variable. Use explicit budgets rather than treating it as a latency-first model:

- Small read or extraction: 60-120 seconds.
- Focused implementation or test work: 120-240 seconds.
- Broader analysis or checkpoint phase: 180-360 seconds.

After a timeout, inspect partial evidence and either finish locally or deliberately reroute. Do not repeat the same run unchanged.

## Verification Matrix

Before expanding routing policy, test these flows and retain provider/model/effort receipts:

1. Standalone response with exact route metadata.
2. Single and parallel tool calls.
3. Multi-turn tool calls with preserved reasoning content.
4. Read-only repository exploration.
5. Focused write with exact file ownership.
6. Test generation and execution.
7. Checkpoint and resume.
8. Long-context input at 256K, then staged increases.
9. Timeout and process termination.
10. MCP allowlisting and credential isolation.
11. Native provider override once upstream support appears.
12. Persisted requested-versus-effective provider/model/effort provenance.

## Recommendation

Do not retire `routed-exec` completely yet. Retire it for ordinary OpenAI workers now that native model and effort controls are verified, and retain it as the controlled DeepSeek/OpenRouter path.

Next, update the routing registry and skills so DeepSeek V4 Flash is the first general candidate for independently verifiable Mechanical and Standard work, and a supporting candidate for Judgment work. Keep explicit capability-based exceptions instead of describing it primarily as cheap or experimental.
