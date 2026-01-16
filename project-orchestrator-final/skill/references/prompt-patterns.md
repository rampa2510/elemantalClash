# Prompt Patterns Reference

Reasoning patterns for autonomous execution and structured problem-solving.

## Table of Contents
- [ReAct Pattern](#react-pattern)
- [Chain-of-Thought](#chain-of-thought)
- [Tree of Thoughts](#tree-of-thoughts)
- [Plan-and-Execute](#plan-and-execute)
- [Error Handling Prompts](#error-handling-prompts)
- [Thinking Budget Management](#thinking-budget-management)

---

## ReAct Pattern

ReAct (Reasoning + Acting) interleaves thinking with tool execution.

### Structure

```
Thought: [Reason about current situation and what to do next]
Action: [The specific action/tool to call]
Action Input: [Parameters for the action]
Observation: [Result from the action]
... (repeat until solved)
Thought: [Final reasoning]
Answer: [Final answer or result]
```

### When to Use

- Tasks requiring external tool interaction
- Information retrieval and verification
- Iterative refinement based on feedback
- Multi-step procedures with checkpoints

### ReAct Prompt Template

```markdown
## Task
{{TASK_DESCRIPTION}}

## Instructions
Work through this task step by step, alternating between thinking and acting.

For each step:
1. **Thought**: Reason about what you know and what you need to do next
2. **Action**: Choose an action (tool call, code execution, etc.)
3. **Observation**: Note the result of your action
4. **Repeat** until the task is complete

## Available Actions
- read_file: Read contents of a file
- write_file: Write content to a file
- run_command: Execute a shell command
- search: Search for information

## Begin
Thought: Let me analyze this task...
```

### Example

```
Thought: I need to fix the bug in auth.py. First, let me read the file.
Action: read_file
Action Input: {"path": "src/auth.py"}
Observation: [File contents showing login function]

Thought: I see the issue - line 45 doesn't handle null email.
Action: write_file
Action Input: {"path": "src/auth.py", "content": "...fixed code..."}
Observation: File written successfully.

Thought: Let me verify the fix by running tests.
Action: run_command
Action Input: {"command": "pytest test_auth.py"}
Observation: All tests passed.

Thought: The bug is fixed and verified.
Answer: Fixed null email handling in auth.py. All tests pass.
```

---

## Chain-of-Thought

CoT guides structured multi-step reasoning before reaching conclusions.

### Structure

```
<thinking>
Step 1: [First reasoning step]
Step 2: [Second reasoning step]
...
Step N: [Final reasoning step]
</thinking>

<answer>
[Conclusion based on reasoning]
</answer>
```

### When to Use

- Complex problems requiring multiple reasoning steps
- Mathematical or logical analysis
- Decisions with multiple factors
- Debugging and root cause analysis

### CoT Prompt Template

```markdown
## Problem
{{PROBLEM_DESCRIPTION}}

## Instructions
Think through this step by step before providing your answer.

Structure your response as:
1. Break down the problem into components
2. Analyze each component
3. Synthesize findings
4. Reach a conclusion

<thinking>
[Your step-by-step reasoning here]
</thinking>

<answer>
[Your final answer]
</answer>
```

### Zero-Shot CoT

Simply append "Let's think step by step" to any prompt:

```
Q: {{QUESTION}}

Let's think step by step.
```

This simple addition improves accuracy on reasoning tasks by 10-40%.

---

## Tree of Thoughts

ToT explores multiple reasoning paths, enabling backtracking and evaluation.

### Structure

```
Root Problem
├── Branch A: [Approach 1]
│   ├── Evaluation: [Score/Assessment]
│   └── Continue? [Yes/No]
├── Branch B: [Approach 2]
│   ├── Evaluation: [Score/Assessment]
│   └── Continue? [Yes/No]
└── Branch C: [Approach 3]
    ├── Evaluation: [Score/Assessment]
    └── Continue? [Yes/No]

Selected: Branch [X]
Final Solution: [...]
```

### When to Use

- Problems with multiple valid approaches
- Strategic planning with lookahead needed
- High-stakes decisions worth extra computation
- Creative problem-solving

**Note**: ToT uses significantly more tokens. Reserve for complex problems.

### ToT Prompt Template

```markdown
## Problem
{{PROBLEM_DESCRIPTION}}

## Instructions
Explore multiple approaches before committing to a solution.

### Phase 1: Generate Approaches
List 3 different ways to solve this problem:
1. [Approach A]
2. [Approach B]
3. [Approach C]

### Phase 2: Evaluate Each
For each approach, score on:
- Feasibility (1-10)
- Quality of outcome (1-10)
- Risk level (1-10, lower is better)

### Phase 3: Select and Execute
Choose the best approach and implement it.

If you hit a dead end, backtrack and try the next best approach.
```

---

## Plan-and-Execute

Separate planning from execution for complex multi-step tasks.

### Structure

```
## Planning Phase
Goal: [Ultimate goal]
Constraints: [Limitations]

Plan:
1. [Step 1] → Expected outcome: [...]
2. [Step 2] → Expected outcome: [...]
3. [Step 3] → Expected outcome: [...]

## Execution Phase
Step 1: [Execute] → Actual: [...] ✓/✗
Step 2: [Execute] → Actual: [...] ✓/✗
...

## Replan if Needed
[Adjust plan based on actual results]
```

### When to Use

- Multi-step projects
- Tasks where order matters
- When upfront planning saves time
- Coordinating across skills

### Plan-and-Execute Template

```markdown
## Goal
{{GOAL_DESCRIPTION}}

## Phase 1: Planning
Before taking any action, create a complete plan.

### Constraints
- {{Constraint 1}}
- {{Constraint 2}}

### Plan
| Step | Action | Expected Result | Dependencies |
|------|--------|-----------------|--------------|
| 1 | {{action}} | {{result}} | None |
| 2 | {{action}} | {{result}} | Step 1 |
| ... | ... | ... | ... |

### Risk Assessment
- What could go wrong?
- What's the fallback?

## Phase 2: Execution
Execute each step, noting actual vs expected results.

## Phase 3: Verification
Confirm all steps succeeded and goal is achieved.
```

---

## Error Handling Prompts

### Structured Error Recovery

```markdown
## Error Recovery Protocol

When encountering an error:

### 1. Analyze
- What went wrong?
- Is it recoverable?
- What's the root cause?

### 2. Options
List 2-3 alternative approaches:
1. [Alternative 1]: [Pros/Cons]
2. [Alternative 2]: [Pros/Cons]
3. [Alternative 3]: [Pros/Cons]

### 3. Select
Choose the most promising alternative based on:
- Likelihood of success
- Cost/effort required
- Risk level

### 4. Execute
Try the selected alternative.

### 5. Verify
Confirm the issue is resolved.

### Escalation Trigger
If same error occurs 3 times:
- Stop attempting fixes
- Summarize what was tried
- Request human assistance
```

### Defensive Execution Template

```markdown
## Execute with Safeguards

Before: [Pre-condition check]
Action: [The action to take]
After: [Post-condition check]
Rollback: [How to undo if needed]

### Execution
```python
# Pre-check
if not pre_condition_met():
    raise PreconditionError("Cannot proceed: [reason]")

# Create checkpoint
checkpoint = create_checkpoint()

try:
    # Execute action
    result = execute_action()
    
    # Post-check
    if not post_condition_met(result):
        raise PostconditionError("Action failed: [reason]")
    
    return result
    
except Exception as e:
    # Rollback
    restore_checkpoint(checkpoint)
    raise
```
```

---

## Thinking Budget Management

### Claude Code Thinking Triggers

Use these magic words to control thinking budget:

| Trigger | Budget | When to Use |
|---------|--------|-------------|
| "think" | Low | Simple tasks |
| "think hard" | Medium | Moderate complexity |
| "think harder" | High | Complex problems |
| "ultrathink" | Maximum (31,999 tokens) | Very complex analysis |

### Usage Examples

```markdown
# Low budget
Please think about how to fix this typo.

# Medium budget  
Think hard about the architecture for this feature.

# High budget
Think harder about potential security vulnerabilities.

# Maximum budget
Ultrathink: Analyze this complex system design and identify 
all potential failure modes, scalability issues, and 
optimization opportunities.
```

### When to Use Extended Thinking

**Use high budget for**:
- Architectural decisions
- Security analysis
- Complex debugging
- Multi-factor tradeoff analysis
- Strategic planning

**Avoid high budget for**:
- Simple tasks
- Clear requirements
- Well-defined procedures
- Time-sensitive operations

### Structured Thinking Request

```markdown
## Complex Analysis Request

I need you to deeply analyze this problem. Use extended thinking.

### Context
{{CONTEXT}}

### Question
{{QUESTION}}

### Analysis Requirements
1. Consider multiple perspectives
2. Identify edge cases
3. Evaluate tradeoffs
4. Provide confidence levels

### Output Format
<thinking>
[Deep analysis with multiple angles]
</thinking>

<recommendation>
[Final recommendation with rationale]
Confidence: [X]%
</recommendation>
```

---

## Pattern Selection Guide

| Situation | Pattern | Reason |
|-----------|---------|--------|
| Tool interaction needed | ReAct | Interleave reasoning with actions |
| Complex reasoning | CoT | Structure thought process |
| Multiple approaches | ToT | Explore and compare options |
| Multi-step project | Plan-Execute | Separate planning from doing |
| Error occurred | Error Recovery | Systematic recovery |
| High complexity | Extended Thinking | More computation budget |

### Combining Patterns

For complex tasks, combine patterns:

```
1. ToT → Explore approaches (planning)
2. CoT → Deep-dive on selected approach
3. ReAct → Execute with tool interactions
4. Error Recovery → Handle issues
```

Example:

```markdown
## Complex Feature Implementation

### Phase 1: Explore Options (ToT)
Consider 3 architectural approaches...

### Phase 2: Analyze Selected (CoT)
Think through the chosen approach step by step...

### Phase 3: Execute (ReAct)
Implement with tool interactions...

### If Error (Error Recovery)
Apply recovery protocol...
```
