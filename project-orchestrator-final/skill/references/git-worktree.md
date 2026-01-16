# Git Worktree Reference

Safe isolation patterns for autonomous code execution using Git worktrees.

## Table of Contents
- [Why Worktrees](#why-worktrees)
- [Basic Commands](#basic-commands)
- [Orchestrator Integration](#orchestrator-integration)
- [Best Practices](#best-practices)
- [Recovery Procedures](#recovery-procedures)

---

## Why Worktrees

Git worktrees enable safe, isolated execution:

| Benefit | Explanation |
|---------|-------------|
| **Isolation** | Changes don't affect main branch until merged |
| **Parallel Work** | Multiple features can be developed simultaneously |
| **Safe Rollback** | Easy to discard experimental changes |
| **Clean State** | Each worktree has fresh working directory |
| **Merge Control** | Human can review before merging |

### When to Use

- Starting new features
- Experimental changes
- Risky refactoring
- Any work that should be reviewed before merging

---

## Basic Commands

### Create Worktree

```bash
# Create worktree with new branch
git worktree add .worktrees/feature-auth -b feature/auth

# Create worktree from existing branch
git worktree add .worktrees/bugfix bugfix/login-issue

# Create worktree with auto-generated session branch
git worktree add .worktrees/auto-$(date +%s) -b auto-session-$(date +%Y%m%d-%H%M%S)
```

### List Worktrees

```bash
git worktree list
# Output:
# /path/to/repo                   abc123 [main]
# /path/to/repo/.worktrees/auth   def456 [feature/auth]
```

### Remove Worktree

```bash
# Remove worktree (keeps branch)
git worktree remove .worktrees/feature-auth

# Force remove (if dirty)
git worktree remove --force .worktrees/feature-auth

# Prune stale worktrees
git worktree prune
```

### Merge Worktree

```bash
# From main branch
git checkout main

# Merge feature branch
git merge feature/auth --no-ff -m "Merge feature/auth"

# Or squash merge for clean history
git merge feature/auth --squash
git commit -m "Add authentication feature"
```

---

## Orchestrator Integration

### Session Initialization

When starting a new orchestrator session:

```bash
# Create session worktree
SESSION_ID=$(date +%Y%m%d_%H%M%S)
BRANCH_NAME="orchestrator/session-$SESSION_ID"
WORKTREE_PATH=".worktrees/$SESSION_ID"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
cd "$WORKTREE_PATH"
```

### Recommended Directory Structure

```
project-root/
├── .git/                          # Git directory
├── .worktrees/                    # Worktree containers (gitignored)
│   ├── session-20250103-1000/     # Orchestrator session 1
│   │   ├── .orchestrator/         # Session-specific state
│   │   └── src/                   # Code changes
│   └── session-20250103-1400/     # Orchestrator session 2
├── .gitignore                     # Includes .worktrees/
├── src/                           # Main codebase
└── CLAUDE.md                      # Project config
```

### Add to .gitignore

```
# Worktrees
.worktrees/
```

### Automated Worktree Script

```python
#!/usr/bin/env python3
"""
Create and manage worktrees for orchestrator sessions.

Usage:
    python worktree.py create [name]
    python worktree.py list
    python worktree.py merge <name>
    python worktree.py cleanup
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path

WORKTREE_DIR = ".worktrees"

def run_git(args: list) -> str:
    """Run git command and return output"""
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        raise Exception(f"Git error: {result.stderr}")
    return result.stdout.strip()

def create_worktree(name: str = None) -> str:
    """Create new worktree for orchestrator session"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = name or f"session-{timestamp}"
    branch = f"orchestrator/{name}"
    path = f"{WORKTREE_DIR}/{name}"
    
    Path(WORKTREE_DIR).mkdir(exist_ok=True)
    
    run_git(["worktree", "add", path, "-b", branch])
    
    print(f"Created worktree:")
    print(f"  Path: {path}")
    print(f"  Branch: {branch}")
    print(f"\nTo work in this worktree:")
    print(f"  cd {path}")
    
    return path

def list_worktrees():
    """List all worktrees"""
    output = run_git(["worktree", "list"])
    print(output)

def merge_worktree(name: str, squash: bool = True):
    """Merge worktree branch back to main"""
    
    branch = f"orchestrator/{name}"
    
    # Switch to main
    run_git(["checkout", "main"])
    
    # Merge
    if squash:
        run_git(["merge", branch, "--squash"])
        print(f"Squash merged {branch}. Run 'git commit' to complete.")
    else:
        run_git(["merge", branch, "--no-ff", "-m", f"Merge {branch}"])
        print(f"Merged {branch} to main.")

def cleanup_worktrees():
    """Remove merged worktree branches"""
    
    # Prune stale
    run_git(["worktree", "prune"])
    
    # List worktrees
    output = run_git(["worktree", "list", "--porcelain"])
    
    worktrees = []
    current = {}
    for line in output.split("\n"):
        if line.startswith("worktree "):
            if current:
                worktrees.append(current)
            current = {"path": line.split(" ", 1)[1]}
        elif line.startswith("branch "):
            current["branch"] = line.split(" ", 1)[1]
    if current:
        worktrees.append(current)
    
    # Remove worktrees in .worktrees/
    for wt in worktrees:
        if WORKTREE_DIR in wt.get("path", ""):
            path = wt["path"]
            print(f"Removing: {path}")
            run_git(["worktree", "remove", path, "--force"])
    
    print("Cleanup complete.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "create":
        name = sys.argv[2] if len(sys.argv) > 2 else None
        create_worktree(name)
    elif command == "list":
        list_worktrees()
    elif command == "merge":
        if len(sys.argv) < 3:
            print("Usage: worktree.py merge <name>")
            sys.exit(1)
        merge_worktree(sys.argv[2])
    elif command == "cleanup":
        cleanup_worktrees()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
```

---

## Best Practices

### 1. Branch Naming Convention

```
orchestrator/session-YYYYMMDD-HHMMSS    # Auto sessions
orchestrator/task-TASK_ID               # Task-specific
feature/description                      # Features
bugfix/issue-number                      # Bug fixes
```

### 2. Commit Frequently

Within worktree, commit often:

```bash
# After each task completion
git add -A
git commit -m "TASK-001: Implement login form"
```

### 3. Commit Message Format

```
TASK-XXX: Brief description

- Detail 1
- Detail 2

Acceptance criteria met:
- [x] Criterion 1
- [x] Criterion 2
```

### 4. Regular Sync with Main

```bash
# Pull latest main into worktree
git fetch origin main
git rebase origin/main
# Or merge if preferred
git merge origin/main
```

### 5. Review Before Merge

```bash
# View changes before merging
git log main..HEAD --oneline
git diff main..HEAD --stat
```

---

## Recovery Procedures

### Worktree in Bad State

```bash
# Hard reset to last good commit
git reset --hard HEAD~1

# Or reset to specific commit
git reset --hard abc123
```

### Accidental Deletion

```bash
# If worktree dir deleted but branch exists
git worktree prune
git worktree add .worktrees/name existing-branch-name
```

### Merge Conflicts

```bash
# Abort merge
git merge --abort

# Or resolve manually
git mergetool
git commit
```

### Detached HEAD

```bash
# Create branch from detached state
git checkout -b recovery-branch

# Or return to branch
git checkout branch-name
```

---

## Integration with Orchestrator State

### State File Location

Store `.orchestrator/` inside worktree for session isolation:

```
.worktrees/session-001/
├── .orchestrator/           # Session state
│   ├── state.yaml
│   └── CONTEXT.md
├── src/                     # Code changes
└── tests/
```

### Session Resume

When resuming a session:

1. Find the worktree: `git worktree list`
2. CD into it: `cd .worktrees/session-xxx`
3. Read orchestrator state: `cat .orchestrator/CONTEXT.md`
4. Continue work

### End of Session

```bash
# In worktree
git add -A
git commit -m "Session checkpoint: [summary]"

# Update orchestrator state
python scripts/checkpoint.py create --trigger session_end

# Optionally merge to main if work is complete
cd ../..
git merge orchestrator/session-xxx --squash
```

---

## Worktree vs. Branch-Only

| Aspect | Worktree | Branch Only |
|--------|----------|-------------|
| File isolation | ✅ Full | ❌ Shared |
| Parallel work | ✅ Easy | ⚠️ Need stash |
| Disk space | ⚠️ More | ✅ Less |
| Mental model | ✅ Clear | ⚠️ Complex |
| Safe for AI | ✅ Very | ⚠️ Risk of accidents |

**Recommendation**: Use worktrees for orchestrator sessions. The isolation is worth the disk space.
