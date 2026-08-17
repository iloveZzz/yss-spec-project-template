#!/usr/bin/env ruby
# frozen_string_literal: true

require "digest"
require "open3"
require "optparse"
require "pathname"
require "yaml"

ROOT = Pathname.new(__dir__).join("../..").realpath
REVIEWS_ROOT = ROOT.join(".template-source/evidence/reviews")
INDEX_PATH = REVIEWS_ROOT.join("index.yaml")
SOURCE_ROOT = ".template-source/evidence/reviews"

options = { check: false, write: false, pending: false, archive_commit: nil }
OptionParser.new do |parser|
  parser.on("--check", "校验证据索引和归档内容") { options[:check] = true }
  parser.on("--write", "生成证据索引") { options[:write] = true }
  parser.on("--pending", "生成尚未绑定 checkpoint 的中间索引") { options[:pending] = true }
  parser.on("--archive-commit COMMIT", "使用指定 Git commit 作为归档 checkpoint") do |commit|
    options[:archive_commit] = commit
  end
end.parse!

abort("必须指定 --check 或 --write") unless options[:check] ^ options[:write]
abort("--pending 只能与 --write 一起使用") if options[:pending] && !options[:write]
abort("--pending 与 --archive-commit 不能同时使用") if options[:pending] && options[:archive_commit]
abort("--write 必须指定 --pending 或 --archive-commit") if options[:write] && !options[:pending] && options[:archive_commit].nil?

def git(*args, allow_failure: false)
  stdout, stderr, status = Open3.capture3("git", *args, chdir: ROOT.to_s)
  return stdout if status.success?
  return nil if allow_failure

  abort("git #{args.join(" ")} 失败：#{stderr.strip}")
end

def current_review_paths
  REVIEWS_ROOT.glob("*.md").sort
end

def relative(path)
  path.relative_path_from(ROOT).to_s
end

def digest_and_size(bytes)
  [Digest::SHA256.hexdigest(bytes), bytes.bytesize]
end

def commit_info(requested)
  commit = git("rev-parse", "--verify", "#{requested}^{commit}").strip
  tree = git("rev-parse", "--verify", "#{commit}^{tree}").strip
  [commit, tree]
end

def archived_bytes(commit, path)
  git("cat-file", "blob", "#{commit}:#{path}").b
end

def base_entry(path, archive_path: relative(path), archive_ref: nil)
  bytes = File.binread(path)
  sha256, size = digest_and_size(bytes)
  {
    "path" => archive_path,
    "origin_path" => "docs/reviews/#{path.basename}",
    "bytes" => size,
    "sha256" => sha256,
    "archive_path" => archive_path,
    "archive_ref" => archive_ref
  }
end

def pending_index
  paths = current_review_paths
  abort("没有发现 .template-source/evidence/reviews/*.md") if paths.empty?

  entries = paths.map { |path| base_entry(path) }
  {
    "schema_version" => 1,
    "kind" => "review-evidence-index",
    "source_root" => SOURCE_ROOT,
    "count" => entries.length,
    "archive" => {
      "kind" => "git-history",
      "status" => "pending",
      "commit" => nil,
      "tree" => nil
    },
    "files" => entries
  }
end

def complete_index(requested_commit)
  paths = current_review_paths
  abort("生成 complete 索引前必须保留原始审查文件") if paths.empty?

  commit, tree = commit_info(requested_commit)
  entries = paths.map do |path|
    archive_path = relative(path)
    current = File.binread(path).b
    archived = archived_bytes(commit, archive_path)
    current_sha, current_size = digest_and_size(current)
    archived_sha, archived_size = digest_and_size(archived)
    unless [current_sha, current_size] == [archived_sha, archived_size]
      abort("当前文件与 archive checkpoint 不一致: #{archive_path}")
    end

    base_entry(path, archive_path: archive_path, archive_ref: "git:#{commit}:#{archive_path}")
  end

  {
    "schema_version" => 1,
    "kind" => "review-evidence-index",
    "source_root" => SOURCE_ROOT,
    "count" => entries.length,
    "archive" => {
      "kind" => "git-history",
      "status" => "complete",
      "commit" => commit,
      "tree" => tree
    },
    "files" => entries
  }
end

def tracked_review_paths
  git("ls-files", "--", SOURCE_ROOT).lines.map(&:strip).select { |path| path.end_with?(".md") }.sort
end

