---
name: project-orchestrator
description: |
  Autonomous project orchestration transforming Claude from AI babysitter to AI manager. 
  Provides task decomposition, file-based state persistence, self-review loops, and failure 
  recovery for multi-step projects. Use when: planning projects, breaking down epics, tracking 
  progress across sessions, orchestrating autonomous execution, managing sprints, resuming 
  interrupted work, or when user wants Claude to work independently on larger tasks. 
  Coordinates with domain skills (3d-web-graphics-mastery, gas-debugger, ui-ux-mastery-modular) 
  for specialized work. Keywords: project planning, sprint planning, task breakdown, workflow 
  orchestration, autonomous execution, project state, epic decomposition, milestone tracking, 
  kanban, progress tracking, self-review, checkpoint, resume work, continue project, pick up 
  where we left off, autonomous coding, manager not babysitter.
---

# Project Orchestrator

Transform Claude into an autonomous project manager that decomposes complex work, maintains 
state across sessions, self-reviews outputs, and knows when to escalate to humans.

## Quick Reference

### When to Use This Skill
- Planning multi-step projects or features
- Breaking down epics into executable tasks
- Resuming work from a previous session
- Tracking progress on ongoing projects
- Autonomous execution of bounded tasks
- Coordinating work across multiple domain skills

### Core Workflow
```
INTAKE → DECOMPOSE → EXECUTE → REVIEW → COMPLETE
   │          │          │         │         │
   ▼          ▼          ▼         ▼         ▼
Load/Create  MECE      Route to   Self-    Archive
project     breakdown  domain    critique   state
state                  skills    + verify
```

## 1. Project Initialization

### Starting a New Project

When user requests a new project, create the state directory and files:

```bash
mkdir -p .orchestrator/checkpoints .orchestrator/knowledge
```

Create `.orchestrator/state.yaml` using the template in `templates/project-state.yaml`.

Create `.orchestrator/CONTEXT.md` for cold-start resume using `templates/CONTEXT.md`.

### Resuming an Existing Project

When user says "resume", "continue", "pick up where we left off":

1. Read `.orchestrator/CONTEXT.md` first (cold-start context)
2. Read `.orchestrator/state.yaml` for current state
3. Identify the current phase and active task
4. Load relevant checkpoint if context was lost
5. Continue from last known good state

**Critical**: Always read CONTEXT.md before state.yaml - it provides the mental model.

## 2. Task Decomposition

Apply MECE (Mutually Exclusive, Collectively Exhaustive) decomposition.

### Decomposition Rules

1. **Mutually Exclusive**: No overlapping scope between tasks
2. **Collectively Exhaustive**: All tasks together = complete goal
3. **Right-Sized**: Each task 30 min to 4 hours of human time
4. **Clear Boundaries**: Unambiguous start/end conditions
5. **Dependency-Aware**: Explicit hard/soft dependencies

### Task Complexity Estimation

| Human Time | Complexity | Autonomous? |
|------------|------------|-------------|
| <15 min    | Trivial    | ✅ Yes |
| 15 min - 1 hr | Small   | ✅ Yes with checkpoint |
| 1-4 hours  | Substantial | ⚠️ Decompose further |
| >4 hours   | Hard       | ❌ Must decompose |

**The 30-Minute Rule**: Tasks optimally suited for autonomous execution take ~30 minutes for humans.

### Domain Skill Routing

Assign tasks to appropriate domain skills:

| Domain | Skill | Trigger Keywords |
|--------|-------|------------------|
| 3D/WebGL | `3d-web-graphics-mastery` | Three.js, shader, particle, WebGL, R3F |
| Debugging | `gas-debugger` | bug, fix, security, vulnerability, debug |
| UI/UX | `ui-ux-mastery-modular` | design, component, accessibility, UI, UX |
| Orchestration | `project-orchestrator` | planning, decomposition, state |
| General | None (Claude handles) | Everything else |

For detailed decomposition patterns, see `references/task-decomposition.md`.

## 3. State Management

### State File Format

Use hybrid Markdown + YAML format for human readability and machine parsing.

**Location**: `.orchestrator/state.yaml`

