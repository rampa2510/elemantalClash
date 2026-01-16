# R-002 Findings: Claude Skills System Mastery

**Research Date:** 2026-01-02  
**Status:** ✅ COMPLETE  
**Sources:** Official Anthropic docs, engineering blog, community skills, GitHub repos

---

## Executive Summary

Claude Skills are modular, self-contained packages that extend Claude's capabilities through specialized instructions, scripts, and resources. The system uses **progressive disclosure** to efficiently load context only when needed. Skills work across Claude.ai, Claude Code, and the API without modification.

**Key Insight for Our Orchestrator:** Skills are prompt injection mechanisms, not executables. Our orchestrator skill should leverage this by front-loading planning logic and using progressive disclosure for detailed reference material.

---

## Official Folder Structure

### Minimal Structure
```
skill-name/
└── SKILL.md           # REQUIRED - Core instructions with YAML frontmatter
```

### Standard Structure (Recommended)
```
skill-name/
├── SKILL.md           # Core instructions (keep under 500 lines)
├── scripts/           # Executable code (Python/Bash/etc.)
│   ├── helper.py
│   └── validate.sh
├── references/        # Documentation for context loading
│   ├── api-reference.md
│   └── patterns.md
└── assets/            # Templates, icons, fonts, data files
    └── template.json
```

### Complete Structure (Complex Skills)
```
skill-name/
├── SKILL.md                    # Main entry point
├── FORMS.md                    # Domain-specific guide (loaded as needed)
├── REFERENCE.md                # API/technical reference
├── examples.md                 # Usage examples
├── scripts/
│   ├── analyze.py              # Utility script (executed, not read)
│   ├── generate.py             # Generation script
│   └── validate.py             # Validation script
├── references/
│   ├── conventions.md          # Project conventions
│   ├── architecture.md         # Architecture documentation
│   └── troubleshooting.md      # Error handling guide
└── assets/
    ├── templates/
    │   └── report-template.md
    └── icons/
        └── logo.svg
```

---

## SKILL.md File Format

### Required Components

```markdown
---
name: skill-name-here
description: What this skill does and when to use it. Include trigger contexts, file types, task types, and keywords.
---

# Skill Title

## Instructions
[Step-by-step instructions for Claude to follow]

## Examples
[Concrete input/output examples]
```

### Optional YAML Frontmatter Fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | **Required.** Human-friendly identifier (64 chars max) | `project-orchestrator` |
| `description` | **Required.** Trigger description (200 chars max) | `Manage complex projects autonomously...` |
| `allowed-tools` | Restrict available tools when skill is active | `Read, Grep, Glob, Bash` |
| `license` | License identifier | `MIT` |

### SKILL.md Best Practices

1. **Keep under 500 lines** - Split content into separate files if approaching limit
2. **Frontmatter is discovery** - Name and description determine when skill triggers
3. **Write for Claude, not humans** - Use imperative instructions
4. **Include clear triggers** in description - "Use when...", "Triggers on..."
5. **Reference supporting files explicitly** - Tell Claude where to find additional info
6. **Use checklists** for complex workflows - Claude can copy and track progress

### Example SKILL.md (Our Orchestrator)

```markdown
---
name: project-orchestrator
description: Autonomous project management for complex development tasks. Use when user mentions 'orchestrate', 'manage project', 'plan and execute', multi-step development workflows, or asks to build features autonomously. Enables manager-not-babysitter workflow.
---

# Project Orchestrator

## Activation
Announce: "I'm loading the project-orchestrator skill to manage this autonomously."

## First Actions
1. Check for existing PROJECT_STATE.md in project root
2. If exists, read and resume from last checkpoint
3. If not, initialize new project state

## Core Workflow
[See references/workflow.md for detailed phases]

## State Management
[See references/state-schema.md for state file format]

## Quality Gates
[See references/quality-gates.md for review criteria]
```

---

## Auto-Activation Mechanics

### How Skill Discovery Works

1. **Startup Phase:** Claude scans all skill directories:
   - `~/.claude/skills/` (user skills)
   - `.claude/skills/` (project skills)
   - Plugin-provided skills
   - Built-in skills

2. **Metadata Loading:** Only name + description loaded (~100 tokens per skill)

3. **Request Matching:** Claude semantically matches user request against descriptions

4. **Full Loading:** When matched, Claude invokes Skill tool which:
   - Loads complete SKILL.md body
   - Makes skill directory available for file access
   - Claude can then read supporting files as needed

### Activation Triggers

Skills activate when the user's request semantically matches the `description` field:

```yaml
# Good description (specific triggers)
description: Create and edit Word documents (.docx files). Use when creating documents, modifying content, working with tracked changes, or adding comments.

# Bad description (too vague)
description: Helps with documents.
```

### Making Activation Reliable

