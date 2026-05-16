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
- [x] Dependency tooling: Renovate (`minimumReleaseAge` + `allowedRegistries`)
- [x] `htllm` is a known-good MCP server — on Phase 8 allowlist
- [x] Phase 4 branch name: `chore/pin-actions`
- [x] Phase 9 report destination: dedicated `chore/security-report` PR
- [x] Phase 0 pre-flight: yes — must exit 0 before any writes
- [x] Card serialization: `--serial`
- [x] Admin access to all 6 GitHub repos: confirmed
- [x] npm token rotation rights for `@ruco-ai`: confirmed
- [x] Repo paths declared in REPO_PATHS map below (not all siblings)
- [x] Renovate GitHub App: already installed on `@ruco-ai` org
- [x] Phase 6 `op run`: add as `dev:secure` / `deploy:secure` variants — do NOT replace `dev`
- [x] `NPM_TOKEN` in other repos: BOT scans all 6 in Phase 1e, adds findings to Phase 2 checklist
- [x] `jq` dependency: removed from pre-flight

**Before passing to BOT, confirm:**
- [ ] 1Password CLI installed and `op` authenticated locally (`op whoami` exits 0)

> This is the only remaining gate. Check this box, then pass to BOT.

> ⛔ **BLOCKED (2026-05-16, attempt 2):** BOT re-ran Phase 0 — `op whoami` still returns non-zero. `gh` ✓ (alexruco), `vercel` ✓ (alexruco), all 6 repos reachable. Only `op` is failing.
> Fix: run `op signin` (or `op signin --account <shorthand>`) in your terminal. Verify with `op whoami` before passing back to BOT. All other pre-requisites are satisfied.

---

## BOT — execute security hardening

> ⚠️ Run `--serial`. Phase order:
> 0 → 1 → (HUMAN: 2) → 3 → 4 → 5 → 6 → 7 → 8 → 9
> Do not start any phase until the previous one is confirmed complete.

> 📋 PR tracking: maintain a running `PR_LOG` array. Every time you open a PR,
> immediately append its URL to `PR_LOG`. Print the full list in Phase 9.

### Repo path map

```bash
# BOT: declare this at the start of every phase that iterates repos.
# Do not use ../$repo — use ${REPO_PATHS[$repo]} throughout.
declare -A REPO_PATHS=(
  [mcpster]="."
  [sitegrow]="$HOME/projects/sitegrow"
  [mdblu]="$HOME/projects/main/mdblu"
  [xtage]="$HOME/projects/main/xtage"
  [skillms]="$HOME/projects/main/skillms"
  [flowdeck]="$HOME/projects/main/flowdeck"
)
```

---

### Phase 0 — Pre-flight (exits 0 or aborts)

```bash
declare -A REPO_PATHS=(
  [mcpster]="."
  [sitegrow]="$HOME/projects/sitegrow"
  [mdblu]="$HOME/projects/main/mdblu"
  [xtage]="$HOME/projects/main/xtage"
  [skillms]="$HOME/projects/main/skillms"
  [flowdeck]="$HOME/projects/main/flowdeck"
)

echo "=== Phase 0: Pre-flight ==="
FAILED=0

# 1Password — no jq dependency
op whoami > /dev/null 2>&1 \
  && echo "PASS: 1Password — $(op whoami)" \
  || { echo "FAIL: op not authenticated. Run: op signin"; FAILED=1; }

# GitHub CLI
gh auth status > /dev/null 2>&1 \
  && echo "PASS: GitHub CLI — $(gh api user --jq .login 2>/dev/null || echo 'authenticated')" \
  || { echo "FAIL: gh not authenticated. Run: gh auth login"; FAILED=1; }

# Vercel CLI
vercel whoami > /dev/null 2>&1 \
  && echo "PASS: Vercel — $(vercel whoami)" \
  || { echo "FAIL: vercel not authenticated. Run: vercel login"; FAILED=1; }

[ $FAILED -eq 1 ] && { echo "Pre-flight FAILED. Fix above and retry."; exit 1; }

# Repo reachability (WARN only)
for repo in "${!REPO_PATHS[@]}"; do
  path="${REPO_PATHS[$repo]}"
  [ -d "$path/.git" ] \
    && echo "PASS: $repo → $path" \
    || echo "WARN: $repo not found at $path — will be skipped in all phases"
done

echo "=== Pre-flight complete ==="
```

**BOT: any FAIL → stop. WARN → log and continue.**

---

### Phase 1 — Audit (read-only)
> depends: Phase 0

