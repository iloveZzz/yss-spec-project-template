#!/usr/bin/env python3
"""Inspect local candidates or prepare a verified YSS executor; never install or execute it."""
import argparse
import hashlib
import http.client
import io
import json
import os
from pathlib import Path
import platform
import re
import stat
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
import zlib

API_BASE = "https://api.github.com/repos/iloveZzz/yss-cli/releases/"
RELEASE_BASE = "https://github.com/iloveZzz/yss-cli/releases/"
HOSTS = {"api.github.com", "github.com", "release-assets.githubusercontent.com",
         "objects.githubusercontent.com", "github-releases.githubusercontent.com"}
PLATFORMS = {"darwin/arm64", "darwin/amd64", "linux/arm64", "linux/amd64", "windows/arm64", "windows/amd64"}
MAX_ARCHIVE = 256 << 20
MAX_METADATA = 256 << 10
VERSION = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\Z")
SHA = re.compile(r"[a-f0-9]{64}\Z")
COMMIT = re.compile(r"[a-f0-9]{40}\Z")
DOCUMENTS = {"README.md", "docs/source-lock.json", "docs/compatibility.md", "docs/porting-status.md",
             "docs/native-governance.md", "docs/cli-retirement.md", "compat/README.md"}
PROOF_FIELDS = set("schemaVersion version cliCommit sourceState stableReady pending sourceLockSha256 releaseGateSha256 inputManifestSha256 qualificationScope requiredPlatforms supportedPlatforms bundles artifacts".split())
ARTIFACT_FIELDS = set("platform archive sha256 bytes compiled nativeRuntimeVerified binarySha256 nativeReceiptSha256".split())
MANIFEST_FIELDS = set("schemaVersion cliVersion protocolVersion platform cgo sourceState cliCommit bundles binarySha256 sourceLockSha256 requiredPlatforms supportedPlatforms nativeReceiptSha256 releaseGateSha256 stableReady runtimeVerification files".split())


class BootstrapError(Exception):
    def __init__(self, stage, message, code="ARTIFACT"):
        super().__init__(message)
        self.stage, self.code = stage, code


def require(condition, stage, message, code="ARTIFACT"):
    if not condition:
        raise BootstrapError(stage, message, code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def matches(pattern, value):
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def relative_ref(value):
    return (isinstance(value, str) and bool(value) and not any(char in value for char in "\\:\x00")
            and all(part not in ("", ".", "..", ".git") for part in value.split("/")))


def read_json(data, stage):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, stage, "JSON 含重复键")
            result[key] = value
        return result

    def invalid_constant(_):
        raise ValueError("nonfinite number")

    try:
        value = json.loads(data, object_pairs_hook=pairs, parse_constant=invalid_constant)
        require(isinstance(value, dict), stage, "JSON 顶层必须是对象")
        return value
    except (ValueError, UnicodeError, RecursionError):
        raise BootstrapError(stage, "无法读取严格 JSON 文档") from None


def fields(value, allowed, stage):
    require(isinstance(value, dict) and not (value.keys() - allowed), stage, "字段类型或合同字段不受支持")


def stable_version(value):
    require(isinstance(value, str), "release", "版本必须是稳定语义版本", "VERSION")
    value = value.removeprefix("v")
    require(matches(VERSION, value), "release", "版本必须是无后缀的 X.Y.Z 或 vX.Y.Z", "VERSION")
    return value


def current_platform():
    system = {"Darwin": "darwin", "Linux": "linux", "Windows": "windows"}.get(platform.system(), platform.system().lower())
    machine = platform.machine().lower()
    architecture = {"aarch64": "arm64", "arm64": "arm64", "x86_64": "amd64", "amd64": "amd64"}.get(machine, machine)
    return system + "/" + architecture


def official_url(url, stage="network"):
    try:
        parsed = urllib.parse.urlsplit(url)
        valid = (parsed.scheme == "https" and parsed.hostname in HOSTS and parsed.port in (None, 443)
                 and parsed.username is None and parsed.password is None and not parsed.fragment)
    except (ValueError, TypeError):
        valid = False
    require(valid, stage, "拒绝非官方 HTTPS 来源或带凭据的 URL", "NETWORK")


class OfficialRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 5
    max_repeats = 2

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        official_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_bytes(url, limit, stage):
    official_url(url, stage)
    request = urllib.request.Request(url, headers={"User-Agent": "yss-skill-bootstrap/1", "Accept": "application/vnd.github+json"})
    started = time.monotonic()
    try:
        with urllib.request.build_opener(OfficialRedirect()).open(request, timeout=20) as response:
            official_url(response.geturl(), stage)
            require(response.status == 200, stage, "官方来源返回非成功 HTTP 状态", "NETWORK")
            length = response.headers.get("Content-Length")
            require(length is None or length.isdigit() and int(length) <= limit, stage, "下载长度超限或无效")
            data = bytearray()
            while True:
                require(time.monotonic() - started < 120, stage, "下载超过 120 秒期限", "NETWORK")
                chunk = response.read(min(64 << 10, limit + 1 - len(data)))
                if not chunk:
                    break
                data.extend(chunk)
                require(len(data) <= limit, stage, "下载超过大小上限")
            require(length is None or len(data) == int(length), stage, "下载实际长度不符")
            return bytes(data)
    except urllib.error.HTTPError as error:
        raise BootstrapError(stage, "官方来源返回 HTTP " + str(error.code), "NETWORK") from None
    except (urllib.error.URLError, http.client.HTTPException, TimeoutError, OSError):
        # Network exceptions can embed proxy credentials or signed redirect URLs.
        raise BootstrapError(stage, "连接或下载失败；请检查本机 DNS、HTTPS、代理和限流", "NETWORK") from None


def asset_url(release, name, expected_size=None):
    assets = release.get("assets")
    require(isinstance(assets, list), "release", "Release 缺少资产列表")
    found = [item for item in assets if isinstance(item, dict) and item.get("name") == name]
    require(len(found) == 1, "release", "固定 Release 缺少唯一预期资产")
    item = found[0]
    url = RELEASE_BASE + "download/" + release["tag_name"] + "/" + name
    require(item.get("browser_download_url") == url, "release", "资产 URL 与固定仓库、tag 或名称不符")
    if expected_size is not None:
        require(type(item.get("size")) is int and item["size"] == expected_size, "release", "资产长度与清单不符")
    return url


def platform_sets(value, target, stage):
    for key in ("requiredPlatforms", "supportedPlatforms"):
        items = value.get(key)
        require(isinstance(items, list) and items and all(isinstance(item, str) for item in items), stage, "缺少平台资格列表")
        require(len(set(items)) == len(items) and set(items) <= PLATFORMS, stage, "平台列表含未知或重复项")
    require(set(value["supportedPlatforms"]) == PLATFORMS and set(value["requiredPlatforms"]) <= PLATFORMS,
            stage, "平台支持合同不完整")
    require(target in value["requiredPlatforms"], stage, "当前平台不在稳定发行验收范围", "PLATFORM")


def validate_proof(proof, version, target):
    stage = "checksums"
    fields(proof, PROOF_FIELDS, stage)
    require(type(proof.get("schemaVersion")) is int and proof["schemaVersion"] == 2, stage, "仅支持 checksums schema 2")
    require(proof.get("version") == version and proof.get("sourceState") == "committed"
            and proof.get("stableReady") is True and proof.get("pending") == [], stage, "未满足固定稳定发行资格")
    require(matches(COMMIT, proof.get("cliCommit")), stage, "缺少完整源码 SHA")
    for key in ("sourceLockSha256", "releaseGateSha256", "inputManifestSha256"):
        require(matches(SHA, proof.get(key)), stage, "发行证明摘要不完整")
    platform_sets(proof, target, stage)
    artifacts = proof.get("artifacts")
    require(isinstance(artifacts, list), stage, "缺少发行包列表")
    selected = [item for item in artifacts if isinstance(item, dict) and item.get("platform") == target]
    require(len(selected) == 1, stage, "缺少当前平台唯一发行包")
    artifact = selected[0]
    fields(artifact, ARTIFACT_FIELDS, stage)
    extension = ".zip" if target.startswith("windows/") else ".tar.gz"
    require(artifact.get("archive") == "yss_" + version + "_" + target.replace("/", "_") + extension,
            stage, "归档名与平台或版本不符")
    require(type(artifact.get("bytes")) is int and 0 < artifact["bytes"] <= MAX_ARCHIVE,
            stage, "归档大小无效")
    require(artifact.get("compiled") is False and artifact.get("nativeRuntimeVerified") is True,
            stage, "构建包不具备稳定安装资格", "PLATFORM")
    for key in ("sha256", "binarySha256", "nativeReceiptSha256"):
        require(matches(SHA, artifact.get(key)), stage, "发行包摘要不完整")
    return artifact


