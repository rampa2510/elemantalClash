# Research Supplement: Additional Patterns & Implementation Details

## S-001: AutoClaude Implementation Details (Deeper Dive)

### Actual Repository Structure

From examining AutoClaude forks and documentation:

```
autoclaude/
├── src/
│   ├── agents/
│   │   ├── discovery.ts      # Project understanding agent
│   │   ├── requirements.ts   # Requirements analysis
│   │   ├── research.ts       # External research
│   │   ├── spec-writer.ts    # Specification generation
│   │   ├── spec-critic.ts    # Self-critique of specs
│   │   ├── planner.ts        # Task planning
│   │   ├── qa-reviewer.ts    # Quality review
│   │   └── qa-fixer.ts       # Fix identified issues
│   ├── memory/
│   │   ├── graph.ts          # Graphiti integration
│   │   └── semantic.ts       # Semantic retrieval
│   ├── orchestrator/
│   │   ├── kanban.ts         # State machine
│   │   └── worktree.ts       # Git worktree management
│   └── merge/
│       └── resolver.ts       # AI merge conflict resolution
├── specs/
│   └── [task-id]/
│       ├── spec.md           # Task specification
│       ├── implementation_plan.json
│       ├── PAUSE              # Optional: pause execution
│       └── HUMAN_INPUT.md     # Optional: human guidance
└── .auto-claude/
    ├── config.yaml
    ├── roadmap/
    └── ideation/
```

### Self-Healing Loop Details

The QA Reviewer → QA Fixer loop works as follows:

```python
MAX_FIX_ITERATIONS = 50  # Surprisingly high
MIN_CONFIDENCE = 0.85

def self_healing_loop(implementation):
    for iteration in range(MAX_FIX_ITERATIONS):
        review = qa_reviewer.analyze(implementation)
        
        if review.confidence >= MIN_CONFIDENCE and review.issues == []:
            return {"status": "approved", "iteration": iteration}
        
        if review.requires_human:
            return {"status": "human_review", "issues": review.issues}
        
        # Attempt fix
        fix_result = qa_fixer.fix(implementation, review.issues)
        
        if not fix_result.success:
            # After 3 failed fix attempts, escalate
            if fix_result.consecutive_failures >= 3:
                return {"status": "escalate", "reason": "fix_loop_stuck"}
        
        implementation = fix_result.updated_code
    
    return {"status": "max_iterations", "last_confidence": review.confidence}
```

### Worktree Isolation Commands

```bash
# Create isolated worktree for AI work
git worktree add .worktrees/auto-claude -b auto-claude-session-$(date +%s)

# Work happens in isolated worktree...

# Merge back when complete
git checkout main
git merge auto-claude-session-xxx --no-ff -m "AI implementation: [task]"

# Cleanup
git worktree remove .worktrees/auto-claude
git branch -d auto-claude-session-xxx
```

---

## S-002: Claude Skills System - Undocumented Behaviors

### Activation Scoring (Observed Behavior)

Based on community testing, Claude's skill activation appears to use:

1. **Semantic similarity** between user request and skill description
2. **Keyword matching** for specific terms in description
3. **Recency bias** - recently used skills may have slight preference
4. **Specificity preference** - more specific skills beat general ones

### Description Optimization Formula

```
OPTIMAL_DESCRIPTION = 
    [What it does - 1-2 sentences] +
    [When to use it - explicit triggers] +
    [Keywords - comma-separated list of activation terms]
```

**Example (well-optimized):**
```yaml
description: |
  Autonomous project orchestration with task decomposition, state management, 
  self-review, and failure recovery. Use when planning multi-step projects, 
  breaking down complex work, tracking progress across sessions, or when 
  autonomous execution is needed. Keywords: project planning, sprint planning, 
  task breakdown, workflow orchestration, autonomous execution, project state, 
  epic decomposition, milestone tracking.
```

### Skill Stacking Behavior

When multiple skills apply:
1. Claude loads all relevant skill metadata
2. Makes single decision about which skill(s) to activate
3. Can combine instructions from multiple skills
4. User sees: "I'll use the [skill] and [skill] for this"

### Subagent Skill Isolation

**Critical limitation discovered:**
- Built-in agents (Explore, Plan, Verify) do NOT inherit skills
- Task tool subagents do NOT inherit skills
- Only custom subagents defined in `.claude/agents/` with explicit `skills:` field get skills