1. **Include explicit keywords** users would use
2. **List file types** if relevant (`.docx`, `.pdf`, etc.)
3. **List task types** (creating, editing, analyzing, etc.)
4. **Include trigger phrases** ("Use when...", "Triggers on...")

### Can Skills Chain/Call Other Skills?

**Not directly.** Skills cannot explicitly invoke other skills. However:
- Claude can use multiple skills together automatically
- Skills can reference patterns from other skills if documented
- Subagents can have skills pre-loaded via `skills:` field

---

## Resources/ and Templates/ Folders

### How Claude Accesses Supporting Files

```markdown
# In SKILL.md
## Form Processing
When processing PDF forms, read `references/form-fields.md` for field mappings.

# Claude will then:
# 1. Determine it needs form field info
# 2. Use Read tool to load references/form-fields.md
# 3. Continue with task using loaded context
```

### File Types Supported

| Type | Usage | Token Cost |
|------|-------|------------|
| `.md` | Documentation, references | Read into context |
| `.py` | Python scripts | Executed, output only |
| `.sh` | Shell scripts | Executed, output only |
| `.json` | Data files, templates | Read or parsed |
| `.yaml` | Configuration | Read into context |
| `.txt` | Plain text | Read into context |
| Any binary | Templates, assets | Used by scripts |

### Size/Complexity Limits

- **SKILL.md:** Keep under 500 lines for optimal performance
- **Individual files:** No hard limit, but context window applies
- **Total skill size:** Practical limit based on context window (~200k tokens)
- **Scripts:** Execute without loading source; only output consumes tokens

### Progressive Disclosure Pattern

```
Level 1: Metadata (always loaded, ~100 tokens)
   └── name + description only

Level 2: SKILL.md body (loaded when triggered, <5k tokens)
   └── Core instructions, workflow overview

Level 3: Supporting files (loaded as needed, unlimited)
   └── Detailed references, API docs, examples
   └── Scripts executed without reading source
```

---

## Cross-Interface Compatibility

### Where Skills Work

| Interface | Skill Location | Notes |
|-----------|---------------|-------|
| Claude.ai Web | Settings > Capabilities | Upload as .zip |
| Claude.ai API | `/v1/skills` endpoint | Programmatic access |
| Claude Code CLI | `.claude/skills/` or `~/.claude/skills/` | Filesystem-based |
| Claude Desktop | Settings > Skills | Upload as .zip |

### Interface Differences

| Feature | Claude.ai | Claude Code | API |
|---------|-----------|-------------|-----|
| Script execution | ✅ Sandboxed | ✅ Full access | ✅ Container |
| File system access | ✅ Limited | ✅ Full | ✅ Container |
| Installation method | Upload .zip | Filesystem | API call |
| Auto-discovery | ✅ | ✅ | ✅ |
| Subagent integration | Limited | Full | Full |

### Cross-Platform Tips

1. **Use relative paths** in scripts - works everywhere
2. **Avoid hardcoded paths** - use environment variables
3. **Test on target platform** before distribution
4. **Package as .zip** for Claude.ai, use directory for Claude Code

---

## Community Patterns Worth Adopting

### 1. Progressive Disclosure Architecture
**Source:** Anthropic's official skills (pdf, docx, pptx)

```
skill/
├── SKILL.md           # Overview + quick start
├── REFERENCE.md       # Full API reference (loaded when needed)
├── FORMS.md           # Specialized guide (loaded for form tasks)
└── scripts/           # Utilities (executed, not loaded)
```

**Why it works:** Keeps initial context lean, loads detail only when relevant.

### 2. Checklist-Based Progress Tracking
**Source:** obra/superpowers, skill-creator

```markdown
## Task Progress
Copy and update this checklist:
- [ ] Step 1: Initialize state file
- [ ] Step 2: Analyze requirements  
- [ ] Step 3: Create implementation plan
- [ ] Step 4: Execute plan
- [ ] Step 5: Review and validate
```

**Why it works:** Claude can literally copy this and check items off, providing visible progress.

### 3. Role/Persona Switching
**Source:** wshobson/agents

```markdown
## Builder Phase
You are a senior developer focused on clean implementation.

## Reviewer Phase  
Switch to QA engineer mindset. Be critical and thorough.
```

**Why it works:** Different phases require different "thinking modes."

### 4. Explicit File References
**Source:** Anthropic best practices

```markdown
## When to Load Additional Context
- For API details → read `references/api.md`
- For error handling → read `references/errors.md`
- For examples → read `references/examples.md`
```

**Why it works:** Claude knows where to look without loading everything upfront.

### 5. Validation Scripts
**Source:** pdf skill, docx skill

```markdown
## Validation
Run `scripts/validate.py <output-file>` to verify output correctness.
```

**Why it works:** Deterministic validation without consuming context tokens.

---

