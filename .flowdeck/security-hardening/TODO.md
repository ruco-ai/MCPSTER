# TODO — security-hardening-supply-chain

**Deck:** mcpster (but scope is all 6 ecosystem repos)
**Created:** 2026-05-15
**Trigger:** Mini Shai-Hulud npm/PyPI supply-chain campaign targeting AI developer tooling.
**Ref:** supply-chain-mitigation.md, AINews May 12–13 2026
**Serialization:** play this card `--serial` — phases must run in order, no parallel execution.

---

## HUMAN — scoping sign-off

**Decisions made (2026-05-15):**

- [x] Scope: all 6 repos — mcpster, sitegrow, mdblu, xtage, skillms, flowdeck
- [x] Secrets to rotate: npm publish token (@ruco-ai/mcpster), GitHub token (mdblu PR automation), Vercel deploy token
- [x] Secrets manager: 1Password CLI (`op run --`)
- [x] SECURITY.md contact: `alex@ruco.pt`
- [x] Dependency tooling: Renovate (for `minimumReleaseAge` + `allowedRegistries` support)
- [x] `htllm` is a known-good MCP server — add to Phase 8 allowlist
- [x] Phase 4 branch name: `chore/pin-actions`
- [x] Phase 9 report destination: dedicated `chore/security-report` PR
- [x] Phase 0 pre-flight: yes — `op whoami`, `gh auth status`, `vercel whoami` must all exit 0 before any writes
- [x] Card serialization: `--serial`, phases run in order

**Before passing to BOT, confirm:**
- [ ] You have 1Password CLI installed and `op` authenticated locally
- [ ] You have admin access to all 6 GitHub repos
- [ ] You have npm token rotation rights for `@ruco-ai`
- [ ] All 6 repos are siblings at the same `../` relative path from this working directory?
  > _answer:_
- [ ] `jq` is available in the local shell (required by Phase 0)?
  > _answer:_
- [ ] Renovate GitHub App is already installed at the `@ruco-ai` org (github.com/apps/renovate)?
  > _answer:_
- [ ] Phase 6 `op run` prefix on `scripts.dev`: add directly (breaking workflow for contributors without `op`), or as a separate `scripts.dev:secure` variant?
  > _answer:_
- [ ] Besides mcpster, do any other repos reference `NPM_TOKEN` in their CI workflows (e.g. to install private packages)? If yes, those secrets need rotating too.
  > _answer:_

#### COMMENTS

**Phase 0 — Pre-flight**
Straightforward. One silent dependency: `op whoami --format=json | jq -r '.email'` calls `jq` after the auth check passes — if `jq` is absent, the script produces a confusing error on a line that looks like a PASS. Confirm `jq` is installed (question above). The repo discovery loop uses `../` relative paths; if CWD is not inside the shared parent this fails silently with WARNs for every repo.

**Phase 1 — Audit**
The exotic dep grep (`github:|git+`) is a good first pass but misses `file:`, `link:`, and `npm:` aliases pointing to non-registry sources. Acceptable for a first sweep. `npm view @ruco-ai/mcpster` will likely fail without auth context since it's a scoped package — the `|| echo WARN` handles it but the publish history check will be a no-op. The Vercel project list from step 1e is load-bearing for Phase 2 token scoping — BOT must print it before pausing. Phase 1 does not scan other repos' workflows for `NPM_TOKEN` usage; if multiple repos reference it, Phase 2's rotation checklist is incomplete. BOT should grep `.github/workflows/` across all repos for `NPM_TOKEN` references during this phase.

**Phase 2 — Rotate Secrets**
HUMAN-only. Clean design. The checklist rotates NPM_TOKEN only in mcpster — if other repos use it (question above), the checklist is missing steps. No automation risk here.

**Phase 3 — Renovate**
BOT has no built-in JSON schema validator. The "validate against Renovate schema" instruction will in practice be a JSON syntax check at best — expect BOT to report it as validated if the JSON parses cleanly. If Renovate GitHub App is not yet installed at the org level (question above), all 6 PRs will merge config files that do nothing until it is. This phase generates up to 6 PRs; combined with Phases 4, 6, 7, 9 the total across the card is potentially 25–30 PRs — manageable but worth batching reviews in one sitting.