```yaml
project:
  id: "proj_001"
  name: "Project Name"
  goal: "High-level project goal"
  created: "2025-01-03T10:00:00Z"
  
phase: "implementation"  # planning | implementation | review | complete
phase_progress: 0.45

tasks:
  - id: "TASK-001"
    name: "Clear imperative action"
    status: "completed"  # pending | in_progress | completed | verified | blocked
    assigned_skill: null
    started_at: "2025-01-03T10:00:00Z"
    completed_at: "2025-01-03T11:00:00Z"
    dependencies:
      hard: []
      soft: []
    acceptance_criteria:
      - "Criterion 1"
      - "Criterion 2"
    outputs:
      - path: "path/to/output"
        description: "What was created"

checkpoints:
  - id: "cp_001"
    created: "2025-01-03T11:00:00Z"
    trigger: "task_complete"
    description: "Completed schema design"
    
session:
  last_updated: "2025-01-03T12:00:00Z"
  context_usage: 0.45
  notes: "Current focus: authentication flow"
```

### State Transitions

```
Task Status Flow:
  pending ─────────────────────▶ in_progress ─▶ completed ─▶ verified
       │                              │              │
       ▼                              ▼              │
    blocked ◀─────────────────── needs_human ◀──────┘
   (dependency)                   (escalation)
```

### Checkpoint Triggers

Create checkpoints when:
- Task marked as completed
- Before risky/irreversible operations
- At major milestones
- Context usage exceeds 60%
- User explicitly requests

For detailed state patterns, see `references/state-management.md`.

## 4. Execution Loop

### For Each Task

```
1. READ current state from .orchestrator/state.yaml
2. IDENTIFY next pending task (respect dependencies)
3. UPDATE task status to "in_progress"
4. ROUTE to domain skill if assigned, else execute directly
5. EXECUTE the task
6. SELF-REVIEW the output (see Section 5)
7. UPDATE task status based on review result
8. CHECKPOINT if significant progress
9. REPEAT until all tasks complete or escalation needed
```

### Skill Hand-off Protocol

When routing to a domain skill:

1. **Context Package**: Pass task ID, relevant project context, acceptance criteria
2. **Execution Boundary**: Skill handles domain work independently
3. **Result Integration**: Read skill output, update project state, create checkpoint

Example delegation prompt:
```
I need to delegate TASK-003 (Build authentication flow) to the 
ui-ux-mastery-modular skill.

Context: This is part of [Project Name]. The auth flow should include 
login, registration, and password reset screens.

Acceptance Criteria:
- [ ] Login form with email/password
- [ ] Registration with validation
- [ ] Password reset flow
- [ ] Mobile-responsive design
```

## 5. Self-Review System

### Three-Phase Review

| Phase | When | Checks | On Failure |
|-------|------|--------|------------|
| Quick | After each task | Syntax, basic correctness | Auto-fix |
| Deep | After task group | Requirements met, quality | Iterate (max 3x) |
| Human | Before milestone | Matches intent, business value | Escalate |

### Critique Prompt Template

```
## Self-Review: [TASK_ID]

### Output to Review
[INSERT OUTPUT]

### Requirements
[ACCEPTANCE CRITERIA FROM TASK]

### Evaluation (be genuinely critical)
1. **Correctness** (40%): Does it actually work?
2. **Completeness** (30%): All requirements addressed?
3. **Quality** (20%): Production-ready or hacky?
4. **Safety** (10%): Any risks introduced?

### Required Format
{
  "verdict": "PASS" | "NEEDS_REVISION" | "ESCALATE",
  "confidence": 0.85,
  "issues": [{"severity": "critical|major|minor", "location": "...", "problem": "...", "fix": "..."}],
  "improvements": ["at least 2, even if minor"]
}
```

### Stopping Conditions

```python
MAX_ITERATIONS = 3
MIN_CONFIDENCE = 0.85
MIN_IMPROVEMENT = 0.05

def should_stop(iteration, current, previous):
    if iteration >= MAX_ITERATIONS: return True, "max_iterations"
    if current.verdict == "PASS" and current.confidence >= MIN_CONFIDENCE:
        return True, "approved"
    if previous and (current.confidence - previous.confidence) < MIN_IMPROVEMENT:
        return True, "diminishing_returns"
    return False, "continue"
```

For detailed self-review patterns, see `references/self-review.md`.

## 6. Human Escalation

### Escalation Triggers

