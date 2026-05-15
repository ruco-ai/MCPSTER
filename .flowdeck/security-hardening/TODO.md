# TODO — security-hardening-supply-chain

**Deck:** mcpster (but scope is all 6 ecosystem repos)
**Created:** 2026-05-15
**Trigger:** Mini Shai-Hulud npm/PyPI supply-chain campaign targeting AI developer tooling.
**Ref:** supply-chain-mitigation.md, AINews May 12–13 2026

---

## HUMAN — scoping sign-off

**Decisions made (2026-05-15):**

- [x] Scope: all 6 repos — mcpster, sitegrow, mdblu, xtage, skillms, flowdeck
- [x] Secrets to rotate: npm publish token (@ruco-ai/mcpster), GitHub token (mdblu PR automation), Vercel deploy token
- [x] Secrets manager: 1Password CLI (`op run --`)
- [x] SECURITY.md contact: `alex@ruco.pt`
- [x] Dependency tooling: Renovate (for `minimumReleaseAge` + `blockExoticSubdeps` support)

**Before passing to BOT, confirm:**
- [ ] You have 1Password CLI installed and `op` authenticated locally
- [ ] You have admin access to all 6 GitHub repos
- [ ] You have npm token rotation rights for `@ruco-ai`

---

#### COMMENTS (flash — 2026-05-15)

**Phase 1 — Audit**
Scripts use `../repo` relative paths, assuming all 6 repos sit as siblings on disk. If any repo is checked out elsewhere the scan will silently miss it. `npm view @ruco-ai/mcpster` works unauthenticated only if the package is public; if it's private, BOT will need `NPM_TOKEN` in env. Phase 1 must complete before Phase 8 can do anything meaningful — that dependency isn't declared anywhere.

**Phase 2 — Rotate Secrets**
Human-gating is correct. Two vague spots: (a) the GitHub secret name is guessed as `GITHUB_TOKEN_MDBLU or similar` — the actual name must be confirmed before rotation or the update step will silently write to the wrong secret; (b) Vercel token says "scoped to relevant project(s)" without naming them. Neither blocker for Phase 2 itself, but both will cause Phase 3's PRs to fail if the tokens aren't landed correctly.

**Phase 3 — Renovate**
`blockExoticSubdeps` is not a documented Renovate config key. The option for blocking git-protocol or GitHub subdeps is `allowedRegistries` / `registryAliases`, or `blockCustomExternalRegistries` in some contexts — not `blockExoticSubdeps`. BOT must validate against the actual Renovate JSON schema before writing the file, or it will be silently ignored. Additionally, Renovate's GitHub App must be installed on the `@ruco-ai` org by a human admin before any PRs will be opened — this is a prerequisite the card doesn't call out.

**Phase 4 — SHA-pin GitHub Actions**
The three SHAs listed are asserted as correct but have no source link. Pinning to a wrong SHA is worse than a floating tag (it will silently run the wrong commit forever). BOT should verify each SHA at execution time via `gh api repos/actions/{repo}/git/ref/tags/v4.x.x` or `git ls-remote`. Also, the three patterns listed won't catch other `uses:` lines — third-party actions (`pnpm/action-setup`, `vercel/action`, etc.) or `actions/cache` will be missed unless BOT scans all `uses:` lines, not just the three listed.

**Phase 5 — `pull_request_target` in mdblu**
If no mdblu workflow uses `pull_request_target`, this phase is a no-op — fine. If a workflow does use it and already has a `permissions:` block at the job level, inserting another at the workflow level will override it — BOT must check for existing `permissions:` before inserting. Low risk overall.

**Phase 6 — 1Password migration**
The `.env.template` vault paths (`op://Personal/Anthropic/api_key`) are generic placeholders. If the 1Password vault is named differently (e.g. `ruco-ai`, `Work`, etc.) or item names differ, `op run` will fail. These paths need to match the actual vault/item/field names. Also, `op run --env-file` in CI requires a service account token (`OP_SERVICE_ACCOUNT_TOKEN`) — biometric auth won't work in non-interactive contexts. The card doesn't address CI usage.

**Phase 7 — SECURITY.md**
Straightforward, low risk. The template body mentions "MCP server permissions in `.claude/settings.json`" — this is mcpster-specific context and will read oddly in flowdeck or skillms. Minor: probably fine to leave as-is for a v1.

