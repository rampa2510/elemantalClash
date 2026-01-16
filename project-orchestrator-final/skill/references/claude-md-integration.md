# CLAUDE.md Integration Reference

How the orchestrator integrates with CLAUDE.md project configuration.

## Table of Contents
- [Understanding CLAUDE.md](#understanding-claudemd)
- [Memory Hierarchy](#memory-hierarchy)
- [Orchestrator + CLAUDE.md](#orchestrator--claudemd)
- [Template Patterns](#template-patterns)
- [MCP Server Integration](#mcp-server-integration)

---

## Understanding CLAUDE.md

CLAUDE.md is Claude Code's persistent memory system—a configuration file that loads into every conversation automatically.

### Key Characteristics

| Aspect | Behavior |
|--------|----------|
| **Loading** | Automatically loaded at session start |
| **Persistence** | Survives context compaction |
| **Scope** | Project-wide instructions |
| **Priority** | High (near system prompt level) |

### What CLAUDE.md Is For

✅ **Good uses**:
- Project conventions (naming, style)
- Key directories and architecture
- Common commands (build, test, deploy)
- Tech stack summary
- Important constraints

❌ **Not for**:
- Detailed procedures (use Skills)
- Large reference docs (use Skills/references)
- Session-specific state (use .orchestrator/)
- Task definitions (use state.yaml)

---

## Memory Hierarchy

Claude Code has a priority-ordered memory system:

```
Priority 1: Enterprise CLAUDE.md
  └── /Library/Application Support/ClaudeCode/CLAUDE.md (macOS)
  └── /etc/claude-code/CLAUDE.md (Linux)

Priority 2: User CLAUDE.md
  └── ~/.claude/CLAUDE.md

Priority 3: Project CLAUDE.md
  └── ./CLAUDE.md
  └── ./.claude/CLAUDE.md

Priority 4: Local Overrides
  └── ./CLAUDE.local.md (gitignored, personal)

Priority 5: Subtree CLAUDE.md
  └── ./src/CLAUDE.md (loaded when reading src/)
```

### Loading Behavior

- All levels load and merge
- Higher priority wins on conflicts
- Subtree files load dynamically when Claude reads those directories
- Local files for personal preferences (not committed)

---

## Orchestrator + CLAUDE.md

The orchestrator complements CLAUDE.md—they serve different purposes.

### Separation of Concerns

| Aspect | CLAUDE.md | Orchestrator State |
|--------|-----------|-------------------|
| Scope | Project conventions | Session/task state |
| Persistence | Permanent | Session-scoped |
| Contents | How to work | What to work on |
| Updates | Rare | Frequent |

### Recommended CLAUDE.md for Orchestrated Projects

```markdown
# Project: {{PROJECT_NAME}}

## Overview
{{One-sentence project description}}

## Key Directories
- `src/` - Source code
- `tests/` - Test files
- `docs/` - Documentation
- `.orchestrator/` - Project orchestrator state (managed)

## Tech Stack
- Frontend: {{tech}}
- Backend: {{tech}}
- Database: {{tech}}

## Commands
```bash
npm run dev      # Start development
npm run build    # Build for production
npm run test     # Run tests
```

## Conventions
- TypeScript strict mode
- Prettier for formatting
- Conventional commits

## Project Orchestrator
This project uses the project-orchestrator skill for task management.
- State: `.orchestrator/state.yaml`
- Resume: Read `.orchestrator/CONTEXT.md`
- Do NOT manually edit `.orchestrator/` files

## Additional Context
- Architecture: @docs/architecture.md
- API: @docs/api.md
```

### What NOT to Put in CLAUDE.md

```markdown
# DON'T DO THIS

## Current Tasks
- Build login page (in progress)  ← This belongs in .orchestrator/state.yaml
- Fix bug #123

## Session Notes
- Decided to use React ← This belongs in .orchestrator/decisions.yaml
- User prefers tabs over spaces
```

---

## Template Patterns

### Minimal CLAUDE.md

For simple projects:

```markdown
# Project Name

Brief description.

## Tech Stack
{{Stack}}

## Commands
{{Key commands}}
```

### Standard CLAUDE.md

For most projects:

```markdown
# {{Project Name}}

{{Description}}

## Key Directories
| Directory | Purpose |
|-----------|---------|
| `src/` | Source code |
| `tests/` | Tests |

## Tech Stack
- {{Category}}: {{Technology}}

## Commands
```bash
{{command}} # {{description}}
```

## Conventions
- {{Convention 1}}
- {{Convention 2}}

## Additional Context
- @docs/architecture.md
- @docs/api.md
```

### Orchestrator-Aware CLAUDE.md

For projects using the orchestrator:

```markdown
# {{Project Name}}

{{Description}}

## Quick Start
1. Check `.orchestrator/CONTEXT.md` for current state
2. Run `python .orchestrator/scripts/report.py` for status
3. Resume with "continue project"

## Directories
- `src/` - Source code
- `.orchestrator/` - Project state (auto-managed)
- `.worktrees/` - Git worktrees for sessions (gitignored)

## Tech Stack
{{Stack}}

## Commands
{{Commands}}

## Conventions
{{Conventions}}

## Orchestration Notes
- Tasks tracked in `.orchestrator/state.yaml`
- Checkpoints in `.orchestrator/checkpoints/`
- Decision log in `.orchestrator/decisions.yaml`
- Never manually edit orchestrator files

## Domain Skills Available
- `3d-web-graphics-mastery` - 3D/WebGL/Three.js
- `gas-debugger` - Code debugging and security
- `ui-ux-mastery-modular` - UI/UX design patterns

## Context
@docs/architecture.md
@docs/api.md
```

### Import Syntax

Use `@path` to reference detailed docs without bloating CLAUDE.md:

```markdown
## API Documentation
@docs/api/authentication.md
@docs/api/users.md
@docs/api/products.md
```

Claude reads these on demand, not upfront.

---

## MCP Server Integration

### Understanding MCP vs Skills

| Component | Purpose | Integration |
|-----------|---------|-------------|
| **MCP Servers** | External connectivity | Tool definitions |
| **Skills** | Domain expertise | Procedural knowledge |
| **CLAUDE.md** | Project config | Always-on context |
| **Orchestrator** | Task management | File-based state |

### MCP Servers for Orchestration

If you have MCP servers available:

```markdown
# In CLAUDE.md

## Connected Services (MCP)
- **Notion**: Project docs via mcp-notion
- **Linear**: Issue tracking via mcp-linear
- **GitHub**: Code management via mcp-github

## Orchestrator + MCP Workflow
1. Orchestrator decomposes tasks (file-based)
2. MCP syncs tasks to external tools (optional)
3. Progress tracked in both systems
```

### MCP Server Recommendations

| Server | Use Case |
|--------|----------|
| `atlas-mcp-server` | Project/task management |
| `mcp-notion` | Documentation sync |
| `mcp-linear` | Issue tracking |
| `mcp-github` | PR/issue management |
| `mcp-filesystem` | File operations |

### Claude Max Constraints

For Claude Max users (no API):

- MCP works via Claude Desktop (stdio transport)
- Configure in `claude_desktop_config.json`
- Remote MCP via Settings → Connectors
- Skills work everywhere (file-based)

---

## Configuration Best Practices

### 1. Keep CLAUDE.md Under 100 Lines

LLMs follow ~150-200 instructions reliably. CLAUDE.md competes with system prompt.

### 2. Use Progressive Disclosure

```markdown
## API
Basic auth: Bearer token

For full API docs: @docs/api/README.md
```

### 3. Version Control CLAUDE.md

- Commit CLAUDE.md to repo
- Use CLAUDE.local.md for personal preferences
- Add CLAUDE.local.md to .gitignore

### 4. Update CLAUDE.md Rarely

- Project conventions change slowly
- Task state changes frequently
- Don't mix the two

### 5. Test CLAUDE.md Effectiveness

Ask Claude:
- "What's our coding style?"
- "How do I run tests?"
- "What's the project architecture?"

If Claude can't answer from CLAUDE.md, improve it.

---

## Troubleshooting

### CLAUDE.md Not Loading

Check file location:
```bash
# Should be at project root
ls -la CLAUDE.md
# Or in .claude directory
ls -la .claude/CLAUDE.md
```

### Conflicting Instructions

If CLAUDE.md conflicts with orchestrator:
- CLAUDE.md = project conventions (stable)
- Orchestrator = task state (dynamic)
- Orchestrator follows CLAUDE.md conventions

### Too Much Context

If CLAUDE.md is too large:
1. Move details to referenced files (@path)
2. Use subtree CLAUDE.md for module-specific rules
3. Consider Skills for procedural knowledge

### CLAUDE.md vs Skill Confusion

| If it's about... | Put it in... |
|------------------|--------------|
| Project naming conventions | CLAUDE.md |
| How to decompose tasks | Skill |
| Build commands | CLAUDE.md |
| Self-review process | Skill |
| Tech stack | CLAUDE.md |
| Recovery procedures | Skill |
