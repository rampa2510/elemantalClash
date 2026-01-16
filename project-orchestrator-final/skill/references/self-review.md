# Self-Review Reference

Patterns for effective self-critique that catches issues before human review.

## Table of Contents
- [Review Philosophy](#review-philosophy)
- [Critique Prompt Templates](#critique-prompt-templates)
- [Evaluation Dimensions](#evaluation-dimensions)
- [Stopping Conditions](#stopping-conditions)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Integration with gas-debugger](#integration-with-gas-debugger)

---

## Review Philosophy

### Core Principles

1. **External Validation Over Self-Assessment**: Research shows pure self-correction often degrades quality. Always include external signals (tests, validators, linting).

2. **Genuine Criticism Required**: Force identification of at least 2 potential improvements, even for good work. Prevents rubber-stamping.

3. **Bounded Iteration**: Maximum 3 review cycles. Diminishing returns after that.

4. **Evidence-Based Verdicts**: Every PASS verdict must cite specific verification performed.

### The Self-Review Paradox

LLMs are often overconfident in their own outputs. Mitigate by:
- Requiring explicit verification steps
- Using binary pass/fail (not Likert scales)
- Separating generator and critic prompts
- Including external validation (tests, syntax checks)

---

## Critique Prompt Templates

### Quick Review (After Each Task) - Phase 1 of 3

```markdown
## Quick Review: [TASK_ID]

### Output
[INSERT OUTPUT - code, document, etc.]

### Acceptance Criteria
[LIST FROM TASK DEFINITION]

### Quick Checks
Run these validations:
1. [ ] Syntax valid (no parse errors)
2. [ ] Criteria addressed (check each one)
3. [ ] No obvious bugs (scan for common issues)
4. [ ] Output matches expected format

### Output
```json
{
  "checks_passed": 4,
  "checks_failed": 0,
  "quick_verdict": "PASS" | "FIX_NEEDED",
  "issues": []
}
```
```

### Deep Review (After Task Group)

```markdown
## Deep Review: [TASK_ID or TASK_GROUP]

### Output to Review
[INSERT COMPLETE OUTPUT]

### Original Requirements
[FULL REQUIREMENTS AND ACCEPTANCE CRITERIA]

### Evaluation Dimensions

**1. Correctness (40%)**
- Does this actually solve the stated problem?
- Would a user get the expected result?
- Are edge cases handled?

**2. Completeness (30%)**
- Are ALL requirements addressed?
- Is anything missing that should be there?
- Check each criterion individually.

**3. Quality (20%)**
- Is this production-ready or a prototype?
- Would a senior developer approve this?
- Are there code smells or anti-patterns?

**4. Safety (10%)**
- Are there security vulnerabilities?
- Could this break existing functionality?
- Are there performance concerns?

### Required Response Format
```json
{
  "verdict": "PASS" | "NEEDS_REVISION" | "MAJOR_ISSUES" | "ESCALATE",
  "confidence": 0.85,
  "scores": {
    "correctness": 0.9,
    "completeness": 0.8,
    "quality": 0.85,
    "safety": 0.95
  },
  "weighted_score": 0.87,
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "dimension": "correctness" | "completeness" | "quality" | "safety",
      "location": "file:line or description",
      "problem": "What's wrong",
      "fix": "How to fix it",
      "effort": "trivial" | "small" | "medium" | "large"
    }
  ],
  "tests_performed": [
    "Syntax validation via AST parse",
    "Ran existing unit tests",
    "Manual trace of main flow"
  ],
  "improvements_possible": [
    "Even if minor, list at least 2",
    "This prevents rubber-stamping"
  ]
}
```

### Critical Rules
- You MUST find at least 2 potential improvements
- If claiming PASS with confidence >0.9, list specific tests run
- Never use vague praise without evidence
- "Looks good" is NOT an acceptable review
```

### Human Review Preparation

```markdown
## Human Review Package: [MILESTONE]

### Summary
[2-3 sentence summary of what was built]

### Deliverables
| Item | Location | Status |
|------|----------|--------|
| [deliverable] | [path] | [complete/partial] |

### Decisions Made
1. [Decision]: [Rationale]
2. [Decision]: [Rationale]

### Known Limitations
- [Limitation 1]
- [Limitation 2]

### Questions for Human
1. [Specific question needing human judgment]
2. [Specific question needing human judgment]

### Risks Identified
| Risk | Impact | Mitigation |
|------|--------|------------|
| [risk] | [high/med/low] | [what we did] |

### Recommendation
[APPROVE / APPROVE_WITH_CHANGES / NEEDS_DISCUSSION]
```

---

## Evaluation Dimensions

### Dimension: Correctness

| Score | Meaning |
|-------|---------|
| 1.0 | Works perfectly for all cases |
| 0.8 | Works for main cases, minor edge case issues |
| 0.6 | Works but has notable bugs |
| 0.4 | Partially works, significant issues |
| 0.2 | Mostly broken |
| 0.0 | Does not work at all |

**Verification Methods**:
- Run code and check output
- Trace logic manually
- Test edge cases
- Compare to requirements

### Dimension: Completeness

| Score | Meaning |
|-------|---------|
| 1.0 | All requirements met |
| 0.8 | Most requirements met, minor omissions |
| 0.6 | Core requirements met, notable omissions |
| 0.4 | Only basic requirements met |
| 0.2 | Few requirements met |
| 0.0 | Requirements not addressed |

**Verification Methods**:
- Check each acceptance criterion
- Look for implicit requirements
- Consider user expectations

### Dimension: Quality

| Score | Meaning |
|-------|---------|
| 1.0 | Production-ready, exemplary |
| 0.8 | Good quality, minor improvements possible |
| 0.6 | Acceptable, needs polish |
| 0.4 | Works but needs refactoring |
| 0.2 | Hacky, technical debt |
| 0.0 | Unacceptable quality |

**Verification Methods**:
- Code style/formatting
- Naming conventions
- Error handling
- Documentation
- DRY/SOLID principles

### Dimension: Safety

| Score | Meaning |
|-------|---------|
| 1.0 | No risks identified |
| 0.8 | Minor risks, mitigated |
| 0.6 | Moderate risks, partially mitigated |
| 0.4 | Notable risks |
| 0.2 | Significant risks |
| 0.0 | Critical risks, should not deploy |

**Verification Methods**:
- Security scan
- Dependency check
- Performance impact
- Breaking changes

---

## Stopping Conditions

### Algorithm

```python
class ReviewLoop:
    MAX_ITERATIONS = 3
    MIN_CONFIDENCE = 0.85
    MIN_IMPROVEMENT = 0.05
    PASS_THRESHOLD = 0.80
    
    def __init__(self):
        self.iteration = 0
        self.history = []
    
    def should_stop(self, current_result):
        self.iteration += 1
        self.history.append(current_result)
        
        # Hard limit
        if self.iteration >= self.MAX_ITERATIONS:
            return True, "max_iterations_reached"
        
        # Quality threshold met
        if (current_result.verdict == "PASS" and 
            current_result.confidence >= self.MIN_CONFIDENCE and
            current_result.weighted_score >= self.PASS_THRESHOLD):
            return True, "quality_threshold_met"
        
        # No critical issues and good score
        critical_count = sum(1 for i in current_result.issues 
                            if i.severity == "critical")
        if critical_count == 0 and current_result.weighted_score >= 0.75:
            return True, "acceptable_with_minor_issues"
        
        # Diminishing returns
        if len(self.history) >= 2:
            prev = self.history[-2]
            improvement = current_result.weighted_score - prev.weighted_score
            if improvement < self.MIN_IMPROVEMENT:
                return True, "diminishing_returns"
        
        # Escalation needed
        if current_result.verdict == "ESCALATE":
            return True, "human_intervention_required"
        
        return False, "continue_iteration"
    
    def get_action(self, stop_reason):
        actions = {
            "quality_threshold_met": "mark_verified",
            "acceptable_with_minor_issues": "mark_completed_with_notes",
            "max_iterations_reached": "mark_completed_needs_review",
            "diminishing_returns": "mark_completed_needs_review",
            "human_intervention_required": "create_human_input_request",
            "continue_iteration": "apply_fixes_and_retry"
        }
        return actions.get(stop_reason, "unknown")
```

### Iteration Flow

```
Iteration 1:
├── Generate output
├── Run self-review
├── If PASS with high confidence → Done
└── Else → Identify issues, apply fixes

Iteration 2:
├── Apply fixes from iteration 1
├── Run self-review
├── Compare to iteration 1
├── If improved significantly → Continue if needed
└── If no improvement → Stop, mark needs review

Iteration 3 (Max):
├── Apply remaining fixes
├── Run final review
├── Whatever the result → Stop
└── Mark appropriately based on final state
```

---

## Anti-Patterns to Avoid

### Self-Congratulation

❌ **Bad**:
```
"This is a comprehensive and elegant solution that addresses all requirements."
```

✅ **Good**:
```
"Verified against 5 acceptance criteria. Passed syntax check. 
Unit tests pass. Two potential improvements: error messages 
could be more specific, and the retry logic could be extracted."
```

### Vague Approval

❌ **Bad**:
```
{
  "verdict": "PASS",
  "confidence": 0.95,
  "issues": [],
  "improvements_possible": []
}
```

✅ **Good**:
```
{
  "verdict": "PASS",
  "confidence": 0.88,
  "issues": [],
  "tests_performed": [
    "Parsed AST successfully",
    "Ran 12 unit tests (all pass)",
    "Traced login flow manually",
    "Checked SQL injection vectors"
  ],
  "improvements_possible": [
    "Add rate limiting to prevent brute force",
    "Consider adding request ID to logs"
  ]
}
```

### Over-Criticizing

Avoid finding fake issues to appear thorough:

❌ **Bad**:
```
"Issue: Variable name 'i' could be more descriptive."
(in a simple loop where 'i' is conventional)
```

✅ **Good**:
Focus on issues that actually matter:
- Would this cause bugs?
- Does this violate requirements?
- Is there a security risk?
- Would this confuse a maintainer?

### Critique Without Action

Every issue must have a fix:

❌ **Bad**:
```
{
  "problem": "Error handling is weak"
}
```

✅ **Good**:
```
{
  "problem": "Missing try/catch around database call on line 45",
  "fix": "Wrap in try/catch, log error, return user-friendly message",
  "location": "src/api/users.ts:45"
}
```

---

## Integration with gas-debugger

For code review, delegate to the gas-debugger skill for specialized analysis.

### When to Use gas-debugger

- Security vulnerability scanning
- Bug detection in complex logic
- Performance issue identification
- Code quality analysis

### Hand-off Pattern

```markdown
## Delegate to gas-debugger

Task: Review code quality for [TASK_ID]

Files to analyze:
- src/auth/login.ts
- src/auth/session.ts

Focus areas:
- Security (auth code is sensitive)
- Logic errors
- Error handling

Return findings in bug manifest format for tracking.
```

### Integrating Results

```yaml
# After gas-debugger analysis
review:
  self_review:
    verdict: "NEEDS_REVISION"
    issues: [...]
  gas_debugger:
    security_issues: 0
    logic_issues: 1
    performance_issues: 0
    manifest: ".gas-debugger/bug-manifest.yaml"
  combined_verdict: "FIX_LOGIC_ISSUE"
```

---

## Review Checklists

### Code Review Checklist

```
[ ] Syntax valid (no parse errors)
[ ] All acceptance criteria addressed
[ ] No obvious bugs in logic
[ ] Error handling present
[ ] Input validation where needed
[ ] No hardcoded secrets
[ ] No SQL injection vectors
[ ] No XSS vulnerabilities
[ ] Appropriate logging
[ ] Tests included (if required)
[ ] Documentation updated (if needed)
```

### Document Review Checklist

```
[ ] All sections complete
[ ] Consistent formatting
[ ] No placeholder text remaining
[ ] Links work
[ ] Code examples run
[ ] Spelling/grammar acceptable
[ ] Meets stated purpose
```

### Design Review Checklist

```
[ ] Meets accessibility standards (WCAG AA)
[ ] Mobile responsive
[ ] Consistent with design system
[ ] All states covered (loading, error, empty)
[ ] Interaction feedback present
[ ] Performance acceptable
```
