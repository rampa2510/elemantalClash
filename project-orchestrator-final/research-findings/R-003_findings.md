# R-003 Findings: State Persistence Patterns

**Research Date:** 2026-01-02  
**Status:** ✅ COMPLETE  
**Sources:** LangGraph docs, research papers, framework comparisons, production patterns

---

## Executive Summary

State persistence is the backbone of autonomous orchestration. Without external databases, we must rely on **file-based state** that is:
1. Human-readable (for debugging)
2. Machine-parseable (for Claude to read/write)
3. Resumable (checkpoint-based)
4. Context-efficient (summaries vs. full history)

**Key Finding:** Markdown with structured YAML frontmatter provides the best balance of human readability and LLM comprehension. JSON is used for structured data that needs parsing.

---

## File-Based State Pattern Comparison

| Pattern | Pros | Cons | Best Use Case |
|---------|------|------|---------------|
| **JSON** | - Machine-parseable<br>- Well-understood<br>- Structured data | - Poor human readability<br>- Verbose (more tokens)<br>- No comments | Task data, progress tracking |
| **Markdown** | - Human-readable<br>- Natural for LLMs<br>- Token-efficient<br>- Supports formatting | - Less structured<br>- Parsing complex data harder | Main state file, documentation |
| **YAML** | - Human-readable<br>- Token-efficient<br>- Good structure<br>- Comments allowed | - Indentation-sensitive<br>- Complex nested data tricky | Configuration, task specs |
| **Hybrid** | - Best of both worlds<br>- YAML frontmatter + Markdown body<br>- JSON for data sections | - Slightly more complex to parse | **RECOMMENDED** |

### Research-Backed Format Recommendations

From format benchmarks (ImprovingAgents.com 2025):
- **YAML performed best** for accuracy on nested data (GPT-5 Nano, Gemini)
- **Markdown was most token-efficient** (~10% fewer than YAML)
- **JSON showed poor performance** for some models
- **Markdown-KV** (key: value pairs) achieved highest accuracy in table data

### Claude-Specific Considerations

1. **YAML frontmatter** is native to skills system
2. **Markdown** is Claude's natural output format
3. **JSON** works but consumes more tokens
4. **Comments** help Claude understand intent

---

## LLM-Friendly State Design

### What Works Best for Claude to Read

```markdown
# PROJECT_STATE.md

---
project_name: PropHit v2
status: IN_PROGRESS
current_phase: implementation
last_checkpoint: 2026-01-02T14:30:00Z
---

## Current Task
**ID:** TASK-003
**Title:** Implement user authentication
**Status:** 🔵 IN_PROGRESS
**Progress:** 60%

### Completed Steps
- [x] Set up Aadhaar verification API
- [x] Create login UI components
- [ ] Implement PAN verification
- [ ] Add session management
- [ ] Write integration tests

## Context Snapshot
Last working on: `src/auth/aadhaar.ts`
Key decisions: Using Aadhaar SDK v2.0 for verification
Blocked by: None

## Next Actions
1. Complete PAN verification endpoint
2. Test error handling flows
3. Review with security checklist
```

### What Works Best for Claude to Write/Update

1. **Explicit markers** for sections to update
2. **Atomic updates** (change one field, not rewrite entire file)
3. **Append-friendly** sections (logs, history)
4. **Checkboxes** that can be toggled

### Minimizing Parsing Errors

| Strategy | Implementation |
|----------|----------------|
| **Consistent format** | Use templates, validate against schema |
| **Clear section markers** | `## Section Name` with blank lines |
| **Simple data structures** | Avoid deeply nested objects |
| **Explicit field names** | `status:` not just `s:` |
| **ISO timestamps** | `2026-01-02T14:30:00Z` |
| **Enum values** | `🟢 DONE`, `🔵 IN_PROGRESS`, `🟡 PENDING` |

---

## Checkpoint/Resume Patterns

### Capturing "Where We Left Off"