```bash
declare -A REPO_PATHS=(
  [mcpster]="."
  [sitegrow]="$HOME/projects/sitegrow"
  [mdblu]="$HOME/projects/main/mdblu"
  [xtage]="$HOME/projects/main/xtage"
  [skillms]="$HOME/projects/main/skillms"
  [flowdeck]="$HOME/projects/main/flowdeck"
)

# 1a. .claude/settings.json — scan all repos
# Note: distinguish global (~/.claude/settings.json) from per-project files.
# Global file is at $HOME/.claude/settings.json — include it.
echo "=== 1a: .claude/settings.json ==="
cat "$HOME/.claude/settings.json" 2>/dev/null && echo "(global)"
for repo in "${!REPO_PATHS[@]}"; do
  path="${REPO_PATHS[$repo]}"
  [ -d "$path" ] || continue
  find "$path" -name "settings.json" -path "*/.claude/*" 2>/dev/null | while read f; do
    echo "--- $f ---"
    cat "$f"
  done
done

# 1b. .vscode/tasks.json — scan all repos
echo "=== 1b: .vscode/tasks.json ==="
for repo in "${!REPO_PATHS[@]}"; do
  path="${REPO_PATHS[$repo]}"
  [ -d "$path" ] || continue
  find "$path" -name "tasks.json" -path "*/.vscode/*" 2>/dev/null | while read f; do
    echo "--- $f ---"
    cat "$f"
  done
done

# 1c. Exotic subdeps in package-lock.json
echo "=== 1c: exotic subdeps ==="
for repo in "${!REPO_PATHS[@]}"; do
  path="${REPO_PATHS[$repo]}"
  if [ -f "$path/package-lock.json" ]; then
    hits=$(grep '"resolved"' "$path/package-lock.json" | grep -E '"(github:|git\+|file:|link:)')
    [ -n "$hits" ] && echo "FOUND in $repo: $hits" || echo "$repo: clean"
  else
    echo "$repo: no package-lock.json"
  fi
done

# 1d. npm publish history for @ruco-ai/mcpster
echo "=== 1d: npm publish history ==="
npm view @ruco-ai/mcpster time --json 2>/dev/null | tail -n 10 \
  || echo "WARN: could not fetch (private package — set NPM_TOKEN if needed)"

# 1e. NPM_TOKEN references across all repo CI workflows
echo "=== 1e: NPM_TOKEN in CI workflows ==="
for repo in "${!REPO_PATHS[@]}"; do
  path="${REPO_PATHS[$repo]}"
  [ -d "$path/.github/workflows" ] || continue
  grep -rl "NPM_TOKEN" "$path/.github/workflows/" 2>/dev/null | while read f; do
    echo "FOUND in $repo — $f:"
    grep -n "NPM_TOKEN" "$f"
  done
done
echo "BOT: include any repos found above in the Phase 2 npm token rotation checklist."

# 1f. Vercel projects (load-bearing for Phase 2 token scoping)
echo "=== 1f: Vercel projects ==="
vercel projects list
echo "BOT: this list is required before HUMAN can complete Phase 2. Print it clearly."
```

**BOT: print all findings before pausing for Phase 2. The Vercel project list (1f) must appear in the output.**

---

### Phase 2 — Rotate Secrets
> depends: Phase 1 complete + HUMAN review
> ⚠️ Do NOT automate. Print checklist and pause.

**BOT: fill in [FROM PHASE 1] placeholders from Phase 1 output, then print and pause:**

```
SECRET ROTATION CHECKLIST — execute manually

[x] npm publish token (@ruco-ai/mcpster)
    1. npmjs.com → Account → Access Tokens
    2. Delete existing automation token for @ruco-ai/mcpster
    3. Create new Automation token (CIDR-restrict to CI IP if possible)
    4. Update GitHub secret NPM_TOKEN in: mcpster + [repos found in Phase 1e, if any]

[x] GitHub token (mdblu PR automation)
    1. Secret name found in Phase 1 workflow scan: [FROM PHASE 1 — exact name]
    2. GitHub → Settings → Developer Settings → Personal Access Tokens
    3. Delete or regenerate; scope: repo (contents + pull-requests only)
    4. Update secret with exact name from step 1

[x] Vercel deploy token
    1. Projects in scope: [FROM PHASE 1f — list]
    2. vercel.com → Settings → Tokens → delete existing token
    3. Create new token scoped ONLY to projects listed above
    4. Update VERCEL_TOKEN in GitHub secrets for affected repos

[ ] Confirm all three complete before telling BOT to continue to Phase 3
```

---