## Anti-Patterns to Avoid

### 1. Monolithic SKILL.md
**Problem:** Everything in one 2000+ line file  
**Why it fails:** Consumes entire context window, slow loading  
**Fix:** Split into SKILL.md + supporting files

### 2. Vague Descriptions
**Problem:** `description: Helps with stuff`  
**Why it fails:** Won't trigger reliably  
**Fix:** Include specific triggers, file types, task types

### 3. Hardcoded Paths
**Problem:** `/Users/john/projects/myapp/...`  
**Why it fails:** Breaks on other systems  
**Fix:** Use relative paths or environment variables

### 4. Reading Scripts into Context
**Problem:** "First, read the script at scripts/helper.py..."  
**Why it fails:** Wastes tokens; should execute, not read  
**Fix:** "Run `python scripts/helper.py <args>`"

### 5. No Progress Indicators
**Problem:** Long workflows with no checkpoints  
**Why it fails:** Can't resume if interrupted, user has no visibility  
**Fix:** Add checklist progress tracking

### 6. Over-Specification
**Problem:** Micro-managing every possible edge case  
**Why it fails:** Claude is capable; too many rules degrade performance  
**Fix:** Provide principles, not exhaustive rules

### 7. Missing Examples
**Problem:** Instructions without concrete examples  
**Why it fails:** Ambiguous interpretation  
**Fix:** Include input/output examples

### 8. Auxiliary Documentation Bloat
**Problem:** README.md, CONTRIBUTING.md, setup guides in skill  
**Why it fails:** Skills should contain only what Claude needs  
**Fix:** Put human docs elsewhere; skills are for Claude

---

## Optimal Structure for Our Orchestrator Skill

Based on research, here's the recommended structure:

```
project-orchestrator/
├── SKILL.md                     # Core activation + workflow overview (~300 lines)
│
├── references/
│   ├── workflow-phases.md       # Detailed phase instructions
│   ├── state-schema.md          # PROJECT_STATE.md format
│   ├── quality-gates.md         # Review criteria and checklists
│   ├── task-decomposition.md    # How to break down tasks
│   ├── failure-recovery.md      # Error handling patterns
│   └── integration-guide.md     # Working with other skills
│
├── scripts/
│   ├── init_project.py          # Initialize PROJECT_STATE.md
│   ├── validate_state.py        # Validate state file integrity
│   └── generate_report.py       # Generate progress report
│
├── templates/
│   ├── PROJECT_STATE.md         # State file template
│   ├── TASK_SPEC.md             # Task specification template
│   └── REVIEW_CHECKLIST.md      # Quality review template
│
└── assets/
    └── examples/
        ├── simple-project.md    # Example: simple feature
        └── complex-project.md   # Example: multi-feature project
```

### Key Design Decisions

1. **SKILL.md stays lean** - Overview only, references detailed docs
2. **Checklists everywhere** - Enable progress tracking
3. **Templates provided** - Consistent state file format
4. **Scripts for validation** - Deterministic state checking
5. **Progressive disclosure** - Load detail only when needed
6. **Examples included** - Show concrete usage patterns

---

## YAML Frontmatter for Our Skill

```yaml
---
name: project-orchestrator
description: Autonomous project orchestration for complex development workflows. Use when user wants to build features autonomously, manage multi-step projects, plan and execute development tasks, or mentions 'orchestrate', 'autonomous', 'manager not babysitter'. Enables checkpoint-based resumable workflows with quality gates and self-review.
allowed-tools: Read, Write, Bash, Grep, Glob
---
```

### Description Analysis
- **What it does:** Autonomous project orchestration
- **When to use:** build features autonomously, multi-step projects, plan and execute
- **Keywords:** orchestrate, autonomous, manager not babysitter
- **Capabilities hint:** checkpoint-based, resumable, quality gates, self-review

---

## Key Insights for Our Orchestrator

1. **Progressive disclosure is mandatory** - Our skill will have substantial reference material; structure for on-demand loading

2. **Description is the activation trigger** - Craft carefully to ensure reliable triggering on relevant requests

3. **Checklists enable resumability** - Claude can copy progress trackers and update them, providing natural checkpoints

4. **Scripts don't consume context** - Use Python/Bash for state validation, report generation, etc.

5. **Templates ensure consistency** - Provide PROJECT_STATE.md template so format is always correct

6. **Role switching enables self-review** - Can instruct Claude to shift from "builder" to "reviewer" mindset

7. **Cross-platform works automatically** - Same skill structure works in Claude.ai and Claude Code

---

## Next Steps

With R-002 complete, proceed to:
- **R-003:** State Persistence Patterns (design PROJECT_STATE.md schema)
- **R-004:** Self-Review & Critique Patterns (implement quality gates)
- **R-005:** RAG Alternatives for Max Users (file-based project understanding)
