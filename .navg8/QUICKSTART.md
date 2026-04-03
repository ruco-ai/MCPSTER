# navg8 - Quick Start Guide

## Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) — authenticated
- [mdforge](https://github.com/ruco-ai/mdforge) — installed and on PATH

## Commands

| Command | Description |
|---------|-------------|
| `navg8 init` | Scaffold .navg8/ folder structure in current directory |
| `navg8 forge -i <n> [-t TEMPLATE]` | Generate a document from a GitHub issue (default: MISSION) |
| `navg8 forge -p "<prompt>" -t TEMPLATE` | Generate a document from a prompt |
| `navg8 add -i <n> [-t TEMPLATE]` | Post a generated document as a comment on an issue |
| `navg8 run -i <n>` | Create issue branch + implement mission + write MISSION-REPORT |
| `navg8 accept -i <n>` | Merge issue branch and close issue |
| `navg8 rerun -i <n>` | Re-run a failed mission with updated instructions |
| `navg8 abort -i <n>` | Abort a mission: delete branch and mark report as aborted |
| `navg8 rollback -i <n>` | Revert an accepted mission by reverting the merge commit |
| `navg8 reforge -i <n> [-t TEMPLATE]` | Re-forge a document incorporating feedback from the issue thread |
| `navg8 chat -i <n> [-t TEMPLATE]` | Open a generated document in Claude Code for interactive editing |
| `navg8 config [key] [value]` | Read or write navg8 configuration (stored in .navg8/config.json) |
| `navg8 pull-templates` | Install community templates (SPEC, ADR, README, etc.) from mdforge |

## Workflows

### Mission workflow (issue-driven)

```bash
# 1. Initialize navg8 in your project folder
navg8 init
# → .navg8/ scaffolded with outputs/, templates/ subfolders

# 2. Generate a MISSION document from the issue
navg8 forge -i 42
# → .navg8/outputs/MISSION/MISSION_0042.md

# 3. Post it as a comment on the issue (so the thread has full context)
navg8 add -i 42
# → posts MISSION_0042.md as comment on issue #42

# 4. Execute the mission (creates branch, generates report from thread)
navg8 run -i 42
# → branch issue_42 created
# → .navg8/outputs/MISSION-REPORT/MISSION-REPORT_0042.md

# 5. Accept (merge + close)
navg8 accept -i 42
# → issue_42 merged into main, issue #42 closed
```

### Spec workflow (prompt-driven)

```bash
navg8 forge -p "build a login system with OAuth" -t SPEC
navg8 add -i 7 -t SPEC
navg8 run -i 7
navg8 accept -i 7
```

### Using template variants

Pass `-t TEMPLATE` to `forge` and `add` to use a different document type:

```bash
navg8 forge -i 42 -t FEATURE   # generates a FEATURE doc instead of MISSION
navg8 forge -i 42 -t BUG       # generates a BUG report
navg8 forge -i 42 -t SPIKE     # generates a SPIKE/research doc
navg8 forge -i 42 -t REFACTOR  # generates a REFACTOR plan
```

## Output Structure

All generated files go under `.navg8/outputs/`:

```
.navg8/
├── templates/          ← project-level template overrides
├── outputs/
│   ├── MISSION/
│   │   └── MISSION_0042.md
│   ├── MISSION-REPORT/
│   │   └── MISSION-REPORT_0042.md
│   └── SPEC/
│       └── SPEC.md
└── QUICKSTART.md
```

## Templates

Owned templates (MISSION, MISSION-REPORT, BUG, SPIKE, REFACTOR, FEATURE) are installed to
`~/.navg8/templates/` by `navg8 init` and refreshed on every `navg8 init` run.

Run `navg8 pull-templates` to install community templates (SPEC, ADR, README, etc.) from mdforge.

### Overriding templates per project

Place a template file in `.navg8/templates/` to override it for this project only.
Templates are resolved in this order:
1. `.navg8/templates/<TEMPLATE>.md` (project override — highest priority)
2. `~/.navg8/templates/<TEMPLATE>.md` (user-global)
3. Bundled default shipped with navg8

```bash
# Example: override the MISSION template for this repo
cp ~/.navg8/templates/MISSION.md .navg8/templates/MISSION.md
# Edit .navg8/templates/MISSION.md to taste
```
