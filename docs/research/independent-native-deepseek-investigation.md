# Independent investigation: native subagents and DeepSeek V4 Flash

**Scope/date.** Primary-source review completed 2026-07-21. This assesses native Codex child agents, not whether a normal single Codex session can use OpenRouter.

## Findings

1. **A native `model`/`reasoning_effort` override does not imply provider control.** The live `spawn_agent` schema contains `agent_type`, `fork_context`, `model`, `reasoning_effort`, and `service_tier`, but no `model_provider` or profile selector. The implementation describes children as inheriting the current model unless `model` is set, and its override path resolves that model through the current model manager. The live schema's advertised list is therefore a model list, not a provider-routing interface. [Schema source](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/multi_agents_spec.rs) | [spawn handler](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/handlers/multi_agents/spawn.rs)

2. **Custom agent files can syntactically pin `model_provider`, but that is not proof that native non-OpenAI execution works.** Official docs say a custom agent file is a configuration layer and may include other supported `config.toml` keys; the configuration reference defines `model_provider` as the provider ID from `model_providers`. Thus an agent file can contain `model_provider = "openrouter"` and `model = "deepseek/deepseek-v4-flash"`. Provider definitions and selection are user-level configuration, not project-scoped configuration. [Subagents docs](https://learn.chatgpt.com/docs/agent-configuration/subagents) | [config reference](https://learn.chatgpt.com/docs/config-file/config-reference)

3. **Current evidence does not establish reliable native DeepSeek/OpenRouter children.** Upstream issue [#17598](https://github.com/openai/codex/issues/17598) remains open and reports, in Codex CLI 0.120.0, that an OpenAI parent ignored a custom child's non-OpenAI provider and that a non-OpenAI parent did not spawn native children at all. The reproducer uses exactly a custom agent file with `model_provider`; its reported OpenAI-only control case succeeds. Related open enhancement [#14039](https://github.com/openai/codex/issues/14039) explicitly requests per-subagent provider/profile selection. These are issue reports, not a release guarantee, but they are direct upstream evidence against treating configuration syntax as operational support.

4. **DeepSeek V4 Flash is available from OpenRouter under `deepseek/deepseek-v4-flash`.** OpenRouter documents Codex CLI custom-provider setup separately, which supports direct Codex sessions but does not change the native-child limitation above. [OpenRouter model page](https://openrouter.ai/deepseek/deepseek-v4-flash) | [OpenRouter Codex guide](https://openrouter.ai/docs/cookbook/coding-agents/codex-cli)

## Decision

Do **not** remove `routed-exec` if retaining DeepSeek V4 Flash via OpenRouter matters. Native spawning can be used for children intentionally routed to the parent/OpenAI provider, but there is no native tool-level provider control and no verified current end-to-end evidence for an OpenRouter DeepSeek child. A model name written in a child prompt is not routing control.

## Smallest safe migration/deprecation

Keep the existing routed-exec DeepSeek path as the only non-OpenAI-child fallback. Do not change native OpenAI-child use. Add a deprecation gate rather than a date: remove the fallback only after the evidence below is captured against the intended released Codex version. This avoids speculative config changes and preserves the current DeepSeek capability.

## Evidence required to retire routed-exec

All of the following should be recorded from a released build, not merely inferred from source:

1. The native `spawn_agent` schema exposes an explicit child provider/profile control, or official docs state that a custom agent's `model_provider` is honored for native children.
2. An OpenAI-parent native spawn of a custom child configured with `model_provider = "openrouter"` and `model = "deepseek/deepseek-v4-flash"` produces a child rollout/config snapshot showing both exact values.
3. The child completes a real tool-using task through OpenRouter; request/usage evidence shows the OpenRouter route, not an inherited OpenAI model.
4. If the deployment also needs a non-OpenAI parent, repeat the same test with an OpenRouter parent and verify that it emits `spawn_agent` and creates the child.

Until then, native model/effort control should be treated as **OpenAI-model selection in this surface**, not as portable provider routing.

## Primary sources reviewed

- [Codex subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Open issue #14039](https://github.com/openai/codex/issues/14039)
- [Open issue #17598](https://github.com/openai/codex/issues/17598)
- [Upstream `spawn.rs`](https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/src/tools/handlers/multi_agents/spawn.rs)
- [Upstream `multi_agents_spec.rs`](https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/src/tools/handlers/multi_agents_spec.rs)