**Phase 4 — SHA-pin GitHub Actions**
**Highest implementation risk in the card.** The `gh api repos/{owner}/{action}/git/ref/tags/{tag}` call returns the tag object SHA for annotated tags, not the commit SHA. For annotated tags `.object.type == "tag"`, and a second call is needed: `gh api repos/{owner}/{action}/git/tags/{object_sha} --jq '.object.sha'` to resolve to the actual commit. If BOT pins the tag object SHA instead of the commit SHA, GitHub Actions silently rejects or misresolves the action. The current card instructions do not include this dereference step — BOT is unlikely to handle it correctly without guidance. Consider adding the two-step dereference to the Phase 4 instructions before executing. The skip-on-error behaviour (`log warning and skip`) is correctly defensive.

**Phase 5 — `pull_request_target` in mdblu**
Narrow scope, low risk. The branch note is slightly ambiguous: "open a separate commit on `chore/security-policy` if that branch is already open" — `chore/security-policy` is Phase 7's branch and won't exist yet at Phase 5 execution time. Likely means: if `chore/pin-actions` was already merged/closed by Phase 4, create `chore/security-policy` here. BOT should interpret it that way.

**Phase 6 — 1Password migration**
The `.env.template` keys (`ANTHROPIC_API_KEY`, `RAILWAY_TOKEN`, `NPM_TOKEN`) are illustrative — each repo will have its own secret surface. BOT can only infer keys from existing `.env` files and `package.json` scripts; it cannot read CI secret names from GitHub. Template will be incomplete for most repos; treat it as a scaffold, not a complete inventory. Adding `op run` as a prefix to `scripts.dev` means `npm run dev` fails for any contributor without `op` installed — this is the most disruptive change in the card (question above). Phase 6 alone is not sufficient for CI to use 1Password; CI requires `OP_SERVICE_ACCOUNT_TOKEN` via a 1Password Service Account, which is not provisioned here. This is noted in the card but is a known gap.

**Phase 7 — SECURITY.md**
Clean. Low risk. GitHub surfaces a "Report a vulnerability" button automatically when `SECURITY.md` is present at repo root — this is a bonus side effect.

**Phase 8 — MCP server permissions**
Claude.ai remote integrations (Canva, Gmail, Google Drive, etc.) live at the claude.ai account level, not in `.claude/settings.json`. They will not appear in Phase 1 output and are out of scope — BOT should not flag their absence. The audit should distinguish between global `~/.claude/settings.json` and per-project settings files; both may surface in Phase 1. `htllm` is on the allowlist per HUMAN decision.

**Phase 9 — Report**
BOT needs to track PR URLs from all prior phases to populate the report. Recommend BOT log each PR URL immediately when opened (not just at Phase 9) so none are missed if a phase partially succeeds.

---

## BOT — execute security hardening

> ⚠️ Run this card `--serial`. Phases have dependencies:
> Phase 0 → Phase 1 → (HUMAN: Phase 2) → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
> Do not start any phase until the previous one is confirmed complete.

---

### Phase 0 — Pre-flight (exits 0 or aborts)

```bash
echo "=== Pre-flight checks ==="

# 1Password
op whoami > /dev/null 2>&1 || { echo "FAIL: op not authenticated. Run: op signin"; exit 1; }
echo "PASS: 1Password authenticated ($(op whoami --format=json | jq -r '.email'))"

# GitHub CLI
gh auth status > /dev/null 2>&1 || { echo "FAIL: gh not authenticated. Run: gh auth login"; exit 1; }
echo "PASS: GitHub CLI authenticated ($(gh api user --jq .login))"

# Vercel CLI
vercel whoami > /dev/null 2>&1 || { echo "FAIL: vercel not authenticated. Run: vercel login"; exit 1; }
echo "PASS: Vercel authenticated ($(vercel whoami))"

# Confirm all 6 repos are reachable
for repo in mcpster sitegrow mdblu xtage skillms flowdeck; do
  [ -d "../$repo/.git" ] || { echo "WARN: ../$repo not found — this repo will be skipped"; }
done

echo "=== Pre-flight complete. Safe to proceed. ==="
```

