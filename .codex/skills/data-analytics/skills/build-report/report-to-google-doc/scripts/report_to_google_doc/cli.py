"""Convert HTML to local DOCX and record the requested delivery target.

No Google APIs are called. Local delivery is the default. Cloud planning requires
an explicit target and never substitutes for capability discovery or authorization.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .constants import DEFAULT_RENDER_WORKERS
from .plan import write_outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", type=Path, help="Local HTML report path")
    parser.add_argument(
        "--out-dir", type=Path, required=True, help="Directory for generated plan files"
    )
    parser.add_argument(
        "--chart-mode",
        choices=["image", "table"],
        default="image",
        help="Use rendered chart images by default; `table` writes simple parsed chart tables into the DOCX.",
    )
    parser.add_argument(
        "--render-workers",
        type=int,
        default=DEFAULT_RENDER_WORKERS,
        help=(
            "Number of chart/table-grid images to render concurrently. "
            "Default 0 auto-selects a conservative worker count; use an "
            "explicit positive value only after benchmarking this report family."
        ),
    )
    parser.add_argument(
        "--no-strict-preflight",
        action="store_true",
        help="Write preflight_checks.json but do not fail the command when checks fail.",
    )
    parser.add_argument("--target", choices=["local-docx", "hosted-docx", "native-google-docs"], default="local-docx")
    args = parser.parse_args()
    write_outputs(
        args.html,
        args.out_dir,
        chart_mode=args.chart_mode,
        render_workers=args.render_workers,
        strict_preflight=not args.no_strict_preflight,
        target=args.target,
    )
