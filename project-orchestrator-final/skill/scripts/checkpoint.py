#!/usr/bin/env python3
"""
Checkpoint management for project orchestrator.

Usage:
    python checkpoint.py create --trigger task_complete --description "Finished auth"
    python checkpoint.py list
    python checkpoint.py restore --latest
    python checkpoint.py restore --id cp_001
"""

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def load_yaml_file(path: Path) -> dict:
    """Load YAML or JSON file"""
    with open(path) as f:
        if HAS_YAML:
            return yaml.safe_load(f)
        else:
            return json.load(f)


def save_yaml_file(path: Path, data: dict):
    """Save YAML or JSON file"""
    with open(path, 'w') as f:
        if HAS_YAML:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        else:
            json.dump(data, f, indent=2)


def generate_checkpoint_id() -> str:
    """Generate unique checkpoint ID"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"cp_{timestamp}"


def compute_state_hash(state: dict) -> str:
    """Compute hash of state for integrity checking"""
    state_str = json.dumps(state, sort_keys=True)
    return hashlib.sha256(state_str.encode()).hexdigest()[:16]


def create_checkpoint(base_path: Path, trigger: str, description: str = None,
                      task_id: str = None) -> dict:
    """Create a new checkpoint"""
    
    state_path = base_path / "state.yaml"
    checkpoints_path = base_path / "checkpoints"
    manifest_path = checkpoints_path / "manifest.yaml"
    
    # Load current state
    if not state_path.exists():
        raise FileNotFoundError("State file not found")
    
    state = load_yaml_file(state_path)
    
    # Generate checkpoint
    checkpoint_id = generate_checkpoint_id()
    now = datetime.now().isoformat()
    
    checkpoint = {
        "id": checkpoint_id,
        "created": now,
        "trigger": trigger,
        "description": description or f"Checkpoint triggered by {trigger}",
        "task_id": task_id,
        "state_hash": compute_state_hash(state),
        "state_snapshot": state,
        "context": {
            "phase": state.get("phase"),
            "phase_progress": state.get("phase_progress", 0),
            "active_tasks": [
                t["id"] for t in state.get("tasks", [])
                if t.get("status") == "in_progress"
            ]
        }
    }
    
    # Save checkpoint file
    checkpoint_file = f"{checkpoint_id}.yaml"
    checkpoint_path = checkpoints_path / checkpoint_file
    save_yaml_file(checkpoint_path, checkpoint)
    
    # Update manifest
    if manifest_path.exists():
        manifest = load_yaml_file(manifest_path)
    else:
        manifest = {
            "checkpoints": [],
            "latest": None,
            "retention": {
                "keep_last": 10,
                "keep_milestones": True,
                "max_age_days": 30
            }
        }
    
    # Add to manifest
    manifest["checkpoints"].append({
        "id": checkpoint_id,
        "created": now,
        "trigger": trigger,
        "task": task_id,
        "file": checkpoint_file
    })
    
    # Find parent (previous latest)
    if manifest["latest"]:
        checkpoint["parent"] = manifest["latest"]
    
    manifest["latest"] = checkpoint_id
    
    # Enforce retention policy
    manifest = enforce_retention(manifest, checkpoints_path)
    
    save_yaml_file(manifest_path, manifest)
    
    return checkpoint


def enforce_retention(manifest: dict, checkpoints_path: Path) -> dict:
    """Enforce checkpoint retention policy"""
    retention = manifest.get("retention", {})
    keep_last = retention.get("keep_last", 10)
    
    checkpoints = manifest.get("checkpoints", [])
    
    if len(checkpoints) > keep_last:
        # Keep most recent
        to_remove = checkpoints[:-keep_last]
        manifest["checkpoints"] = checkpoints[-keep_last:]
        
        # Delete old checkpoint files
        for cp in to_remove:
            cp_path = checkpoints_path / cp["file"]
            if cp_path.exists():
                cp_path.unlink()
    
    return manifest


def list_checkpoints(base_path: Path) -> list:
    """List all checkpoints"""
    manifest_path = base_path / "checkpoints" / "manifest.yaml"
    
    if not manifest_path.exists():
        return []
    
    manifest = load_yaml_file(manifest_path)
    return manifest.get("checkpoints", [])


def restore_checkpoint(base_path: Path, checkpoint_id: str = None,
                       latest: bool = False) -> dict:
    """Restore state from a checkpoint"""
    
    checkpoints_path = base_path / "checkpoints"
    manifest_path = checkpoints_path / "manifest.yaml"
    state_path = base_path / "state.yaml"
    
    if not manifest_path.exists():
        raise FileNotFoundError("No checkpoints found")
    
    manifest = load_yaml_file(manifest_path)
    
    # Determine which checkpoint to restore
    if latest:
        checkpoint_id = manifest.get("latest")
        if not checkpoint_id:
            raise ValueError("No latest checkpoint available")
    
    if not checkpoint_id:
        raise ValueError("Must specify checkpoint ID or --latest")
    
    # Find checkpoint in manifest
    checkpoint_entry = None
    for cp in manifest.get("checkpoints", []):
        if cp["id"] == checkpoint_id:
            checkpoint_entry = cp
            break
    
    if not checkpoint_entry:
        raise ValueError(f"Checkpoint not found: {checkpoint_id}")
    
    # Load checkpoint file
    checkpoint_path = checkpoints_path / checkpoint_entry["file"]
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint file missing: {checkpoint_path}")
    
    checkpoint = load_yaml_file(checkpoint_path)
    
    # Verify hash
    state_snapshot = checkpoint.get("state_snapshot")
    expected_hash = checkpoint.get("state_hash")
    actual_hash = compute_state_hash(state_snapshot)
    
    if expected_hash and actual_hash != expected_hash:
        print(f"Warning: Checkpoint hash mismatch. Data may be corrupted.")
    
    # Backup current state before restore
    if state_path.exists():
        backup_path = base_path / "backups" / f"state_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.yaml"
        backup_path.parent.mkdir(exist_ok=True)
        shutil.copy(state_path, backup_path)
    
    # Restore state
    save_yaml_file(state_path, state_snapshot)
    
    # Update session info
    state_snapshot["session"]["last_updated"] = datetime.now().isoformat()
    state_snapshot["session"]["notes"] = f"Restored from checkpoint {checkpoint_id}"
    save_yaml_file(state_path, state_snapshot)
    
    return {
        "restored_from": checkpoint_id,
        "checkpoint_created": checkpoint.get("created"),
        "phase": state_snapshot.get("phase"),
        "progress": state_snapshot.get("phase_progress", 0)
    }


def main():
    parser = argparse.ArgumentParser(
        description="Checkpoint management for project orchestrator"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Create command
    create_parser = subparsers.add_parser("create", help="Create a checkpoint")
    create_parser.add_argument(
        "--trigger", "-t",
        default="manual",
        help="What triggered this checkpoint"
    )
    create_parser.add_argument(
        "--description", "-d",
        help="Description of checkpoint"
    )
    create_parser.add_argument(
        "--task", "-T",
        help="Related task ID"
    )
    
    # List command
    list_parser = subparsers.add_parser("list", help="List checkpoints")
    list_parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    
    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore from checkpoint")
    restore_parser.add_argument(
        "--id", "-i",
        help="Checkpoint ID to restore"
    )
    restore_parser.add_argument(
        "--latest", "-l",
        action="store_true",
        help="Restore from latest checkpoint"
    )
    
    # Global options
    parser.add_argument(
        "--path", "-p",
        default=".orchestrator",
        help="Orchestrator directory path"
    )
    
    args = parser.parse_args()
    base_path = Path(args.path)
    
    if not base_path.exists():
        print(f"Error: Orchestrator directory not found: {base_path}")
        sys.exit(1)
    
    try:
        if args.command == "create":
            checkpoint = create_checkpoint(
                base_path,
                trigger=args.trigger,
                description=args.description,
                task_id=args.task
            )
            print(f"✓ Created checkpoint: {checkpoint['id']}")
            print(f"  Trigger: {checkpoint['trigger']}")
            print(f"  Phase: {checkpoint['context']['phase']}")
        
        elif args.command == "list":
            checkpoints = list_checkpoints(base_path)
            
            if args.json:
                print(json.dumps(checkpoints, indent=2))
            else:
                if not checkpoints:
                    print("No checkpoints found")
                else:
                    print(f"Checkpoints ({len(checkpoints)}):\n")
                    for cp in reversed(checkpoints):  # Most recent first
                        print(f"  {cp['id']}")
                        print(f"    Created: {cp['created']}")
                        print(f"    Trigger: {cp['trigger']}")
                        if cp.get('task'):
                            print(f"    Task: {cp['task']}")
                        print()
        
        elif args.command == "restore":
            result = restore_checkpoint(
                base_path,
                checkpoint_id=args.id,
                latest=args.latest
            )
            print(f"✓ Restored from checkpoint: {result['restored_from']}")
            print(f"  Original created: {result['checkpoint_created']}")
            print(f"  Phase: {result['phase']}")
            print(f"  Progress: {result['progress']*100:.0f}%")
        
        else:
            parser.print_help()
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
