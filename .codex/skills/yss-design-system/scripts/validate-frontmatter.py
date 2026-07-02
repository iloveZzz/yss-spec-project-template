#!/usr/bin/env python3
"""Validate the yss-design-system skill frontmatter without third-party deps."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"


def main() -> int:
    text = SKILL.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not match:
        print("Invalid SKILL.md frontmatter block", file=sys.stderr)
        return 1

    fields: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if not line.strip():
            continue
        key, sep, value = line.partition(":")
        if not sep:
            print(f"Invalid frontmatter line: {line}", file=sys.stderr)
            return 1
        fields[key.strip()] = value.strip()

    expected = {"name", "description"}
    if set(fields) != expected:
        print(f"Expected keys {sorted(expected)}, got {sorted(fields)}", file=sys.stderr)
        return 1

    name = fields["name"]
    if not re.match(r"^[a-z0-9-]+$", name):
        print(f"Invalid skill name: {name}", file=sys.stderr)
        return 1

    description = fields["description"]
    if not description or len(description) > 1024:
        print("Description must be present and <= 1024 chars", file=sys.stderr)
        return 1

    print(f"{name} frontmatter ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