Escalate when:
- Confidence <70% on critical decisions
- Action would be irreversible
- Conflicting requirements detected
- 3+ failed attempts on same task
- Security-sensitive operations
- Task complexity exceeds 4-hour threshold
- Ambiguous acceptance criteria

### HUMAN_INPUT.md Protocol

Create `.orchestrator/HUMAN_INPUT.md`:

```markdown
# Human Input Required

**Project**: [name]
**Task**: [current task]
**Time**: [timestamp]

## What Happened
[Clear explanation of the situation]

## Why I'm Stuck
[Specific reason human input is needed]

## Options Considered
1. [Option A]: Pros/Cons
2. [Option B]: Pros/Cons

## What I Need From You
[Specific question or decision]

## How to Resume
After providing input: "Continue with [your choice]"
```

## 7. Context Management

### Context Budget Allocation

| Component | Allocation |
|-----------|------------|
| System + instructions | 10-15% |
| Current task state | 10-20% |
| Working memory | 30-40% |
| Retrieved context | 20-30% |
| Output buffer | 10-20% |

### Compaction Triggers

At **70% context usage**:
1. Create checkpoint with full state
2. Summarize session (decisions, progress, blockers)
3. Update `.orchestrator/CONTEXT.md` with summary
4. Recommend: "Consider starting fresh session"

### What to Preserve vs. Discard

**Preserve**: User preferences, project context, architectural decisions, file paths, error patterns, unresolved issues.

**Discard**: Verbose tool outputs, intermediate reasoning, redundant context, temporal action details.

For detailed context patterns, see `references/context-engineering.md`.

## 8. Failure Handling

### Failure Detection

| Failure | Detection | Response |
|---------|-----------|----------|
| Context exhaustion | Usage >80% | Checkpoint, summarize, new session |
| Infinite loop | 3+ similar outputs | Break, try alternative |
| Task stuck | No progress 3 attempts | Mark blocked, escalate |
| State corruption | Validation fails | Restore from checkpoint |

### Loop Detection

Monitor output similarity between iterations. If Jaccard similarity >0.8 for 3 consecutive outputs, break the loop and try a different approach.

### Recovery Procedures

**Context Exhaustion**:
1. Create checkpoint
2. Generate session summary in CONTEXT.md
3. Instruct: "Start new session, say 'resume project'"

**Infinite Loop**:
1. Break execution
2. Log the pattern
3. Try alternative decomposition
4. If still stuck: escalate

**State Corruption**:
1. Attempt auto-repair
2. If fails, restore from latest checkpoint
3. Log what was lost

For detailed failure patterns, see `references/failure-recovery.md`.

## 9. Session Lifecycle

### New Session Checklist

```
[ ] Create .orchestrator/ directory
[ ] Initialize state.yaml from template
[ ] Create CONTEXT.md for resume capability
[ ] Decompose goal into tasks
[ ] Validate dependency DAG (no cycles)
[ ] Begin execution from first pending task
```

### Resume Session Checklist

```
[ ] Read CONTEXT.md (cold-start context)
[ ] Read state.yaml (current state)
[ ] Identify current phase and active task
[ ] Check for HUMAN_INPUT.md (pending input?)
[ ] Continue from last checkpoint if needed
[ ] Update session.last_updated timestamp
```

### Complete Session Checklist

```
[ ] Verify all tasks in "verified" status
[ ] Run final review of deliverables
[ ] Generate completion report
[ ] Archive state to .orchestrator/archive/
[ ] Update CONTEXT.md with project summary
```

## 10. Reference Files

Load these as needed for deeper implementation details:

| File | Contents |
|------|----------|
| `references/task-decomposition.md` | MECE, HTN, dependency DAGs, estimation |
| `references/state-management.md` | State schema, checkpoints, atomic updates |
| `references/self-review.md` | Critique prompts, stopping conditions |
| `references/skill-integration.md` | Domain skill coordination, Tree-sitter patterns |
| `references/failure-recovery.md` | Recovery procedures, defensive patterns |
| `references/context-engineering.md` | Compaction, memory, cold-start |
| `references/complexity-estimation.md` | Task sizing, escalation criteria |
| `references/prompt-patterns.md` | ReAct, CoT, ToT, thinking budgets |
| `references/git-worktree.md` | Safe isolation for autonomous execution |
| `references/claude-md-integration.md` | CLAUDE.md patterns, MCP integration |