### Phase 3 — Install Renovate (all 6 repos)
> depends: Phase 2 HUMAN confirmed

**BOT:**
1. Before writing any file: confirm the JSON does NOT contain `blockExoticSubdeps`. If it does, replace with `allowedRegistries`. This is the only validation needed.
2. For each repo: check if `package.json` exists; if not, skip.
3. If `renovate.json` already exists, diff against template and report — do not overwrite without reporting.
4. Commit on branch `chore/renovate-config`, open one PR per repo. Append each PR URL to `PR_LOG`.
5. Note in each PR: "Renovate App is installed on @ruco-ai — config takes effect on merge."

**renovate.json** (same for all 6 repos with `package.json`):

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

---

### Phase 4 — SHA-pin GitHub Actions (all repos)
> depends: Phase 3 complete
> branch: `chore/pin-actions`

**BOT:**
1. For each of the 6 repos, scan all `.github/workflows/*.yml` for `uses:` lines with floating tags (any `@v*`, `@main`, `@master`).

2. For each floating `uses: owner/repo@tag`, resolve to a commit SHA using the two-step dereference (required for annotated tags):

```bash
resolve_action_sha() {
  local owner_repo="$1"  # e.g. "actions/checkout"
  local tag="$2"         # e.g. "v4" or "v4.2.2"

  local ref_response
  ref_response=$(gh api "repos/${owner_repo}/git/ref/tags/${tag}" 2>/dev/null) || {
    echo "WARN: could not resolve ${owner_repo}@${tag} — skipping"
    return 1
  }

  local sha type
  sha=$(echo "$ref_response" | grep '"sha"' | head -1 | sed 's/.*"sha": *"\([^"]*\)".*/\1/')
  type=$(echo "$ref_response" | grep '"type"' | head -1 | sed 's/.*"type": *"\([^"]*\)".*/\1/')

  # Annotated tag: dereference to the commit it points to
  if [ "$type" = "tag" ]; then
    sha=$(gh api "repos/${owner_repo}/git/tags/${sha}" 2>/dev/null \
      | grep '"sha"' | tail -1 | sed 's/.*"sha": *"\([^"]*\)".*/\1/')
  fi

  echo "$sha"
}
```

3. Replace each verified floating tag: `uses: owner/repo@{SHA}  # {original-tag}`
4. If `resolve_action_sha` returns WARN for any action: leave unpinned, log the warning.
5. Commit to branch `chore/pin-actions`. Append each PR URL to `PR_LOG`. Open one PR per repo with changes.
6. Repos with no workflows or no floating tags: log and skip.

---

### Phase 5 — Restrict `pull_request_target` in mdblu
> depends: Phase 4 complete
> branch: `chore/pin-actions` (reuse; if already merged, create `chore/mdblu-permissions`)

```bash
path="$HOME/projects/main/mdblu"
grep -rl "pull_request_target" "$path/.github/workflows/" 2>/dev/null
```

**BOT:**
- No results → log "Phase 5 no-op" and continue.
- Results found:
  - Check for existing `permissions:` block at workflow or job level.
  - Job-level block exists → verify it has only `contents: read` and `pull-requests: write`. Report; do not modify.
  - No block exists → insert at workflow level after `on:`:
    ```yaml
    permissions:
      contents: read
      pull-requests: write
    ```
  - Commit, append PR URL to `PR_LOG`.

---

### Phase 6 — Migrate secrets to 1Password CLI
> depends: Phase 0 passed (op authenticated)
> branch: `chore/1password-secrets`

**BOT:** For each of the 6 repos:

1. Check for tracked `.env` files:
   ```bash
   cd "${REPO_PATHS[$repo]}" && git ls-files .env .env.local .env.production 2>/dev/null
   ```
   If any found: flag as `SECURITY ISSUE: tracked .env in $repo` — report to HUMAN, do not modify git history.

2. Check `.gitignore` for `.env`. If absent, append:
   ```
   .env
   .env.local
   .env.production
   ```

3. Scan `.env` files for secret patterns (`sk-`, `ghp_`, `npm_`, `vercel_`). Report file path + pattern only — do not print values.

4. Create `.env.template` if absent:
   ```bash
   # .env.template — placeholder paths only. No real values.
   # Local:  op run --env-file='.env.template' -- <command>
   # CI:     requires OP_SERVICE_ACCOUNT_TOKEN (biometric auth not supported in CI)
   # Vault:  run `op vault list` to find your vault name, update op:// paths below.
   ANTHROPIC_API_KEY=op://YOUR_VAULT/Anthropic/api_key
   RAILWAY_TOKEN=op://YOUR_VAULT/Railway/token
   NPM_TOKEN=op://YOUR_VAULT/npm/ruco-ai-token
   ```