**BOT: if any check fails with FAIL (not WARN), stop and report. WARN is acceptable — log the missing repo and continue.**

---

### Phase 1 — Audit (read-only, safe to run first)
> depends: Phase 0

```bash
# 1a. Scan all .claude/settings.json across all 6 repos
for repo in mcpster sitegrow mdblu xtage skillms flowdeck; do
  find "../$repo" -name "settings.json" -path "*/.claude/*" 2>/dev/null | while read f; do
    echo "=== $f ==="
    cat "$f"
  done
done

# 1b. Scan all .vscode/tasks.json across all 6 repos
for repo in mcpster sitegrow mdblu xtage skillms flowdeck; do
  find "../$repo" -name "tasks.json" -path "*/.vscode/*" 2>/dev/null | while read f; do
    echo "=== $f ==="
    cat "$f"
  done
done

# 1c. Check for github: or git+https: protocol deps (exotic subdeps)
for repo in mcpster sitegrow mdblu xtage skillms flowdeck; do
  echo "=== $repo ==="
  [ -f "../$repo/package-lock.json" ] && \
    cat "../$repo/package-lock.json" | grep '"resolved"' | grep -E '"(github:|git\+)' || \
    echo "no package-lock.json or no exotic deps"
done

# 1d. Check recent npm publish history for @ruco-ai/mcpster
npm view @ruco-ai/mcpster time --json 2>/dev/null | tail -n 10 || \
  echo "WARN: could not fetch publish history (private package or no NPM_TOKEN)"

# 1e. List Vercel projects for Phase 2 token scoping
echo "=== Vercel projects ==="
vercel projects list
echo "BOT: record this list — HUMAN will need it to scope the new Vercel token in Phase 2."
```

**BOT: report all findings. Include the Vercel project list in the output. Do not proceed to Phase 2 until findings are printed.**

---

### Phase 2 — Rotate Secrets
> depends: Phase 1 complete + HUMAN review of Phase 1 findings
> ⚠️ Do NOT automate this phase. Print the checklist and pause.

**BOT: output the following checklist for HUMAN to action:**

```
SECRET ROTATION CHECKLIST — execute manually

[ ] npm publish token
    1. Go to npmjs.com → Account → Access Tokens
    2. Delete existing automation token for @ruco-ai/mcpster
    3. Create new token: type=Automation, CIDR restrict to your CI IP if possible
    4. Update GitHub secret NPM_TOKEN in mcpster repo

[ ] GitHub token (mdblu PR automation)
    1. Scan mdblu .github/workflows/*.yml for secrets.* references (Phase 1 output)
    2. Note the exact secret name(s) found
    3. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
    4. Delete or regenerate the token
    5. Scope: repo (contents + pull-requests only)
    6. Update the GitHub secret with the exact name found in step 2

[ ] Vercel deploy token
    1. Review the Vercel project list from Phase 1 output
    2. Go to vercel.com → Settings → Tokens
    3. Delete existing deploy token
    4. Create new token scoped ONLY to the projects listed in Phase 1
    5. Update VERCEL_TOKEN in GitHub secrets for affected repos

[ ] Confirm all three rotations complete before telling BOT to continue to Phase 3
```

---

### Phase 3 — Install Renovate (all 6 repos)
> depends: Phase 2 HUMAN confirmed

For each repo that has a `package.json`, create `renovate.json` at root.

**Note:** `blockExoticSubdeps` is not a valid Renovate key and must NOT be used. Use `allowedRegistries` instead to block non-registry sources.

**mcpster, sitegrow, skillms, xtage** (npm packages with dependencies):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "minimumReleaseAge": "3 days",
  "allowedRegistries": ["https://registry.npmjs.org"],
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

