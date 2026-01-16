# Failure Recovery Reference

Defensive patterns, failure detection, and recovery procedures for resilient orchestration.

## Table of Contents
- [Real-World Case Studies](#real-world-case-studies)
- [Failure Taxonomy](#failure-taxonomy)
- [Detection Mechanisms](#detection-mechanisms)
- [Recovery Procedures](#recovery-procedures)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)
- [Defensive Design Principles](#defensive-design-principles)

---

## Real-World Case Studies

### The $47K Multi-Agent Disaster

A documented incident where a multi-agent AI system ran unsupervised:

```
Timeline:
- Hour 0: User starts autonomous coding task
- Hour 2: Agent encounters error, spawns helper agents
- Hour 4: Agents enter loop, each spawning more agents  
- Hour 8: 50+ agents running simultaneously
- Hour 12: User discovers $47,000 API bill

Root Causes:
1. No hard limits on agent spawning
2. No cost monitoring or circuit breakers
3. No human-in-the-loop checkpoints
4. Agents could spawn unlimited sub-agents
```

**Lessons applied to our orchestrator:**
- Hard iteration limits (MAX_ITERATIONS = 3)
- Single-session, sequential execution (no agent spawning)
- Checkpoint-based human review
- Context monitoring with auto-pause

### Production AI Agent Failure Rates

Research findings on AI agent reliability:

| Study/Source | Failure Rate | Key Finding |
|--------------|--------------|-------------|
| Berkeley MAST | 41% | Multi-agent coordination failures |
| SWE-bench | 86.7% | Autonomous coding task failures |
| Industry average | 50-70% | Production deployment issues |
| Our target | <20% | With orchestrator guardrails |

**Why agents fail:**
1. No clear stopping conditions
2. Context window exhaustion
3. Hallucinated tool outputs
4. Goal drift over long sessions
5. Missing error handling

---

## Failure Taxonomy

### Agent-Specific Failures

| Failure Type | Description | Detection | Frequency |
|--------------|-------------|-----------|-----------|
| Context Exhaustion | Performance degrades as context fills | Token count >80% | Common |
| Infinite Loop | Repeating same action/output | Output similarity >0.8 | Common |
| Hallucinated Progress | Claims completion when incomplete | Verification fails | Moderate |
| Scope Creep | Pursues imaginary follow-up tasks | Task drift detection | Moderate |
| Goal Drift | Forgets original objective | State comparison | Common in long sessions |
| Premature Termination | Stops before task complete | Acceptance criteria unmet | Moderate |

### Multi-Agent Failures (From Berkeley MAST Research)

| Category | Percentage | Examples |
|----------|------------|----------|
| Specification & Design | 37% | Role disobedience, unclear boundaries |
| Inter-Agent Misalignment | 31% | Information withholding, format mismatches |
| Task Verification | 31% | Incomplete checks, false positives |

### Code Generation Failures

| Failure Type | Rate | Impact |
|--------------|------|--------|
| Fundamental code errors | 52.6% | Code doesn't work |
| Execution failures | 31.7% | Requires manual debugging |
| Missing dependencies | 10.5% | Environment issues |
| Security vulnerabilities | Variable | Production risk |

---

## Detection Mechanisms

### Loop Detection

```python
import hashlib
from collections import deque

class LoopDetector:
    """Detect infinite loops via output similarity"""
    
    def __init__(self, window_size=5, similarity_threshold=0.8):
        self.recent_outputs = deque(maxlen=window_size)
        self.similarity_threshold = similarity_threshold
        self.hash_history = set()
    
    def check(self, output: str) -> tuple[bool, str]:
        """Returns (is_loop, reason)"""
        
        # Exact match detection (fastest)
        output_hash = hashlib.sha256(output.encode()).hexdigest()[:16]
        if output_hash in self.hash_history:
            return True, "exact_repetition"
        self.hash_history.add(output_hash)
        
        # Semantic similarity detection
        for prev_output in self.recent_outputs:
            similarity = self._jaccard_similarity(output, prev_output)
            if similarity >= self.similarity_threshold:
                return True, f"high_similarity_{similarity:.2f}"
        
        self.recent_outputs.append(output)
        return False, None
    
    def _jaccard_similarity(self, a: str, b: str) -> float:
        """Jaccard similarity of word sets"""
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        if not words_a or not words_b:
            return 0.0
        intersection = len(words_a & words_b)
        union = len(words_a | words_b)
        return intersection / union
    
    def reset(self):
        """Reset detector state"""
        self.recent_outputs.clear()
        self.hash_history.clear()
```

### Context Exhaustion Monitor

```python
class ContextMonitor:
    """Monitor context window usage"""
    
    THRESHOLDS = {
        "healthy": 0.60,
        "warning": 0.70,
        "critical": 0.80,
        "emergency": 0.90
    }
    
    def __init__(self, max_tokens=200000):
        self.max_tokens = max_tokens
    
    def check(self, current_tokens: int) -> tuple[str, str]:
        """Returns (status, recommendation)"""
        usage = current_tokens / self.max_tokens
        
        if usage >= self.THRESHOLDS["emergency"]:
            return "EMERGENCY", "Stop immediately. Save state and start new session."
        
        if usage >= self.THRESHOLDS["critical"]:
            return "CRITICAL", "Create checkpoint now. Consider new session."
        
        if usage >= self.THRESHOLDS["warning"]:
            return "WARNING", "Approaching limit. Avoid loading large files."
        
        return "OK", f"Context at {usage*100:.0f}%. Healthy."
    
    def estimate_remaining_capacity(self, current_tokens: int) -> dict:
        """Estimate what can fit in remaining context"""
        remaining = self.max_tokens - current_tokens
        
        return {
            "remaining_tokens": remaining,
            "can_load_large_file": remaining > 50000,
            "can_do_complex_task": remaining > 30000,
            "should_checkpoint": remaining < 40000
        }
```

### Goal Drift Detection

```python
def detect_goal_drift(original_goal: str, current_activity: str, 
                      task_history: list) -> tuple[bool, float]:
    """Detect if agent has drifted from original goal"""
    
    # Extract key terms from original goal
    goal_terms = set(extract_key_terms(original_goal))
    
    # Check current activity alignment
    activity_terms = set(extract_key_terms(current_activity))
    
    # Calculate overlap
    if not goal_terms:
        return False, 1.0
    
    overlap = len(goal_terms & activity_terms) / len(goal_terms)
    
    # Check task history for progressive drift
    if len(task_history) >= 3:
        recent_terms = set()
        for task in task_history[-3:]:
            recent_terms.update(extract_key_terms(task))
        
        recent_overlap = len(goal_terms & recent_terms) / len(goal_terms)
        if recent_overlap < 0.3:
            return True, recent_overlap
    
    return overlap < 0.2, overlap
```

### State Corruption Validator

```python
def validate_state_integrity(state: dict) -> tuple[bool, list, list]:
    """Comprehensive state validation"""
    errors = []
    warnings = []
    
    # Schema validation
    required_fields = ["project", "phase", "tasks", "session"]
    for field in required_fields:
        if field not in state:
            errors.append(f"Missing required field: {field}")
    
    if errors:
        return False, errors, warnings
    
    # Project validation
    project = state.get("project", {})
    if not project.get("id"):
        errors.append("Project missing 'id'")
    if not project.get("name"):
        errors.append("Project missing 'name'")
    if not project.get("goal"):
        warnings.append("Project missing 'goal'")
    
    # Phase validation
    valid_phases = ["planning", "implementation", "review", "complete"]
    if state["phase"] not in valid_phases:
        errors.append(f"Invalid phase: {state['phase']}")
    
    # Task validation
    task_ids = set()
    for task in state.get("tasks", []):
        # Duplicate check
        if task["id"] in task_ids:
            errors.append(f"Duplicate task ID: {task['id']}")
        task_ids.add(task["id"])
        
        # Status check
        valid_statuses = ["pending", "in_progress", "completed", 
                         "verified", "blocked", "needs_human"]
        if task.get("status") not in valid_statuses:
            errors.append(f"Invalid status for {task['id']}: {task.get('status')}")
        
        # Dependency check
        for dep in task.get("dependencies", {}).get("hard", []):
            if dep not in task_ids and dep not in [t["id"] for t in state["tasks"]]:
                errors.append(f"Task {task['id']} references non-existent dependency: {dep}")
        
        # Consistency checks
        if task.get("status") == "completed" and not task.get("completed_at"):
            warnings.append(f"Task {task['id']} completed but missing completed_at")
        if task.get("status") == "in_progress" and not task.get("started_at"):
            warnings.append(f"Task {task['id']} in_progress but missing started_at")
    
    # DAG validation (no cycles)
    is_dag, cycle_info = validate_dependency_dag(state["tasks"])
    if not is_dag:
        errors.append(f"Circular dependency: {cycle_info}")
    
    return len(errors) == 0, errors, warnings
```

---

## Recovery Procedures

### Context Exhaustion Recovery

```markdown
## Recovery: Context Exhaustion

**Trigger**: Context usage >80%

**Procedure**:

1. **Immediate Actions**
   - Stop current task execution
   - Do not load any new files
   - Do not start complex reasoning

2. **State Preservation**
   ```bash
   # Create emergency checkpoint
   python scripts/checkpoint.py create --trigger emergency
   ```

3. **Generate Session Summary**
   Update `.orchestrator/CONTEXT.md`:
   - What was accomplished this session
   - Current task state
   - Key decisions made
   - Next steps for resumption

4. **User Communication**
   ```
   ⚠️ Context window at [X]%. 
   
   I've saved the project state. To continue:
   1. Start a new conversation
   2. Say "resume [project name]"
   
   Current progress: [summary]
   Next task: [task name]
   ```

5. **Clean Exit**
   - Ensure state file is written
   - Verify checkpoint created
   - End conversation gracefully
```

### Infinite Loop Recovery

```markdown
## Recovery: Infinite Loop

**Trigger**: 3+ similar outputs detected

**Procedure**:

1. **Break Immediately**
   - Stop current execution
   - Log the repeating pattern

2. **Analyze Pattern**
   ```
   What's repeating:
   - Same error message?
   - Same failed approach?
   - Same request to user?
   ```

3. **Try Alternative Approaches**
   
   **Approach A**: Different decomposition
   - Break task into smaller pieces
   - Try different order
   
   **Approach B**: Different tool
   - If code isn't working, try different library
   - If file approach fails, try API
   
   **Approach C**: Simplify
   - Remove constraints
   - Solve simpler version first

4. **Escalation**
   If 2 alternatives fail:
   ```markdown
   ## Loop Detected - Human Input Required
   
   I'm stuck in a loop trying to: [task]
   
   Pattern: [what keeps repeating]
   
   Tried:
   1. [approach 1] - Failed because: [reason]
   2. [approach 2] - Failed because: [reason]
   
   I need help with: [specific question]
   ```

5. **State Update**
   - Mark task as "blocked"
   - Record loop pattern in task notes
   - Create HUMAN_INPUT.md
```

### State Corruption Recovery

```markdown
## Recovery: State Corruption

**Trigger**: State validation fails

**Procedure**:

1. **Assess Severity**
   - Warnings only? Continue with fixes
   - Errors? Attempt auto-repair
   - Critical? Restore from checkpoint

2. **Auto-Repair Attempt**
   ```python
   # Common auto-repairs
   repairs = {
       "missing_timestamp": add_current_timestamp,
       "invalid_status": reset_to_pending,
       "orphan_dependency": remove_dependency,
       "duplicate_id": rename_duplicate
   }
   ```

3. **Checkpoint Restore**
   If auto-repair fails:
   ```bash
   # List available checkpoints
   python scripts/checkpoint.py list
   
   # Restore most recent valid
   python scripts/checkpoint.py restore --latest
   ```

4. **Manual Recovery**
   If no valid checkpoint:
   - Read session log for history
   - Reconstruct state from outputs
   - Ask user to confirm current status

5. **Prevention**
   - Always validate before save
   - Use atomic writes
   - Checkpoint more frequently
```

### Task Stuck Recovery

```markdown
## Recovery: Task Stuck

**Trigger**: No progress after 3 attempts

**Procedure**:

1. **Diagnose**
   - Is the task too complex? → Decompose
   - Missing information? → Escalate
   - Technical blocker? → Try alternative
   - Outside capabilities? → Escalate

2. **Decomposition Attempt**
   If task is >1 hour estimated:
   - Break into 30-min subtasks
   - Identify specific blocker
   - Solve smallest piece first

3. **Alternative Approach**
   ```
   Original approach: [what was tried]
   Alternative 1: [different method]
   Alternative 2: [simplify requirements]
   Alternative 3: [partial solution + TODO]
   ```

4. **Escalation**
   Create HUMAN_INPUT.md:
   - What was attempted
   - Where exactly it's stuck
   - What decision is needed
   - Suggested options
```

---

## Circuit Breaker Pattern

Prevent cascading failures with circuit breaker:

```python
class CircuitBreaker:
    """Prevent repeated failures from cascading"""
    
    STATES = ["CLOSED", "OPEN", "HALF_OPEN"]
    
    def __init__(self, failure_threshold=3, recovery_timeout=300):
        self.state = "CLOSED"
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout  # seconds
        self.last_failure_time = None
    
    def can_execute(self) -> bool:
        """Check if execution is allowed"""
        if self.state == "CLOSED":
            return True
        
        if self.state == "OPEN":
            # Check if recovery timeout passed
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                return True
            return False
        
        if self.state == "HALF_OPEN":
            return True  # Allow one test request
        
        return False
    
    def record_success(self):
        """Record successful execution"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def record_failure(self):
        """Record failed execution"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
    
    def get_fallback_action(self) -> str:
        """Get action when circuit is open"""
        return "escalate_to_human"
```

### Usage in Orchestrator

```python
# Global circuit breakers for different failure types
breakers = {
    "file_operations": CircuitBreaker(failure_threshold=3),
    "code_generation": CircuitBreaker(failure_threshold=2),
    "external_apis": CircuitBreaker(failure_threshold=2),
    "self_review": CircuitBreaker(failure_threshold=3)
}

def execute_with_breaker(operation_type: str, func, *args):
    """Execute function with circuit breaker protection"""
    breaker = breakers.get(operation_type)
    
    if not breaker.can_execute():
        return {"status": "circuit_open", "action": breaker.get_fallback_action()}
    
    try:
        result = func(*args)
        breaker.record_success()
        return {"status": "success", "result": result}
    except Exception as e:
        breaker.record_failure()
        return {"status": "failure", "error": str(e)}
```

---

## Defensive Design Principles

### 1. Hard Limits First

Always set limits BEFORE loops:

```python
MAX_ITERATIONS = 10
MAX_RETRIES = 3
MAX_CONTEXT_USAGE = 0.75

for i in range(MAX_ITERATIONS):
    # ... work ...
    if done:
        break
else:
    # Hit limit - escalate
    create_human_input_request("Max iterations reached")
```

### 2. Checkpoint on Every State Change

```python
def update_task_status(task_id: str, new_status: str):
    """Update status with automatic checkpoint"""
    state = load_state()
    task = find_task(state, task_id)
    
    old_status = task["status"]
    task["status"] = new_status
    task[f"{new_status}_at"] = datetime.now().isoformat()
    
    save_state(state)
    
    # Checkpoint on significant transitions
    if new_status in ["completed", "verified", "blocked"]:
        create_checkpoint(
            trigger=f"status_{old_status}_to_{new_status}",
            task_id=task_id
        )
```

### 3. External Validation Required

Never trust self-assessment alone:

```python
def verify_task_completion(task_id: str) -> bool:
    """Verify task with external signals"""
    task = get_task(task_id)
    
    validations = []
    
    # Syntax validation (external)
    if task.outputs_code:
        validations.append(run_syntax_check(task.outputs))
    
    # Test validation (external)
    if task.has_tests:
        validations.append(run_tests(task.test_files))
    
    # Lint validation (external)
    if task.outputs_code:
        validations.append(run_linter(task.outputs))
    
    # Only then do self-review
    if all(validations):
        return run_self_review(task)
    
    return False
```

### 4. Fresh Context for Major Phases

```python
def should_start_fresh_context(current_phase: str, next_phase: str,
                               context_usage: float) -> bool:
    """Determine if new session needed for phase transition"""
    
    major_transitions = [
        ("planning", "implementation"),
        ("implementation", "review"),
    ]
    
    if (current_phase, next_phase) in major_transitions:
        if context_usage > 0.50:
            return True
    
    if context_usage > 0.70:
        return True
    
    return False
```

### 5. Fail-Safe Defaults

```python
# Always have safe defaults
DEFAULT_MAX_TASK_TIME = 60  # minutes
DEFAULT_MAX_ITERATIONS = 3
DEFAULT_CHECKPOINT_INTERVAL = 30  # minutes

def get_config(key: str, default=None):
    """Get config with fail-safe default"""
    try:
        config = load_config()
        return config.get(key, default)
    except:
        return default
```

---

## Monitoring Checklist

Before each task:
```
[ ] Context usage <70%?
[ ] Circuit breakers closed?
[ ] State validates?
[ ] Dependencies satisfied?
```

After each task:
```
[ ] Output matches criteria?
[ ] No errors in execution?
[ ] State updated correctly?
[ ] Checkpoint if needed?
```

Session health:
```
[ ] No repeated failures?
[ ] Progress being made?
[ ] Goal still aligned?
[ ] Human input needed?
```
