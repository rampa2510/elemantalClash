# Task Decomposition Reference

Comprehensive patterns for breaking complex projects into executable tasks.

## Table of Contents
- [MECE Framework](#mece-framework)
- [Hierarchical Task Networks](#hierarchical-task-networks)
- [Dependency Management](#dependency-management)
- [Complexity Estimation](#complexity-estimation)
- [Decomposition Prompts](#decomposition-prompts)

---

## MECE Framework

MECE (Mutually Exclusive, Collectively Exhaustive) ensures complete coverage without overlap.

### Principles

1. **Mutually Exclusive**: Each task has unique scope
   - No two tasks should produce the same output
   - Clear ownership of each deliverable
   - No "shared" or "overlapping" responsibilities

2. **Collectively Exhaustive**: All tasks together = complete goal
   - Sum of task scopes equals project scope
   - No gaps between tasks
   - Nothing falls through the cracks

### MECE Validation Checklist

```
[ ] Can I complete task A without touching task B's scope?
[ ] Do all tasks together fully achieve the goal?
[ ] Is there any work not covered by any task?
[ ] Are there any deliverables claimed by multiple tasks?
```

### Common MECE Violations

| Violation | Example | Fix |
|-----------|---------|-----|
| Overlap | "Build UI" + "Create components" | Merge or clarify scope |
| Gap | Missing "deploy" task | Add missing task |
| Ambiguity | "Handle edge cases" | Specify which edge cases |

---

## Hierarchical Task Networks

HTN provides recursive decomposition from abstract to primitive tasks.

### Task Types

**Compound Task**: Requires further decomposition
```yaml
- id: "TASK-001"
  name: "Build authentication system"
  type: compound
  subtasks:
    - "TASK-001-A"  # Login flow
    - "TASK-001-B"  # Registration flow
    - "TASK-001-C"  # Password reset
```

**Primitive Task**: Directly executable
```yaml
- id: "TASK-001-A"
  name: "Build login form component"
  type: primitive
  estimated_time: "45 min"
  acceptance_criteria:
    - "Email/password inputs with validation"
    - "Submit button with loading state"
    - "Error display for invalid credentials"
```

### Decomposition Depth

Stop decomposing when:
- Task is 15-60 minutes of human work
- Acceptance criteria are unambiguous
- Single person can complete without coordination
- Output is clearly verifiable

### HTN Algorithm

```python
def decompose(task):
    if is_primitive(task):
        return [task]
    
    subtasks = identify_subtasks(task)
    validate_mece(subtasks)
    
    result = []
    for subtask in subtasks:
        result.extend(decompose(subtask))
    
    return result

def is_primitive(task):
    return (
        task.estimated_time <= 60  # minutes
        and len(task.acceptance_criteria) >= 2
        and task.output_is_verifiable
    )
```

---

## Dependency Management

### Dependency Types

**Hard Dependency**: Must complete before starting
```yaml
dependencies:
  hard:
    - "TASK-001"  # Cannot start without this
```

**Soft Dependency**: Preferred but not required
```yaml
dependencies:
  soft:
    - "TASK-002"  # Nice to have first
```

**Data Dependency**: Needs output from another task
```yaml
dependencies:
  data:
    - from: "TASK-001.output.schema"
      to: "inputs.database_schema"
```

### DAG Validation

Tasks must form a Directed Acyclic Graph (no cycles).

```python
def validate_dag(tasks):
    """Ensure no circular dependencies using Kahn's algorithm"""
    from collections import defaultdict
    
    graph = defaultdict(list)
    in_degree = defaultdict(int)
    
    for task in tasks:
        task_id = task["id"]
        for dep in task.get("dependencies", {}).get("hard", []):
            graph[dep].append(task_id)
            in_degree[task_id] += 1
    
    # Start with tasks that have no dependencies
    queue = [t["id"] for t in tasks if in_degree[t["id"]] == 0]
    sorted_order = []
    
    while queue:
        current = queue.pop(0)
        sorted_order.append(current)
        
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    if len(sorted_order) != len(tasks):
        remaining = set(t["id"] for t in tasks) - set(sorted_order)
        return False, f"Cycle detected: {remaining}"
    
    return True, sorted_order
```

### Parallel Execution Opportunities

Tasks at the same DAG level can run in parallel:

```
Level 0: [TASK-A, TASK-B]        # No dependencies, parallel
Level 1: [TASK-C]                # Depends on A
Level 2: [TASK-D, TASK-E]        # D depends on C, E depends on B
Level 3: [TASK-F]                # Depends on D and E
```

For Claude Max (sequential execution), execute level by level.

---

## Complexity Estimation

### Time-Based Classification

| Human Time | Complexity | Files | LOC | Autonomous? |
|------------|------------|-------|-----|-------------|
| <15 min | Trivial | 1 | <10 | ✅ Full |
| 15-60 min | Small | 1-2 | 10-50 | ✅ With checkpoint |
| 1-4 hr | Substantial | 2-5 | 50-200 | ⚠️ Decompose |
| >4 hr | Hard | >5 | >200 | ❌ Must decompose |

### Complexity Factors

```python
def estimate_complexity(task):
    score = 0
    
    # File scope
    if task.files_affected == 1: score += 1
    elif task.files_affected <= 4: score += 2
    else: score += 4
    
    # LOC estimate
    if task.estimated_loc < 10: score += 1
    elif task.estimated_loc < 100: score += 2
    else: score += 4
    
    # External dependencies
    score += len(task.external_apis) * 2
    
    # Ambiguity
    if task.has_clear_spec: score += 0
    else: score += 3
    
    # Reversibility
    if task.is_reversible: score += 0
    else: score += 2
    
    # Classification
    if score <= 3: return "trivial"
    elif score <= 6: return "small"
    elif score <= 10: return "substantial"
    else: return "hard"
```

### Context Window Budget

Estimate context requirements before execution:

| Task Type | Context Budget |
|-----------|---------------|
| Single file edit | 5-10% |
| Multi-file refactor | 15-25% |
| New feature | 20-35% |
| Architecture change | 40-60% |

If estimated budget >50% of remaining context, decompose further.

---

## Decomposition Prompts

### Initial Decomposition Prompt

```markdown
## Task Decomposition Request

### Project Goal
[INSERT FULL PROJECT GOAL]

### Decomposition Requirements
1. Apply MECE: No overlaps, no gaps
2. Right-size: 30-60 minutes per task
3. Clear boundaries: Unambiguous scope
4. Explicit dependencies: What must come first?

### For Each Task, Specify:
- id: Unique identifier (TASK-001 format)
- name: Clear imperative action
- description: What needs to be done
- type: "primitive" or "compound"
- estimated_time: In minutes
- dependencies:
    hard: [task IDs that must complete first]
    soft: [task IDs that are nice to have first]
- acceptance_criteria: [list of verifiable conditions]
- assigned_skill: [domain skill name or null]

### Validation
After generating:
[ ] No circular dependencies
[ ] All tasks together = complete goal
[ ] No overlapping scopes
[ ] Each task has 2+ acceptance criteria
[ ] Each task is 15-60 minutes
```

### Refinement Prompt

When a task is too large:

```markdown
## Decompose Further: [TASK-ID]

This task is too large (estimated [X] hours). Break it into subtasks.

### Current Task
[TASK DETAILS]

### Decomposition Constraints
- Each subtask: 30-60 minutes
- Maintain clear boundaries
- Preserve all acceptance criteria
- Update dependency graph

### Output
Replace [TASK-ID] with subtasks [TASK-ID-A], [TASK-ID-B], etc.
Update any tasks that depended on [TASK-ID].
```

### Domain Skill Assignment Prompt

```markdown
## Skill Assignment Review

For each task, determine the appropriate handler:

| Task | Keywords | Assigned Skill |
|------|----------|----------------|
| [task] | [keywords found] | [skill or "none"] |

### Skill Triggers
- 3D/WebGL/Three.js/shader → 3d-web-graphics-mastery
- bug/fix/security/debug → gas-debugger
- UI/UX/design/component → ui-ux-mastery-modular
- planning/state/orchestration → project-orchestrator
- Everything else → No skill (Claude handles directly)
```

---

## Example Decomposition

### Input: "Build a user authentication system"

### Output:

```yaml
tasks:
  - id: "TASK-001"
    name: "Design authentication database schema"
    type: primitive
    estimated_time: 30
    dependencies:
      hard: []
    acceptance_criteria:
      - "User table with email, password_hash, created_at"
      - "Session table with token, user_id, expires_at"
      - "Schema documented in docs/schema.md"
    assigned_skill: null
    
  - id: "TASK-002"
    name: "Build login form component"
    type: primitive
    estimated_time: 45
    dependencies:
      hard: ["TASK-001"]
    acceptance_criteria:
      - "Email/password inputs with validation"
      - "Loading state during submission"
      - "Error display for invalid credentials"
      - "Accessible (WCAG AA)"
    assigned_skill: "ui-ux-mastery-modular"
    
  - id: "TASK-003"
    name: "Implement login API endpoint"
    type: primitive
    estimated_time: 45
    dependencies:
      hard: ["TASK-001"]
    acceptance_criteria:
      - "POST /api/auth/login endpoint"
      - "Validates credentials against database"
      - "Returns JWT on success"
      - "Rate limiting (5 attempts/minute)"
    assigned_skill: null
    
  - id: "TASK-004"
    name: "Build registration form component"
    type: primitive
    estimated_time: 45
    dependencies:
      hard: ["TASK-001"]
    acceptance_criteria:
      - "Email/password/confirm password inputs"
      - "Client-side validation"
      - "Password strength indicator"
    assigned_skill: "ui-ux-mastery-modular"
    
  - id: "TASK-005"
    name: "Implement registration API endpoint"
    type: primitive
    estimated_time: 45
    dependencies:
      hard: ["TASK-001"]
    acceptance_criteria:
      - "POST /api/auth/register endpoint"
      - "Email uniqueness validation"
      - "Password hashing with bcrypt"
      - "Welcome email trigger"
    assigned_skill: null
    
  - id: "TASK-006"
    name: "Integrate auth with frontend routing"
    type: primitive
    estimated_time: 30
    dependencies:
      hard: ["TASK-002", "TASK-003", "TASK-004", "TASK-005"]
    acceptance_criteria:
      - "Protected routes redirect to login"
      - "Auth state persisted across refresh"
      - "Logout clears session"
    assigned_skill: null
    
  - id: "TASK-007"
    name: "Write authentication tests"
    type: primitive
    estimated_time: 60
    dependencies:
      hard: ["TASK-006"]
    acceptance_criteria:
      - "Unit tests for auth utilities"
      - "Integration tests for API endpoints"
      - "E2E test for login/logout flow"
      - "80%+ coverage on auth module"
    assigned_skill: "gas-debugger"
```

### Execution Order (from DAG)
```
Level 0: TASK-001 (schema)
Level 1: TASK-002, TASK-003, TASK-004, TASK-005 (parallel capable)
Level 2: TASK-006 (integration)
Level 3: TASK-007 (testing)
```
