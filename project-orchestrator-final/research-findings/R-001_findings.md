# R-001 Findings: AutoClaude Architecture Deep-Dive

**Research Date:** 2026-01-02  
**Status:** ✅ COMPLETE  
**Sources:** 20+ GitHub repositories, 15+ articles, official documentation

---

## Executive Summary

AutoClaude (specifically AndyMik90/Auto-Claude and forks) is a multi-agent autonomous coding framework that transforms Claude Code from a single-session assistant into a "manager not babysitter" workflow. Key architectural components include: Kanban task management, git worktree isolation, FalkorDB graph memory, QA self-review loops, and AI-powered merge conflict resolution.

**Critical Finding:** AutoClaude requires Claude API access and Docker (for FalkorDB). For Claude Max users without API access, we must replicate the *patterns* using file-based alternatives.

---

## Graph Memory System

### How It Works
AutoClaude uses **FalkorDB** (formerly RedisGraph) as a graph database to create persistent memory across sessions. The system:

1. **Indexes the codebase** into graph nodes representing files, functions, classes, and relationships
2. **Creates relationship edges** between entities (imports, calls, inheritance)
3. **Enables semantic queries** to retrieve relevant context for each task
4. **Persists insights** agents learn during development

### Data Structures
```
Nodes:
- File nodes (path, language, last_modified)
- Function/Class nodes (name, signature, docstring)
- Insight nodes (learnings from past sessions)

Edges:
- IMPORTS (file -> file)
- CALLS (function -> function)  
- CONTAINS (file -> function/class)
- RELATES_TO (semantic similarity)
```

### File Relationship Tracking
- Uses AST parsing for code structure
- Tracks import statements and dependencies
- Maintains a dependency graph for impact analysis
- Updates incrementally on file changes

### Semantic RAG Integration
- **Embedding Model:** Not specified in repos, likely uses OpenAI embeddings or local alternatives
- **Retrieval:** Semantic similarity search on insights and code summaries
- **Chunking:** Files chunked by function/class boundaries
- **Generation:** Retrieved context injected into agent prompts

**What We CAN Replicate:**
- File-based relationship mapping (dependency graphs in JSON/markdown)
- Structured project indexes in markdown files
- Convention documentation as "pre-loaded knowledge"

**What We CANNOT Replicate (Needs API/Docker):**
- Real-time vector similarity search
- Graph traversal queries
- Cross-session semantic retrieval at scale

---

## Git Worktree Isolation

### What Are Git Worktrees?
Git worktrees allow multiple working directories linked to the same repository, each on a different branch. This enables:

- **Multiple checkouts** of the same repo simultaneously
- **Isolated development** without branch switching overhead
- **Parallel execution** with no file conflicts

### Technical Implementation
```bash
# Create isolated workspace
git worktree add ../project-feature-a -b feature-a

# Work in isolation
cd ../project-feature-a
claude  # Run Claude Code session here

# Cleanup when done
git worktree remove ../project-feature-a
```

### AutoClaude's Worktree Structure
```
your-project/
├── .worktrees/                    # Created during builds (git-ignored)
│   └── auto-claude/               # Isolated workspace for AI coding
├── .auto-claude/                  # Per-project persistent data
│   ├── specs/                     # Task specifications
│   ├── roadmap/                   # Project roadmap
│   └── ideation/                  # Ideas and planning
└── main codebase...
```

### How Parallel Execution Works
1. Each task gets its own worktree branch
2. Multiple agents work simultaneously in separate directories
3. Changes isolated until explicit merge
4. No file locking conflicts between agents

### Merge Strategies
- **Auto-merge first:** Let git attempt automatic resolution
- **AI conflict resolution:** For actual conflicts, process only conflict regions
- **Full-file fallback:** If partial resolution fails, AI reviews entire file
- **Human review:** Complex conflicts staged for manual review

**What We CAN Replicate:**
- Git worktree commands work with Claude Code natively
- Can instruct orchestrator to create worktrees for parallel tasks
- Anthropic docs explicitly support this pattern

**What We CANNOT Replicate:**
- Running multiple Claude Code sessions simultaneously (requires multiple subscriptions)
- True parallel agent execution (our orchestrator will be sequential)

---

## Self-Review Mechanism