```yaml
# .claude/agents/code-reviewer/AGENT.md
---
name: code-reviewer
description: Review code for quality
skills: pr-review, security-check  # Must explicitly list
---
```

---

## S-003: State Persistence - Advanced Patterns

### Atomic State Updates

To prevent corruption, always:

```python
import tempfile
import os
import shutil

def atomic_state_update(state_path, new_state):
    """Write state atomically to prevent corruption on crash"""
    # Write to temp file first
    fd, temp_path = tempfile.mkstemp(dir=os.path.dirname(state_path))
    try:
        with os.fdopen(fd, 'w') as f:
            yaml.dump(new_state, f)
        # Atomic rename (works on POSIX)
        os.replace(temp_path, state_path)
    except:
        os.unlink(temp_path)
        raise
```

### State Versioning

```yaml
# project_state.yaml
version: "1.0.0"
schema_version: 3  # Increment when format changes
migrated_from: null  # Or previous version

# Include migration path
migrations:
  v2_to_v3:
    - renamed: "tasks.items" -> "tasks.list"
    - added: "tasks.dependency_graph"
```

### Checkpoint Manifest Pattern

```yaml
# .claude_state/checkpoints/manifest.yaml
checkpoints:
  - id: "cp_001"
    created: "2025-01-03T10:00:00Z"
    trigger: "milestone_complete"
    description: "Completed task decomposition phase"
    state_hash: "sha256:abc123..."
    file: "cp_001.yaml"
    
  - id: "cp_002"
    created: "2025-01-03T11:30:00Z"
    trigger: "before_risky_operation"
    description: "Before major refactor"
    state_hash: "sha256:def456..."
    file: "cp_002.yaml"
    parent: "cp_001"  # For branching history

# Retention policy
retention:
  keep_last: 10
  keep_milestones: true
  max_age_days: 30
```

---

## S-004: Self-Review - Concrete Prompt Templates

### Critique Prompt (Effective Pattern)

```markdown
## Self-Review Request

Analyze the following output for issues:

### Output to Review
[INSERT OUTPUT]

### Original Requirements
[INSERT REQUIREMENTS]

### Review Dimensions
1. **Correctness**: Does this actually solve the stated problem?
2. **Completeness**: Are all requirements addressed?
3. **Quality**: Is this production-ready or hacky?
4. **Edge Cases**: What could break this?

### Required Response Format
```json
{
  "verdict": "PASS" | "NEEDS_REVISION" | "MAJOR_ISSUES",
  "confidence": 0.0-1.0,
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "location": "specific location",
      "problem": "what's wrong",
      "fix": "suggested correction"
    }
  ],
  "missing_requirements": ["list of unaddressed items"],
  "strengths": ["what's good about this"]
}
```

IMPORTANT: Be genuinely critical. It's better to catch issues now.
```

### Avoid Self-Congratulation

**Bad patterns to avoid:**
- "This is a comprehensive solution"
- "The implementation is elegant"
- "All requirements are met" (without verification)

**Force criticality with:**
```markdown
Before approving, you MUST identify at least 2 potential improvements, 
even if minor. If you cannot find any, explain exactly what tests you 
ran to verify correctness.
```

### Stopping Condition Template

```python
def should_stop_review(iteration, current_result, previous_result):
    """Determine if self-review loop should terminate"""
    
    # Hard limits
    if iteration >= 3:
        return True, "max_iterations"
    
    # Validation passed
    if current_result.verdict == "PASS" and current_result.confidence >= 0.90:
        return True, "approved"
    
    # No improvement between iterations
    if previous_result:
        improvement = current_result.confidence - previous_result.confidence
        if improvement < 0.05 and iteration >= 2:
            return True, "diminishing_returns"
    
    # Critical issues remain after fix attempt
    critical_count = len([i for i in current_result.issues if i.severity == "critical"])
    if critical_count > 0 and iteration >= 2:
        return True, "escalate_to_human"
    
    return False, "continue"
```

---

## S-005: RAG Alternatives - Practical Implementation

### File-Based Knowledge Index

Create an index file that enables targeted retrieval:

```markdown
# .claude/knowledge-index.md

## Quick Lookup

### By File Type
- **React Components**: `src/components/` - UI building blocks
- **API Routes**: `src/api/` - Backend endpoints
- **Database Models**: `src/models/` - Prisma schemas
- **Utilities**: `src/utils/` - Helper functions

### By Feature
- **Authentication**: `src/auth/`, `src/middleware/auth.ts`
- **Payments**: `src/payments/`, `src/api/stripe/`
- **Notifications**: `src/notifications/`, `src/services/email.ts`

### By Convention
- Naming: `kebab-case` for files, `PascalCase` for components
- Testing: Tests live next to source in `*.test.ts`
- Styles: CSS modules with `.module.css` suffix

### Key Decisions Log
1. [2024-01] Chose Prisma over Drizzle for ORM - team familiarity
2. [2024-03] Migrated from REST to tRPC - type safety
3. [2024-06] Added Redis for session storage - performance
```

### Grep-Based Retrieval Strategy

```bash
# Strategy 1: Find relevant files first
rg -l "authentication" --type ts src/

# Strategy 2: Get context around matches
rg -C 5 "function authenticate" src/

# Strategy 3: Count matches for relevance ranking
rg -c "user" --type ts src/ | sort -t: -k2 -rn | head -10

# Strategy 4: Exclude noise
rg "pattern" --glob '!{node_modules,dist,coverage,.git}'
```

### Chunking for Large Reference Files

When a reference file exceeds ~2000 tokens:

```markdown
# references/api-schema.md

## Table of Contents
- [Authentication Endpoints](#authentication)
- [User Management](#users)
- [Billing](#billing)

## How to Use This File
Use grep to find specific sections:
- `rg "## Authentication" references/api-schema.md -A 100`
- `rg "POST /api/users" references/api-schema.md -A 20`

---

## Authentication
[...detailed content...]

## Users
[...detailed content...]
```

---

## S-006: Task Decomposition - Concrete Algorithm

### MECE Decomposition Prompt

```markdown
## Task Decomposition Request

Decompose this goal into tasks using MECE principles:

### Goal
[INSERT HIGH-LEVEL GOAL]

### Decomposition Rules
1. **Mutually Exclusive**: No two tasks should overlap in scope
2. **Collectively Exhaustive**: All tasks together must fully achieve the goal
3. **Right-Sized**: Each task should be completable in 1-4 hours
4. **Clear Boundaries**: Each task has unambiguous start/end conditions

### Output Format
```yaml
tasks:
  - id: "TASK-001"
    name: "Clear imperative action"
    scope: "What's included and what's NOT included"
    inputs:
      - from: "user" | "TASK-XXX.output"
        name: "input description"
    outputs:
      - name: "output description"
        format: "file | data | state_change"
    acceptance_criteria:
      - "Specific, verifiable condition"
    dependencies:
      hard: ["TASK-XXX"]  # Must complete first
      soft: []            # Nice to have first
    estimated_complexity: "low | medium | high"
```

### Verification
After decomposition, verify:
1. Sum of task scopes equals original goal scope
2. No gaps between tasks
3. No overlapping responsibilities
4. Dependencies form a valid DAG (no cycles)
```

### Dependency DAG Validation

```python
def validate_dag(tasks):
    """Ensure task dependencies form valid DAG (no cycles)"""
    from collections import defaultdict
    
    # Build adjacency list
    graph = defaultdict(list)
    in_degree = defaultdict(int)
    
    for task in tasks:
        task_id = task["id"]
        for dep in task.get("dependencies", {}).get("hard", []):
            graph[dep].append(task_id)
            in_degree[task_id] += 1
    
    # Topological sort via Kahn's algorithm
    queue = [t["id"] for t in tasks if in_degree[t["id"]] == 0]
    sorted_tasks = []
    
    while queue:
        current = queue.pop(0)
        sorted_tasks.append(current)
        
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    if len(sorted_tasks) != len(tasks):
        # Cycle detected
        remaining = [t["id"] for t in tasks if t["id"] not in sorted_tasks]
        return False, f"Cycle detected involving: {remaining}"
    
    return True, sorted_tasks  # Valid execution order
```

---

## S-007: Official Skill Best Practices (From Anthropic Docs)

### Frontmatter Requirements

```yaml
---
name: skill-name           # Required: lowercase, hyphens, max 64 chars
description: |             # Required: max 1024 chars, include triggers
  What the skill does.
  When to use it.
  Keywords: term1, term2
---
```

