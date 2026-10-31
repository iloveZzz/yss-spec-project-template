"""Bootstrap trust-boundary tests; no network or downloaded program is executed."""
import contextlib
import copy
import hashlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import stat
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request
import zipfile

SCRIPT = Path(__file__).resolve().parents[1] / ".agents/skills/setup-yss-harness/scripts/bootstrap.py"
SPEC = importlib.util.spec_from_file_location("bootstrap", SCRIPT)
bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bootstrap)


def encoded(value):
    return json.dumps(value, sort_keys=True).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def fixture(platform="darwin/arm64", change=None, extra=None):
    version, commit = "3.1.0", "a" * 40
    binary = "yss.exe" if platform.startswith("windows/") else "yss"
    producer = {"version": "bundle-producer-v4", "commit": "b" * 40, "sourceState": "committed"}
    source = {"profile": "spec", "sourcePath": ".", "templateCommit": "c" * 40,
              "templateVersion": "5.1.0", "templateTag": "v5.1.0", "sourceState": "committed",
              "policyPath": ".template-source/distribution/bundle-profile.json", "policyHash": "d" * 64,
              "legacy": {"version": "3.5.10", "cliCommit": "e" * 40}}
    lock = {"schemaVersion": 5, "producer": producer, "profiles": {"spec": source}}
    bundle = {"schemaVersion": 4, "profile": "spec", "templateVersion": "5.1.0",
              "templateCommit": source["templateCommit"], "sourceState": "committed", "producer": producer,
              "legacy": source["legacy"], "legacyVersion": "3.5.10", "legacyCLICommit": "e" * 40,
              "sourceSnapshotHash": "f" * 64, "manifestHash": "1" * 64, "bundleHash": "2" * 64,
              "sourcePolicy": {"kind": "committed", "path": source["policyPath"], "digest": source["policyHash"]}}
    lock["profiles"]["backend"] = copy.deepcopy(source)
    lock["profiles"]["backend"].update(profile="backend", overlayPaths=["profiles/backend"])
    bundles = {"spec": bundle, "backend": copy.deepcopy(bundle)}
    bundles["backend"]["profile"] = "backend"
    files = {binary: b"must never execute this downloaded file", "README.md": b"readme",
             "docs/source-lock.json": encoded(lock), "docs/compatibility.md": b"compatibility"}
    modes = {name: 0o755 if name == binary else 0o644 for name in files}
    manifest = {"schemaVersion": 1, "cliVersion": version, "protocolVersion": 1, "platform": platform,
                "cgo": False, "sourceState": "committed", "cliCommit": commit, "bundles": bundles,
                "binarySha256": sha(files[binary]), "sourceLockSha256": sha(files["docs/source-lock.json"]),
                "requiredPlatforms": [platform], "supportedPlatforms": sorted(bootstrap.PLATFORMS),
                "nativeReceiptSha256": "3" * 64, "releaseGateSha256": "4" * 64,
                "stableReady": True, "runtimeVerification": "passed",
                "files": {name: {"type": "file", "digest": sha(body), "mode": modes[name]} for name, body in files.items()}}
    if change:
        change(files, modes, manifest)
    files["release-manifest.json"] = encoded(manifest)
    modes["release-manifest.json"] = 0o644
    out = io.BytesIO()
    if platform.startswith("windows/"):
        with zipfile.ZipFile(out, "w") as archive:
            for name, body in files.items():
                info = zipfile.ZipInfo(name)
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | modes[name]) << 16
                archive.writestr(info, body)
    else:
        with tarfile.open(fileobj=out, mode="w:gz") as archive:
            for name, body in files.items():
                info = tarfile.TarInfo(name)
                info.size, info.mode = len(body), modes[name]
                archive.addfile(info, io.BytesIO(body))
            if extra:
                extra(archive)
    data = out.getvalue()
    name = "yss_3.1.0_" + platform.replace("/", "_") + (".zip" if platform.startswith("windows/") else ".tar.gz")
    artifact = {"platform": platform, "archive": name, "sha256": sha(data), "bytes": len(data),
                "compiled": False, "nativeRuntimeVerified": True, "binarySha256": sha(files[binary]), "nativeReceiptSha256": "3" * 64}
    proof = {"schemaVersion": 2, "version": version, "cliCommit": commit, "sourceState": "committed",
             "stableReady": True, "pending": [], "sourceLockSha256": sha(files["docs/source-lock.json"]),
             "releaseGateSha256": "4" * 64, "inputManifestSha256": "5" * 64,
             "qualificationScope": "local-platform-program-install", "requiredPlatforms": [platform],
             "supportedPlatforms": sorted(bootstrap.PLATFORMS),
             "bundles": {profile: {key: item[key] for key in ("templateVersion", "templateCommit", "sourceState", "sourceSnapshotHash", "manifestHash", "bundleHash")} for profile, item in bundles.items()},
             "artifacts": [artifact]}
    release = {"tag_name": "v3.1.0", "draft": False, "prerelease": False,
               "html_url": bootstrap.RELEASE_BASE + "tag/v3.1.0", "assets": [
                   {"name": asset, "browser_download_url": bootstrap.RELEASE_BASE + "download/v3.1.0/" + asset,
                    "size": size} for asset, size in [("checksums.json", len(encoded(proof))), (name, len(data))]]}
    return release, proof, data


