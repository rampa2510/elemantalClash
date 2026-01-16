# State Management Reference

File-based state persistence patterns for cross-session continuity.

## Table of Contents
- [State File Format](#state-file-format)
- [Checkpoint System](#checkpoint-system)
- [Atomic Updates](#atomic-updates)
- [State Validation](#state-validation)
- [Session Continuity](#session-continuity)

---

## State File Format

### Primary State: `.orchestrator/state.yaml`

```yaml
# Project Orchestrator State File
# Version: 1.0.0
# Last Updated: 2025-01-03T12:00:00Z

project:
  id: "proj_20250103_001"
  name: "PropHit v2 MVP"
  goal: |
    Build fractional real estate ownership platform with Aadhaar/PAN 
    verification and LLP contract generation for the Indian market.
  created: "2025-01-03T10:00:00Z"
  constraints:
    - "Claude Max only (no API)"
    - "File-based state persistence"
    - "Mobile-first design"

phase: "implementation"  # planning | implementation | review | complete
phase_started: "2025-01-03T11:00:00Z"
phase_progress: 0.35  # 0.0 to 1.0

tasks:
  - id: "TASK-001"
    name: "Design database schema for properties and ownership"
    status: "verified"
    type: "primitive"
    estimated_time: 45  # minutes
    assigned_skill: null
    dependencies:
      hard: []
      soft: []
    acceptance_criteria:
      - "Property table with location, price, ownership_percentage"
      - "User table with KYC status, Aadhaar hash"
      - "Ownership table linking users to properties"
      - "Transaction history table"
    started_at: "2025-01-03T10:15:00Z"
    completed_at: "2025-01-03T11:00:00Z"
    verified_at: "2025-01-03T11:05:00Z"
    outputs:
      - path: "docs/database-schema.md"
        description: "Complete schema documentation"
      - path: "prisma/schema.prisma"
        description: "Prisma schema file"
    review_notes: "Schema covers all entities. Approved."

  - id: "TASK-002"
    name: "Build property listing page with 3D viewer"
    status: "in_progress"
    type: "primitive"
    estimated_time: 60
    assigned_skill: "3d-web-graphics-mastery"
    dependencies:
      hard: ["TASK-001"]
      soft: []
    acceptance_criteria:
      - "Property grid with images and key details"
      - "3D model viewer for property visualization"
      - "Filtering by location, price, ownership %"
      - "Mobile-responsive layout"
    started_at: "2025-01-03T11:10:00Z"
    completed_at: null
    outputs: []
    current_progress: "3D viewer component complete, integrating with listing"

  - id: "TASK-003"
    name: "Implement Aadhaar/PAN verification flow"
    status: "pending"
    type: "primitive"
    estimated_time: 90
    assigned_skill: null
    dependencies:
      hard: ["TASK-001"]
      soft: ["TASK-002"]
    acceptance_criteria:
      - "Aadhaar OTP verification integration"
      - "PAN validation API integration"
      - "KYC status stored in user profile"
      - "Error handling for invalid documents"
    started_at: null
    outputs: []

checkpoints:
  - id: "cp_001"
    created: "2025-01-03T11:05:00Z"
    trigger: "task_verified"
    task_id: "TASK-001"
    description: "Database schema complete and verified"
    state_hash: "sha256:a1b2c3d4..."
    file: "checkpoints/cp_001.yaml"

session:
  id: "sess_20250103_001"
  started: "2025-01-03T10:00:00Z"
  last_updated: "2025-01-03T12:00:00Z"
  context_usage: 0.42
  compactions: 0
  notes: |
    Currently implementing property listing with 3D viewer.
    Using React Three Fiber for 3D integration.
    Next: Complete listing page, then move to KYC flow.

blocked_tasks: []
escalated_tasks: []
```

### Cold-Start Context: `.orchestrator/CONTEXT.md`

Human-readable summary for session resume:

```markdown
# Project: PropHit v2 MVP

## Quick Summary
Building a fractional real estate platform where users can purchase 
percentage stakes in properties via LLP contracts. Target: Indian market.

## Current Status
- **Phase**: Implementation (35% complete)
- **Active Task**: TASK-002 (Property listing with 3D viewer)
- **Completed**: Database schema (TASK-001)
- **Next Up**: Aadhaar/PAN verification (TASK-003)

## Key Decisions Made
1. Using Prisma for database ORM
2. React Three Fiber for 3D property visualization
3. Storing Aadhaar as hash (privacy compliance)

## Important Files
- Database schema: `docs/database-schema.md`
- Prisma schema: `prisma/schema.prisma`
- State file: `.orchestrator/state.yaml`

## How to Resume
1. Read this file for context
2. Check state.yaml for detailed task status
3. Continue TASK-002 (3D viewer integration)

## Session History
- Session 1 (Jan 3 AM): Completed planning and schema design
- Session 2 (Jan 3 PM): Started property listing page [current]
```

---

## Checkpoint System

### Checkpoint Triggers

| Trigger | When | Priority |
|---------|------|----------|
| `task_verified` | Task passes review | High |
| `milestone` | Phase transition | High |
| `pre_risky_op` | Before irreversible action | Critical |
| `context_threshold` | Context >60% | Medium |
| `user_request` | User says "checkpoint" | High |
| `time_interval` | Every 30 min of work | Low |

### Checkpoint File Format

```yaml
# .orchestrator/checkpoints/cp_001.yaml
checkpoint:
  id: "cp_001"
  created: "2025-01-03T11:05:00Z"
  trigger: "task_verified"
  
context:
  task_completed: "TASK-001"
  phase: "implementation"
  progress: 0.15
  
state_snapshot:
  # Full copy of state.yaml at checkpoint time
  project: {...}
  tasks: [...]
  
summary: |
  Completed database schema design. Tables created for properties,
  users, ownership stakes, and transactions. Schema documented and
  Prisma schema file generated.
  
files_created:
  - path: "docs/database-schema.md"
    hash: "sha256:..."
  - path: "prisma/schema.prisma"
    hash: "sha256:..."
    
next_task: "TASK-002"
```

### Checkpoint Manifest

```yaml
# .orchestrator/checkpoints/manifest.yaml
checkpoints:
  - id: "cp_001"
    created: "2025-01-03T11:05:00Z"
    trigger: "task_verified"
    task: "TASK-001"
    file: "cp_001.yaml"
    
  - id: "cp_002"
    created: "2025-01-03T12:30:00Z"
    trigger: "context_threshold"
    task: "TASK-002"
    file: "cp_002.yaml"
    parent: "cp_001"

latest: "cp_002"

retention:
  keep_last: 10
  keep_milestones: true
  max_age_days: 30
```

### Restore from Checkpoint

```python
def restore_checkpoint(checkpoint_id):
    """Restore state from a specific checkpoint"""
    
    # Load checkpoint manifest
    manifest = load_yaml(".orchestrator/checkpoints/manifest.yaml")
    
    # Find checkpoint
    checkpoint_file = None
    for cp in manifest["checkpoints"]:
        if cp["id"] == checkpoint_id:
            checkpoint_file = cp["file"]
            break
    
    if not checkpoint_file:
        raise ValueError(f"Checkpoint {checkpoint_id} not found")
    
    # Load checkpoint
    checkpoint = load_yaml(f".orchestrator/checkpoints/{checkpoint_file}")
    
    # Restore state
    state = checkpoint["state_snapshot"]
    save_yaml(".orchestrator/state.yaml", state)
    
    # Update CONTEXT.md
    update_context_md(
        summary=checkpoint["summary"],
        next_task=checkpoint["next_task"]
    )
    
    return state
```

---

## Atomic Updates

### Safe State Write Pattern

```python
import tempfile
import os
import shutil
from datetime import datetime

def atomic_state_update(state_path, new_state):
    """Write state atomically to prevent corruption"""
    
    # Add metadata
    new_state["session"]["last_updated"] = datetime.now().isoformat()
    
    # Write to temp file in same directory
    dir_path = os.path.dirname(state_path)
    fd, temp_path = tempfile.mkstemp(dir=dir_path, suffix=".yaml")
    
    try:
        with os.fdopen(fd, 'w') as f:
            yaml.dump(new_state, f, default_flow_style=False)
        
        # Atomic rename (POSIX guarantees atomicity)
        os.replace(temp_path, state_path)
        
    except Exception as e:
        # Cleanup temp file on failure
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise e
```

### Backup Before Risky Operations

```python
def backup_state():
    """Create backup before risky operation"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f".orchestrator/backups/state_{timestamp}.yaml"
    
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    shutil.copy(".orchestrator/state.yaml", backup_path)
    
    return backup_path
```

---

## State Validation

### Validation Rules

```python
def validate_state(state):
    """Validate state file consistency"""
    errors = []
    warnings = []
    
    # Required fields
    required_fields = ["project", "phase", "tasks", "session"]
    for field in required_fields:
        if field not in state:
            errors.append(f"Missing required field: {field}")
    
    if errors:
        return False, errors, warnings
    
    # Project validation
    if "id" not in state["project"]:
        errors.append("Project missing 'id'")
    if "name" not in state["project"]:
        errors.append("Project missing 'name'")
    
    # Phase validation
    valid_phases = ["planning", "implementation", "review", "complete"]
    if state["phase"] not in valid_phases:
        errors.append(f"Invalid phase: {state['phase']}")
    
    # Task validation
    task_ids = set()
    for task in state["tasks"]:
        # Check for duplicate IDs
        if task["id"] in task_ids:
            errors.append(f"Duplicate task ID: {task['id']}")
        task_ids.add(task["id"])
        
        # Check status
        valid_statuses = ["pending", "in_progress", "completed", 
                         "verified", "blocked", "needs_human"]
        if task["status"] not in valid_statuses:
            errors.append(f"Invalid status for {task['id']}: {task['status']}")
        
        # Check dependencies exist
        for dep in task.get("dependencies", {}).get("hard", []):
            if dep not in task_ids:
                errors.append(f"Task {task['id']} has non-existent dependency: {dep}")
        
        # Status consistency
        if task["status"] == "completed" and not task.get("completed_at"):
            warnings.append(f"Task {task['id']} completed but missing completed_at")
        
        if task["status"] == "verified" and not task.get("verified_at"):
            warnings.append(f"Task {task['id']} verified but missing verified_at")
    
    # Check for circular dependencies
    is_dag, result = validate_dag(state["tasks"])
    if not is_dag:
        errors.append(f"Circular dependency detected: {result}")
    
    return len(errors) == 0, errors, warnings
```

### Auto-Repair Patterns

```python
def auto_repair_state(state, errors):
    """Attempt automatic repair of common issues"""
    repairs = []
    
    for error in errors:
        if "missing completed_at" in error:
            # Find task and set completed_at to now
            task_id = extract_task_id(error)
            for task in state["tasks"]:
                if task["id"] == task_id:
                    task["completed_at"] = datetime.now().isoformat()
                    repairs.append(f"Set completed_at for {task_id}")
        
        if "missing verified_at" in error:
            task_id = extract_task_id(error)
            for task in state["tasks"]:
                if task["id"] == task_id:
                    task["verified_at"] = datetime.now().isoformat()
                    repairs.append(f"Set verified_at for {task_id}")
    
    return state, repairs
```

---

## Session Continuity

### Session Log Format

Append-only log of session activity:

```jsonl
{"timestamp": "2025-01-03T10:00:00Z", "event": "session_start", "session_id": "sess_001"}
{"timestamp": "2025-01-03T10:15:00Z", "event": "task_start", "task_id": "TASK-001"}
{"timestamp": "2025-01-03T11:00:00Z", "event": "task_complete", "task_id": "TASK-001"}
{"timestamp": "2025-01-03T11:05:00Z", "event": "task_verified", "task_id": "TASK-001"}
{"timestamp": "2025-01-03T11:05:00Z", "event": "checkpoint_created", "checkpoint_id": "cp_001"}
{"timestamp": "2025-01-03T11:10:00Z", "event": "task_start", "task_id": "TASK-002"}
{"timestamp": "2025-01-03T12:00:00Z", "event": "context_check", "usage": 0.42}
```

### Decision Log

Important decisions with rationale:

```yaml
# .orchestrator/decisions.yaml
decisions:
  - id: "dec_001"
    timestamp: "2025-01-03T10:30:00Z"
    task: "TASK-001"
    decision: "Use Prisma ORM instead of raw SQL"
    rationale: |
      - Type-safe database access
      - Built-in migration system
      - Team familiarity from previous projects
    alternatives_considered:
      - "Drizzle ORM": "Newer, less documentation"
      - "Raw SQL": "More control but more error-prone"
    
  - id: "dec_002"
    timestamp: "2025-01-03T11:15:00Z"
    task: "TASK-002"
    decision: "Use React Three Fiber for 3D rendering"
    rationale: |
      - Declarative React integration
      - Existing 3d-web-graphics-mastery skill
      - Good performance on mobile
    alternatives_considered:
      - "Raw Three.js": "More work to integrate with React"
      - "Babylon.js": "Heavier, less React-friendly"
```

### Progressive Context Loading

When resuming a session, load context progressively:

**Level 1 (Always load, ~500 tokens)**:
- CONTEXT.md summary
- Current phase and progress
- Active task name and status

**Level 2 (Load on demand, ~2000 tokens)**:
- Full task details for active task
- Dependencies and blockers
- Recent decisions

**Level 3 (Load if needed, variable)**:
- Full session history
- All checkpoints
- Complete decision log
