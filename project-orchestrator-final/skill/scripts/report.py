#!/usr/bin/env python3
"""
Generate progress reports for project orchestrator.

Usage:
    python report.py
    python report.py --format markdown
    python report.py --format json
    python report.py --output report.md
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from collections import Counter

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def load_state(path: Path) -> dict:
    """Load state file"""
    if not path.exists():
        raise FileNotFoundError(f"State file not found: {path}")
    
    with open(path) as f:
        if HAS_YAML:
            return yaml.safe_load(f)
        else:
            return json.load(f)


def calculate_progress(tasks: list) -> dict:
    """Calculate detailed progress metrics"""
    
    if not tasks:
        return {
            "total": 0,
            "completed": 0,
            "verified": 0,
            "in_progress": 0,
            "pending": 0,
            "blocked": 0,
            "percentage": 0.0
        }
    
    status_counts = Counter(t.get("status", "pending") for t in tasks)
    total = len(tasks)
    
    # Count completed as verified + completed
    done = status_counts.get("verified", 0) + status_counts.get("completed", 0)
    
    return {
        "total": total,
        "completed": status_counts.get("completed", 0),
        "verified": status_counts.get("verified", 0),
        "in_progress": status_counts.get("in_progress", 0),
        "pending": status_counts.get("pending", 0),
        "blocked": status_counts.get("blocked", 0),
        "needs_human": status_counts.get("needs_human", 0),
        "done": done,
        "percentage": (done / total) * 100 if total > 0 else 0
    }


def get_task_timeline(tasks: list) -> list:
    """Get completed tasks in order"""
    completed = [t for t in tasks if t.get("status") in ["completed", "verified"]]
    return sorted(completed, key=lambda t: t.get("completed_at", ""))


def get_blockers(tasks: list) -> list:
    """Get blocked tasks with reasons"""
    blocked = [t for t in tasks if t.get("status") in ["blocked", "needs_human"]]
    return blocked


def estimate_remaining(tasks: list, progress: dict) -> dict:
    """Estimate remaining work"""
    
    remaining_tasks = progress["pending"] + progress["in_progress"]
    
    # Estimate based on average task time (if we have completed tasks)
    completed_tasks = [t for t in tasks if t.get("completed_at") and t.get("started_at")]
    
    if completed_tasks:
        # Calculate average duration
        total_duration = 0
        for t in completed_tasks:
            try:
                start = datetime.fromisoformat(t["started_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(t["completed_at"].replace("Z", "+00:00"))
                total_duration += (end - start).total_seconds()
            except:
                continue
        
        avg_duration = total_duration / len(completed_tasks) if completed_tasks else 0
        estimated_remaining = avg_duration * remaining_tasks
        
        return {
            "remaining_tasks": remaining_tasks,
            "avg_task_duration_minutes": avg_duration / 60,
            "estimated_remaining_minutes": estimated_remaining / 60,
            "estimated_remaining_hours": estimated_remaining / 3600
        }
    
    return {
        "remaining_tasks": remaining_tasks,
        "avg_task_duration_minutes": None,
        "estimated_remaining_minutes": None,
        "estimated_remaining_hours": None
    }


def generate_markdown_report(state: dict) -> str:
    """Generate markdown progress report"""
    
    project = state.get("project", {})
    tasks = state.get("tasks", [])
    session = state.get("session", {})
    
    progress = calculate_progress(tasks)
    timeline = get_task_timeline(tasks)
    blockers = get_blockers(tasks)
    remaining = estimate_remaining(tasks, progress)
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    report = f"""# Progress Report: {project.get('name', 'Unknown Project')}

Generated: {now}

## Executive Summary

| Metric | Value |
|--------|-------|
| Phase | {state.get('phase', 'Unknown')} |
| Overall Progress | {progress['percentage']:.1f}% |
| Tasks Complete | {progress['done']} / {progress['total']} |
| Currently Active | {progress['in_progress']} |
| Blocked | {progress['blocked'] + progress.get('needs_human', 0)} |

## Task Status Breakdown

