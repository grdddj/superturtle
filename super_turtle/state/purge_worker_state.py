from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from super_turtle.state.conductor_state import ConductorStateStore

TERMINAL_WORKER_STATES = frozenset(
    {"archived", "completed", "failed", "stopped", "timed_out"}
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove canonical worker state, optionally including archived workspace directories."
    )
    parser.add_argument(
        "--state-dir",
        default=".superturtle/state",
        help="Canonical SuperTurtle state directory (default: .superturtle/state).",
    )
    parser.add_argument(
        "--archive-root",
        default=".superturtle/subturtles/.archive",
        help="Archived subturtle workspace root (default: .superturtle/subturtles/.archive).",
    )
    parser.add_argument(
        "--worker",
        action="append",
        dest="workers",
        required=True,
        help="Worker name to purge. Repeat for multiple workers.",
    )
    parser.add_argument(
        "--delete-workspace",
        action="store_true",
        help="Also delete archived workspace directories for the selected workers.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow purging non-terminal worker states.",
    )
    return parser.parse_args()


def _is_within_archive_root(path: Path, archive_root: Path) -> bool:
    try:
        path.resolve().relative_to(archive_root.resolve())
    except ValueError:
        return False
    return True


def main() -> int:
    args = _parse_args()
    store = ConductorStateStore(args.state_dir)
    archive_root = Path(args.archive_root)
    exit_code = 0

    for worker_name in args.workers:
        state = store.load_worker_state(worker_name)
        if state is None:
            print(f"[purge-worker-state] skip {worker_name}: state not found", file=sys.stderr)
            exit_code = 1
            continue

        lifecycle_state = str(state.get("lifecycle_state") or "").strip()
        if not args.force and lifecycle_state not in TERMINAL_WORKER_STATES:
            print(
                f"[purge-worker-state] skip {worker_name}: lifecycle_state={lifecycle_state or 'unknown'} is not terminal",
                file=sys.stderr,
            )
            exit_code = 1
            continue

        workspace_removed = False
        if args.delete_workspace:
            workspace = state.get("workspace")
            if isinstance(workspace, str) and workspace.strip():
                workspace_path = Path(workspace)
                if workspace_path.exists():
                    if not _is_within_archive_root(workspace_path, archive_root):
                        print(
                            f"[purge-worker-state] skip {worker_name}: workspace is outside archive root: {workspace_path}",
                            file=sys.stderr,
                        )
                        exit_code = 1
                        continue
                    shutil.rmtree(workspace_path)
                    workspace_removed = True

        store.delete_worker_state(worker_name)
        status_line = f"[purge-worker-state] removed worker state for {worker_name}"
        if workspace_removed:
            status_line += " and archived workspace"
        print(status_line)

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