## 11. Templates

| Template | Purpose |
|----------|---------|
| `templates/project-state.yaml` | Initial state file structure |
| `templates/CONTEXT.md` | Cold-start context template |
| `templates/task-definition.yaml` | Task definition schema |
| `templates/HUMAN_INPUT.md` | Human escalation template |
| `templates/todo.md` | Attention anchor template |

## 12. Scripts

Execute these for automation:

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/init_project.py` | Initialize project state | `python scripts/init_project.py "Project Name" --goal "..."` |
| `scripts/validate_state.py` | Check state consistency | `python scripts/validate_state.py` |
| `scripts/detect_loops.py` | Detect infinite loops | `python scripts/detect_loops.py <output1> <output2>` |
| `scripts/checkpoint.py` | Create/restore checkpoints | `python scripts/checkpoint.py create|restore` |
| `scripts/report.py` | Generate progress report | `python scripts/report.py` |
| `scripts/worktree.py` | Git worktree management | `python scripts/worktree.py create|list|merge|cleanup` |

## Quick Commands

| User Says | Action |
|-----------|--------|
| "Start project X" | Initialize state, decompose, begin |
| "Resume project" | Load CONTEXT.md + state, continue |
| "What's the status?" | Read state, report progress |
| "Checkpoint now" | Create checkpoint, update CONTEXT.md |
| "I'm stuck on..." | Create HUMAN_INPUT.md, pause |
| "Continue with X" | Read HUMAN_INPUT.md, apply decision, resume |

## Anti-Patterns to Avoid

- ❌ Storing state in LLM memory (use files)
- ❌ Tasks >4 hours without decomposition
- ❌ Skipping self-review phase
- ❌ Ignoring dependency order
- ❌ Continuing past 80% context usage
- ❌ Duplicating domain skill functionality
- ❌ Self-congratulatory reviews without evidence
- ❌ Manual editing of .orchestrator/ files
- ❌ Putting task state in CLAUDE.md

## 13. Git Worktree Isolation (Recommended)

For safe autonomous execution, use Git worktrees:

```bash
# Create isolated worktree for session
git worktree add .worktrees/session-$(date +%Y%m%d) -b orchestrator/session

# Work safely in isolation
cd .worktrees/session-YYYYMMDD

# Merge when complete (after human review)
git checkout main
git merge orchestrator/session --squash
```

**Benefits**: Changes don't affect main until reviewed. Safe rollback. Clear boundaries.

See `references/git-worktree.md` for full patterns.

## 14. CLAUDE.md Integration

The orchestrator complements CLAUDE.md—they serve different purposes:

| CLAUDE.md | Orchestrator |
|-----------|--------------|
| Project conventions | Task state |
| How to work | What to work on |
| Permanent | Session-scoped |
| Rarely updated | Frequently updated |

**Add to project CLAUDE.md**:
```markdown
## Project Orchestrator
This project uses project-orchestrator for task management.
- State: `.orchestrator/state.yaml`
- Resume: Read `.orchestrator/CONTEXT.md`
```

See `references/claude-md-integration.md` for full patterns.

## 15. Thinking Budget Hints

For complex analysis, use extended thinking triggers:

| Phrase | Budget | Use For |
|--------|--------|---------|
| "think" | Low | Simple tasks |
| "think hard" | Medium | Moderate analysis |
| "think harder" | High | Complex problems |
| "ultrathink" | Maximum | Deep architecture analysis |

**Example**: "Ultrathink about potential failure modes in this authentication flow."

See `references/prompt-patterns.md` for ReAct, CoT, ToT patterns.

## 16. MCP Server Awareness

If MCP servers are available, the orchestrator can leverage them:

| Server | Integration |
|--------|-------------|
| Notion MCP | Sync project docs |
| Linear MCP | Issue tracking |
| GitHub MCP | PR/issue management |

The orchestrator's file-based state works without MCP. MCP adds optional external sync.

## Success Metrics

| Metric | Target |
|--------|--------|
| Session continuity | 90%+ tasks resume correctly |
| Self-review catch rate | 70%+ issues caught before human |
| Skill routing accuracy | 95%+ correct skill selection |
| Context efficiency | <80% usage per session |
| Human escalations | <10% of tasks |

---

*Project Orchestrator v1.0 - Transform Claude from AI babysitter to AI manager*