class BootstrapTests(unittest.TestCase):
    def release_resolver(self):
        spec = importlib.util.spec_from_file_location("regression_release", SCRIPT.parents[4] / ".template-source/scripts/lib/resolve-yss-release.py")
        resolver = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(resolver)
        return resolver

    def test_regression_resolver_pins_latest_once_and_preserves_platform_qualification(self):
        resolver = self.release_resolver()
        release, proof, _ = fixture()
        with patch.object(resolver.bootstrap, "fetch_bytes", side_effect=[encoded(release), encoded(proof)]) as fetch:
            result = resolver.resolve_release()
        self.assertEqual(result["commit"], proof["cliCommit"])
        self.assertEqual(set(result["binaries"]), {"darwin-arm64"})
        self.assertEqual(fetch.call_count, 2)
        self.assertTrue(fetch.call_args_list[0].args[0].endswith("/latest"))
        self.assertIn("/download/v3.1.0/", fetch.call_args_list[1].args[0])

    def test_regression_resolver_rejects_unknown_proof_and_fixes_explicit_tag(self):
        resolver = self.release_resolver()
        release, proof, _ = fixture()
        proof["schemaVersion"] = 99
        with patch.object(resolver.bootstrap, "fetch_bytes", side_effect=[encoded(release), encoded(proof)]) as fetch:
            with self.assertRaises(resolver.bootstrap.BootstrapError):
                resolver.resolve_release("3.1.0")
        self.assertTrue(fetch.call_args_list[0].args[0].endswith("/tags/v3.1.0"))

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

    def prepare(self, payload=None, version=None):
        release, proof, data = payload or fixture()
        with patch.object(bootstrap, "current_platform", return_value="darwin/arm64"), patch.object(
            bootstrap, "fetch_bytes", side_effect=[encoded(release), encoded(proof), data]
        ) as fetch:
            result = bootstrap.prepare(str(self.root / "new"), version)
        return result, fetch

    def test_latest_pins_download_and_extracts_only_executor(self):
        result, fetch = self.prepare()
        self.assertEqual(fetch.call_count, 3)
        self.assertTrue(fetch.call_args_list[0].args[0].endswith("/latest"))
        self.assertTrue(all("/download/v3.1.0/" in call.args[0] for call in fetch.call_args_list[1:]))
        self.assertEqual(Path(result["executor"]).read_bytes(), b"must never execute this downloaded file")
        self.assertEqual(stat.S_IMODE(Path(result["executor"]).stat().st_mode), 0o755)
        self.assertFalse((self.root / "new" / "docs").exists())
        self.assertEqual(result["archiveSha256"], sha(Path(result["archive"]).read_bytes()))

    def test_fixed_version_does_not_query_latest(self):
        _, fetch = self.prepare(version="v3.1.0")
        self.assertTrue(fetch.call_args_list[0].args[0].endswith("/tags/v3.1.0"))

    def test_existing_directory_and_symlink_parent_refused_before_network(self):
        target = self.root / "keep"
        target.mkdir()
        (target / "user.txt").write_text("keep")
        link = self.root / "alias"
        link.symlink_to(target, target_is_directory=True)
        with patch.object(bootstrap, "fetch_bytes") as fetch:
            for path in (target, link / "child", Path("relative")):
                with self.subTest(path=path), self.assertRaises(bootstrap.BootstrapError):
                    bootstrap.prepare(str(path))
            fetch.assert_not_called()
        self.assertEqual((target / "user.txt").read_text(), "keep")

    def test_unqualified_platform_rejected_before_package_download(self):
        release, proof, data = fixture()
        proof["requiredPlatforms"] = ["windows/amd64"]
        with patch.object(bootstrap, "current_platform", return_value="darwin/arm64"), patch.object(
            bootstrap, "fetch_bytes", side_effect=[encoded(release), encoded(proof), data]
        ) as fetch, self.assertRaises(bootstrap.BootstrapError):
            bootstrap.prepare(str(self.root / "new"))
        self.assertEqual(fetch.call_count, 2)

    def test_wrong_digest_and_build_only_rejected(self):
        for field, value in (("sha256", "0" * 64), ("compiled", True), ("nativeRuntimeVerified", False)):
            release, proof, data = fixture()
            proof["artifacts"][0][field] = value
            with self.subTest(field=field), self.assertRaises(bootstrap.BootstrapError):
                self.prepare((release, proof, data))
            if (self.root / "new").exists():
                self.assertFalse((self.root / "new" / "yss").exists())
                shutil.rmtree(self.root / "new")

    def test_manifest_identity_digest_and_permissions_checked(self):
        for change in (lambda f, m, j: j.update(cliCommit="f" * 40),
                       lambda f, m, j: m.update(yss=0o777),
                       lambda f, m, j: f.update({"README.md": b"changed"}),
                       lambda f, m, j: j.update(protocolVersion=True)):
            release, proof, data = fixture(change=change)
            with self.subTest(change=change), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.validate_archive(data, proof["artifacts"][0], proof, "3.1.0", "darwin/arm64")

    def test_unknown_duplicate_traversal_and_link_members_rejected(self):
        for name, kind in (("../escape", tarfile.REGTYPE), ("yss", tarfile.REGTYPE),
                           ("extra", tarfile.REGTYPE), ("yss-link", tarfile.SYMTYPE)):
            def extra(archive):
                info = tarfile.TarInfo(name)
                info.type, info.linkname = kind, "yss" if kind == tarfile.SYMTYPE else ""
                archive.addfile(info, io.BytesIO())
            _, proof, data = fixture(extra=extra)
            with self.subTest(name=name), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.validate_archive(data, proof["artifacts"][0], proof, "3.1.0", "darwin/arm64")

    def test_trailing_gzip_stream_rejected(self):
        _, proof, data = fixture()
        data += data
        proof["artifacts"][0].update(sha256=sha(data), bytes=len(data))
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.validate_archive(data, proof["artifacts"][0], proof, "3.1.0", "darwin/arm64")

    def test_qualified_zip_parsing_is_independent_of_native_execution(self):
        _, proof, data = fixture(platform="windows/amd64")
        binary, _ = bootstrap.validate_archive(data, proof["artifacts"][0], proof, "3.1.0", "windows/amd64")
        self.assertEqual(binary, b"must never execute this downloaded file")

    def test_json_duplicate_keys_and_nonfinite_numbers_rejected(self):
        for data in (b'{"a":1,"a":2}', b'{"a":NaN}'):
            with self.subTest(data=data), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.read_json(data, "test")

    def test_retired_cli_releases_are_rejected(self):
        _, proof, _ = fixture()
        proof["version"] = "2.8.1"
        proof["artifacts"][0]["archive"] = proof["artifacts"][0]["archive"].replace("3.1.0", "2.8.1")
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.validate_proof(proof, "2.8.1", "darwin/arm64")
        proof["version"] = "3.0.0"
        proof["cliCommit"] = "d67bc777198174a92cc3f58e4f26ce9f0daef2d9"
        proof["artifacts"][0]["archive"] = proof["artifacts"][0]["archive"].replace("2.8.1", "3.0.0")
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.validate_proof(proof, "3.0.0", "darwin/arm64")

    def test_retired_cli_version_is_rejected_before_network_or_work_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory) / "new-work"
            with patch.object(bootstrap, "fetch_bytes") as fetch, self.assertRaises(bootstrap.BootstrapError):
                bootstrap.prepare(str(work), "2.8.1")
            fetch.assert_not_called()
            self.assertFalse(work.exists())

    def test_retired_template_release_is_rejected_even_with_matching_metadata(self):
        _, _, data = fixture()
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            lock = json.load(archive.extractfile("docs/source-lock.json"))
            manifest = json.load(archive.extractfile("release-manifest.json"))
        for name in ("spec", "backend"):
            lock["profiles"][name].update(templateCommit="1e49127842c358caf552af8ebec58f438a35c5a6", templateVersion="5.0.0", templateTag="v5.0.0")
            manifest["bundles"][name].update(templateCommit="1e49127842c358caf552af8ebec58f438a35c5a6", templateVersion="5.0.0")
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.source_lock_matches(encoded(lock), manifest["bundles"])

    def test_supported_template_versions_require_current_source_identity(self):
        _, _, data = fixture()
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            lock = json.load(archive.extractfile("docs/source-lock.json"))
            manifest = json.load(archive.extractfile("release-manifest.json"))
        for version in ("4.9.0", "5.0.0", "5.1.0", "5.2.0"):
            with self.subTest(version=version):
                for name in ("spec", "backend"):
                    lock["profiles"][name].update(templateVersion=version, templateTag="v" + version)
                    manifest["bundles"][name]["templateVersion"] = version
                if version == "4.9.0":
                    with self.assertRaises(bootstrap.BootstrapError):
                        bootstrap.source_lock_matches(encoded(lock), manifest["bundles"])
                else:
                    bootstrap.source_lock_matches(encoded(lock), manifest["bundles"])

    def test_unknown_proof_schema_and_boolean_schema_rejected(self):
        for value in (3, True):
            _, proof, _ = fixture()
            proof["schemaVersion"] = value
            with self.subTest(value=value), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.validate_proof(proof, "3.1.0", "darwin/arm64")

    def test_expanded_archive_limit_precedes_member_extraction(self):
        _, proof, data = fixture()
        with patch.object(bootstrap, "MAX_ARCHIVE", len(data) + 1), self.assertRaises(bootstrap.BootstrapError):
            bootstrap.validate_archive(data, proof["artifacts"][0], proof, "3.1.0", "darwin/arm64")

    def test_source_lock_profile_commit_mismatch_rejected(self):
        def change(files, modes, manifest):
            lock = json.loads(files["docs/source-lock.json"])
            lock["profiles"]["spec"]["templateCommit"] = "6" * 40
            files["docs/source-lock.json"] = encoded(lock)
            manifest["sourceLockSha256"] = sha(files["docs/source-lock.json"])
            manifest["files"]["docs/source-lock.json"]["digest"] = manifest["sourceLockSha256"]
        _, proof, data = fixture(change=change)
        with self.assertRaises(bootstrap.BootstrapError) as caught:
            bootstrap.validate_archive(data, proof["artifacts"][0], proof, "3.1.0", "darwin/arm64")
        self.assertEqual(caught.exception.stage, "source-lock")

    def test_source_lock_paths_and_profile_contract_rejected(self):
        _, _, data = fixture()
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            lock = json.load(archive.extractfile("docs/source-lock.json"))
            manifest = json.load(archive.extractfile("release-manifest.json"))
        for change in (lambda value: value["profiles"]["spec"].update(sourcePath="../escape"),
                       lambda value: value["profiles"].pop("backend"),
                       lambda value: value["profiles"]["backend"].update(overlayPaths=["../escape"])):
            changed = copy.deepcopy(lock)
            change(changed)
            with self.subTest(change=change), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.source_lock_matches(encoded(changed), manifest["bundles"])

    def test_network_failure_is_redacted(self):
        with patch("urllib.request.OpenerDirector.open", side_effect=urllib.error.URLError("proxy://user:secret@host")):
            with self.assertRaises(bootstrap.BootstrapError) as caught:
                bootstrap.fetch_bytes(bootstrap.API_BASE + "latest", 1000, "release")
        self.assertNotIn("secret", str(caught.exception))
        self.assertEqual(caught.exception.stage, "release")

    def test_http_failure_is_json_and_does_not_create_executor(self):
        output = io.StringIO()
        error = urllib.error.HTTPError("https://github.com/?secret=token", 403, "secret", {}, None)
        with patch("urllib.request.OpenerDirector.open", side_effect=error), contextlib.redirect_stdout(output):
            code = bootstrap.main(["prepare", "--work-dir", str(self.root / "new")])
        self.assertEqual(code, 1)
        result = json.loads(output.getvalue())
        self.assertEqual((result["stage"], result["code"]), ("release", "NETWORK"))
        self.assertIn("403", result["message"])
        self.assertNotIn("secret", output.getvalue())
        self.assertFalse((self.root / "new" / "yss").exists())

    def test_http_protocol_failures_are_redacted_json(self):
        secret = "https://release-assets.githubusercontent.com/file?token=review-secret"
        failures = (http.client.BadStatusLine(secret), http.client.IncompleteRead(secret.encode(), 100))
        for index, error in enumerate(failures):
            output = io.StringIO()
            target = self.root / ("protocol-failure-" + str(index))
            with self.subTest(error=type(error).__name__), patch("urllib.request.OpenerDirector.open", side_effect=error), contextlib.redirect_stdout(output):
                code = bootstrap.main(["prepare", "--work-dir", str(target)])
            self.assertEqual(code, 1)
            result = json.loads(output.getvalue())
            self.assertEqual((result["stage"], result["code"]), ("release", "NETWORK"))
            self.assertNotIn("review-secret", output.getvalue())
            self.assertFalse((target / "yss").exists())

    def test_redirect_rejects_external_http_and_credentials(self):
        handler = bootstrap.OfficialRedirect()
        request = urllib.request.Request(bootstrap.API_BASE + "latest")
        for url in ("http://github.com/x", "https://example.com/x", "https://user:secret@github.com/x"):
            with self.subTest(url=url), self.assertRaises(bootstrap.BootstrapError):
                handler.redirect_request(request, None, 302, "redirect", {}, url)

    def test_inspect_reports_symlink_and_receipt_without_execution(self):
        tool, bindir = self.root / "tool", self.root / "bin"
        tool.mkdir()
        bindir.mkdir()
        executable = tool / "yss"
        executable.write_text("#!/bin/sh\ntouch SHOULD_NOT_EXIST\n")
        executable.chmod(0o755)
        (tool / "installation.json").write_text(json.dumps({"cliVersion": "3.1.0", "secret": "do-not-show"}))
        (bindir / "yss").symlink_to(executable)
        with patch.dict(os.environ, {"PATH": str(bindir), "HTTPS_PROXY": "http://secret"}):
            result = bootstrap.inspect_environment()
        self.assertEqual(result["candidates"][0]["resolvedPath"], str(executable))
        self.assertNotIn("secret", json.dumps(result))
        self.assertFalse((self.root / "SHOULD_NOT_EXIST").exists())

    def test_inspect_does_not_abort_on_malformed_receipt_platform(self):
        executable = self.root / "yss"
        executable.write_bytes(b"not executable")
        (self.root / "installation.json").write_text('{"platform": ["invalid"]}')
        with patch.dict(os.environ, {"PATH": str(self.root)}):
            result = bootstrap.inspect_environment()
        self.assertEqual(len(result["candidates"]), 1)
        self.assertNotIn("platform", result["candidates"][0]["receipt"])

    def test_argument_error_is_json(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = bootstrap.main(["prepare"])
        self.assertNotEqual(code, 0)
        self.assertEqual(json.loads(output.getvalue())["status"], "error")


if __name__ == "__main__":
    unittest.main()