### Three-Phase Agent Pipeline
AutoClaude uses a three-phase QA pipeline:

1. **Build Agent:** Implements the task
2. **QA Reviewer Agent:** Validates against acceptance criteria
3. **QA Fixer Agent:** Addresses identified issues

### What Triggers Self-Critique
- Task completion by build agent
- Explicit acceptance criteria from spec
- Automated test failures
- Lint/type check failures
- Security scan alerts

### "Good Enough" Decision Criteria
- All acceptance criteria met
- No critical issues flagged
- Tests passing
- No security vulnerabilities
- Code style compliance

### Feedback Loop Structure
```
Build → QA Review → [Issues Found?]
           │                │
           No               Yes
           ↓                ↓
         Done           QA Fixer
                            │
                            ↓
                     [Fixed?] → No → (Loop up to 50x)
                        │
                       Yes
                        ↓
                    QA Review (repeat)
```

### Self-Review Prompts (Inferred Structure)
```markdown
## Review Checklist
- [ ] Does implementation match acceptance criteria?
- [ ] Are all edge cases handled?
- [ ] Is error handling complete?
- [ ] Are there security concerns?
- [ ] Is code readable and maintainable?
- [ ] Do tests exist and pass?

## If Issues Found:
1. Identify specific file/line
2. Describe the issue
3. Suggest concrete fix
4. Rate severity (critical/warning/suggestion)
```

**What We CAN Replicate:**
- Multi-phase review structure in skill instructions
- Explicit acceptance criteria in state files
- Iteration counters to prevent infinite loops
- Severity-based prioritization

**What We CANNOT Replicate:**
- Parallel agent execution (reviewer as separate instance)
- Our reviews will be sequential phases in same session

---

## AI Merge Conflict Resolution

### Pattern Detection
- Identifies conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Extracts "ours" vs "theirs" code blocks
- Analyzes semantic intent of each change

### Prioritization Logic
1. **Functional correctness** over style
2. **Newer logic** typically preferred
3. **Tests as arbiters** when available
4. **Feature preservation** - combine if non-conflicting
5. **Human escalation** for business logic conflicts

### Three-Tier Resolution Approach
```
1. Git Auto-Merge (simple cases)
      ↓ fails
2. AI Partial Resolution (conflict regions only) 
      ↓ fails  
3. AI Full-File Review (complete context)
      ↓ fails
4. Human Review (staged changes)
```

### Token Efficiency
- Processing only conflict regions achieves ~98% token reduction vs full files
- Enables resolution of builds 50+ commits behind main

**What We CAN Replicate:**
- Conflict detection and extraction
- AI-assisted resolution prompts
- Prioritization guidelines in skill

**What We CANNOT Replicate:**
- Real-time automated resolution (manual trigger in our case)

---

## Kanban State Management

### State Transitions
```
Planning → In Progress → AI Review → Human Review → Done
    │          │            │             │
    ↓          ↓            ↓             ↓
  [Blocked]  [Blocked]   [Failed]    [Rejected]
```

### What Triggers State Transitions

| From | To | Trigger |
|------|-----|---------|
| Backlog | Planning | User moves card |
| Planning | In Progress | Agent starts spec |
| In Progress | AI Review | Build complete |
| AI Review | Human Review | QA passes |
| AI Review | In Progress | QA fails (fix cycle) |
| Human Review | Done | Human approves |
| Human Review | In Progress | Human requests changes |
| Any | Blocked | Dependency unmet / error |

### Progress Tracking
- Each task has spec file with checkboxes
- Agents update spec as they complete steps
- Status visible in Kanban UI
- Timestamps logged for each transition

### Blocked Task Handling
- Blocked tasks flagged with reason
- Dependency tracking identifies blockers
- Agents can work on non-blocked tasks
- Notifications when blockers resolve

**What We CAN Replicate:**
- File-based task states (markdown/JSON)
- State machine transitions in skill logic
- Progress checkboxes in task files
- Blocked task tracking

**What We CANNOT Replicate:**
- Real-time UI updates
- Visual Kanban board (can describe textually)

---

## What We Can Replicate (No API Required)

