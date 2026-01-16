# Unified Architecture: Project Orchestrator Skill

## Implementation Blueprint for Claude Max Users

This document synthesizes all research findings (R-001 through R-008 plus supplements) into a concrete, implementable architecture for the Autonomous Project Orchestrator Skill.

---

## 1. Skill Structure

```
project-orchestrator/
├── SKILL.md                              # 8-12KB core instructions
├── references/
│   ├── task-decomposition.md             # MECE + HTN patterns
│   ├── state-schema.md                   # Complete state format spec
│   ├── self-review-prompts.md            # Critique prompt templates
│   ├── skill-integration.md              # How to work with domain skills
│   ├── failure-recovery.md               # Recovery procedures
│   └── examples.md                       # Concrete workflow examples
├── scripts/
│   ├── init_project.py                   # Initialize project state
│   ├── validate_state.py                 # Check state consistency
│   ├── detect_loops.py                   # Infinite loop detection
│   ├── checkpoint.py                     # Create/restore checkpoints
│   └── report.py                         # Generate progress report
└── templates/
    ├── project-state.yaml                # Initial state template
    ├── task-definition.yaml              # Task schema template
    └── session-log.md                    # Session log format
```

---

## 2. SKILL.md Specification

```yaml
---
name: project-orchestrator
description: |
  Autonomous project orchestration with task decomposition, state persistence, 
  self-review, and failure recovery. Transforms Claude from AI babysitter to 
  AI manager. Use when planning multi-step projects, breaking down complex work, 
  tracking progress across sessions, orchestrating autonomous execution, or 
  managing sprints. Coordinates with domain skills (3d-web-graphics-mastery, 
  gas-debugger, ui-ux-mastery-modular) for specialized work. Keywords: project 
  planning, sprint planning, task breakdown, workflow orchestration, autonomous 
  execution, project state, epic decomposition, milestone tracking, kanban, 
  progress tracking, self-review, checkpoint, resume work.
---
```

---

## 3. Core Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT ORCHESTRATOR FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐ │
│  │  INTAKE  │───▶│ DECOMPOSE │───▶│ EXECUTE  │───▶│  REVIEW  │ │
│  └──────────┘    └───────────┘    └──────────┘    └──────────┘ │
│       │               │                │               │        │
│       ▼               ▼                ▼               ▼        │
│  Load/Create     Break into      For each task:   Self-critique │
│  project state   MECE tasks      1. Route to      with external │
│                                     domain skill   validation    │
│                                  2. Execute                      │
│                                  3. Update state                 │
│                                  4. Checkpoint                   │
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐                 │
│  │ COMPLETE │◀───│  ITERATE  │◀───│ HUMAN?   │                 │
│  └──────────┘    └───────────┘    └──────────┘                 │
│       │               │                │                        │
│       ▼               ▼                ▼                        │
│  Archive state   Fix issues      Escalate with                  │
│  Generate report Continue loop   HUMAN_INPUT.md                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. State Management

### State File Format (Hybrid Markdown + YAML)

```markdown
# Project: [Project Name]
Session: [session_id] | Updated: [timestamp] | Phase: [current_phase]

## Project Context
```yaml
project_id: "proj_001"
name: "PropHit v2 MVP"
created: "2025-01-03T10:00:00Z"
goal: |
  Build fractional real estate ownership platform MVP with 
  Aadhaar/PAN verification and LLP contract generation.
constraints:
  - Claude Max only (no API)
  - File-based state persistence
  - Coordinate with existing skills
```

## Current Phase
```yaml
phase: "implementation"  # planning | implementation | review | complete
phase_started: "2025-01-03T12:00:00Z"
phase_progress: 0.45
```

## Tasks
```yaml
tasks:
  - id: "TASK-001"
    name: "Design database schema"
    status: "completed"
    assigned_skill: null  # Orchestrator handles
    started_at: "2025-01-03T10:15:00Z"
    completed_at: "2025-01-03T11:00:00Z"
    outputs:
      - path: "docs/schema.md"
        
  - id: "TASK-002"
    name: "Build authentication flow"
    status: "in_progress"
    assigned_skill: "ui-ux-mastery-modular"
    started_at: "2025-01-03T11:05:00Z"
    dependencies:
      hard: ["TASK-001"]
      
  - id: "TASK-003"
    name: "Implement 3D property viewer"
    status: "pending"
    assigned_skill: "3d-web-graphics-mastery"
    dependencies:
      hard: ["TASK-002"]
```

## Checkpoints
```yaml
checkpoints:
  - id: "cp_001"
    created: "2025-01-03T11:00:00Z"
    trigger: "task_complete"
    description: "Completed schema design"
```

## Session Log
- [10:00] Session started
- [10:15] Task decomposition complete: 8 tasks identified
- [10:16] Started TASK-001: Design database schema
- [11:00] TASK-001 completed, checkpoint created
- [11:05] Started TASK-002: Build authentication flow
```

