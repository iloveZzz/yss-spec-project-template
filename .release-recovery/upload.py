import gzip
import hashlib
import json
import os
import pathlib
import subprocess

REPOSITORY = "iloveZzz/yss-spec-project-template"
RELEASE_ID = 419845355
TAG = "v4.7.1"
COMMIT = "a435d0693b374e58f803b61817c9d8f9402c72e9"
REPORT_SHA = "79bd1e50bf7d221941816e6eba5e2150dfde58368e4a76d7632d920b08db15c7"


def api(endpoint):
    return json.loads(subprocess.check_output(["gh", "api", endpoint], text=True))


assert subprocess.check_output(["git", "rev-parse", TAG + "^{commit}"], text=True).strip() == COMMIT
release = api(f"repos/{REPOSITORY}/releases/{RELEASE_ID}")
assert release["id"] == RELEASE_ID and release["tag_name"] == TAG and release["draft"] is True
source = pathlib.Path(".release-recovery")
report = gzip.decompress((source / "template-fast-verification-report.json.gz").read_bytes())
assert len(report) == 81076058 and hashlib.sha256(report).hexdigest() == REPORT_SHA
assert (source / "SHA256SUMS").read_text() == REPORT_SHA + "  template-fast-verification-report.json\n"
out = pathlib.Path(os.environ["RUNNER_TEMP"]) / "template471-upload"
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
(pathlib.Path(os.environ["RUNNER_TEMP"]) / "template471-upload-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt))