### Fully Replicable
1. **Task state management** via markdown/JSON files
2. **Git worktree isolation** (native git feature)
3. **Self-review phases** in sequential skill execution
4. **Acceptance criteria checking** via structured prompts
5. **Project structure indexing** in markdown files
6. **Convention documentation** as skill resources
7. **Checkpoint/resume** via PROJECT_STATE.md pattern
8. **Iteration limits** to prevent infinite loops
9. **Priority queues** via file-based task lists
10. **Conflict resolution prompts** (manual trigger)

### Partially Replicable
1. **Codebase understanding** - Limited to what fits in context window
2. **Cross-session memory** - Summarized in markdown, not semantic search
3. **Parallel task awareness** - Sequential execution with state tracking
4. **Merge resolution** - Manual trigger, not automated pipeline

---

## What We Cannot Replicate (Needs API/External Tools)

### Requires API Access
1. Multiple simultaneous Claude sessions
2. Background agent execution
3. Webhook-triggered automations
4. Real-time progress streaming

### Requires External Services
1. FalkorDB graph database (Docker)
2. Vector embeddings for semantic search
3. Persistent cross-session RAG
4. Real-time Kanban UI updates

### Requires Infrastructure
1. CI/CD integration (GitHub Actions with API)
2. Automated PR creation/review
3. Webhook listeners
4. Queue management systems

---

## Key Insights for Our Skill

### 1. State is Everything
AutoClaude's power comes from persistent state management. We must design our PROJECT_STATE.md to be:
- Human-readable (for debugging)
- Machine-parseable (for Claude to update)
- Comprehensive (capture "where we are")
- Resumable (enable "continue from here")

### 2. Self-Review is Sequential, Not Parallel
Without API access, our "QA agent" is just a different phase in the same session. Design prompts that shift Claude's mindset from "builder" to "reviewer."

### 3. Git Worktrees Work Out of the Box
Claude Code can use git worktrees natively. This is our primary mechanism for safe experimentation and feature isolation.

### 4. Skills as Pre-Loaded Knowledge
Since we can't do semantic retrieval, our skill must frontload project conventions, patterns, and architecture in markdown files that Claude reads at the start of each session.

### 5. Explicit Handoff Points
Without persistent agents, we need explicit "checkpoint" moments where state is saved to files, enabling resume in new sessions.

### 6. Quality Gates, Not Quality Loops
We can't loop automatically, but we can define clear gates:
- "Review this implementation against criteria X, Y, Z"
- "If issues found, fix them before proceeding"
- "Declare ready for human review only when all gates pass"

### 7. The Manager Pattern
The "manager not babysitter" philosophy works by:
- Front-loading planning and specifications
- Trusting agent execution within guardrails  
- Reviewing outcomes, not every step
- Clear escalation paths for blockers

---

## Related Projects Analyzed

| Project | Key Innovation | API Required? |
|---------|---------------|---------------|
| AndyMik90/Auto-Claude | Full autonomous workflow | Yes (SDK) |
| ruvnet/claude-flow | Swarm orchestration | Yes (API + MCP) |
| wshobson/agents | 99 specialized agents | No (skills-based) |
| automazeio/ccpm | GitHub Issues integration | Partial |
| bwads001/claude-code-agents | Multi-agent orchestration | No (prompts) |

### Most Relevant for Our Use Case
**wshobson/agents** - Demonstrates skills-based approach without API dependency. Uses 107 "agent skills" with progressive disclosure.

**bwads001/claude-code-agents** - Shows how to achieve multi-agent patterns through prompt engineering and CLAUDE.md templates.

---

## Recommendations for Our Orchestrator Skill

1. **Adopt the 3-phase pattern:** Plan → Execute → Review
2. **Use markdown for state:** Human-readable, Claude-friendly
3. **Leverage git worktrees:** For safe parallel-like isolation
4. **Front-load context:** Skills as knowledge packages
5. **Design for resume:** Every action updates state file
6. **Include iteration limits:** Prevent runaway loops
7. **Explicit quality gates:** Checklists, not loops
8. **Human escalation paths:** Clear "stuck" handling

---

## Next Steps

With R-001 complete, proceed to:
- **R-002:** Claude Skills System Mastery (understand how to build our skill optimally)
- **R-003:** State Persistence Patterns (design our state schema)
- **R-004:** Self-Review & Critique Patterns (implement quality gates)