**mdblu, flowdeck** (check for `package.json` first; skip if absent):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "minimumReleaseAge": "3 days",
  "allowedRegistries": ["https://registry.npmjs.org"],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

**BOT:**
1. Before writing any file, validate the JSON above against the Renovate schema at `https://docs.renovatebot.com/renovate-schema.json`. If validation fails, stop and report.
2. Commit `renovate.json` to each applicable repo on branch `chore/renovate-config`.
3. Open one PR per repo.
4. Add a completion report note: "Renovate GitHub App must be installed at github.com/apps/renovate on the @ruco-ai org before these PRs will trigger any automation."

---

### Phase 4 — SHA-pin GitHub Actions (all repos)
> depends: Phase 3 complete
> branch: `chore/pin-actions`

For each `.github/workflows/*.yml` file across all 6 repos:

**BOT:**
1. Scan ALL `uses:` lines in all workflow files — not just the three listed below. Every floating tag must be pinned.
2. For each `uses: owner/action@vX.Y.Z` or `uses: owner/action@vX` found, verify the current SHA via:
   ```bash
   gh api repos/{owner}/{action}/git/ref/tags/{tag} --jq '.object.sha'
   ```
   If `gh` returns an error for any action, log a warning and skip that line rather than pinning an unverified SHA.
3. Replace each floating tag with the verified SHA, keeping the tag as a comment.

**Known starting points (verify at runtime — do not use without confirming):**
```yaml
# These are known patterns to look for. SHAs must be verified via gh api before use.
uses: actions/checkout@vX         → verify SHA for current v4.x.x
uses: actions/setup-node@vX       → verify SHA for current v4.x.x
uses: actions/upload-artifact@vX  → verify SHA for current v4.x.x
uses: actions/cache@vX            → verify SHA for current v4.x.x
# Plus any third-party actions found (pnpm/action-setup, vercel/action, etc.)
```

4. Commit all changes to branch `chore/pin-actions`, open one PR per repo that had changes.
5. If a repo has no workflow files, log "no workflows found — skipping" and continue.

---

### Phase 5 — Restrict `pull_request_target` in mdblu CI
> depends: Phase 4 complete

In mdblu's `.github/workflows/`:

**BOT:**
1. Check all workflow files for `pull_request_target` trigger.
2. If none found, log "no pull_request_target triggers found in mdblu — phase 5 is a no-op" and continue.
3. If found, check whether a `permissions:` block already exists at the workflow level or job level.
   - If a job-level `permissions:` block exists, do NOT add a workflow-level one (it would override the job-level block). Instead, verify the job-level permissions are sufficiently restrictive.
   - If no `permissions:` block exists, add at the workflow level:
     ```yaml
     permissions:
       contents: read
       pull-requests: write
     ```
4. Commit changes directly to the existing `chore/pin-actions` branch (or open a separate commit on `chore/security-policy` if that branch is already open).

---

### Phase 6 — Migrate secrets to 1Password CLI
> depends: Phase 2 HUMAN confirmed (op must be authenticated)

For each of the 6 repos:

**BOT:**
1. Check whether a `.env` file exists and is tracked by git (`git ls-files .env`). If tracked, flag it — do not modify yet, report to HUMAN.
2. Check whether `.env` is in `.gitignore`. If not, add it.
3. Check whether any `.env` file contains real secret values (patterns: `sk-`, `ghp_`, `npm_`, `vercel_`). If found, report the file path and pattern matched — do not print the value.
4. Create `.env.template` with placeholder paths:

```bash
# .env.template — keys only, no real values.
# Usage: op run --env-file='.env.template' -- <command>
# Run `op vault list` to find your vault name, then update these paths.
ANTHROPIC_API_KEY=op://YOUR_VAULT/Anthropic/api_key
RAILWAY_TOKEN=op://YOUR_VAULT/Railway/token
NPM_TOKEN=op://YOUR_VAULT/npm/ruco-ai-token
```

5. For repos that have `package.json` with `scripts.dev` or `scripts.deploy*`, add `op run --env-file='.env.template' --` prefix to those commands. Only modify scripts that currently have no `op run` prefix.
6. Commit on branch `chore/1password-secrets`, open one PR per repo that had changes.

