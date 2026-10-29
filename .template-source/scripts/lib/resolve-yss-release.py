#!/usr/bin/env python3
"""Resolve one official release for regression tools; never install or execute it."""
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("yss_bootstrap", Path(__file__).resolve().parents[3] / ".agents/skills/setup-yss-harness/scripts/bootstrap.py")
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)

def resolve_release(version=None):
    bootstrap.require(sys.version_info >= (3, 11), "environment", "需要 Python 3.11+", "CAPABILITY")
    requested = bootstrap.stable_version(version) if version is not None else None
    release = bootstrap.read_json(bootstrap.fetch_bytes(bootstrap.API_BASE + ("tags/v" + requested if requested else "latest"), bootstrap.MAX_METADATA, "release"), "release")
    version = bootstrap.stable_version(release.get("tag_name"))
    bootstrap.require(release.get("tag_name") == "v" + version and release.get("draft") is False and release.get("prerelease") is False
                      and release.get("html_url") == bootstrap.RELEASE_BASE + "tag/v" + version
                      and (requested is None or version == requested), "release", "固定正式 Release 身份不符")
    proof = bootstrap.read_json(bootstrap.fetch_bytes(bootstrap.asset_url(release, "checksums.json"), bootstrap.MAX_METADATA, "checksums"), "checksums")
    required = proof.get("requiredPlatforms")
    bootstrap.require(isinstance(required, list) and required and isinstance(required[0], str), "checksums", "缺少正式发行资格")
    # A release may qualify only another platform; local builds remain regression-only.
    for target in required:
        bootstrap.validate_proof(proof, version, target)
    return {"version": version, "commit": proof["cliCommit"], "sourceLockSha256": proof["sourceLockSha256"],
            "binaries": {target.replace("/", "-"): {"sha256": bootstrap.validate_proof(proof, version, target)["binarySha256"]} for target in required}}


if __name__ == "__main__":
    try:
        print(json.dumps({"status": "ok", "result": resolve_release(sys.argv[1] if len(sys.argv) > 1 else None)}))
    except bootstrap.BootstrapError as error:
        print(json.dumps({"status": "error", "stage": error.stage, "code": error.code, "message": str(error)}, ensure_ascii=False))
        raise SystemExit(1)