```
Verified:    {'█' * progress['verified']}{'░' * (progress['total'] - progress['verified'])} {progress['verified']}
Completed:   {'█' * progress['completed']}{'░' * (progress['total'] - progress['completed'])} {progress['completed']}
In Progress: {'▓' * progress['in_progress']}{'░' * (progress['total'] - progress['in_progress'])} {progress['in_progress']}
Pending:     {'░' * progress['pending']} {progress['pending']}
Blocked:     {'▒' * progress['blocked']} {progress['blocked']}
```

## Project Goal

{project.get('goal', 'No goal specified')}

"""
    
    # Completed tasks
    if timeline:
        report += "## Completed Tasks\n\n"
        for t in timeline[-10:]:  # Last 10
            report += f"- ✓ **{t.get('id')}**: {t.get('name')}\n"
            if t.get('completed_at'):
                report += f"  - Completed: {t['completed_at'][:16]}\n"
        report += "\n"
    
    # Current work
    in_progress = [t for t in tasks if t.get("status") == "in_progress"]
    if in_progress:
        report += "## Currently In Progress\n\n"
        for t in in_progress:
            report += f"- 🔄 **{t.get('id')}**: {t.get('name')}\n"
            if t.get('started_at'):
                report += f"  - Started: {t['started_at'][:16]}\n"
        report += "\n"
    
    # Blockers
    if blockers:
        report += "## ⚠️ Blockers\n\n"
        for t in blockers:
            report += f"- **{t.get('id')}**: {t.get('name')}\n"
            report += f"  - Status: {t.get('status')}\n"
            if t.get('notes'):
                report += f"  - Notes: {t.get('notes')}\n"
        report += "\n"
    
    # Up next
    pending = [t for t in tasks if t.get("status") == "pending"]
    if pending:
        report += "## Up Next\n\n"
        for t in pending[:5]:  # Next 5
            report += f"- ⏳ **{t.get('id')}**: {t.get('name')}\n"
        if len(pending) > 5:
            report += f"- ... and {len(pending) - 5} more\n"
        report += "\n"
    
    # Estimates
    if remaining["estimated_remaining_hours"] is not None:
        report += "## Time Estimates\n\n"
        report += f"- Average task duration: {remaining['avg_task_duration_minutes']:.0f} minutes\n"
        report += f"- Remaining tasks: {remaining['remaining_tasks']}\n"
        report += f"- Estimated time remaining: {remaining['estimated_remaining_hours']:.1f} hours\n"
        report += "\n"
    
    # Session info
    report += "## Session Info\n\n"
    report += f"- Session ID: {session.get('id', 'Unknown')}\n"
    report += f"- Context Usage: {session.get('context_usage', 0)*100:.0f}%\n"
    report += f"- Last Updated: {session.get('last_updated', 'Unknown')}\n"
    
    if session.get('notes'):
        report += f"\n**Notes**: {session['notes']}\n"
    
    return report


def generate_json_report(state: dict) -> dict:
    """Generate JSON progress report"""
    
    tasks = state.get("tasks", [])
    progress = calculate_progress(tasks)
    remaining = estimate_remaining(tasks, progress)
    
    return {
        "generated_at": datetime.now().isoformat(),
        "project": state.get("project", {}),
        "phase": state.get("phase"),
        "progress": progress,
        "remaining": remaining,
        "tasks": {
            "in_progress": [t["id"] for t in tasks if t.get("status") == "in_progress"],
            "blocked": [t["id"] for t in tasks if t.get("status") in ["blocked", "needs_human"]],
            "completed": [t["id"] for t in tasks if t.get("status") in ["completed", "verified"]]
        },
        "session": state.get("session", {})
    }


def main():
    parser = argparse.ArgumentParser(
        description="Generate progress report for project orchestrator"
    )
    parser.add_argument(
        "--path", "-p",
        default=".orchestrator/state.yaml",
        help="Path to state file"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["markdown", "json", "text"],
        default="markdown",
        help="Output format"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file (default: stdout)"
    )
    
    args = parser.parse_args()
    
    try:
        state = load_state(Path(args.path))
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    # Generate report
    if args.format == "json":
        report = json.dumps(generate_json_report(state), indent=2)
    elif args.format == "markdown":
        report = generate_markdown_report(state)
    else:
        # Text format - simplified markdown
        report = generate_markdown_report(state)
    
    # Output
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report saved to: {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