### State Transitions

```
Task Status Flow:
  pending → in_progress → complete → verified
       ↓
    blocked (if dependency not met)
       ↓
    needs_human (if escalated)
```

---

## 5. Task Decomposition

### Decomposition Prompt Template

```markdown
## Task Decomposition for: [PROJECT NAME]

### Goal
[FULL PROJECT GOAL]

### Apply MECE Decomposition

Break this into tasks that are:
1. **Mutually Exclusive** - No overlapping scope
2. **Collectively Exhaustive** - All tasks together = complete goal
3. **Right-Sized** - Each task: 30 min to 4 hours
4. **Dependency-Aware** - Clear what must come first

### Domain Skill Assignment

Assign each task to the appropriate skill:
- 3D/WebGL/Shaders → `3d-web-graphics-mastery`
- Debugging/Security → `gas-debugger`
- UI/UX Design → `ui-ux-mastery-modular`
- Project Management → `project-orchestrator` (self)
- General Coding → No skill (Claude handles)

### Output Format
[YAML task list per state schema]

### Validation
After generating tasks:
1. ✓ No gaps between tasks
2. ✓ No overlapping responsibilities
3. ✓ Dependencies form valid DAG
4. ✓ Each task has clear acceptance criteria
```

---

## 6. Self-Review System

### Three-Phase Review

| Phase | When | What's Checked | Action on Failure |
|-------|------|----------------|-------------------|
| **Quick Check** | After each task | Syntax, basic correctness | Auto-fix, continue |
| **Deep Review** | After task group | Meets requirements, quality | Iterate (max 3x) |
| **Human Review** | Before major milestone | Matches intent, business value | PAUSE + HUMAN_INPUT.md |

### Critique Prompt

```markdown
## Self-Review: [TASK_ID]

### Output to Review
[INSERT OUTPUT]

### Requirements
[INSERT ACCEPTANCE CRITERIA]

### Evaluation Dimensions
1. **Correctness** (40%): Does it work?
2. **Completeness** (30%): All requirements met?
3. **Quality** (20%): Production-ready?
4. **Safety** (10%): Any risks?

### Response Format
```json
{
  "verdict": "PASS | NEEDS_REVISION | ESCALATE",
  "confidence": 0.85,
  "issues": [
    {
      "severity": "critical | major | minor",
      "location": "where",
      "problem": "what",
      "fix": "how"
    }
  ],
  "tests_performed": ["list of verifications done"],
  "improvements_possible": ["at least 2, even if minor"]
}
```

### Critical Rules
- You MUST find at least 2 potential improvements
- If claiming PASS with 0 issues, explain exact tests run
- Never use: "elegant", "comprehensive", "robust" without evidence
```

### Stopping Conditions

```python
STOP_CONDITIONS = {
    "max_iterations": 3,
    "min_confidence": 0.85,
    "min_improvement": 0.05,
    "escalate_after_failures": 2
}
```

---

## 7. Skill Integration Protocol

### Domain Skill Router

```markdown
## Skill Routing Logic

When a task is ready for execution:

1. **Check assigned_skill** in task definition
   - If specified, delegate to that skill
   
2. **Auto-detect domain** from task content:
   - 3D | WebGL | Three.js | shader | particle → 3d-web-graphics-mastery
   - debug | bug | security | vulnerability | fix → gas-debugger
   - UI | UX | design | component | accessibility → ui-ux-mastery-modular
   
3. **Orchestrator handles**:
   - Task decomposition
   - State management
   - Coordination
   - Progress tracking
   - Self-review meta-process

4. **No skill needed**:
   - General coding tasks
   - Documentation
   - Configuration
```

### Hand-off Protocol

```markdown
## Delegating to Domain Skill

When routing to a domain skill:

1. **Context Package**
   - Task ID and name
   - Relevant project context (from state)
   - Acceptance criteria
   - Dependencies already completed

2. **Execution Boundary**
   - Skill handles domain work
   - Skill may use its own state files
   - Skill returns completion signal

3. **Result Integration**
   - Orchestrator receives output
   - Updates project state
   - Creates checkpoint if significant
   - Triggers next task or review

## Example Delegation

"I need to delegate TASK-003 (Implement 3D property viewer) to the 
3d-web-graphics-mastery skill. 

Context: This is part of PropHit v2, a real estate platform. 
The viewer should show properties in 3D with rotation controls.
It should use React Three Fiber and integrate with our React app.

Acceptance Criteria:
- [ ] 3D model loading (glTF)
- [ ] Orbit controls
- [ ] Mobile-responsive
- [ ] Performance: 60fps on mid-tier devices"
```

---

## 8. Failure Handling

### Failure Taxonomy

| Failure Type | Detection | Response |
|--------------|-----------|----------|
| Context exhaustion | Token count > 80% | Checkpoint, summarize, new session |
| Infinite loop | 3+ similar outputs | Break loop, escalate |
| Task stuck | No progress 3+ attempts | Mark blocked, try different approach |
| Quality degradation | Confidence trending down | Checkpoint, take break |
| State corruption | Validation fails | Restore from checkpoint |

