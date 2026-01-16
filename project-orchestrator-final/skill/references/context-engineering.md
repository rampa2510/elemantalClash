# Context Engineering Reference

Patterns for managing context windows, memory systems, and session continuity.

## Table of Contents
- [Context Window Management](#context-window-management)
- [Memory Architecture](#memory-architecture)
- [Compaction Strategies](#compaction-strategies)
- [Cold-Start Patterns](#cold-start-patterns)
- [Attention Manipulation](#attention-manipulation)

---

## Context Window Management

### Context Budget Allocation

For a 200K token context window:

| Component | Tokens | Percentage | Notes |
|-----------|--------|------------|-------|
| System prompt | 3,000-5,000 | ~2% | Claude's base instructions |
| CLAUDE.md | 2,000-5,000 | ~2% | Project configuration |
| Skill metadata | 500-1,000 | <1% | All skill descriptions |
| Active skill | 5,000-15,000 | 5-7% | Loaded skill content |
| Conversation | 30,000-80,000 | 15-40% | User + assistant turns |
| Working files | 40,000-80,000 | 20-40% | Code, docs in context |
| Tool outputs | 20,000-40,000 | 10-20% | Results from tools |
| Output buffer | 20,000-40,000 | 10-20% | Space for response |

### Usage Thresholds

```python
CONTEXT_THRESHOLDS = {
    "optimal": 0.50,      # Best performance zone
    "acceptable": 0.65,   # Still good performance
    "caution": 0.75,      # Start planning checkpoint
    "warning": 0.80,      # Checkpoint now
    "critical": 0.90,     # Stop and save
    "emergency": 0.95     # Immediate exit
}
```

### Performance Degradation Curve

Research shows performance degrades non-linearly with context usage:

| Context Usage | Performance Impact |
|---------------|-------------------|
| 0-50% | Optimal - full capability |
| 50-65% | Minimal degradation |
| 65-75% | Noticeable quality drop |
| 75-85% | Significant degradation |
| 85-95% | Unreliable outputs |
| 95%+ | Failures likely |

**Critical Rule**: Avoid using the final 20% for complex tasks.

---

## Memory Architecture

### Three-Tier Memory System

Inspired by MemGPT's approach adapted for file-based implementation:

```
┌─────────────────────────────────────┐
│         WORKING MEMORY              │
│    (Current context window)         │
│    - Active task details            │
│    - Recent conversation            │
│    - Loaded files                   │
└─────────────────────────────────────┘
                 ↑↓
┌─────────────────────────────────────┐
│         SHORT-TERM MEMORY           │
│    (.orchestrator/session.jsonl)    │
│    - Session history                │
│    - Recent decisions               │
│    - Task progress                  │
└─────────────────────────────────────┘
                 ↑↓
┌─────────────────────────────────────┐
│         LONG-TERM MEMORY            │
│    (.orchestrator/knowledge/)       │
│    - Project context                │
│    - User preferences               │
│    - Historical decisions           │
│    - Archived sessions              │
└─────────────────────────────────────┘
```

### File-Based Memory Implementation

```
.orchestrator/
├── CONTEXT.md              # Cold-start summary (always load first)
├── state.yaml              # Current project state
├── session.jsonl           # Append-only session log
├── decisions.yaml          # Key decisions with rationale
├── todo.md                 # Active tasks (attention anchor)
├── checkpoints/
│   ├── manifest.yaml       # Checkpoint index
│   └── cp_*.yaml           # Individual checkpoints
└── knowledge/
    ├── project.yaml        # Static project info
    ├── user-prefs.yaml     # User preferences
    ├── repo-map.md         # Codebase structure
    └── glossary.yaml       # Domain terminology
```

### Memory Operations

```python
class MemoryManager:
    """Manage hierarchical memory system"""
    
    def __init__(self, orchestrator_path=".orchestrator"):
        self.path = orchestrator_path
    
    def load_to_working(self, scope: str = "minimal") -> dict:
        """Load appropriate memory into working context"""
        
        if scope == "minimal":
            # Just enough to orient
            return {
                "context": self._read("CONTEXT.md"),
                "current_task": self._get_current_task()
            }
        
        elif scope == "task":
            # Full context for current task
            return {
                "context": self._read("CONTEXT.md"),
                "state": self._read("state.yaml"),
                "task": self._get_current_task_full(),
                "recent_decisions": self._get_recent_decisions(5)
            }
        
        elif scope == "full":
            # Complete memory load (expensive)
            return {
                "context": self._read("CONTEXT.md"),
                "state": self._read("state.yaml"),
                "decisions": self._read("decisions.yaml"),
                "todo": self._read("todo.md")
            }
    
    def persist_to_short_term(self, event: dict):
        """Append event to session log"""
        event["timestamp"] = datetime.now().isoformat()
        with open(f"{self.path}/session.jsonl", "a") as f:
            f.write(json.dumps(event) + "\n")
    
    def persist_to_long_term(self, key: str, value: any):
        """Store in long-term knowledge"""
        knowledge_path = f"{self.path}/knowledge/{key}.yaml"
        with open(knowledge_path, "w") as f:
            yaml.dump(value, f)
    
    def update_context_summary(self, summary: str):
        """Update cold-start context"""
        self._write("CONTEXT.md", summary)
```

---

## Compaction Strategies

### When to Compact

Trigger compaction when:
- Context usage >70%
- Major phase transition
- Before loading large file
- After completing task group
- User requests new session

### What to Preserve

**Always Keep**:
- Project identity and goal
- Current phase and progress
- Active task details
- Key decisions (with rationale)
- File paths (for re-retrieval)
- Error patterns and lessons
- User preferences

**Can Discard**:
- Verbose tool outputs (keep summary)
- Intermediate reasoning (keep conclusions)
- Redundant context repetitions
- Detailed exploration dead-ends
- Full file contents (keep paths)
- Conversation pleasantries

### Compaction Algorithm

```python
def compact_context(conversation: list, state: dict) -> dict:
    """Compress conversation while preserving essentials"""
    
    preserved = {
        "summary": "",
        "decisions": [],
        "file_references": [],
        "current_task": None,
        "blockers": []
    }
    
    # Extract decisions
    for turn in conversation:
        if contains_decision(turn):
            preserved["decisions"].append(extract_decision(turn))
        
        if contains_file_reference(turn):
            preserved["file_references"].extend(extract_paths(turn))
        
        if contains_blocker(turn):
            preserved["blockers"].append(extract_blocker(turn))
    
    # Generate summary
    preserved["summary"] = generate_summary(
        original_length=len(conversation),
        key_points=extract_key_points(conversation),
        progress=state.get("phase_progress", 0)
    )
    
    # Current task always preserved in full
    preserved["current_task"] = get_active_task(state)
    
    return preserved
```

### Anchored Summary Pattern

Maintain a persistent summary that grows incrementally:

```python
def update_anchored_summary(existing_summary: str, new_content: str,
                           dropped_content: str) -> str:
    """Update summary without regenerating from scratch"""
    
    prompt = f"""
    ## Existing Summary
    {existing_summary}
    
    ## Content Being Dropped
    {dropped_content}
    
    ## New Content to Incorporate
    {new_content}
    
    Update the summary to:
    1. Preserve all key decisions from existing summary
    2. Add any important new information
    3. Include essence of dropped content if significant
    4. Keep under 500 words
    
    Return only the updated summary.
    """
    
    return generate_summary(prompt)
```

---

## Cold-Start Patterns

### Progressive Context Loading

Load context in stages based on need:

**Stage 1: Identity (Always, ~500 tokens)**
```markdown
# Project: [Name]
Goal: [One sentence]
Phase: [Current phase] ([X]% complete)
Active Task: [Task name]
```

**Stage 2: Context (On demand, ~2000 tokens)**
```markdown
## Recent Progress
- [Completed task 1]
- [Completed task 2]

## Key Decisions
1. [Decision]: [Rationale]

## Current Focus
[What we're working on and why]
```

**Stage 3: Detail (When needed, variable)**
```markdown
## Full Task Details
[Complete task specification]

## Related Files
[File paths and descriptions]

## Historical Context
[Previous session summaries]
```

### CONTEXT.md Template

```markdown
# Project: [PROJECT_NAME]

> Quick Summary: [One sentence describing the project]

## Current Status
- **Phase**: [planning|implementation|review|complete]
- **Progress**: [X]% complete
- **Active Task**: [TASK-ID] - [Task name]
- **Last Updated**: [Timestamp]

## What's Been Done
1. [Major accomplishment 1]
2. [Major accomplishment 2]
3. [Major accomplishment 3]

## Key Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| [Decision 1] | [Why] | [When] |
| [Decision 2] | [Why] | [When] |

## Important Files
| File | Purpose |
|------|---------|
| [path/to/file] | [What it contains] |

## Next Steps
1. Complete [current task]
2. Then [next task]
3. Then [following task]

## How to Resume
1. Read this file for context
2. Check `.orchestrator/state.yaml` for full state
3. Continue from [current task]

---
*Session History*
- [Date]: [What was accomplished]
- [Date]: [What was accomplished]
```

### Resume Protocol

```python
def resume_project(project_name: str = None) -> dict:
    """Resume project with optimal context loading"""
    
    # Stage 1: Load CONTEXT.md
    context = load_file(".orchestrator/CONTEXT.md")
    if not context:
        raise ProjectNotFoundError("No CONTEXT.md found")
    
    # Stage 2: Load state
    state = load_yaml(".orchestrator/state.yaml")
    
    # Stage 3: Identify current position
    current_task = find_current_task(state)
    
    # Stage 4: Check for pending human input
    human_input = load_file(".orchestrator/HUMAN_INPUT.md")
    if human_input:
        return {
            "status": "awaiting_input",
            "context": context,
            "pending": human_input
        }
    
    # Stage 5: Validate state
    is_valid, errors, warnings = validate_state(state)
    if not is_valid:
        return {
            "status": "needs_repair",
            "errors": errors
        }
    
    return {
        "status": "ready",
        "context": context,
        "state": state,
        "current_task": current_task,
        "phase": state["phase"],
        "progress": state.get("phase_progress", 0)
    }
```

---

## Attention Manipulation

### The todo.md Pattern

Keep a constantly-updated todo file that serves as an attention anchor:

```markdown
# Active Todo

## RIGHT NOW
- [ ] [Current immediate task]

## NEXT UP
- [ ] [Task 2]
- [ ] [Task 3]

## BLOCKED
- [ ] [Blocked task] - Waiting on: [what]

## DONE THIS SESSION
- [x] [Completed task 1]
- [x] [Completed task 2]

---
Updated: [timestamp]
Goal: [Project goal reminder]
```

### Why This Works

By reading and updating `todo.md` at the start and end of each action:
1. Agent "recites" current objectives
2. Prevents goal drift
3. Creates natural checkpoints
4. Maintains focus across context limits

### Implementation

```python
def update_todo(action: str, item: str = None):
    """Maintain todo.md attention anchor"""
    
    todo = load_file(".orchestrator/todo.md")
    
    if action == "start_task":
        todo = move_to_right_now(todo, item)
    
    elif action == "complete_task":
        todo = move_to_done(todo, item)
        todo = promote_next_to_current(todo)
    
    elif action == "block_task":
        todo = move_to_blocked(todo, item)
    
    todo = update_timestamp(todo)
    save_file(".orchestrator/todo.md", todo)
    
    # Always re-read after update (attention refresh)
    return load_file(".orchestrator/todo.md")
```

### End-of-Action Protocol

After every significant action:

```python
def end_of_action_protocol():
    """Refresh attention and persist state"""
    
    # 1. Update todo
    todo = update_todo("refresh")
    
    # 2. Check context usage
    usage = estimate_context_usage()
    if usage > 0.70:
        create_checkpoint(trigger="context_threshold")
    
    # 3. Update session log
    log_event({"type": "action_complete", "context_usage": usage})
    
    # 4. Re-read goal (attention anchor)
    goal = read_project_goal()
    
    return {
        "todo": todo,
        "context_usage": usage,
        "goal_reminder": goal
    }
```

---

## Context Optimization Tips

### 1. Use File References, Not Content

```python
# Bad: Loading entire file
file_content = read_file("large_file.py")  # 5000 tokens

# Good: Reference for later retrieval
file_ref = {"path": "large_file.py", "purpose": "main API routes"}  # 20 tokens
```

### 2. Structured Over Prose

```yaml
# Good: Structured (fewer tokens, easier to parse)
task:
  id: TASK-001
  status: in_progress
  assignee: null
  
# Bad: Prose (more tokens, harder to parse)
# "The first task with ID TASK-001 is currently in progress 
#  and has not been assigned to anyone yet."
```

### 3. Incremental Disclosure

```python
# Load in stages
def get_task_info(task_id: str, detail_level: str = "minimal"):
    if detail_level == "minimal":
        return {"id": task_id, "name": task.name, "status": task.status}
    
    if detail_level == "standard":
        return {**minimal, "criteria": task.acceptance_criteria}
    
    if detail_level == "full":
        return {**standard, "history": task.history, "notes": task.notes}
```

### 4. Prune Conversation History

Keep only the relevant parts of conversation:
- User's original request
- Key clarifications
- Final decisions
- Error messages (for debugging)

Discard:
- Intermediate attempts
- Verbose explanations
- Repeated information