def source_lock_matches(data, bundles):
    stage = "source-lock"
    lock = read_json(data, stage)
    fields(lock, {"schemaVersion", "producer", "profiles"}, stage)
    require(type(lock.get("schemaVersion")) is int and lock["schemaVersion"] == 5,
            stage, "此引导仅支持已验证的 source-lock schema 5")
    producer = lock.get("producer")
    fields(producer, {"version", "commit", "sourceState"}, stage)
    require(isinstance(producer.get("version"), str) and producer["version"] and producer.get("sourceState") == "committed"
            and matches(COMMIT, producer.get("commit")), stage, "来源 Producer 未固定")
    profiles = lock.get("profiles")
    require(isinstance(profiles, dict) and profiles.keys() == {"spec", "backend"}
            and isinstance(bundles, dict) and profiles.keys() == bundles.keys(),
            stage, "Bundle 与来源锁 Profile 集不符")
    allowed = set("profile sourcePath templateCommit templateVersion templateTag policyPath policyHash legacy sourceState sourceTree overlayPaths skillsSource".split())
    for profile_name, source in profiles.items():
        fields(source, allowed, stage)
        bundle = bundles[profile_name]
        require(isinstance(bundle, dict) and type(bundle.get("schemaVersion")) is int and bundle["schemaVersion"] in (4, 5),
                stage, "不支持的 Bundle 来源合同")
        tag = source.get("templateTag")
        version = stable_version(tag) if tag else "git:" + str(source.get("templateCommit"))
        require(source.get("profile") == profile_name and source.get("sourceState", "committed") == "committed"
                and not source.get("sourceTree") and matches(COMMIT, source.get("templateCommit"))
                and (source.get("sourcePath") == "." or relative_ref(source.get("sourcePath")))
                and source.get("templateVersion") == version and (not tag or tag == "v" + version),
                stage, "Profile 来源未固定")
        overlays = source.get("overlayPaths", [])
        require(isinstance(overlays, list) and all(relative_ref(item) for item in overlays)
                and len(set(overlays)) == len(overlays), stage, "来源覆盖路径无效或重复")
        shared = source.get("skillsSource")
        if shared is not None:
            fields(shared, {"sourcePath", "templateCommit", "configurationPath", "configurationHash", "sourceState", "sourceTree"}, stage)
            require(profile_name == "backend" and not overlays and not shared.get("sourceState") and not shared.get("sourceTree")
                    and matches(COMMIT, shared.get("templateCommit"))
                    and (shared.get("sourcePath") == "." or relative_ref(shared.get("sourcePath")))
                    and shared.get("configurationPath") == ".template-source/profile-skill-sync.json"
                    and matches(SHA, shared.get("configurationHash")), stage, "共享技能来源未固定")
        elif profile_name == "backend":
            require(bool(overlays), stage, "Backend 来源锁缺少覆盖层或共享技能来源")
        require(bundle.get("profile") == profile_name and bundle.get("sourceState") == "committed"
                and bundle.get("templateCommit") == source["templateCommit"] and bundle.get("templateVersion") == version
                and bundle.get("producer") == producer and bundle.get("legacy") == source.get("legacy"),
                stage, "Bundle 与来源锁身份不符")
        legacy = source.get("legacy")
        require(isinstance(legacy, dict) and bundle.get("legacyVersion", "") == legacy.get("version", "")
                and bundle.get("legacyCLICommit", "") == legacy.get("cliCommit", ""), stage, "历史来源身份不符")
        policy = bundle.get("sourcePolicy")
        require(isinstance(policy, dict) and isinstance(source.get("policyPath"), str) and source["policyPath"]
                and matches(SHA, source.get("policyHash")) and policy.get("path") == source["policyPath"]
                and policy.get("digest") == source["policyHash"]
                and policy.get("kind") == ("bootstrap" if source["policyPath"].startswith("builtin:") else "committed"),
                stage, "Bundle 政策与来源锁不符")
        for key in ("sourceSnapshotHash", "manifestHash", "bundleHash"):
            require(matches(SHA, bundle.get(key)), stage, "Bundle 来源摘要不完整")


