# Complexity Estimation Reference

Frameworks for estimating task complexity and determining autonomous execution viability.

## Table of Contents
- [Complexity Factors](#complexity-factors)
- [Estimation Framework](#estimation-framework)
- [Autonomous Execution Criteria](#autonomous-execution-criteria)
- [Escalation Decision Matrix](#escalation-decision-matrix)
- [SWE-Bench Insights](#swe-bench-insights)

---

## Complexity Factors

### Primary Factors

| Factor | Weight | Low | Medium | High |
|--------|--------|-----|--------|------|
| Files Affected | 25% | 1 file | 2-4 files | 5+ files |
| Lines of Code | 20% | <30 LOC | 30-100 LOC | >100 LOC |
| Dependencies | 15% | 0-1 external | 2-3 external | 4+ external |
| Reversibility | 15% | Fully reversible | Partially | Irreversible |
| Ambiguity | 15% | Clear spec | Some unclear | Vague |
| Domain Expertise | 10% | General coding | Specialized | Expert only |

### Complexity Score Calculation

```python
def calculate_complexity(task: dict) -> tuple[float, str]:
    """Calculate complexity score (0-1) and category"""
    
    score = 0.0
    
    # Files affected (25%)
    files = task.get("estimated_files", 1)
    if files == 1:
        score += 0.05
    elif files <= 4:
        score += 0.15
    else:
        score += 0.25
    
    # Lines of code (20%)
    loc = task.get("estimated_loc", 20)
    if loc < 30:
        score += 0.04
    elif loc <= 100:
        score += 0.12
    else:
        score += 0.20
    
    # Dependencies (15%)
    deps = task.get("external_dependencies", 0)
    if deps <= 1:
        score += 0.03
    elif deps <= 3:
        score += 0.09
    else:
        score += 0.15
    
    # Reversibility (15%)
    if task.get("reversible", True):
        score += 0.03
    elif task.get("partially_reversible", False):
        score += 0.09
    else:
        score += 0.15
    
    # Ambiguity (15%)
    criteria_count = len(task.get("acceptance_criteria", []))
    if criteria_count >= 3:
        score += 0.03
    elif criteria_count >= 1:
        score += 0.09
    else:
        score += 0.15
    
    # Domain expertise (10%)
    domain = task.get("domain", "general")
    if domain == "general":
        score += 0.02
    elif domain in ["specialized", "security", "performance"]:
        score += 0.06
    else:
        score += 0.10
    
    # Categorize
    if score < 0.25:
        category = "trivial"
    elif score < 0.45:
        category = "small"
    elif score < 0.65:
        category = "substantial"
    else:
        category = "hard"
    
    return score, category
```

### Time Estimation Heuristics

Based on SWE-bench and METR research:

| Category | Complexity Score | Human Time | AI Success Rate |
|----------|------------------|------------|-----------------|
| Trivial | 0.00-0.25 | <15 min | ~95% |
| Small | 0.25-0.45 | 15-60 min | ~75% |
| Substantial | 0.45-0.65 | 1-4 hours | ~40% |
| Hard | 0.65-1.00 | >4 hours | <15% |

---

## Estimation Framework

### Quick Estimation Checklist

Before starting any task, answer these questions:

```markdown
## Task Complexity Assessment: [TASK_ID]

### Scope
- [ ] Single file change? (+0)
- [ ] Multiple files, same module? (+1)
- [ ] Multiple modules? (+2)
- [ ] Cross-cutting change? (+3)

### Clarity
- [ ] Clear acceptance criteria (3+)? (+0)
- [ ] Some criteria, some unclear? (+1)
- [ ] Vague requirements? (+2)
- [ ] No clear success definition? (+3)

### Risk
- [ ] Easily undone? (+0)
- [ ] Can revert with some effort? (+1)
- [ ] Difficult to reverse? (+2)
- [ ] Irreversible (data, external)? (+3)

### Dependencies
- [ ] No external deps? (+0)
- [ ] 1-2 well-known deps? (+1)
- [ ] 3+ deps or unfamiliar? (+2)
- [ ] Complex integration required? (+3)

### Total: [X] / 12

**Classification**:
- 0-3: Trivial → Execute autonomously
- 4-6: Small → Execute with checkpoint
- 7-9: Substantial → Decompose first
- 10-12: Hard → Must decompose or escalate
```

### Estimation by Task Type

| Task Type | Typical Complexity | Notes |
|-----------|-------------------|-------|
| Bug fix (clear repro) | Trivial-Small | If cause known |
| Bug fix (unclear) | Substantial-Hard | Investigation needed |
| New feature (small) | Small-Substantial | Depends on scope |
| Refactoring | Substantial | Many files usually |
| New integration | Substantial-Hard | External dependencies |
| Architecture change | Hard | Must decompose |
| Security fix | Varies | Needs careful review |
| Performance optimization | Substantial-Hard | Often requires profiling |

### Context Budget Estimation

Estimate context needed before starting:

```python
def estimate_context_needs(task: dict) -> dict:
    """Estimate context window budget for task"""
    
    base_budget = 0.15  # System prompt, skill, conversation
    
    # Files to read
    files_to_read = task.get("files_to_read", [])
    file_budget = len(files_to_read) * 0.03  # ~3% per file average
    
    # Complexity multiplier
    _, category = calculate_complexity(task)
    complexity_multiplier = {
        "trivial": 1.0,
        "small": 1.2,
        "substantial": 1.5,
        "hard": 2.0
    }[category]
    
    # Tool output estimation
    tool_budget = 0.10 if task.get("needs_search", False) else 0.05
    
    # Output buffer
    output_budget = 0.15
    
    total = (base_budget + file_budget) * complexity_multiplier + tool_budget + output_budget
    
    return {
        "estimated_usage": min(total, 0.95),
        "safe_to_start": total < 0.60,
        "needs_fresh_context": total > 0.50,
        "breakdown": {
            "base": base_budget,
            "files": file_budget,
            "tools": tool_budget,
            "output": output_budget,
            "multiplier": complexity_multiplier
        }
    }
```

---

## Autonomous Execution Criteria

### The 30-Minute Rule

Tasks optimally suited for autonomous execution:
- Take ~30 minutes for a human
- Have clear acceptance criteria
- Affect limited scope
- Are fully reversible
- Don't require human judgment calls

### Autonomous Execution Decision Tree

```
START
  │
  ├─ Is task >4 hours? ──────────────────────→ DECOMPOSE
  │
  ├─ Is action irreversible? ────────────────→ ESCALATE for approval
  │
  ├─ Are requirements ambiguous? ────────────→ CLARIFY before executing
  │
  ├─ Does it involve sensitive data? ────────→ ESCALATE
  │
  ├─ Is it security-critical? ───────────────→ ESCALATE for review
  │
  ├─ Context budget >50%? ───────────────────→ Consider CHECKPOINT first
  │
  ├─ Complexity score >0.65? ────────────────→ DECOMPOSE
  │
  └─ All clear ──────────────────────────────→ EXECUTE AUTONOMOUSLY
```

### Execution Level Classification

| Level | Description | When to Use |
|-------|-------------|-------------|
| **Full Auto** | Execute without pause | Trivial tasks, clear scope |
| **Auto + Checkpoint** | Execute, checkpoint after | Small tasks, some risk |
| **Auto + Review** | Execute, then self-review | Substantial tasks |
| **Supervised** | Pause at milestones | New domains, learning |
| **Human-in-Loop** | Approval each step | High-risk, irreversible |

```python
def determine_execution_level(task: dict) -> str:
    """Determine appropriate execution level"""
    
    score, category = calculate_complexity(task)
    
    # Overrides
    if task.get("irreversible", False):
        return "human_in_loop"
    
    if task.get("security_critical", False):
        return "supervised"
    
    if task.get("sensitive_data", False):
        return "supervised"
    
    # Default by category
    level_map = {
        "trivial": "full_auto",
        "small": "auto_checkpoint",
        "substantial": "auto_review",
        "hard": "supervised"
    }
    
    return level_map[category]
```

---

## Escalation Decision Matrix

### When to Escalate

| Condition | Action | Rationale |
|-----------|--------|-----------|
| Confidence <70% | Escalate | Uncertain about approach |
| Requirements conflict | Escalate | Need human decision |
| Irreversible action | Escalate | Too risky for auto |
| 3+ failed attempts | Escalate | Likely stuck |
| Scope creep detected | Escalate | Verify intent |
| Security implications | Escalate | Needs review |
| External system changes | Escalate | Production impact |
| Ambiguous success criteria | Escalate | Can't verify completion |

### Escalation Template

```markdown
## Escalation: [TASK_ID]

### Type
- [ ] Approval needed
- [ ] Clarification needed
- [ ] Decision required
- [ ] Review requested

### Context
**Task**: [Task name and description]
**Progress**: [What's been done]
**Blocker**: [Why escalating]

### The Question
[Specific question or decision needed]

### Options Considered
1. **Option A**: [Description]
   - Pros: [List]
   - Cons: [List]
   
2. **Option B**: [Description]
   - Pros: [List]
   - Cons: [List]

### Recommendation
[Your recommendation if you have one]

### To Proceed
Reply with your choice, or provide additional guidance.
```

### Escalation vs. Decomposition

Sometimes "escalate" really means "decompose first":

| Symptom | Escalate? | Decompose? |
|---------|-----------|------------|
| Task too large | No | Yes |
| Requirements unclear | Yes | Maybe after |
| Technical blocker | Yes | No |
| Multiple approaches viable | Maybe | No |
| Risk too high | Yes | No |
| Missing information | Yes | No |

---

## SWE-Bench Insights

### Task Difficulty Distribution

From SWE-bench Verified analysis:

| Difficulty | % of Tasks | Human Time | Files Changed | LOC Changed |
|------------|------------|------------|---------------|-------------|
| Easy | 40% | <15 min | 1 | 5-15 |
| Medium | 35% | 15-60 min | 1-2 | 15-50 |
| Hard | 25% | >60 min | 2+ | 50-200+ |

### Success Predictors

Factors that predict AI success:

**Positive Indicators**:
- Single file change
- Clear test case
- Well-documented codebase
- Standard library usage
- Simple fix pattern

**Negative Indicators**:
- Cross-file dependencies
- No existing tests
- Complex setup required
- External API changes
- Performance-sensitive code

### Practical Thresholds

Based on current AI capabilities (2025):

```python
AUTONOMOUS_THRESHOLDS = {
    # High confidence autonomous
    "auto_execute": {
        "max_files": 2,
        "max_loc": 50,
        "min_criteria": 2,
        "max_dependencies": 1,
        "reversible": True
    },
    
    # Autonomous with checkpoint
    "auto_checkpoint": {
        "max_files": 4,
        "max_loc": 100,
        "min_criteria": 1,
        "max_dependencies": 3,
        "reversible": True  # Or partially
    },
    
    # Requires decomposition
    "must_decompose": {
        "min_files": 5,
        "min_loc": 100,
        "complexity_score": 0.65
    },
    
    # Requires human
    "must_escalate": {
        "irreversible": True,
        "security_critical": True,
        "no_criteria": True,
        "confidence": "<0.70"
    }
}
```

---

## Estimation Examples

### Example 1: Simple Bug Fix

```yaml
task: "Fix null pointer in user profile display"
estimation:
  files: 1
  loc: 5-10
  criteria:
    - "No crash on null user"
    - "Shows 'Guest' for anonymous"
  dependencies: 0
  reversible: true
  
complexity:
  score: 0.12
  category: trivial
  execution_level: full_auto
  estimated_time: 10 min
```

### Example 2: New Feature

```yaml
task: "Add password reset flow"
estimation:
  files: 4-6
  loc: 150-200
  criteria:
    - "Email with reset link"
    - "Token expires in 1 hour"
    - "Password validation"
    - "Success confirmation"
  dependencies: 2 (email service, token library)
  reversible: true
  
complexity:
  score: 0.58
  category: substantial
  execution_level: auto_review
  estimated_time: 2-3 hours
  
recommendation: DECOMPOSE into subtasks:
  - "Create reset token endpoint" (30 min)
  - "Build email template" (20 min)
  - "Create password update endpoint" (30 min)
  - "Build reset form UI" (45 min)
  - "Add validation and error handling" (30 min)
  - "Write tests" (45 min)
```

### Example 3: Architecture Change

```yaml
task: "Migrate from REST to GraphQL"
estimation:
  files: 20+
  loc: 500+
  criteria:
    - "All endpoints have GraphQL equivalent"
    - "No breaking changes to clients"
    - "Performance maintained"
  dependencies: 3+ (GraphQL server, schema tools, client)
  reversible: partially (data migrations)
  
complexity:
  score: 0.89
  category: hard
  execution_level: supervised
  estimated_time: 20+ hours
  
recommendation: MUST DECOMPOSE
  - This is an epic, not a task
  - Break into phases (schema design, implementation, migration)
  - Each phase has multiple tasks
  - Needs human checkpoints between phases
```