**Phase 8 — MCP Permissions Audit**
The known-good list omits `htllm` — which appears as an active MCP server in the current Claude session (`mcp__htllm__*` tools are live). If `htllm` has a `.claude/settings.json` entry anywhere in the repos, BOT will flag it as unknown and block on human review. Decide whether `htllm` belongs on the known-good list before BOT reaches Phase 8.

**PR volume**
Phases 3, 4, and 7 each open a separate PR per applicable repo — potentially ~18 PRs total. Confirm this is acceptable or whether phases should be batched per-repo.

**Open questions for HUMAN before BOT starts:**

- [x] Are all 6 repos siblings on disk?
  > Yes — assume `../sitegrow`, `../mdblu`, etc. resolve from mcpster.
  > If a path fails, log the error and continue with remaining repos.

- [x] Is the Renovate GitHub App installed on `@ruco-ai`?
  > Assume not. BOT commits `renovate.json` to all repos but adds a
  > completion report note: app must be installed at github.com/apps/renovate.

- [x] Exact GitHub secret name for mdblu token?
  > Unknown — BOT must scan `.github/workflows/*.yml` in mdblu for all
  > `secrets.*` references and report names found before taking any action.

- [x] 1Password vault name and item paths?
  > Use placeholder paths in `.env.template`:
  > `op://YOUR_VAULT/item/field` with a comment: "run `op vault list`
  > to find your vault name, then update these paths."

- [x] Is `htllm` a known-good MCP server?
  > Yes — add to Phase 8 allowlist alongside the other known-good servers.

- [x] Should BOT verify GitHub Actions SHAs via `gh api`?
  > Yes — verify each SHA at runtime before committing. Requires `gh` CLI
  > authenticated. If `gh` is not available, log a warning and skip pinning
  > for that workflow rather than committing an unverified SHA.

- [x] Which Vercel projects should the new token be scoped to?
  > BOT must run `vercel projects list` first and report the results.
  > Do not create the token until HUMAN confirms the project list.

---

#### COMMENTS (flash — 2026-05-15, post-answers)

**`blockExoticSubdeps` still in the task body**
The Phase 3 JSON blocks still contain `"blockExoticSubdeps": true`. The resolved answers didn't fix the task body, only noted the issue in comments. BOT will copy the invalid key verbatim into `renovate.json`. Before executing Phase 3, replace with the correct Renovate pattern: add `"allowedRegistries": ["https://registry.npmjs.org"]` to block non-registry sources, and `"allowCustomCriteriaMatching": false` is not applicable here — the right lever is constraining `resolvedAs` sources via a `packageRules` `matchSourceUrls` deny-list or simply `"registryUrls"` at the preset level. BOT should validate against the Renovate JSON schema at runtime.

**Phase 2 Vercel pause has no enforcement mechanism**
The resolved answer for "which Vercel projects?" says "do not create the token until HUMAN confirms." But Phase 2 is already HUMAN-gated (the whole phase is a printed checklist). The `vercel projects list` step belongs in Phase 1 (audit, safe to run) so the list is available before HUMAN starts Phase 2. Right now it isn't there — BOT has no instructions to run it, and HUMAN has no list to act on before Phase 2 begins.

**Phase 8 task body not updated with `htllm`**
The known-good list in the Phase 8 task body (lines ~315–326) still omits `htllm`. The resolved answer says to add it, but the BOT section wasn't edited. When BOT executes it will read the task body, not COMMENTS, and will flag htllm as unknown. Either the Phase 8 task body must be updated before execution, or BOT needs an explicit instruction to merge the COMMENTS allowlist into its check.

- [ ] Update Phase 8 known-good list in the BOT task body to include `htllm`?
  > _answer:_

**Phase 4 has no branch name**
Phases 3, 6, and 7 each declare an explicit branch name. Phase 4 does not. BOT will invent one, risking a collision with other open branches (e.g., if it defaults to `chore/sha-pin` but a Phase 3 branch for the same repo is active). Declare the branch name here.

- [ ] Confirm branch name for Phase 4 SHA-pinning (suggestion: `chore/pin-actions`)?
  > _answer:_