def validate_archive(data, artifact, proof, version, target):
    stage = "archive"
    require(len(data) <= MAX_ARCHIVE and len(data) == artifact["bytes"] and digest(data) == artifact["sha256"],
            stage, "归档长度或 SHA-256 不匹配", "DIGEST")
    binary = "yss.exe" if target.startswith("windows/") else "yss"
    allowed = DOCUMENTS | {binary, "release-manifest.json"}
    files, modes, total = {}, {}, 0

    def add(name, size, mode, stream):
        nonlocal total
        require(name in allowed and name.lower() not in {key.lower() for key in files}, stage, "未知、重复或越界归档成员")
        require(0 <= size <= MAX_ARCHIVE and total + size <= MAX_ARCHIVE, stage, "归档成员或解压总量超限")
        total += size
        body = stream.read(size + 1)
        require(len(body) == size and mode in (0o644, 0o755), stage, "成员长度或权限无效")
        files[name], modes[name] = body, mode

    try:
        if target.startswith("windows/"):
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                require(len(archive.infolist()) <= len(allowed), stage, "归档成员数量超限")
                for item in archive.infolist():
                    mode = item.external_attr >> 16
                    require(not item.flag_bits & 1 and stat.S_ISREG(mode)
                            and item.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), stage, "ZIP 含加密或非普通文件")
                    with archive.open(item) as stream:
                        add(item.filename, item.file_size, stat.S_IMODE(mode), stream)
        else:
            inflater = zlib.decompressobj(16 + zlib.MAX_WBITS)
            raw = inflater.decompress(data, MAX_ARCHIVE + 1)
            require(len(raw) <= MAX_ARCHIVE and inflater.eof and not inflater.unused_data and not inflater.unconsumed_tail,
                    stage, "gzip 超限、不完整或包含尾随数据")
            with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
                end = 0
                for item in archive:
                    require(len(files) < len(allowed) and item.type in (tarfile.REGTYPE, tarfile.AREGTYPE)
                            and not item.linkname and not item.pax_headers, stage, "TAR 含非普通文件或未支持扩展")
                    with archive.extractfile(item) as stream:
                        add(item.name, item.size, item.mode, stream)
                    end = item.offset_data + ((item.size + 511) // 512) * 512
                require(not raw[end:].strip(b"\0"), stage, "TAR 含未登记的尾随数据")
    except (tarfile.TarError, zipfile.BadZipFile, zlib.error, EOFError, OSError, ValueError):
        raise BootstrapError(stage, "无法读取安全发行归档") from None
    require({binary, "README.md", "docs/source-lock.json", "docs/compatibility.md", "release-manifest.json"} <= files.keys(),
            stage, "发行包缺少核心成员")
    manifest = read_json(files["release-manifest.json"], "manifest")
    fields(manifest, MANIFEST_FIELDS, "manifest")
    require(type(manifest.get("schemaVersion")) is int and manifest["schemaVersion"] == 1
            and type(manifest.get("protocolVersion")) is int and manifest["protocolVersion"] == 1
            and manifest.get("cgo") is False, "manifest", "不支持的 manifest、protocol 或 CGO 合同")
    require(manifest.get("cliVersion") == version and manifest.get("platform") == target
            and manifest.get("sourceState") == "committed" and manifest.get("stableReady") is True
            and manifest.get("runtimeVerification") == "passed", "manifest", "包内身份或稳定资格不符")
    for key in ("cliCommit", "sourceLockSha256", "releaseGateSha256", "requiredPlatforms", "supportedPlatforms"):
        require(manifest.get(key) == proof.get(key), "manifest", "包内来源与 checksums 不符")
    summaries, bundles = proof.get("bundles"), manifest.get("bundles")
    require(isinstance(summaries, dict) and isinstance(bundles, dict) and summaries and summaries.keys() == bundles.keys(),
            "manifest", "包内 Bundle 集与 checksums 不符")
    summary_fields = {"templateVersion", "templateCommit", "sourceState", "sourceSnapshotHash", "manifestHash", "bundleHash"}
    for profile_name, summary in summaries.items():
        require(isinstance(summary, dict) and summary.keys() == summary_fields and isinstance(bundles[profile_name], dict)
                and all(bundles[profile_name].get(key) == value for key, value in summary.items()),
                "manifest", "包内 Bundle 摘要与 checksums 不符")
    for key in ("binarySha256", "nativeReceiptSha256"):
        require(manifest.get(key) == artifact.get(key), "manifest", "包内程序或验收摘要不符")
    descriptors = manifest.get("files")
    require(isinstance(descriptors, dict) and descriptors.keys() == files.keys() - {"release-manifest.json"},
            "manifest", "包内文件集合与 manifest 不符")
    require(modes["release-manifest.json"] == 0o644, "manifest", "manifest 权限必须是 0644")
    for name, description in descriptors.items():
        require(isinstance(description, dict) and type(description.get("mode")) is int
                and description == {"type": "file", "digest": digest(files[name]), "mode": modes[name]}
                and modes[name] == (0o755 if name == binary else 0o644), "manifest", "成员摘要、类型或权限不符")
    require(digest(files[binary]) == artifact["binarySha256"]
            and digest(files["docs/source-lock.json"]) == proof["sourceLockSha256"], "manifest", "程序或来源锁摘要不符")
    source_lock_matches(files["docs/source-lock.json"], manifest["bundles"])
    return files[binary], manifest


def new_work_directory(value):
    path = Path(value)
    require(path.is_absolute() and ".." not in path.parts, "work-dir", "工作目录必须是无 .. 的绝对路径", "PATH")
    require(not path.exists() and not path.is_symlink(), "work-dir", "工作目录已存在；拒绝覆盖", "EXISTS")
    for parent in path.parents:
        require(not parent.is_symlink() and parent.is_dir(), "work-dir", "工作目录的父路径必须存在且不是符号链接", "PATH")
    path.mkdir(mode=0o700)
    return path


def write_new(root, name, data, mode=0o600):
    require(root.is_dir() and not root.is_symlink() and root.resolve() == root, "output", "工作目录身份已变化", "PATH")
    path = root / name
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    with os.fdopen(os.open(path, flags, mode), "wb") as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())
        if os.name != "nt":
            os.fchmod(output.fileno(), mode)
    return str(path)