### Skill Naming Rules
- Lowercase letters, numbers, hyphens only
- Maximum 64 characters
- Cannot contain "anthropic" or "claude"

### allowed-tools Field

Limit what tools a skill can use:

```yaml
---
name: safe-reader
description: Read-only file analysis
allowed-tools:
  - Read
  - Glob
  - Grep
  # Bash and Write are NOT allowed
---
```

### Cross-Platform Compatibility

| Platform | Skill Location | Notes |
|----------|---------------|-------|
| Claude.ai | Settings → Skills → Upload | Individual user only |
| Claude Code | `~/.claude/skills/` (personal) | Loads automatically |
| Claude Code | `.claude/skills/` (project) | Shared via git |
| API | `/v1/skills` endpoint | Organization-wide |

**Skills do NOT sync across platforms** - must deploy separately.

---

## S-008: Failure Modes - Detection Scripts

### Loop Detection

```python
#!/usr/bin/env python3
"""Detect infinite loops in agent execution"""

import hashlib
from collections import deque

class LoopDetector:
    def __init__(self, window_size=5, similarity_threshold=0.8):
        self.recent_outputs = deque(maxlen=window_size)
        self.similarity_threshold = similarity_threshold
    
    def check(self, output):
        """Returns True if loop detected"""
        output_hash = hashlib.sha256(output.encode()).hexdigest()[:16]
        
        # Check for exact repetition
        if output_hash in self.recent_outputs:
            return True, "exact_repetition"
        
        # Check for semantic similarity (simplified)
        for prev_output in self.recent_outputs:
            similarity = self._calculate_similarity(output, prev_output)
            if similarity >= self.similarity_threshold:
                return True, f"high_similarity_{similarity:.2f}"
        
        self.recent_outputs.append(output)
        return False, None
    
    def _calculate_similarity(self, a, b):
        """Simple Jaccard similarity of word sets"""
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        if not words_a or not words_b:
            return 0.0
        intersection = len(words_a & words_b)
        union = len(words_a | words_b)
        return intersection / union
```

### Context Exhaustion Warning

```python
def check_context_health(current_tokens, max_tokens=200000):
    """Warn before context exhaustion"""
    usage = current_tokens / max_tokens
    
    if usage >= 0.95:
        return "CRITICAL", "Context nearly full. Save state and start new session."
    elif usage >= 0.80:
        return "WARNING", "Context at 80%. Consider summarizing or checkpointing."
    elif usage >= 0.60:
        return "INFO", "Context at 60%. Healthy."
    else:
        return "OK", f"Context at {usage*100:.0f}%"
```

### State Consistency Validator

```python
def validate_state_consistency(state):
    """Check for common state corruption patterns"""
    errors = []
    
    # Check required fields
    required = ["version", "project_id", "tasks", "current_phase"]
    for field in required:
        if field not in state:
            errors.append(f"Missing required field: {field}")
    
    # Check task references
    task_ids = {t["id"] for t in state.get("tasks", [])}
    for task in state.get("tasks", []):
        for dep in task.get("dependencies", {}).get("hard", []):
            if dep not in task_ids:
                errors.append(f"Task {task['id']} references non-existent dependency: {dep}")
    
    # Check status consistency
    for task in state.get("tasks", []):
        status = task.get("status")
        if status == "completed" and not task.get("completed_at"):
            errors.append(f"Task {task['id']} is completed but missing completed_at")
    
    return len(errors) == 0, errors
```

---

## Synthesis: Implementation Priority

Based on all research, implement in this order:

### Phase 1: Core Infrastructure (Week 1)
1. State file format (hybrid markdown+YAML)
2. Checkpoint mechanism
3. Basic task decomposition prompt

### Phase 2: Self-Review (Week 2)
1. Critique prompt templates
2. Stopping condition logic
3. Integration with gas-debugger for code review

### Phase 3: Skill Integration (Week 3)
1. Skill router logic
2. Domain detection
3. Hand-off protocols

### Phase 4: Failure Handling (Week 4)
1. Loop detection
2. Context exhaustion monitoring
3. Recovery procedures

### Phase 5: Polish (Ongoing)
1. Skill improvement tracking
2. Cross-session memory optimization
3. Human escalation workflows