Essential checkpoint data:
```yaml
checkpoint:
  timestamp: 2026-01-02T14:30:00Z
  session_id: session-001
  
  # Current position
  current_task_id: TASK-003
  current_phase: implementation
  current_step: 3 of 5
  
  # What was being worked on
  active_file: src/auth/aadhaar.ts
  last_action: "Added error handling for invalid Aadhaar"
  
  # What comes next
  next_action: "Implement PAN verification"
  
  # Context summary
  key_decisions:
    - "Using Aadhaar SDK v2.0"
    - "Session timeout set to 30 minutes"
  
  blockers: []
  
  # Quality state
  tests_passing: true
  review_status: pending
```

### Restoring Context Efficiently

**Strategy: Progressive Context Loading**

1. **Level 1 (Always Load):** ~200 tokens
   - Current task and status
   - Blockers
   - Next action
   
2. **Level 2 (Load if Continuing):** ~500 tokens
   - Last 3-5 completed steps
   - Key decisions made
   - Active files
   
3. **Level 3 (Load on Demand):** Variable
   - Full task history
   - All completed tasks
   - Detailed decision log

### Handling Partial Completion

```markdown
## Task: TASK-003 - Implement Authentication

### Step Progress
| Step | Status | Notes |
|------|--------|-------|
| 1. Setup API | ✅ Complete | Aadhaar SDK integrated |
| 2. Create UI | ✅ Complete | LoginForm.tsx created |
| 3. Implement PAN | 🔄 Partial | Endpoint created, validation pending |
| 4. Sessions | ⏳ Not started | |
| 5. Tests | ⏳ Not started | |

### Partial Step Details (Step 3)
Files created:
- src/auth/pan.ts (skeleton only)
- src/api/pan-endpoint.ts (untested)

Remaining work:
- Add validation logic
- Handle API errors
- Write unit tests
```

---

## Context Window Optimization

### What Should Be in State File vs. Separate Files

| In Main State File | In Separate Files |
|-------------------|-------------------|
| Current status | Full task specs |
| Active task summary | Completed task history |
| Next actions | Detailed decision logs |
| Blockers | Reference documentation |
| Key context (5-10 items) | Code snippets |
| Progress percentages | Test results |

### Summarization vs. Preservation

**Summarize (reduce tokens):**
- Completed task details → "Completed on DATE: OUTCOME"
- Long discussions → Key decisions only
- Error logs → Error count + last error

**Preserve (keep detail):**
- Current task context
- Active blockers with details
- Uncommitted decisions
- In-progress work

### Progressive Disclosure Pattern

```markdown
# PROJECT_STATE.md (Main File - Always Loaded)

## Quick Status
- Project: PropHit v2
- Phase: Implementation
- Health: 🟢 Good
- Current: TASK-003 (Authentication)

## Current Task Summary
[See tasks/TASK-003.md for full details]
- Progress: 60%
- ETA: 2 hours
- Blockers: None

## Recent History (Last 3 Tasks)
| Task | Status | Summary |
|------|--------|---------|
| TASK-002 | ✅ | Database schema complete |
| TASK-001 | ✅ | Project setup complete |

## Full History
[See history/completed-tasks.md]
```

---

## Failure Modes & Mitigations

| Failure Mode | Cause | Mitigation |
|--------------|-------|------------|
| **Corrupted state file** | Partial write, interrupted update | Backup before write, validate after |
| **Inconsistent updates** | Multiple fields out of sync | Atomic update sections, timestamps |
| **Lost context despite file** | State file missing crucial info | Checklist of required fields |
| **Stale checkpoint** | Forgot to update state | Update state FIRST, then act |
| **Parsing errors** | Invalid format, typos | Schema validation, templates |
| **Context overflow** | Too much in state file | Progressive disclosure, summarize |
| **Version conflicts** | Manual edits conflict with Claude | Lock mechanism or append-only |

### Defensive Patterns

1. **Validate Before Use**
```markdown
## State Validation
Before proceeding, verify:
- [ ] PROJECT_STATE.md exists and is readable
- [ ] Current task ID is valid
- [ ] Status is a known value
- [ ] No critical errors in last session
```

2. **Backup Before Update**
```bash
cp PROJECT_STATE.md PROJECT_STATE.md.backup
```