### Recovery Procedures

```markdown
## Recovery: Context Exhaustion

When context approaches 80%:
1. Create checkpoint with full state
2. Generate session summary (key decisions, progress)
3. Write RESUME.md with:
   - What was accomplished
   - Current task in progress
   - Next steps
4. Instruct user: "Start new session, say 'resume project'"

## Recovery: Infinite Loop

When loop detected:
1. Break execution immediately
2. Log the repeating pattern
3. Try alternative approach:
   - Different decomposition
   - Different skill assignment
   - Simpler sub-task breakdown
4. If still stuck after 2 alternatives: HUMAN_INPUT.md

## Recovery: State Corruption

When validation fails:
1. Attempt auto-repair for known patterns
2. If auto-repair fails, restore from latest valid checkpoint
3. Log what was lost between checkpoint and corruption
4. Continue from restored state
```

---

## 9. Human Escalation

### HUMAN_INPUT.md Protocol

```markdown
# Human Input Required

## Session
- Project: [name]
- Task: [current task]
- Time: [timestamp]

## What Happened
[Clear explanation of the situation]

## Why I'm Stuck
[Specific reason human input is needed]

## Options I've Considered
1. [Option A]: [Pros/Cons]
2. [Option B]: [Pros/Cons]
3. [Option C]: [Pros/Cons]

## What I Need From You
[Specific question or decision needed]

## How to Resume
After providing input, say: "Continue with [your choice]"
I will resume from the current checkpoint.
```

---

## 10. Session Lifecycle

### New Session

```bash
# Initialize project
scripts/init_project.py "PropHit v2" --goal "Build fractional real estate MVP"

# Creates:
# - .claude_state/project_state.md
# - .claude_state/checkpoints/
# - .claude_state/session_log.md
```

### Resume Session

```markdown
User: "Resume my PropHit project"

Claude:
1. Reads .claude_state/project_state.md
2. Identifies current phase and task
3. Loads relevant checkpoint if needed
4. Continues from last known good state
```

### Complete Session

```markdown
When project complete:
1. Run final review
2. Generate completion report
3. Archive state to .claude_state/archive/
4. Summary: what was built, decisions made, lessons learned
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Days 1-3)
- [ ] SKILL.md with core instructions
- [ ] State file format and templates
- [ ] init_project.py script
- [ ] validate_state.py script

### Phase 2: Core Workflow (Days 4-7)
- [ ] Task decomposition prompts
- [ ] Dependency DAG validation
- [ ] Basic execution loop
- [ ] Checkpoint mechanism

### Phase 3: Self-Review (Days 8-10)
- [ ] Critique prompt templates
- [ ] Stopping condition logic
- [ ] Integration with gas-debugger

### Phase 4: Skill Integration (Days 11-14)
- [ ] Domain detection logic
- [ ] Hand-off protocols
- [ ] Result integration

### Phase 5: Failure Handling (Days 15-17)
- [ ] detect_loops.py
- [ ] Context monitoring
- [ ] Recovery procedures
- [ ] HUMAN_INPUT.md protocol

### Phase 6: Polish (Days 18-21)
- [ ] Session resume flow
- [ ] Report generation
- [ ] Documentation
- [ ] Testing with real projects

---

## 12. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Session continuity | 90%+ tasks resume correctly | Track resume success rate |
| Self-review catch rate | 70%+ issues caught before human | Compare self-review vs human review |
| Skill routing accuracy | 95%+ correct skill selection | Log skill assignments, check correctness |
| Context efficiency | <80% usage per session | Monitor token counts |
| Human escalations | <10% of tasks | Count HUMAN_INPUT.md triggers |

---

## 13. Replication Assessment

### What We FULLY Replicate (100%)
- File-based state persistence
- Task decomposition frameworks
- Git worktree isolation
- Self-review prompts
- Checkpoint/resume
- Kanban state transitions
- Human escalation protocols

### What We PARTIALLY Replicate (60-80%)
- Self-review (no external verification beyond gas-debugger)
- RAG-like retrieval (grep vs embeddings)
- Progress tracking (manual vs automatic)

### What We CANNOT Replicate (0%)
- True semantic embeddings
- Sub-300ms retrieval
- Parallel multi-agent execution
- Cross-session memory without manual loading
- Real-time graph database

### Net Assessment
**70-80% of AutoClaude's "manager not babysitter" capability is achievable** through this architecture. The missing 20-30% is primarily speed and parallelism—not core functionality.

---

## Next Steps

1. **Create SKILL.md** following this blueprint
2. **Build scripts/** directory with Python utilities
3. **Create templates/** with YAML schemas
4. **Test on PropHit v2** as first real project
5. **Iterate based on failures** and improve skill

The orchestrator is ready to be built.
