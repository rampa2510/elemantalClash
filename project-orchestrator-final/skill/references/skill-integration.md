# Skill Integration Reference

Patterns for coordinating with domain skills and understanding code structure.

## Table of Contents
- [Domain Skill Routing](#domain-skill-routing)
- [Hand-off Protocols](#hand-off-protocols)
- [Subagent Coordination](#subagent-coordination)
- [Code Understanding Without Embeddings](#code-understanding-without-embeddings)
- [MCP Server Integration](#mcp-server-integration)

---

## Domain Skill Routing

### Available Domain Skills

The orchestrator coordinates with these specialized skills:

| Skill | Domain | Trigger Keywords | Capabilities |
|-------|--------|------------------|--------------|
| `3d-web-graphics-mastery` | 3D/WebGL | Three.js, R3F, shader, WebGL, particle, WebGPU, VR/AR | 3D rendering, shaders, physics, animations |
| `gas-debugger` | Code Quality | debug, bug, fix, security, vulnerability, scan | Token-optimized debugging, persistent bug tracking |
| `ui-ux-mastery-modular` | Design | UI, UX, design, component, accessibility, WCAG | Research-backed UI patterns, accessibility |
| `project-orchestrator` | Meta | planning, decompose, state, orchestrate | Task management, state persistence |

### Routing Decision Tree

```python
def route_task(task):
    """Determine which skill should handle a task"""
    
    keywords = extract_keywords(task.name + " " + task.description)
    
    # Priority 1: Explicit assignment
    if task.assigned_skill:
        return task.assigned_skill
    
    # Priority 2: Keyword matching
    if matches_any(keywords, ["three.js", "r3f", "webgl", "shader", 
                              "3d", "particle", "webgpu", "vr", "ar"]):
        return "3d-web-graphics-mastery"
    
    if matches_any(keywords, ["debug", "bug", "fix", "security", 
                              "vulnerability", "scan", "lint"]):
        return "gas-debugger"
    
    if matches_any(keywords, ["ui", "ux", "design", "component", 
                              "accessibility", "wcag", "form", "layout"]):
        return "ui-ux-mastery-modular"
    
    if matches_any(keywords, ["plan", "decompose", "orchestrate", 
                              "state", "checkpoint"]):
        return "project-orchestrator"
    
    # Priority 3: No skill needed
    return None  # Claude handles directly
```

### Skill Stacking

Multiple skills can apply to a single task. When stacking:

1. Primary skill handles main work
2. Secondary skills provide consultation
3. Orchestrator coordinates handoffs

Example: "Build accessible 3D product viewer"
- Primary: `3d-web-graphics-mastery` (3D rendering)
- Secondary: `ui-ux-mastery-modular` (accessibility review)
- Orchestrator: Coordinates sequence

---

## Hand-off Protocols

### Delegation Template

When routing to a domain skill, provide this context package:

```markdown
## Task Delegation: [SKILL_NAME]

### Task Details
- **ID**: [TASK_ID]
- **Name**: [TASK_NAME]
- **Description**: [DESCRIPTION]

### Project Context
[Relevant project background - 2-3 sentences max]

### Acceptance Criteria
1. [Criterion 1]
2. [Criterion 2]
3. [Criterion 3]

### Dependencies Completed
- [DEP_TASK_ID]: [Brief description of output]

### Constraints
- [Any technical constraints]
- [Time/scope limitations]

### Expected Output
[What the skill should produce]

### Return Protocol
When complete, provide:
1. Output files/artifacts created
2. Any issues encountered
3. Verification performed
```

### Result Integration

When skill completes, integrate results:

```python
def integrate_skill_result(task_id, skill_output):
    """Integrate domain skill output into project state"""
    
    state = load_state()
    task = find_task(state, task_id)
    
    # Update task with outputs
    task["outputs"] = skill_output.artifacts
    task["status"] = "completed"
    task["completed_at"] = now()
    
    # Record any issues
    if skill_output.issues:
        task["notes"] = skill_output.issues
    
    # Create checkpoint if significant
    if skill_output.is_milestone:
        create_checkpoint(trigger="skill_complete", task_id=task_id)
    
    save_state(state)
    
    # Trigger self-review
    return queue_review(task_id)
```

### Skill Communication Patterns

**Synchronous Delegation** (Default):
```
Orchestrator → Delegate to Skill → Skill Executes → Return Result → Orchestrator Continues
```

**Consultation Pattern**:
```
Orchestrator → Ask Skill for Advice → Skill Provides Guidance → Orchestrator Decides → Execute
```

**Review Pattern**:
```
Orchestrator → Execute Task → Send to Skill for Review → Skill Reviews → Return Verdict
```

---

## Subagent Coordination

### Built-in Subagents

Claude Code provides built-in subagents that the orchestrator can leverage:

| Subagent | Model | Tools | Use Case |
|----------|-------|-------|----------|
| Explore | Haiku | Read, Glob, Grep | Fast codebase search |
| Plan | Research | Read-only | Planning assistance |
| Task | Sonnet | All | Complex subtasks |

**Important**: Built-in subagents do NOT inherit skills. Only custom subagents can load skills.

### Custom Subagent Definition

Create specialized subagents in `.claude/agents/`:

```yaml
# .claude/agents/code-reviewer.md
---
name: code-reviewer
description: Expert code review for security and quality
tools: Read, Grep, Glob, Bash
model: sonnet
skills: gas-debugger
---

You are a senior code reviewer. When invoked:
1. Run `git diff` to see changes
2. Focus on security, correctness, and maintainability
3. Use gas-debugger patterns for systematic review
4. Return structured findings
```

```yaml
# .claude/agents/ui-implementer.md
---
name: ui-implementer
description: UI component implementation specialist
tools: Read, Write, Bash
model: sonnet
skills: ui-ux-mastery-modular
---

You implement UI components following research-backed patterns.
Apply WCAG AA accessibility standards.
Use the design system tokens defined in the project.
```

### Subagent Invocation

```markdown
## Invoke Subagent: [AGENT_NAME]

### Task
[What the subagent should do]

### Context
[Minimal context needed]

### Expected Output
[What to return]
```

---

## Code Understanding Without Embeddings

### Repository Map Pattern

Create a semantic map of the codebase without vector embeddings:

```markdown
# .orchestrator/knowledge/repo-map.md

## Directory Purpose Map
| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `src/api/` | REST endpoints | `routes.ts`, `middleware.ts` |
| `src/models/` | Database models | `user.ts`, `product.ts` |
| `src/services/` | Business logic | `auth.ts`, `payment.ts` |
| `src/components/` | React components | `Button.tsx`, `Modal.tsx` |

## Key Entry Points
- `src/index.ts` - Application bootstrap
- `src/api/routes.ts` - Route definitions
- `src/config/index.ts` - Configuration

## Module Relationships
```
Controllers → Services → Models → Database
     ↓
Middleware (auth, validation, logging)
```

## Conventions
- Naming: `kebab-case` files, `PascalCase` components
- Testing: `*.test.ts` alongside source
- Styles: CSS Modules with `.module.css`
```

### Grep-Based Retrieval

Use grep patterns for BM25-like retrieval (~85% of embedding accuracy):

```bash
# Find relevant files
rg -l "authentication" --type ts src/

# Get context around matches
rg -C 5 "function authenticate" src/

# Rank by frequency
rg -c "user" --type ts src/ | sort -t: -k2 -rn | head -10

# Exclude noise
rg "pattern" --glob '!{node_modules,dist,.git}'
```

### Tree-sitter for Code Structure

For deeper code understanding, use Tree-sitter patterns:

```python
# Extract function signatures
def extract_functions(file_path):
    """Use tree-sitter to extract function definitions"""
    # Parse file
    tree = parser.parse(read_file(file_path))
    
    functions = []
    for node in traverse(tree.root_node):
        if node.type == "function_declaration":
            functions.append({
                "name": get_name(node),
                "params": get_params(node),
                "line": node.start_point[0],
                "file": file_path
            })
    
    return functions
```

### Dependency Graph Generation

```python
def build_dependency_graph(project_root):
    """Build file dependency graph from imports"""
    graph = {}
    
    for file in find_source_files(project_root):
        imports = extract_imports(file)
        graph[file] = {
            "imports": imports,
            "imported_by": []
        }
    
    # Build reverse references
    for file, data in graph.items():
        for imp in data["imports"]:
            if imp in graph:
                graph[imp]["imported_by"].append(file)
    
    return graph
```

---

## MCP Server Integration

### MCP vs Skills

| Aspect | MCP Servers | Skills |
|--------|-------------|--------|
| Purpose | External connectivity | Domain expertise |
| Loading | Tool definitions upfront | On-demand content |
| State | Session-scoped | File-based persistence |
| Use Case | APIs, databases, services | Workflows, knowledge |

### Relevant MCP Servers for Orchestration

| Server | Integration |
|--------|-------------|
| `atlas-mcp-server` | Neo4j-based task/project management |
| `clickup-mcp-server` | ClickUp task integration |
| `linear-mcp` | Linear issue tracking |
| `github-mcp` | GitHub issues/PRs |

### MCP + Skill Composition

```markdown
## Workflow: Sync Tasks to External System

1. Orchestrator decomposes project (uses task-decomposition patterns)
2. State saved to `.orchestrator/state.yaml` (file-based)
3. MCP server syncs tasks to external tool (if connected)
4. Progress tracked in both systems
5. External updates can trigger state refresh
```

### Claude Max Constraints

For users without API access:
- MCP servers work via Claude Desktop (local stdio)
- Configure in `claude_desktop_config.json`
- Remote MCP via Settings → Connectors
- Skills remain fully functional

---

## Integration Examples

### Example 1: 3D Feature with Accessibility Review

```yaml
workflow:
  - step: 1
    task: "Build 3D product viewer"
    skill: "3d-web-graphics-mastery"
    output: "src/components/ProductViewer.tsx"
    
  - step: 2
    task: "Review accessibility"
    skill: "ui-ux-mastery-modular"
    input: "src/components/ProductViewer.tsx"
    focus: "keyboard navigation, screen reader, reduced motion"
    
  - step: 3
    task: "Fix accessibility issues"
    skill: null  # Claude handles based on review
    
  - step: 4
    task: "Final code review"
    skill: "gas-debugger"
    category: "quality"
```

### Example 2: Bug Fix with UI Impact

```yaml
workflow:
  - step: 1
    task: "Scan for security vulnerabilities"
    skill: "gas-debugger"
    category: "security"
    output: ".gas-debugger/bug-manifest.yaml"
    
  - step: 2
    task: "Fix critical vulnerability in auth"
    skill: null
    input: "bug-manifest.yaml#B001"
    
  - step: 3
    task: "Update error UI for new auth flow"
    skill: "ui-ux-mastery-modular"
    
  - step: 4
    task: "Verify fix"
    skill: "gas-debugger"
    input: "B001"
```

### Example 3: Full Project Orchestration

```yaml
project: "E-commerce Checkout Redesign"
phases:
  - phase: "planning"
    orchestrator_handles:
      - Decompose into MECE tasks
      - Create state file
      - Identify skill assignments
      
  - phase: "design"
    ui-ux-mastery-modular:
      - Review checkout flow
      - Accessibility requirements
      - Mobile optimization
      
  - phase: "implementation"
    mixed:
      - skill: "3d-web-graphics-mastery" if 3D product preview
      - skill: null for business logic
      - skill: "ui-ux-mastery-modular" for form components
      
  - phase: "review"
    gas-debugger:
      - Security scan (especially payment flow)
      - Logic error detection
      - Performance check
      
  - phase: "complete"
    orchestrator_handles:
      - Final integration test
      - Generate completion report
      - Archive state
```

---

## Production Coding Systems Patterns

### Cursor Multi-Agent Architecture

Cursor uses a multi-agent system with specialized roles:

```
┌─────────────────────────────────────────────┐
│                 Composer                     │
│  (User-facing, orchestrates sub-agents)     │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  Edit   │  │ Search  │  │Terminal │     │
│  │ Agent   │  │ Agent   │  │ Agent   │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │           │
│       └────────────┼────────────┘           │
│                    │                         │
│            Shared Context Pool              │
└─────────────────────────────────────────────┘
```

**Key patterns:**
- Composer agent coordinates specialized sub-agents
- Each sub-agent has focused tool access
- Shared context pool maintains coherence
- Background indexing for fast retrieval

### Aider Git Integration & Repository Map

Aider implements intelligent repository understanding:

```python
# PageRank-style symbol ranking from Aider
def rank_symbols(codebase):
    """
    Rank code symbols by importance using reference graph.
    More referenced symbols = higher rank = more likely to include.
    """
    graph = build_reference_graph(codebase)
    
    # Similar to PageRank - iterate until convergence
    for _ in range(10):
        for symbol in graph.nodes:
            incoming = graph.get_incoming_references(symbol)
            symbol.rank = sum(ref.rank / ref.outgoing_count 
                             for ref in incoming)
    
    return sorted(graph.nodes, key=lambda s: s.rank, reverse=True)
```

**Aider patterns we adopt:**
- Git integration for safe checkpoints
- Repository map summarizing structure
- Two-tier context: outline + detailed on-demand
- Diff-based code editing (not full file replacement)

### Windsurf Autonomy Levels

Windsurf (Codeium) defines autonomy tiers:

| Level | Name | Description | Human Involvement |
|-------|------|-------------|-------------------|
| 0 | Autocomplete | Single-line suggestions | Every keystroke |
| 1 | Chat | Conversational help | Every message |
| 2 | Edit | Multi-file edits with approval | Per edit batch |
| 3 | Flow | Autonomous multi-step | Periodic checkpoints |
| 4 | Full Auto | End-to-end autonomous | Start and end only |

**Our orchestrator targets Level 3** - autonomous within defined task boundaries with checkpoints.

---

## Multi-Agent Orchestration Patterns

### LangGraph Supervisor-Worker Pattern

LangGraph implements a graph-based agent orchestration:

```python
# LangGraph supervisor pattern (conceptual)
class SupervisorAgent:
    """Routes tasks to specialized worker agents"""
    
    def __init__(self, workers: List[WorkerAgent]):
        self.workers = {w.name: w for w in workers}
        self.state = GraphState()
    
    def route(self, task: Task) -> str:
        """Determine which worker handles task"""
        # Analyze task requirements
        if task.requires_code_edit:
            return "coder"
        elif task.requires_review:
            return "reviewer"
        elif task.requires_research:
            return "researcher"
        return "generalist"
    
    def execute(self, task: Task) -> Result:
        worker_name = self.route(task)
        worker = self.workers[worker_name]
        return worker.execute(task, self.state)
```

### CrewAI Event-Driven Flows

CrewAI uses role-based agent teams:

```yaml
# CrewAI-style crew definition
crew:
  name: "Development Team"
  
  agents:
    - name: "Tech Lead"
      role: "Decompose requirements into tasks"
      tools: [task_manager, codebase_search]
      
    - name: "Developer"  
      role: "Implement assigned tasks"
      tools: [code_edit, terminal, browser]
      
    - name: "Reviewer"
      role: "Review code quality and correctness"
      tools: [code_analysis, test_runner]
  
  flow:
    - Tech Lead receives requirement
    - Tech Lead creates tasks
    - Developer implements (parallel if possible)
    - Reviewer validates each implementation
    - Tech Lead integrates and closes
```

### Conflict Resolution Patterns

When multiple agents could handle a task:

1. **Confidence-based**: Each agent scores confidence, highest wins
2. **Consensus**: Multiple agents must agree
3. **Deterministic**: Fixed routing rules (our approach)
4. **Hierarchical**: Supervisor makes final call

**Our approach**: Deterministic routing with human override capability.

---

## Code Understanding with Tree-sitter

### AST-Based Code Analysis

Tree-sitter enables language-agnostic code parsing:

```python
# Tree-sitter pattern for code understanding
import tree_sitter

def extract_symbols(file_path: str) -> List[Symbol]:
    """Extract functions, classes, and imports using AST"""
    parser = get_parser_for_language(file_path)
    tree = parser.parse(read_file(file_path))
    
    symbols = []
    
    def traverse(node):
        if node.type in ['function_definition', 'class_definition']:
            symbols.append(Symbol(
                name=get_name(node),
                type=node.type,
                start_line=node.start_point[0],
                end_line=node.end_point[0],
                signature=extract_signature(node)
            ))
        for child in node.children:
            traverse(child)
    
    traverse(tree.root_node)
    return symbols
```

### ast-grep for Structural Search

ast-grep enables pattern-based code search:

```bash
# Find all async functions that don't have error handling
ast-grep --pattern 'async function $FUNC() { $$$ }' \
         --rewrite 'async function $FUNC() { try { $$$ } catch (e) { throw e; } }'

# Find all useState without dependency array
ast-grep --pattern 'useEffect($CALLBACK)' --lang tsx
```

### Two-Tier Indexing Strategy

Efficient codebase indexing without embeddings:

```
Tier 1: Shallow Index (Always Loaded)
├── File manifest: name, path, language, size
├── Top-level symbols: function/class names
├── Import graph: file dependencies
└── Size: ~1KB per 100 files

Tier 2: Deep Index (Loaded On-Demand)  
├── Full symbol details: signatures, docstrings
├── Internal references: call graph
├── Code snippets: key implementation patterns
└── Size: ~10KB per file (loaded selectively)
```

### Hybrid Search Strategy

Combining multiple search approaches:

```python
def hybrid_code_search(query: str, codebase_path: str):
    """
    Multi-strategy code search without embeddings.
    Combines ripgrep speed with AST precision.
    """
    results = []
    
    # Strategy 1: Keyword search (ripgrep)
    keyword_matches = ripgrep_search(query, codebase_path)
    results.extend(score_results(keyword_matches, weight=0.3))
    
    # Strategy 2: Symbol search (Tree-sitter index)
    symbol_matches = search_symbol_index(query)
    results.extend(score_results(symbol_matches, weight=0.4))
    
    # Strategy 3: Structural search (ast-grep)
    if looks_like_code_pattern(query):
        structural_matches = ast_grep_search(query, codebase_path)
        results.extend(score_results(structural_matches, weight=0.3))
    
    # Deduplicate and rank
    return dedupe_and_rank(results)