3. **Append-Only Logs**
```markdown
## Session Log (Append Only)
---
### 2026-01-02T14:30:00Z
Action: Started TASK-003
Result: In progress

### 2026-01-02T15:00:00Z
Action: Completed step 1
Result: Aadhaar API integrated
---
```

---

## How Existing Tools Handle State

### AutoClaude
- **FalkorDB graph database** for persistent memory
- **Per-task spec files** in `.auto-claude/specs/`
- **Kanban state** tracked in database
- **Git worktrees** isolate task work

**Replicable Pattern:** Per-task spec files in `tasks/` directory

### LangGraph
- **Checkpointers** save full graph state
- **Thread IDs** separate conversation contexts
- **SqliteSaver** for file-based persistence
- **State schema** defined via TypedDict

**Replicable Pattern:** State schema with typed fields, checkpoint timestamps

### CrewAI
- **Task objects** with status, result, context
- **Memory** configurable (long-term, short-term)
- **Output** stored per task

**Replicable Pattern:** Task objects with explicit status tracking

### Claude Code (Native)
- **CLAUDE.md** for project context
- **Conversation history** in session
- **No built-in persistence** across sessions

**Our Addition:** PROJECT_STATE.md extends CLAUDE.md pattern

---

## Recommended State Schema for Our Orchestrator

### Main State File: `PROJECT_STATE.md`

```markdown
# PROJECT_STATE.md

---
# YAML Frontmatter (Machine-parseable metadata)
schema_version: "1.0"
project_name: "Project Name"
created_at: "2026-01-02T10:00:00Z"
last_updated: "2026-01-02T15:30:00Z"

status: "IN_PROGRESS"  # NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETE
current_phase: "implementation"  # planning | implementation | review | complete

health: "good"  # good | warning | critical
---

## 🎯 Mission
[One-line project goal]

## 📊 Current Status

**Phase:** Implementation (3 of 4)
**Active Task:** TASK-003 - Implement Authentication
**Progress:** ████████░░ 80%
**Blockers:** None

## 🔄 Active Task

### TASK-003: Implement Authentication
**Status:** 🔵 IN_PROGRESS
**Started:** 2026-01-02T14:00:00Z
**Files:** `src/auth/`, `src/api/auth.ts`

#### Progress Checklist
- [x] Setup Aadhaar verification API
- [x] Create login UI components  
- [x] Implement PAN verification
- [ ] Add session management
- [ ] Write integration tests

#### Current Context
Last action: Completed PAN verification endpoint
Working on: Session management implementation
Next step: Implement JWT token generation

#### Key Decisions
- Using Aadhaar SDK v2.0 (official, better docs)
- Session timeout: 30 minutes (industry standard)
- Storing sessions in Redis (when available, localStorage fallback)

## 📋 Task Queue

| Priority | ID | Title | Status | Blocked By |
|----------|-----|-------|--------|------------|
| 1 | TASK-003 | Authentication | 🔵 IN_PROGRESS | - |
| 2 | TASK-004 | Property Listing | 🟡 PENDING | - |
| 3 | TASK-005 | Payment Integration | 🟡 PENDING | TASK-003 |

## ✅ Completed Tasks

| ID | Title | Completed | Outcome |
|----|-------|-----------|---------|
| TASK-002 | Database Schema | 2026-01-02 | Tables created, migrations ready |
| TASK-001 | Project Setup | 2026-01-01 | Vite + React + TypeScript configured |

## 🚨 Blockers & Issues

Currently no blockers.

## 📝 Session Log (Last 5)

| Timestamp | Action | Result |
|-----------|--------|--------|
| 15:30 | Completed PAN endpoint | ✅ Working |
| 15:00 | Started PAN verification | ✅ In progress |
| 14:30 | Completed login UI | ✅ Merged |
| 14:00 | Started TASK-003 | ✅ Planning done |
| 13:30 | Completed TASK-002 | ✅ DB ready |

## 🔧 Configuration

```yaml
quality_gates:
  require_tests: true
  require_review: true
  max_review_iterations: 3

iteration_limits:
  max_task_attempts: 3
  max_fix_iterations: 5
  
escalation:
  on_block: "Document blocker, move to next task"
  on_fail: "Log failure, request human review"
