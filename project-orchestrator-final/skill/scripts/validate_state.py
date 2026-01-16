#!/usr/bin/env python3
"""
Validate orchestrator state file for consistency and correctness.

Usage:
    python validate_state.py
    python validate_state.py --path .orchestrator/state.yaml
    python validate_state.py --fix  # Attempt auto-repair
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import json

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("Warning: PyYAML not installed. Using JSON fallback.")


def load_state(path: Path) -> dict:
    """Load state file"""
    if not path.exists():
        raise FileNotFoundError(f"State file not found: {path}")
    
    with open(path) as f:
        if HAS_YAML:
            return yaml.safe_load(f)
        else:
            # Try JSON as fallback
            return json.load(f)


def validate_required_fields(state: dict) -> list:
    """Check for required top-level fields"""
    errors = []
    required = ["project", "phase", "tasks", "session"]
    
    for field in required:
        if field not in state:
            errors.append(f"Missing required field: {field}")
    
    return errors


def validate_project(state: dict) -> tuple[list, list]:
    """Validate project section"""
    errors = []
    warnings = []
    
    project = state.get("project", {})
    
    if not project.get("id"):
        errors.append("Project missing 'id'")
    
    if not project.get("name"):
        errors.append("Project missing 'name'")
    
    if not project.get("goal"):
        warnings.append("Project missing 'goal' - recommended to add")
    
    if not project.get("created"):
        warnings.append("Project missing 'created' timestamp")
    
    return errors, warnings


def validate_phase(state: dict) -> list:
    """Validate phase value"""
    errors = []
    valid_phases = ["planning", "implementation", "review", "complete"]
    
    phase = state.get("phase")
    if phase not in valid_phases:
        errors.append(f"Invalid phase '{phase}'. Must be one of: {valid_phases}")
    
    return errors


def validate_tasks(state: dict) -> tuple[list, list]:
    """Validate tasks section"""
    errors = []
    warnings = []
    
    tasks = state.get("tasks", [])
    task_ids = set()
    valid_statuses = ["pending", "in_progress", "completed", "verified", "blocked", "needs_human"]
    
    for i, task in enumerate(tasks):
        task_id = task.get("id", f"task_at_index_{i}")
        
        # Check for required task fields
        if not task.get("id"):
            errors.append(f"Task at index {i} missing 'id'")
            continue
        
        if not task.get("name"):
            errors.append(f"Task {task_id} missing 'name'")
        
        # Duplicate check
        if task_id in task_ids:
            errors.append(f"Duplicate task ID: {task_id}")
        task_ids.add(task_id)
        
        # Status validation
        status = task.get("status")
        if status not in valid_statuses:
            errors.append(f"Task {task_id} has invalid status '{status}'")
        
        # Timestamp consistency
        if status == "completed" and not task.get("completed_at"):
            warnings.append(f"Task {task_id} is completed but missing 'completed_at'")
        
        if status == "verified" and not task.get("verified_at"):
            warnings.append(f"Task {task_id} is verified but missing 'verified_at'")
        
        if status == "in_progress" and not task.get("started_at"):
            warnings.append(f"Task {task_id} is in_progress but missing 'started_at'")
        
        # Acceptance criteria check
        criteria = task.get("acceptance_criteria", [])
        if len(criteria) < 1:
            warnings.append(f"Task {task_id} has no acceptance criteria")
    
    # Validate dependencies exist
    for task in tasks:
        task_id = task.get("id")
        deps = task.get("dependencies", {})
        
        for dep in deps.get("hard", []):
            if dep not in task_ids:
                errors.append(f"Task {task_id} references non-existent dependency: {dep}")
        
        for dep in deps.get("soft", []):
            if dep not in task_ids:
                warnings.append(f"Task {task_id} has soft dependency on non-existent task: {dep}")
    
    return errors, warnings


def validate_dag(state: dict) -> tuple[bool, str]:
    """Check for circular dependencies"""
    tasks = state.get("tasks", [])
    
    # Build adjacency list
    graph = defaultdict(list)
    in_degree = defaultdict(int)
    all_ids = set()
    
    for task in tasks:
        task_id = task.get("id")
        all_ids.add(task_id)
        
        for dep in task.get("dependencies", {}).get("hard", []):
            graph[dep].append(task_id)
            in_degree[task_id] += 1
    
    # Kahn's algorithm for topological sort
    queue = [t for t in all_ids if in_degree[t] == 0]
    sorted_order = []
    
    while queue:
        current = queue.pop(0)
        sorted_order.append(current)
        
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    if len(sorted_order) != len(all_ids):
        remaining = all_ids - set(sorted_order)
        return False, f"Circular dependency involving: {remaining}"
    
    return True, "Valid DAG"


def validate_session(state: dict) -> list:
    """Validate session section"""
    warnings = []
    
    session = state.get("session", {})
    
    if not session.get("id"):
        warnings.append("Session missing 'id'")
    
    if not session.get("last_updated"):
        warnings.append("Session missing 'last_updated'")
    
    context_usage = session.get("context_usage", 0)
    if context_usage > 0.8:
        warnings.append(f"Context usage is high: {context_usage*100:.0f}%")
    
    return warnings


def auto_repair(state: dict, errors: list, warnings: list) -> tuple[dict, list]:
    """Attempt to auto-repair common issues"""
    repairs = []
    now = datetime.now().isoformat()
    
    # Fix missing timestamps
    for task in state.get("tasks", []):
        task_id = task.get("id")
        
        if task.get("status") == "completed" and not task.get("completed_at"):
            task["completed_at"] = now
            repairs.append(f"Set completed_at for {task_id}")
        
        if task.get("status") == "verified" and not task.get("verified_at"):
            task["verified_at"] = now
            repairs.append(f"Set verified_at for {task_id}")
        
        if task.get("status") == "in_progress" and not task.get("started_at"):
            task["started_at"] = now
            repairs.append(f"Set started_at for {task_id}")
    
    # Update session timestamp
    if "session" in state:
        state["session"]["last_updated"] = now
        repairs.append("Updated session.last_updated")
    
    return state, repairs


def save_state(state: dict, path: Path):
    """Save state file"""
    if HAS_YAML:
        with open(path, 'w') as f:
            yaml.dump(state, f, default_flow_style=False, sort_keys=False)
    else:
        with open(path, 'w') as f:
            json.dump(state, f, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Validate orchestrator state file"
    )
    parser.add_argument(
        "--path", "-p",
        default=".orchestrator/state.yaml",
        help="Path to state file (default: .orchestrator/state.yaml)"
    )
    parser.add_argument(
        "--fix", "-f",
        action="store_true",
        help="Attempt to auto-repair issues"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    path = Path(args.path)
    
    try:
        state = load_state(path)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error parsing state file: {e}")
        sys.exit(1)
    
    # Run validations
    all_errors = []
    all_warnings = []
    
    all_errors.extend(validate_required_fields(state))
    
    if not all_errors:  # Only continue if basic structure exists
        proj_errors, proj_warnings = validate_project(state)
        all_errors.extend(proj_errors)
        all_warnings.extend(proj_warnings)
        
        all_errors.extend(validate_phase(state))
        
        task_errors, task_warnings = validate_tasks(state)
        all_errors.extend(task_errors)
        all_warnings.extend(task_warnings)
        
        is_dag, dag_msg = validate_dag(state)
        if not is_dag:
            all_errors.append(dag_msg)
        
        all_warnings.extend(validate_session(state))
    
    # Output results
    if args.json:
        result = {
            "valid": len(all_errors) == 0,
            "errors": all_errors,
            "warnings": all_warnings
        }
        print(json.dumps(result, indent=2))
    else:
        print(f"Validating: {path}\n")
        
        if all_errors:
            print("ERRORS:")
            for error in all_errors:
                print(f"  ✗ {error}")
            print()
        
        if all_warnings:
            print("WARNINGS:")
            for warning in all_warnings:
                print(f"  ⚠ {warning}")
            print()
        
        if not all_errors and not all_warnings:
            print("✓ State file is valid with no issues")
        elif not all_errors:
            print(f"✓ State file is valid with {len(all_warnings)} warning(s)")
        else:
            print(f"✗ State file has {len(all_errors)} error(s)")
    
    # Auto-repair if requested
    if args.fix and (all_errors or all_warnings):
        print("\nAttempting auto-repair...")
        state, repairs = auto_repair(state, all_errors, all_warnings)
        
        if repairs:
            save_state(state, path)
            print("Repairs applied:")
            for repair in repairs:
                print(f"  ✓ {repair}")
        else:
            print("No automatic repairs available")
    
    # Exit code
    sys.exit(1 if all_errors else 0)


if __name__ == "__main__":
    main()