def prepare(work_dir, version=None):
    requested = stable_version(version) if version is not None else None
    target = current_platform()
    require(target in PLATFORMS, "platform", "当前平台没有受支持的发行合同", "PLATFORM")
    root = new_work_directory(work_dir)
    release_data = fetch_bytes(API_BASE + ("tags/v" + requested if requested else "latest"), MAX_METADATA, "release")
    release = read_json(release_data, "release")
    version = stable_version(release.get("tag_name"))
    require(release.get("tag_name") == "v" + version and release.get("draft") is False and release.get("prerelease") is False
            and release.get("html_url") == RELEASE_BASE + "tag/v" + version and (requested is None or version == requested),
            "release", "Release 版本、来源或稳定状态不符")
    write_new(root, "release.json", release_data)
    proof_data = fetch_bytes(asset_url(release, "checksums.json"), MAX_METADATA, "checksums")
    proof = read_json(proof_data, "checksums")
    artifact = validate_proof(proof, version, target)
    write_new(root, "checksums.json", proof_data)
    data = fetch_bytes(asset_url(release, artifact["archive"], artifact["bytes"]), artifact["bytes"], "archive")
    archive = write_new(root, artifact["archive"], data)
    binary, manifest = validate_archive(data, artifact, proof, version, target)
    executor = write_new(root, "yss.exe" if target.startswith("windows/") else "yss", binary, 0o755)
    result = {"version": version, "cliCommit": proof["cliCommit"], "platform": target, "releaseUrl": release["html_url"],
              "archive": archive, "archiveSha256": artifact["sha256"], "executor": executor,
              "binarySha256": manifest["binarySha256"], "sourceLockSha256": manifest["sourceLockSha256"], "workDir": str(root)}
    write_new(root, "prepared.json", (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode())
    return result


def inspect_environment():
    candidates, seen = [], set()
    names = ["yss"] if os.name != "nt" else ["yss" + suffix.lower() for suffix in os.environ.get("PATHEXT", ".COM;.EXE;.BAT;.CMD").split(";") if re.fullmatch(r"\.[A-Za-z0-9]+", suffix)]
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        for name in names:
            path = Path(os.path.abspath(os.path.join(directory, name)))
            if str(path) in seen:
                continue
            seen.add(str(path))
            try:
                info = path.lstat()
            except FileNotFoundError:
                continue
            except OSError:
                candidates.append({"path": str(path), "status": "unreadable"})
                continue
            row = {"path": str(path), "type": "symlink" if stat.S_ISLNK(info.st_mode) else "file" if stat.S_ISREG(info.st_mode) else "other",
                   "mode": oct(stat.S_IMODE(info.st_mode)), "receipt": {"status": "not-found"}}
            try:
                resolved = path.resolve(strict=True)
                row["resolvedPath"] = str(resolved)
                row["resolvedMode"] = oct(stat.S_IMODE(resolved.stat().st_mode))
                receipt = resolved.parent / "installation.json"
                if receipt.exists() or receipt.is_symlink():
                    info = receipt.lstat()
                    row["receipt"] = {"path": str(receipt), "status": "unverified"}
                    if stat.S_ISREG(info.st_mode) and info.st_size <= MAX_METADATA:
                        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
                        with os.fdopen(os.open(receipt, flags), "rb") as source:
                            opened = os.fstat(source.fileno())
                            require(stat.S_ISREG(opened.st_mode) and os.path.samestat(info, opened), "inspect", "收据身份已变化")
                            value = read_json(source.read(MAX_METADATA + 1), "inspect")
                        for key, pattern in (("cliVersion", VERSION), ("archiveDigest", SHA)):
                            if matches(pattern, value.get(key)):
                                row["receipt"][key] = value[key]
                        if isinstance(value.get("platform"), str) and value["platform"] in PLATFORMS:
                            row["receipt"]["platform"] = value["platform"]
                        for key in ("schemaVersion", "protocolVersion"):
                            if type(value.get(key)) is int:
                                row["receipt"][key] = value[key]
                        if type(value.get("stableReady")) is bool:
                            row["receipt"]["stableReady"] = value["stableReady"]
                    else:
                        row["receipt"]["status"] = "unreadable-or-unsafe"
            except (OSError, RuntimeError, BootstrapError):
                row["status"] = "unreadable-or-invalid"
            candidates.append(row)
    target = current_platform()
    return {"os": platform.system(), "architecture": platform.machine(), "platform": target,
            "pythonVersion": platform.python_version(), "readOnly": True, "candidates": candidates}


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise BootstrapError("arguments", "参数无效；使用 inspect 或 prepare --work-dir <绝对新目录> [--version X.Y.Z]", "ARGUMENT")


def main(argv=None):
    command = None
    try:
        require(sys.version_info >= (3, 11), "environment", "需要 Python 3.11 或更新版本；不会自动安装", "CAPABILITY")
        parser = Parser(description=__doc__)
        commands = parser.add_subparsers(dest="command", required=True)
        commands.add_parser("inspect", help="只读查看环境与 PATH 候选，不执行候选程序")
        prepare_parser = commands.add_parser("prepare", help="准备已验证的固定执行器，不安装")
        prepare_parser.add_argument("--work-dir", required=True)
        prepare_parser.add_argument("--version")
        args = parser.parse_args(argv)
        command = args.command
        result = inspect_environment() if command == "inspect" else prepare(args.work_dir, args.version)
        print(json.dumps({"status": "ok", "command": command, "result": result}, ensure_ascii=False))
        return 0
    except BootstrapError as error:
        result = {"status": "error", "command": command, "stage": error.stage, "code": error.code, "message": str(error)}
    except KeyboardInterrupt:
        result = {"status": "error", "command": command, "stage": "interrupted", "code": "CANCELLED", "message": "操作已取消；保留已有准备材料"}
    except (OSError, ValueError, TypeError, KeyError, OverflowError, RecursionError):
        result = {"status": "error", "command": command, "stage": "local", "code": "INPUT", "message": "本地路径、权限或发行数据不符合合同；未安装程序"}
    print(json.dumps(result, ensure_ascii=False))
    return 2 if result["code"] == "ARGUMENT" else 1


if __name__ == "__main__":
    raise SystemExit(main())