```

## 📁 Related Files

- Task Specs: `tasks/TASK-XXX.md`
- Completed History: `history/completed.md`
- Decision Log: `history/decisions.md`
- Architecture: `docs/architecture.md`
```

### Task Specification File: `tasks/TASK-003.md`

```markdown
# TASK-003: Implement User Authentication

---
id: TASK-003
title: "Implement User Authentication"
status: IN_PROGRESS
priority: 1
created: 2026-01-02T13:00:00Z
started: 2026-01-02T14:00:00Z
estimated_hours: 4
---

## Objective
Implement secure user authentication using Aadhaar and PAN verification for the PropHit platform.

## Acceptance Criteria
- [ ] Users can sign up with Aadhaar number
- [ ] Aadhaar verification via official API
- [ ] PAN card verification as secondary KYC
- [ ] Session management with JWT tokens
- [ ] Logout functionality
- [ ] Error handling for invalid credentials
- [ ] Unit tests with >80% coverage

## Technical Approach
1. Integrate Aadhaar SDK v2.0
2. Create `/api/auth/aadhaar` endpoint
3. Create `/api/auth/pan` endpoint
4. Implement JWT token generation
5. Add session middleware
6. Create React auth context

## Dependencies
- Aadhaar SDK: `npm install aadhaar-sdk@2.0`
- JWT: `npm install jsonwebtoken`

## Files to Create/Modify
- `src/auth/aadhaar.ts` - Aadhaar verification
- `src/auth/pan.ts` - PAN verification
- `src/auth/session.ts` - Session management
- `src/api/auth.ts` - API routes
- `src/context/AuthContext.tsx` - React context
- `src/components/LoginForm.tsx` - UI

## Progress Log
| Time | Step | Result |
|------|------|--------|
| 14:00 | Started task | ✅ |
| 14:30 | Aadhaar SDK setup | ✅ |
| 15:00 | Login UI created | ✅ |
| 15:30 | PAN endpoint done | ✅ |
| - | Session management | ⏳ |
| - | Tests | ⏳ |

## Notes
- Using official Aadhaar SDK, not third-party
- Session timeout aligned with banking industry standard (30 min)
```

---

## State Update Protocol

### When to Update State

1. **Before starting any work:** Update status to IN_PROGRESS
2. **After completing a step:** Check off progress item
3. **When making decisions:** Log in decisions section
4. **When encountering blockers:** Add to blockers section
5. **After completing task:** Update status, move to completed
6. **Before session end:** Ensure state reflects current position

### How to Update State

```markdown
## Update Protocol

### Starting Work
1. Read PROJECT_STATE.md
2. Verify current task and status
3. Update status if needed
4. Begin work

### After Each Step
1. Check off completed step in checklist
2. Update "Last action" and "Working on"
3. Log significant actions in Session Log

### On Decisions
1. Add to "Key Decisions" with rationale
2. Update docs/decisions.md if significant

### On Blockers
1. Add to Blockers section with details
2. Update task status if blocked
3. Consider moving to next non-blocked task

### Ending Session
1. Ensure checklist reflects actual progress
2. Write clear "Next step" for resumption
3. Update last_updated timestamp
```

---

## Key Insights for Our Orchestrator

1. **Hybrid format wins** - YAML frontmatter + Markdown body provides structure and readability

2. **Progressive disclosure scales** - Main state file stays lean, details in separate files

3. **Checklists are checkpoints** - Each checkbox is a resumable point

4. **Timestamps enable debugging** - ISO format, always include timezone

5. **Explicit next action** - Always know what to do next without re-reading everything

6. **Append-only logs** - History that never corrupts

7. **Emoji status indicators** - Fast visual parsing (🟢🟡🔵🔴)

8. **Backup before write** - Simple defensive pattern

9. **Schema versioning** - Future-proof state format

10. **Context summary, not dump** - "Key decisions" not "every decision"

---

## Next Steps

With R-003 complete, proceed to:
- **R-004:** Self-Review & Critique Patterns (quality gates)
- **R-005:** RAG Alternatives (file-based project understanding)
- **R-006:** Task Decomposition Frameworks (how to break down work)
