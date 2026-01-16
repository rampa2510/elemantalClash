#!/usr/bin/env python3
"""
Git worktree management for orchestrator sessions.

Creates isolated worktrees for safe autonomous execution.
Changes stay isolated until explicitly merged.

Usage:
    python worktree.py create [name]     # Create new worktree
    python worktree.py list              # List all worktrees
    python worktree.py status            # Show current worktree status
    python worktree.py merge <name>      # Merge worktree to main
    python worktree.py cleanup           # Remove old worktrees
"""

import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path

WORKTREE_DIR = ".worktrees"
BRANCH_PREFIX = "orchestrator"


def run_git(args: list, check: bool = True) -> tuple[int, str, str]:
    """Run git command and return (returncode, stdout, stderr)"""
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True
    )
    if check and result.returncode != 0:
        raise Exception(f"Git error: {result.stderr}")
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def is_git_repo() -> bool:
    """Check if current directory is a git repository"""
    code, _, _ = run_git(["rev-parse", "--git-dir"], check=False)
    return code == 0


def get_current_branch() -> str:
    """Get current branch name"""
    _, stdout, _ = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    return stdout


def create_worktree(name: str = None) -> str:
    """Create new worktree for orchestrator session"""
    
    if not is_git_repo():
        print("Error: Not a git repository")
        sys.exit(1)
    
    # Generate name if not provided
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = name or f"session-{timestamp}"
    
    branch = f"{BRANCH_PREFIX}/{name}"
    path = f"{WORKTREE_DIR}/{name}"
    
    # Create worktree directory
    Path(WORKTREE_DIR).mkdir(exist_ok=True)
    
    # Check if path already exists
    if Path(path).exists():
        print(f"Error: Worktree already exists at {path}")
        sys.exit(1)
    
    # Create worktree with new branch
    run_git(["worktree", "add", path, "-b", branch])
    
    # Create .orchestrator directory in worktree
    orchestrator_path = Path(path) / ".orchestrator"
    orchestrator_path.mkdir(exist_ok=True)
    (orchestrator_path / "checkpoints").mkdir(exist_ok=True)
    (orchestrator_path / "knowledge").mkdir(exist_ok=True)
    
    print(f"\n✓ Created worktree:")
    print(f"  Path:   {path}")
    print(f"  Branch: {branch}")
    print(f"\n📁 Directory structure:")
    print(f"  {path}/")
    print(f"  └── .orchestrator/")
    print(f"      ├── checkpoints/")
    print(f"      └── knowledge/")
    print(f"\n🚀 To start working:")
    print(f"  cd {path}")
    print(f"\n💡 When done:")
    print(f"  python worktree.py merge {name}")
    
    return path


def list_worktrees():
    """List all worktrees"""
    _, output, _ = run_git(["worktree", "list"])
    
    print("Git Worktrees:")
    print("-" * 60)
    
    for line in output.split("\n"):
        if line:
            parts = line.split()
            path = parts[0]
            commit = parts[1] if len(parts) > 1 else ""
            branch = parts[2] if len(parts) > 2 else ""
            
            # Check if orchestrator worktree
            is_orchestrator = WORKTREE_DIR in path or BRANCH_PREFIX in branch
            marker = "🤖" if is_orchestrator else "  "
            
            print(f"{marker} {path}")
            print(f"     Branch: {branch}  Commit: {commit}")
            
            # Check for orchestrator state
            state_file = Path(path) / ".orchestrator" / "state.yaml"
            if state_file.exists():
                print(f"     State: .orchestrator/state.yaml ✓")
            print()


def show_status():
    """Show current worktree status"""
    if not is_git_repo():
        print("Error: Not a git repository")
        sys.exit(1)
    
    # Get current directory
    cwd = Path.cwd()
    
    # Check if in a worktree
    _, git_dir, _ = run_git(["rev-parse", "--git-dir"])
    is_worktree = ".git/worktrees" in git_dir or "worktrees" in git_dir
    
    branch = get_current_branch()
    
    print("Current Status:")
    print("-" * 40)
    print(f"Directory: {cwd}")
    print(f"Branch:    {branch}")
    print(f"Worktree:  {'Yes' if is_worktree else 'No (main repo)'}")
    
    # Check for orchestrator state
    state_file = cwd / ".orchestrator" / "state.yaml"
    if state_file.exists():
        print(f"State:     .orchestrator/state.yaml ✓")
    else:
        print(f"State:     No orchestrator state found")
    
    # Check for uncommitted changes
    code, stdout, _ = run_git(["status", "--porcelain"], check=False)
    if stdout:
        changes = len(stdout.split("\n"))
        print(f"Changes:   {changes} uncommitted file(s)")
    else:
        print(f"Changes:   Working tree clean")