**Note on CI:** `op run` in CI requires `OP_SERVICE_ACCOUNT_TOKEN` env var — biometric auth is local-only. Add a comment to `.env.template` noting this.

---

### Phase 7 — Add SECURITY.md (all 6 repos)
> depends: Phase 6 complete
> branch: `chore/security-policy`

Create `SECURITY.md` at root of each repo. Use this template verbatim:

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
| latest  | ✓ |
| < latest | security fixes only |

## Supply Chain Posture

Dependencies are managed via Renovate with a minimum release age of 3 days and registry allowlist.
GitHub Actions are pinned to full commit SHAs. No `.env` files with real secrets are committed.
```

**BOT:** If `SECURITY.md` already exists in a repo, diff the existing content against this template and report the diff rather than overwriting. Do not overwrite without reporting.

---

### Phase 8 — Audit and Clean MCP Server Permissions
> depends: Phase 1 complete (needs the settings.json scan results)

Using the `.claude/settings.json` files found and printed in Phase 1:

**BOT:** Output a table of all registered MCP servers found. For each server, flag if it is NOT in the known-good list below.

**Known-good MCP server list (updated 2026-05-15):**
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
htllm (deploy_menus, deploy_pages, deploy_payload, deploy_theme_mods, get_website, install_to_wp)
```

**Flag for HUMAN review (do not remove automatically):**
- Any server whose name is not on the list above
- Any server with shell execution permissions not matching its expected scope
- Any server with filesystem write access outside its expected directories

**If no `.claude/settings.json` files were found in Phase 1, log "no settings files found — Phase 8 is informational only" and continue.**

---

### Phase 9 — Verify and Report
> depends: all previous phases complete
> branch: `chore/security-report`

**BOT:** Produce the following report, commit it to mcpster as `docs/security-hardening-report.md` on a new branch `chore/security-report`, and open a PR.

```markdown
# Security Hardening — Completion Report
**Date:** [ISO8601]
**Card:** security-hardening-supply-chain

## Pre-flight (Phase 0)
- op authenticated: yes/no
- gh authenticated: yes/no
- vercel authenticated: yes/no
- Repos found on disk: [list]
- Repos missing: [list or "none"]

## Audit Findings (Phase 1)
- .claude/settings.json anomalies: [list or "none found"]
- .vscode/tasks.json anomalies: [list or "none found"]
- Exotic subdeps found: [list or "none found"]
- Unexpected npm publish events: [list or "none found"]
- Vercel projects found: [list]

## Actions Completed
- [ ] Secret rotation: HUMAN confirmed / pending
- [ ] Renovate installed: [repos list]
- [ ] GitHub Actions SHA-pinned: [repos list, actions pinned per repo]
- [ ] pull_request_target restricted: [result or "no-op"]
- [ ] .env → 1Password migration: [repos list]
- [ ] SECURITY.md added: [repos list]
- [ ] MCP permissions audited: [findings or "no settings files found"]

## PRs Opened
[list of PR URLs, one per phase per repo]

## Remaining Open Items
[anything flagged for HUMAN follow-up — unknown MCP servers, tracked .env files, etc.]
```

---

## Done criteria

- [ ] Phase 0 pre-flight passes on all three tools
- [ ] Phase 1 audit findings reviewed and clean or flagged
- [ ] Secret rotation checklist confirmed complete by HUMAN
- [ ] All 6 applicable repos have `renovate.json` with `allowedRegistries` (not `blockExoticSubdeps`)
- [ ] All GitHub Actions `uses:` lines are SHA-pinned (verified via `gh api`, not asserted)
- [ ] `pull_request_target` in mdblu checked and either restricted or confirmed absent
- [ ] No real secrets in git-tracked `.env` files
- [ ] `SECURITY.md` present in all 6 repos
- [ ] MCP server permissions audited, `htllm` on allowlist, unknowns flagged
- [ ] Completion report committed as `docs/security-hardening-report.md` via `chore/security-report` PR