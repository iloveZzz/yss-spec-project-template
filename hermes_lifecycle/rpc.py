from __future__ import annotations

import json
import sys
from typing import Any, Callable

from hermes_lifecycle.commands.doctor import doctor


RpcMethod = Callable[[dict[str, Any]], dict[str, Any]]


def _doctor(params: dict[str, Any]) -> dict[str, Any]:
    return doctor(root=params.get("root"), state=params.get("state", ".comet.yaml"))


METHODS: dict[str, RpcMethod] = {
    "doctor": _doctor,
}


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    method = request.get("method")
    params = request.get("params") or {}
    try:
        if method not in METHODS:
            raise ValueError(f"unknown method: {method}")
        if not isinstance(params, dict):
            raise TypeError("params must be an object")
        return {"id": request_id, "ok": True, "result": METHODS[method](params)}
    except Exception as exc:
        return {
            "id": request_id,
            "ok": False,
            "error": {"code": exc.__class__.__name__, "message": str(exc)},
        }


def main() -> int:
    processed = 0
    for line in sys.stdin:
        if not line.strip():
            continue
        processed += 1
        try:
            request = json.loads(line)
            response = handle_request(request)
        except Exception as exc:
            response = {
                "id": None,
                "ok": False,
                "error": {"code": exc.__class__.__name__, "message": str(exc)},
            }
        print(json.dumps(response, ensure_ascii=False), flush=True)
    return 0 if processed else 1


if __name__ == "__main__":
    raise SystemExit(main())
