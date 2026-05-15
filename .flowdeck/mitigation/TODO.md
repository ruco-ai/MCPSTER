# mitigation

## BOT

- [ ] run Supply Chain Attack Mitigation Plan as described on supply-chain-mitigation.md

## HUMAN

#### COMMENTS

**Overview.** The BOT task is a single line that stands in for a 14-action security hardening plan spanning the entire 6-repo ecosystem. The plan divides into four zones:

1. **Immediate audit (actions 1–3).** Read-only checks BOT can run: scan `.claude/settings.json` and `.vscode/tasks.json` for injected hooks, run `npm audit`, inspect `package-lock.json` for `github:`/`git+` protocol deps, and verify recent publish history for `@ruco-ai/mcpster`. These are safe to automate.

2. **CI/CD hardening (actions 6–7).** SHA-pin GitHub Actions workflows and restrict `pull_request_target` permissions. **Blocked:** no `.github/workflows/` directory exists in this repo. BOT cannot act here. If other repos (sitegrow, mdblu, etc.) have workflows, those need to be handled per-repo.

3. **Dependency policy (actions 4–5).** Add `minimumReleaseAge` and `blockExoticSubdeps` to `renovate.json`. **Blocked:** no Renovate config exists. This requires a human decision on whether to adopt Renovate (or Dependabot as an alternative). BOT can scaffold the file if the tooling decision is made.

4. **Human-only actions (2, 8, 9).** Rotating GitHub Actions secrets, npm publish tokens, and Railway/Fly/Cloudflare deploy tokens cannot be automated — they require credentials and manual portal access. Moving secrets out of `.env` files requires choosing a secrets manager and migrating values.

**Current state observations.**
- `.claude/settings.json` in this repo contains only the `htllm` MCP server (pointing to a local dist path) — nothing suspicious.
- `.claude/settings.local.json` contains a large permission allowlist from prior sessions; entries look legitimate (npm, tsc, vitest, git, curl to npmjs.org).
- No GitHub Actions workflows exist in mcpster — so actions 6 and 7 are currently no-ops for this repo.
- No Renovate config exists — actions 4 and 5 have no target.

**Risks.**
- The card scope is ecosystem-wide but lives in the mcpster deck. If BOT runs it against only this repo, actions on sitegrow, mdblu, xtage, skillms will be missed.
- Secret rotation is time-sensitive — the longer npm/CI tokens remain unrotated after a supply-chain incident, the wider the exposure window.
- The `security@ruco.ai` contact in the proposed SECURITY.md — if this inbox doesn't exist or isn't monitored, the file creates a false promise.

- [ ] Which repos should be in scope for this card? Just mcpster, or all 6 ecosystem repos?
  > _answer:_

- [ ] Is there an active CI/CD pipeline with GitHub Actions secrets for any of these repos? If yes, which repos and which secrets need rotating?
  > _answer:_

- [ ] What secrets manager should action 8 target? (1Password CLI, Doppler, Infisical, or keep `.env` for local dev?)
  > _answer:_

- [ ] Is `security@ruco.ai` a real, monitored inbox? If not, what contact should go in SECURITY.md?
  > _answer:_

- [ ] Should BOT adopt Renovate or Dependabot for actions 4–5? Neither config exists today.
  > _answer:_

