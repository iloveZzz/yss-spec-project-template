import gzip
import hashlib
import json
import os
import pathlib
import subprocess

REPOSITORY = "iloveZzz/yss-spec-project-template"
RELEASE_ID = 419685102
TAG = "v4.7.0"
COMMIT = "4b578aa139ef320be0b1dc13beb3f35cf6cd86f7"
REPORT_SHA = "5aa10318d6cbc53cbc0216dfffa848f3c6a6a729119a442c6b5686eb0483c9bb"


def api(endpoint):
    return json.loads(subprocess.check_output(["gh", "api", endpoint], text=True))


assert subprocess.check_output(["git", "rev-parse", TAG + "^{commit}"], text=True).strip() == COMMIT
release = api(f"repos/{REPOSITORY}/releases/{RELEASE_ID}")
assert release["id"] == RELEASE_ID and release["tag_name"] == TAG and release["draft"] is True
source = pathlib.Path(".release-recovery")
report = gzip.decompress((source / "template-fast-verification-report.json.gz").read_bytes())
assert len(report) == 41582678 and hashlib.sha256(report).hexdigest() == REPORT_SHA
assert (source / "SHA256SUMS").read_text() == REPORT_SHA + "  template-fast-verification-report.json\n"
out = pathlib.Path(os.environ["RUNNER_TEMP"]) / "template470-upload"
out.mkdir()
(out / "template-fast-verification-report.json").write_bytes(report)
(out / "SHA256SUMS").write_bytes((source / "SHA256SUMS").read_bytes())
expected = {p.name: {"size": p.stat().st_size, "digest": "sha256:" + hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir()}
assert set(expected) == {"template-fast-verification-report.json", "SHA256SUMS"}
existing = {a["name"]: a for a in release["assets"]}
assert len(existing) == len(release["assets"]) and set(existing) <= set(expected)
for name, asset in existing.items():
    assert asset["state"] == "uploaded" and all(asset.get(k) == v for k, v in expected[name].items()), name
missing = [str(out / name) for name in expected if name not in existing]
if missing:
    subprocess.run(["gh", "release", "upload", TAG, *missing, "--repo", REPOSITORY], check=True)
after = api(f"repos/{REPOSITORY}/releases/{RELEASE_ID}")
assert after["draft"] is True and after["tag_name"] == TAG
assets = {a["name"]: a for a in after["assets"]}
assert len(after["assets"]) == 2 and set(assets) == set(expected)
for name, expected_asset in expected.items():
    assert assets[name]["state"] == "uploaded" and all(assets[name].get(k) == v for k, v in expected_asset.items()), name
receipt = {"release_id": RELEASE_ID, "tag": TAG, "commit": COMMIT, "draft": True, "assets": expected}
(pathlib.Path(os.environ["RUNNER_TEMP"]) / "template470-upload-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt))