**Phase 9 report commit destination bypasses PR workflow**
`docs/security-hardening-report.md` is committed "to mcpster" with no branch specified, implying a direct commit to `master`. This skips CI and creates a lone commit outside any of the PR branches. Either add it to an existing branch (e.g., Phase 7's `chore/security-policy`) or create a dedicated `chore/security-report` branch with a PR.

**Pre-flight checklist is not a BOT gate**
The three `[ ]` items under "Before passing to BOT, confirm" are unchecked and unenforceable — BOT will proceed regardless. If `op` is not authenticated or `gh` is not available, Phase 6 and Phase 4 will fail mid-execution leaving repos in a partial state. Consider adding a Phase 0 pre-flight check script that verifies `op whoami`, `gh auth status`, and `vercel whoami` before any writes happen.

**No `depends:` headers declared**
Phases 3, 4, 6, and 7 will all create branches in all 6 repos concurrently if run in parallel. No inter-phase dependencies are declared, so the flowdeck orchestrator has no signal to serialize them. Phase 1 → Phase 8 dependency (noted in first-pass comments) and Phase 2 human gate → Phase 3 are the critical ones. Add `depends:` headers or a note that this card must be played `--serial`.

---

## BOT — execute security hardening

### Phase 1 — Audit (read-only, safe to run first)

```bash
# 1a. Scan all .claude/settings.json files for unexpected entries
find . -name "settings.json" -path "*/.claude/*" -exec echo "=== {} ===" \; -exec cat {} \;

# 1b. Scan all .vscode/tasks.json files
find . -name "tasks.json" -path "*/.vscode/*" -exec echo "=== {} ===" \; -exec cat {} \;

# 1c. Check for github: or git+https: protocol deps (exotic subdeps)
for repo in mcpster sitegrow mdblu xtage skillms flowdeck; do
  echo "=== $repo ==="
  [ -f "../$repo/package-lock.json" ] && \
    cat "../$repo/package-lock.json" | grep '"resolved"' | grep -E '"(github:|git\+)' || \
    echo "no package-lock.json or no exotic deps"
done

# 1d. Check recent npm publish history for @ruco-ai/mcpster
npm view @ruco-ai/mcpster time --json | tail -n 10
```

**BOT: report findings before proceeding to Phase 2.**

---

### Phase 2 — Rotate Secrets

> ⚠️ Do NOT automate this phase. List the rotation steps and pause for HUMAN execution.

**BOT: output the following checklist for HUMAN to action:**

```
SECRET ROTATION CHECKLIST — execute manually

[ ] npm publish token
    1. Go to npmjs.com → Account → Access Tokens
    2. Delete existing automation token for @ruco-ai/mcpster
    3. Create new token: type=Automation, CIDR restrict to your CI IP if possible
    4. Update GitHub secret: Settings → Secrets → NPM_TOKEN in mcpster repo

[ ] GitHub token (mdblu PR automation)
    1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
    2. Delete or regenerate the token used by mdblu's propose_template_update
    3. Scope: repo (contents + pull requests), nothing else
    4. Update wherever this token is stored (GitHub secret GITHUB_TOKEN_MDBLU or similar)

[ ] Vercel deploy token
    1. Go to vercel.com → Settings → Tokens
    2. Delete existing deploy token
    3. Create new token scoped to relevant project(s)
    4. Update GitHub secret VERCEL_TOKEN in affected repos

[ ] Confirm rotation complete before BOT continues to Phase 3
```

---

### Phase 3 — Install Renovate (all 6 repos)

For each repo, create `renovate.json` at root:

**mcpster, sitegrow, skillms, xtage** (npm packages):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "minimumReleaseAge": "3 days",
  "blockExoticSubdeps": true,
  "packageRules": [
    {
      "matchDepTypes": ["dependencies"],
      "minimumReleaseAge": "7 days"
    },
    {
      "matchDepTypes": ["devDependencies"],
      "minimumReleaseAge": "3 days"
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

**mdblu, flowdeck** (if they have package.json, same config; if not, skip):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "minimumReleaseAge": "3 days",
  "blockExoticSubdeps": true,
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

**BOT: commit `renovate.json` to each applicable repo root, branch `chore/renovate-config`, open PRs.**

---

### Phase 4 — SHA-pin GitHub Actions (all repos)

For each `.github/workflows/*.yml` file across all 6 repos:

Replace floating version tags with pinned SHAs. Key ones to fix immediately:

```yaml
# Replace these patterns:
uses: actions/checkout@v4
uses: actions/setup-node@v4
uses: actions/upload-artifact@v4

# With pinned SHAs (current as of May 2026):
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683       # v4.2.2
uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020     # v4.4.0
uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa0  # v4.6.2
```

**BOT: scan all workflow files across repos, output a diff of all lines needing SHA pinning, then apply.**

---

### Phase 5 — Restrict `pull_request_target` in mdblu CI

In mdblu's `.github/workflows/` — find any workflow using `pull_request_target` and add explicit permission scoping:

```yaml
# Add to any workflow using pull_request_target:
permissions:
  contents: read
  pull-requests: write
  # Explicitly absent: packages, secrets, id-token
```

**BOT: scan mdblu workflows, apply permission blocks, commit.**

---

### Phase 6 — Migrate secrets to 1Password CLI

For each repo with a `.env` file containing real secrets:

**Template for updated npm scripts in `package.json`:**

```json
{
  "scripts": {
    "dev": "op run --env-file='.env.template' -- tsx src/index.ts",
    "build": "tsc",
    "deploy:railway": "op run --env-file='.env.template' -- railway up"
  }
}
```

**Create `.env.template` (committed, no real values):**

```bash
# .env.template — keys only, no values. Use: op run --env-file='.env.template' -- <command>
ANTHROPIC_API_KEY=op://Personal/Anthropic/api_key
RAILWAY_TOKEN=op://Personal/Railway/token
NPM_TOKEN=op://Personal/npm/ruco-ai-token
```

**Add `.env` to `.gitignore` if not already present.**

**BOT: for each repo, check if `.env` is gitignored, create `.env.template`, update package.json scripts, commit on branch `chore/1password-secrets`.**

---

### Phase 7 — Add SECURITY.md (all 6 repos)

Create at root of each repo:

```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Contact:** alex@ruco.pt
**Response time:** We aim to acknowledge reports within 48 hours.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We will not pursue legal action against researchers who report vulnerabilities in good faith.

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✓         |
| < latest | security fixes only |

## Known Security Considerations

This project builds and deploys MCP (Model Context Protocol) servers. Please review:
- MCP server permissions in `.claude/settings.json`
- Tool input validation in all registered MCP tools
- Dependency integrity via Renovate alerts
```

**BOT: create `SECURITY.md` in each of the 6 repos, commit on branch `chore/security-policy`, open PRs.**

---

### Phase 8 — Audit and Clean MCP Server Permissions

For each `.claude/settings.json` found in Phase 1:

**BOT: output a table of registered MCP servers and their permissions. Flag any:**
- Servers not in the known list (mcpster, sitegrow modules a/b/c/d/f, mdblu, xtage, skillms)
- Servers with filesystem write access beyond their expected scope
- Servers with shell execution permissions that weren't explicitly granted

**Known-good MCP server list:**
```
mcpster CLI server
sitegrow/module-a (PDF→HTML)
sitegrow/module-b (HTML→payload.json)
sitegrow/module-c (WP theme)
sitegrow/module-d (orchestrator)
sitegrow/module-f (prompt→site)
mdblu (use_template, propose_template_update, scaffold_hook)
xtage (read/write CODEINDEX, REPO.md, PROJECTINSIGHTS.md)
skillms (analyze_url, commit_skill, contribute_skill)
```

**Any server not on this list: flag for HUMAN review before removal.**

---

### Phase 9 — Verify and Report

**BOT: produce a completion report with:**

```markdown
## Security Hardening — Completion Report

### Audit Findings (Phase 1)
- .claude/settings.json anomalies: [list or "none found"]
- .vscode/tasks.json anomalies: [list or "none found"]
- Exotic subdeps found: [list or "none found"]
- Unexpected npm publish events: [list or "none found"]

### Actions Completed
- [ ] Secret rotation: HUMAN confirmed / pending
- [ ] Renovate installed: [repos list]
- [ ] GitHub Actions SHA-pinned: [repos list]
- [ ] pull_request_target restricted: mdblu
- [ ] .env → 1Password migration: [repos list]
- [ ] SECURITY.md added: [repos list]
- [ ] MCP permissions audited: [findings]

### PRs Opened
- [list of PR URLs]

### Remaining Open Items
- [anything that needs HUMAN follow-up]
```

---

## Done criteria

- [ ] All 6 repos have `renovate.json` committed
- [ ] All GitHub Actions workflows use SHA-pinned actions
- [ ] `pull_request_target` in mdblu has explicit permission scoping
- [ ] No real secrets in `.env` files tracked by git
- [ ] `SECURITY.md` present in all 6 repos
- [ ] MCP server permissions audited, no unexpected entries
- [ ] Secret rotation checklist confirmed complete by HUMAN
- [ ] Completion report generated and committed to mcpster as `docs/security-hardening-report.md`