5. In `package.json` `scripts`: add `dev:secure` and `deploy:secure` variants alongside
   existing scripts. Do NOT replace `dev` or `deploy`. Only add if the script exists
   and does not already have `op run`:
   ```json
   "dev:secure": "op run --env-file='.env.template' -- <original dev command>",
   "deploy:secure": "op run --env-file='.env.template' -- <original deploy command>"
   ```

6. Commit on `chore/1password-secrets`. Append each PR URL to `PR_LOG`.

---

### Phase 7 — Add SECURITY.md (all 6 repos)
> depends: Phase 6 complete
> branch: `chore/security-policy`

**BOT:** For each repo, create `SECURITY.md` at root. If it already exists, diff and report — do not overwrite without reporting. Commit, append each PR URL to `PR_LOG`.

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

Dependencies are managed via Renovate with a minimum release age of 3 days and registry
allowlist restricted to registry.npmjs.org. GitHub Actions are pinned to full commit SHAs.
No `.env` files with real secrets are committed to this repository.
```

---

### Phase 8 — Audit MCP Server Permissions
> depends: Phase 1a findings

**Note:** claude.ai remote integrations (Canva, Gmail, Google Drive, etc.) live at the
account level — they will NOT appear in `.claude/settings.json` and should not be flagged
as missing or unknown.

Using `.claude/settings.json` files from Phase 1a (both global and per-project):

**BOT:** Output a table for each file found:

| File | Server name | Permissions | Status |
|------|-------------|-------------|--------|
| ...  | ...         | ...         | KNOWN-GOOD / FLAG |

**Known-good list:**
```
mcpster CLI server
sitegrow/module-a, module-b, module-c, module-d, module-f
mdblu (use_template, propose_template_update, scaffold_hook)
xtage (read/write CODEINDEX, REPO.md, PROJECTINSIGHTS.md)
skillms (analyze_url, commit_skill, contribute_skill)
htllm (deploy_menus, deploy_pages, deploy_payload, deploy_theme_mods, get_website, install_to_wp)
```

Flag for HUMAN review (do not remove automatically):
- Server name not on list above
- Shell execution or filesystem write permissions outside expected scope

If no settings files found: log "no .claude/settings.json found — Phase 8 informational only."

---

### Phase 9 — Report
> depends: all phases complete
> branch: `chore/security-report`

**BOT:** Write `docs/security-hardening-report.md` in mcpster, commit on `chore/security-report`, open PR.

```markdown
# Security Hardening — Completion Report
**Date:** [ISO8601]
**Card:** security-hardening-supply-chain

## Pre-flight (Phase 0)
- op: pass/fail
- gh: pass/fail
- vercel: pass/fail
- Repos found: [list]
- Repos skipped: [list or "none"]

## Audit Findings (Phase 1)
- .claude/settings.json anomalies: [list or "none"]
- .vscode/tasks.json anomalies: [list or "none"]
- Exotic subdeps: [list or "none"]
- NPM_TOKEN in other repo workflows: [list or "none beyond mcpster"]
- npm publish history anomalies: [list or "none"]
- Vercel projects: [list from 1f]

## Actions Completed
- Secret rotation: HUMAN confirmed [ ] / pending [ ]
- Renovate: [repos list or skipped reason]
- GitHub Actions pinned: [repos + count of actions pinned per repo]
- pull_request_target: [restricted / no-op]
- 1Password migration: [repos list]
- SECURITY.md: [repos list]
- MCP audit: [findings or "no settings files found"]

## PRs Opened
[PR_LOG — full list accumulated across all phases]

## Open Items for HUMAN
[anything flagged: unknown MCP servers, tracked .env files, unverifiable SHAs, etc.]
```

---

## Done criteria

- [ ] Phase 0: all three tools authenticated
- [ ] Phase 1: findings reviewed
- [ ] Secret rotation: HUMAN confirmed complete
- [ ] `renovate.json` with `allowedRegistries` committed to all repos with `package.json`
- [ ] All `uses:` lines SHA-pinned via two-step dereference, or explicitly skipped with WARN
- [ ] `pull_request_target` checked in mdblu (restricted or confirmed absent)
- [ ] No tracked `.env` files with real secrets
- [ ] `SECURITY.md` in all 6 repos
- [ ] MCP permissions audited — `htllm` on allowlist, unknowns flagged, remote integrations not flagged
- [ ] Completion report committed via `chore/security-report` PR, `PR_LOG` complete
