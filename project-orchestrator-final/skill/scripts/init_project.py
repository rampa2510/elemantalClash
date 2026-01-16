#!/usr/bin/env python3
"""
Initialize a new project for the orchestrator.
Creates the .orchestrator directory structure and initial state files.

Usage:
    python init_project.py "Project Name" --goal "Project goal description"
    python init_project.py "My App" --goal "Build a todo app with auth" --constraints "Mobile-first"
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path
import json

# YAML handling - try to use PyYAML, fall back to simple format
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def generate_project_id():
    """Generate unique project ID"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"proj_{timestamp}"


def generate_session_id():
    """Generate unique session ID"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"sess_{timestamp}"


def create_directory_structure(base_path: Path):
    """Create the orchestrator directory structure"""
    directories = [
        base_path,
        base_path / "checkpoints",
        base_path / "knowledge",
        base_path / "backups"
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"  Created: {directory}")


def create_state_file(base_path: Path, project_name: str, goal: str, 
                      constraints: list = None):
    """Create the initial state.yaml file"""
    
    now = datetime.now().isoformat()
    
    state = {
        "project": {
            "id": generate_project_id(),
            "name": project_name,
            "goal": goal,
            "created": now,
            "constraints": constraints or []
        },
        "phase": "planning",
        "phase_started": now,
        "phase_progress": 0.0,
        "tasks": [],
        "checkpoints": [],
        "session": {
            "id": generate_session_id(),
            "started": now,
            "last_updated": now,
            "context_usage": 0.0,
            "compactions": 0,
            "notes": "Project initialized. Ready for task decomposition."
        },
        "blocked_tasks": [],
        "escalated_tasks": []
    }
    
    state_path = base_path / "state.yaml"
    
    if HAS_YAML:
        with open(state_path, 'w') as f:
            yaml.dump(state, f, default_flow_style=False, sort_keys=False)
    else:
        # Simple YAML-like format without library
        with open(state_path, 'w') as f:
            f.write(f"# Project Orchestrator State\n")
            f.write(f"# Generated: {now}\n\n")
            f.write(f"project:\n")
            f.write(f"  id: \"{state['project']['id']}\"\n")
            f.write(f"  name: \"{project_name}\"\n")
            f.write(f"  goal: |\n    {goal}\n")
            f.write(f"  created: \"{now}\"\n")
            f.write(f"  constraints:\n")
            for c in (constraints or []):
                f.write(f"    - \"{c}\"\n")
            f.write(f"\nphase: \"planning\"\n")
            f.write(f"phase_started: \"{now}\"\n")
            f.write(f"phase_progress: 0.0\n")
            f.write(f"\ntasks: []\n")
            f.write(f"checkpoints: []\n")
            f.write(f"\nsession:\n")
            f.write(f"  id: \"{state['session']['id']}\"\n")
            f.write(f"  started: \"{now}\"\n")
            f.write(f"  last_updated: \"{now}\"\n")
            f.write(f"  context_usage: 0.0\n")
            f.write(f"  notes: \"Project initialized\"\n")
    
    print(f"  Created: {state_path}")
    return state


def create_context_file(base_path: Path, project_name: str, goal: str):
    """Create the CONTEXT.md file for cold-start resume"""
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    context = f"""# Project: {project_name}

> {goal}

## Current Status
- **Phase**: Planning
- **Progress**: 0% complete
- **Active Task**: None (awaiting decomposition)
- **Last Updated**: {now}

## What's Been Done
*No tasks completed yet*

## Key Decisions
*No decisions made yet*

## Important Files
| File | Purpose |
|------|---------|
| `.orchestrator/state.yaml` | Full project state |

## Next Steps
1. Decompose the project goal into MECE tasks
2. Estimate complexity for each task
3. Begin execution from first task

## How to Resume
1. Read this file for context
2. Check `.orchestrator/state.yaml` for detailed state
3. If no tasks exist, run decomposition first

---
*Session History*
- {now}: Project initialized
"""
    
    context_path = base_path / "CONTEXT.md"
    with open(context_path, 'w') as f:
        f.write(context)
    
    print(f"  Created: {context_path}")


def create_todo_file(base_path: Path, project_name: str):
    """Create the todo.md attention anchor"""
    
    now = datetime.now().isoformat()
    
    todo = f"""# Active Todo

## RIGHT NOW
- [ ] Decompose project into tasks

## NEXT UP
- [ ] Review task estimates
- [ ] Begin first task

## BLOCKED
*None*

## DONE THIS SESSION
*None yet*

---
Updated: {now}
Goal: Complete "{project_name}" project
"""
    
    todo_path = base_path / "todo.md"
    with open(todo_path, 'w') as f:
        f.write(todo)
    
    print(f"  Created: {todo_path}")


def create_checkpoint_manifest(base_path: Path):
    """Create empty checkpoint manifest"""
    
    manifest = {
        "checkpoints": [],
        "latest": None,
        "retention": {
            "keep_last": 10,
            "keep_milestones": True,
            "max_age_days": 30
        }
    }
    
    manifest_path = base_path / "checkpoints" / "manifest.yaml"
    
    if HAS_YAML:
        with open(manifest_path, 'w') as f:
            yaml.dump(manifest, f, default_flow_style=False)
    else:
        with open(manifest_path, 'w') as f:
            f.write("checkpoints: []\n")
            f.write("latest: null\n")
            f.write("retention:\n")
            f.write("  keep_last: 10\n")
            f.write("  keep_milestones: true\n")
            f.write("  max_age_days: 30\n")
    
    print(f"  Created: {manifest_path}")


def create_session_log(base_path: Path, project_name: str):
    """Create session.jsonl log file"""
    
    now = datetime.now().isoformat()
    
    initial_event = {
        "timestamp": now,
        "event": "project_initialized",
        "project": project_name
    }
    
    log_path = base_path / "session.jsonl"
    with open(log_path, 'w') as f:
        f.write(json.dumps(initial_event) + "\n")
    
    print(f"  Created: {log_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Initialize a new project for the orchestrator"
    )
    parser.add_argument(
        "name",
        help="Project name"
    )
    parser.add_argument(
        "--goal", "-g",
        required=True,
        help="Project goal description"
    )
    parser.add_argument(
        "--constraints", "-c",
        nargs="*",
        default=[],
        help="Project constraints (can specify multiple)"
    )
    parser.add_argument(
        "--path", "-p",
        default=".orchestrator",
        help="Path for orchestrator directory (default: .orchestrator)"
    )
    
    args = parser.parse_args()
    
    base_path = Path(args.path)
    
    # Check if already exists
    if base_path.exists():
        print(f"Warning: {base_path} already exists.")
        response = input("Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Aborted.")
            sys.exit(1)
    
    print(f"\nInitializing project: {args.name}")
    print(f"Goal: {args.goal}")
    if args.constraints:
        print(f"Constraints: {', '.join(args.constraints)}")
    print()
    
    # Create structure
    print("Creating directory structure...")
    create_directory_structure(base_path)
    
    # Create files
    print("\nCreating files...")
    create_state_file(base_path, args.name, args.goal, args.constraints)
    create_context_file(base_path, args.name, args.goal)
    create_todo_file(base_path, args.name)
    create_checkpoint_manifest(base_path)
    create_session_log(base_path, args.name)
    
    print(f"\n✓ Project '{args.name}' initialized successfully!")
    print(f"\nNext steps:")
    print(f"  1. Review .orchestrator/state.yaml")
    print(f"  2. Decompose project goal into tasks")
    print(f"  3. Begin execution")


if __name__ == "__main__":
    main()