def validate_index(data)
  abort("证据索引必须是 YAML object") unless data.is_a?(Hash)
  abort("证据索引 schema_version 必须为 1") unless data["schema_version"] == 1
  abort("证据索引 kind 不正确") unless data["kind"] == "review-evidence-index"
  abort("证据索引 source_root 不正确") unless data["source_root"] == SOURCE_ROOT

  archive = data["archive"]
  abort("证据索引缺少 archive") unless archive.is_a?(Hash)
  abort("当前仅支持 git-history 归档") unless archive["kind"] == "git-history"
  status = archive["status"]
  abort("archive.status 必须为 pending 或 complete") unless %w[pending complete].include?(status)

  entries = data["files"]
  abort("证据索引 files 必须是数组") unless entries.is_a?(Array) && !entries.empty?
  abort("证据索引 count 与 files 数量不一致") unless data["count"] == entries.length

  paths = []
  origins = []
  entries.each do |entry|
    abort("证据索引条目必须是 object") unless entry.is_a?(Hash)
    path = entry["path"]
    archive_path = entry["archive_path"]
    origin_path = entry["origin_path"]
    sha256 = entry["sha256"]
    bytes = entry["bytes"]
    abort("证据索引 path 非法: #{path}") unless path.is_a?(String) && path.match?(%r{^#{Regexp.escape(SOURCE_ROOT)}/[^/]+\.md$})
    abort("证据索引 archive_path 必须与 path 相同: #{path}") unless archive_path == path
    abort("证据索引 origin_path 非法: #{origin_path}") unless origin_path.is_a?(String) && origin_path.start_with?("docs/reviews/")
    abort("证据索引 sha256 非法: #{path}") unless sha256.is_a?(String) && sha256.match?(/\A[0-9a-f]{64}\z/)
    abort("证据索引 bytes 非法: #{path}") unless bytes.is_a?(Integer) && bytes >= 0
    abort("证据索引存在重复 path: #{path}") if paths.include?(path)
    abort("证据索引存在重复 origin_path: #{origin_path}") if origins.include?(origin_path)
    paths << path
    origins << origin_path
  end

  if status == "pending"
    abort("pending 索引不应包含 commit/tree") unless archive["commit"].nil? && archive["tree"].nil?
    current_paths = current_review_paths.map { |path| relative(path) }
    abort("pending 索引与当前原始文件集合不一致") unless current_paths == paths.sort
    entries.each do |entry|
      bytes = File.binread(ROOT.join(entry.fetch("path"))).b
      sha256, size = digest_and_size(bytes)
      abort("当前原始文件 hash 不匹配: #{entry.fetch("path")}") unless sha256 == entry.fetch("sha256") && size == entry.fetch("bytes")
    end
    return
  end

  commit = archive["commit"]
  tree = archive["tree"]
  abort("complete 索引缺少 40 位 commit") unless commit.is_a?(String) && commit.match?(/\A[0-9a-f]{40}\z/)
  abort("complete 索引缺少 40 位 tree") unless tree.is_a?(String) && tree.match?(/\A[0-9a-f]{40}\z/)
  actual_commit, actual_tree = commit_info(commit)
  abort("archive commit 不可解析") unless actual_commit == commit
  abort("archive tree 与 commit 不一致") unless actual_tree == tree
  abort("complete 索引要求当前不再追踪原始审查 Markdown") unless tracked_review_paths.empty?

  entries.each do |entry|
    expected_ref = "git:#{commit}:#{entry.fetch("archive_path")}"
    abort("archive_ref 不正确: #{entry.fetch("path")}") unless entry["archive_ref"] == expected_ref
    archived = archived_bytes(commit, entry.fetch("archive_path"))
    sha256, size = digest_and_size(archived)
    abort("Git archive hash 不匹配: #{entry.fetch("path")}") unless sha256 == entry.fetch("sha256") && size == entry.fetch("bytes")
  end
end

if options[:write]
  data = options[:pending] ? pending_index : complete_index(options[:archive_commit])
  REVIEWS_ROOT.mkpath
  serialized = YAML.dump(data).gsub(/:\s+\n/, ":\n")
  INDEX_PATH.write(serialized)
  puts("证据索引已写入 #{INDEX_PATH.relative_path_from(ROOT)}（#{data.fetch("archive").fetch("status")}）")
else
  abort("缺少证据索引: #{INDEX_PATH.relative_path_from(ROOT)}") unless INDEX_PATH.file?
  validate_index(YAML.safe_load(INDEX_PATH.binread, permitted_classes: [], aliases: false))
  puts("证据索引验证通过（#{YAML.safe_load(INDEX_PATH.binread, permitted_classes: [], aliases: false).fetch("archive").fetch("status")}）")
end