def merge_worktree(name: str, squash: bool = True):
    """Merge worktree branch back to main"""
    
    branch = f"{BRANCH_PREFIX}/{name}"
    worktree_path = f"{WORKTREE_DIR}/{name}"
    
    # Check worktree exists
    if not Path(worktree_path).exists():
        print(f"Error: Worktree not found at {worktree_path}")
        sys.exit(1)
    
    # Check for uncommitted changes in worktree
    os.chdir(worktree_path)
    code, stdout, _ = run_git(["status", "--porcelain"], check=False)
    if stdout:
        print(f"Warning: Worktree has uncommitted changes:")
        print(stdout)
        response = input("Commit them before merge? (y/N): ")
        if response.lower() == 'y':
            run_git(["add", "-A"])
            run_git(["commit", "-m", f"Final commit for {name}"])
        else:
            print("Aborted. Commit or discard changes first.")
            sys.exit(1)
    
    # Go back to main repo
    os.chdir("../..")
    
    # Get current branch
    current = get_current_branch()
    
    # Switch to main if not already
    if current != "main" and current != "master":
        print(f"Switching from {current} to main...")
        run_git(["checkout", "main"])
    
    # Perform merge
    if squash:
        print(f"Squash merging {branch}...")
        run_git(["merge", branch, "--squash"])
        print(f"\n✓ Changes staged. Review and commit with:")
        print(f"  git commit -m 'Merge {name}: <description>'")
    else:
        print(f"Merging {branch}...")
        run_git(["merge", branch, "--no-ff", "-m", f"Merge {branch}"])
        print(f"\n✓ Merged {branch} to main")
    
    print(f"\n📋 Next steps:")
    print(f"  1. Review changes: git diff --cached")
    print(f"  2. Commit: git commit -m '...'")
    print(f"  3. Cleanup: python worktree.py cleanup")


def cleanup_worktrees(force: bool = False):
    """Remove old/merged worktrees"""
    
    # Prune stale worktree references
    run_git(["worktree", "prune"])
    
    # List worktrees in .worktrees/
    worktree_dir = Path(WORKTREE_DIR)
    if not worktree_dir.exists():
        print("No worktrees directory found.")
        return
    
    removed = 0
    for item in worktree_dir.iterdir():
        if item.is_dir():
            if force:
                confirm = True
            else:
                response = input(f"Remove {item}? (y/N): ")
                confirm = response.lower() == 'y'
            
            if confirm:
                try:
                    run_git(["worktree", "remove", str(item), "--force"])
                    print(f"  ✓ Removed {item}")
                    removed += 1
                except Exception as e:
                    print(f"  ✗ Failed to remove {item}: {e}")
    
    print(f"\nRemoved {removed} worktree(s)")
    
    # Cleanup orphan branches
    _, stdout, _ = run_git(["branch", "--list", f"{BRANCH_PREFIX}/*"])
    if stdout:
        print(f"\nOrphan branches found:")
        for branch in stdout.split("\n"):
            branch = branch.strip()
            if branch:
                print(f"  {branch}")
        print(f"\nRemove with: git branch -D <branch-name>")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    
    command = sys.argv[1]
    
    try:
        if command == "create":
            name = sys.argv[2] if len(sys.argv) > 2 else None
            create_worktree(name)
        
        elif command == "list":
            list_worktrees()
        
        elif command == "status":
            show_status()
        
        elif command == "merge":
            if len(sys.argv) < 3:
                print("Usage: worktree.py merge <name>")
                print("       worktree.py merge session-20250103_120000")
                sys.exit(1)
            merge_worktree(sys.argv[2])
        
        elif command == "cleanup":
            force = "--force" in sys.argv
            cleanup_worktrees(force)
        
        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
