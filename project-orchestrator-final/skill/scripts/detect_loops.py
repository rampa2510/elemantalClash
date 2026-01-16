#!/usr/bin/env python3
"""
Detect infinite loops by comparing output similarity.

Usage:
    python detect_loops.py <output1> <output2>
    python detect_loops.py --file session.jsonl
    python detect_loops.py --text "output string" --history history.txt
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path
from collections import deque


def jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts"""
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = len(words1 & words2)
    union = len(words1 | words2)
    
    return intersection / union


def hash_text(text: str) -> str:
    """Generate hash of text for exact match detection"""
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def detect_exact_match(text: str, history: list) -> bool:
    """Check for exact repetition in history"""
    text_hash = hash_text(text)
    history_hashes = [hash_text(h) for h in history]
    return text_hash in history_hashes


def detect_similarity_loop(text: str, history: list, 
                           threshold: float = 0.8) -> tuple[bool, float]:
    """Check for high similarity with recent outputs"""
    max_similarity = 0.0
    
    for prev_text in history:
        similarity = jaccard_similarity(text, prev_text)
        max_similarity = max(max_similarity, similarity)
        
        if similarity >= threshold:
            return True, similarity
    
    return False, max_similarity


def analyze_session_log(log_path: Path, window_size: int = 5,
                        threshold: float = 0.8) -> dict:
    """Analyze session log for loop patterns"""
    
    if not log_path.exists():
        raise FileNotFoundError(f"Log file not found: {log_path}")
    
    outputs = []
    loop_events = []
    
    with open(log_path) as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                if "output" in event:
                    outputs.append(event["output"])
            except json.JSONDecodeError:
                continue
    
    # Sliding window analysis
    for i in range(window_size, len(outputs)):
        current = outputs[i]
        history = outputs[i-window_size:i]
        
        # Check for exact match
        if detect_exact_match(current, history):
            loop_events.append({
                "index": i,
                "type": "exact_match",
                "severity": "high"
            })
            continue
        
        # Check for similarity
        is_similar, similarity = detect_similarity_loop(current, history, threshold)
        if is_similar:
            loop_events.append({
                "index": i,
                "type": "high_similarity",
                "similarity": similarity,
                "severity": "medium" if similarity < 0.9 else "high"
            })
    
    return {
        "total_outputs": len(outputs),
        "loop_events": loop_events,
        "loop_detected": len(loop_events) > 0,
        "consecutive_loops": count_consecutive(loop_events)
    }


def count_consecutive(events: list) -> int:
    """Count maximum consecutive loop events"""
    if not events:
        return 0
    
    max_consecutive = 1
    current_consecutive = 1
    
    for i in range(1, len(events)):
        if events[i]["index"] == events[i-1]["index"] + 1:
            current_consecutive += 1
            max_consecutive = max(max_consecutive, current_consecutive)
        else:
            current_consecutive = 1
    
    return max_consecutive


def compare_two_outputs(text1: str, text2: str) -> dict:
    """Compare two outputs for loop detection"""
    
    exact_match = hash_text(text1) == hash_text(text2)
    similarity = jaccard_similarity(text1, text2)
    
    # Determine verdict
    if exact_match:
        verdict = "EXACT_MATCH"
        severity = "high"
    elif similarity >= 0.9:
        verdict = "NEAR_IDENTICAL"
        severity = "high"
    elif similarity >= 0.8:
        verdict = "HIGH_SIMILARITY"
        severity = "medium"
    elif similarity >= 0.6:
        verdict = "MODERATE_SIMILARITY"
        severity = "low"
    else:
        verdict = "DIFFERENT"
        severity = "none"
    
    return {
        "exact_match": exact_match,
        "similarity": similarity,
        "verdict": verdict,
        "severity": severity,
        "is_loop": verdict in ["EXACT_MATCH", "NEAR_IDENTICAL", "HIGH_SIMILARITY"]
    }


def main():
    parser = argparse.ArgumentParser(
        description="Detect infinite loops in agent outputs"
    )
    
    # Mode 1: Compare two outputs directly
    parser.add_argument(
        "output1",
        nargs="?",
        help="First output text or file path"
    )
    parser.add_argument(
        "output2",
        nargs="?",
        help="Second output text or file path"
    )
    
    # Mode 2: Analyze session log
    parser.add_argument(
        "--file", "-f",
        help="Session log file (JSONL format)"
    )
    
    # Mode 3: Check text against history
    parser.add_argument(
        "--text", "-t",
        help="Current output text to check"
    )
    parser.add_argument(
        "--history", "-H",
        help="File containing previous outputs (one per line)"
    )
    
    # Options
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.8,
        help="Similarity threshold for loop detection (default: 0.8)"
    )
    parser.add_argument(
        "--window",
        type=int,
        default=5,
        help="Window size for analysis (default: 5)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    
    # Mode 1: Compare two outputs
    if args.output1 and args.output2:
        # Check if they're file paths
        text1 = args.output1
        text2 = args.output2
        
        if Path(args.output1).exists():
            text1 = Path(args.output1).read_text()
        if Path(args.output2).exists():
            text2 = Path(args.output2).read_text()
        
        result = compare_two_outputs(text1, text2)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Comparison Result:")
            print(f"  Exact match: {result['exact_match']}")
            print(f"  Similarity: {result['similarity']:.2%}")
            print(f"  Verdict: {result['verdict']}")
            print(f"  Is loop: {result['is_loop']}")
        
        sys.exit(1 if result['is_loop'] else 0)
    
    # Mode 2: Analyze session log
    elif args.file:
        try:
            result = analyze_session_log(
                Path(args.file),
                window_size=args.window,
                threshold=args.threshold
            )
            
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"Session Analysis: {args.file}")
                print(f"  Total outputs: {result['total_outputs']}")
                print(f"  Loop events: {len(result['loop_events'])}")
                print(f"  Consecutive loops: {result['consecutive_loops']}")
                print(f"  Loop detected: {result['loop_detected']}")
                
                if result['loop_events']:
                    print(f"\n  Loop events:")
                    for event in result['loop_events'][:10]:  # Show first 10
                        print(f"    Index {event['index']}: {event['type']} ({event['severity']})")
            
            sys.exit(1 if result['loop_detected'] else 0)
            
        except FileNotFoundError as e:
            print(f"Error: {e}")
            sys.exit(2)
    
    # Mode 3: Check text against history
    elif args.text and args.history:
        history_path = Path(args.history)
        if not history_path.exists():
            print(f"Error: History file not found: {args.history}")
            sys.exit(2)
        
        history = history_path.read_text().strip().split('\n')
        
        is_exact = detect_exact_match(args.text, history)
        is_similar, similarity = detect_similarity_loop(
            args.text, history, args.threshold
        )
        
        result = {
            "exact_match": is_exact,
            "high_similarity": is_similar,
            "max_similarity": similarity,
            "is_loop": is_exact or is_similar
        }
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Loop Detection:")
            print(f"  Exact match: {is_exact}")
            print(f"  High similarity: {is_similar}")
            print(f"  Max similarity: {similarity:.2%}")
            print(f"  Is loop: {result['is_loop']}")
        
        sys.exit(1 if result['is_loop'] else 0)
    
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
