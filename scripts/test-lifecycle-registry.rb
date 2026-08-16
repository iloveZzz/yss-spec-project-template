#!/usr/bin/env ruby
# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "pathname"
require "tmpdir"
require "yaml"

ROOT = Pathname.new(__dir__).join("..").realpath

class LifecycleRegistryTest < Minitest::Test
  def run_command(*command)
    output, status = Open3.capture2e(*command, chdir: ROOT)
    [output, status]
  end

  def test_registry_verifier_and_generated_views_are_current
    output, status = run_command("scripts/verify-lifecycle-registry")
    assert status.success?, output

    output, status = run_command("scripts/generate-lifecycle-artifacts", "--check")
    assert status.success?, output
  end

  def test_verifier_rejects_unknown_cross_reference
    Dir.mktmpdir("yss-lifecycle-registry") do |directory|
      registry_path = Pathname.new(directory).join("broken.yaml")
      registry = YAML.safe_load(ROOT.join("docs/process/lifecycle-registry.yaml").read, aliases: false)
      registry.fetch("gates").first.fetch("evidence") << "evidence.unknown"
      registry_path.write(YAML.dump(registry))

      output, status = run_command("scripts/verify-lifecycle-registry", "--registry", registry_path.to_s)
      refute status.success?, output
      assert_includes output, "不存在的引用"
    end
  end

  def test_verifier_executes_json_schema_and_stable_id_baseline
    Dir.mktmpdir("yss-lifecycle-registry") do |directory|
      schema_broken = Pathname.new(directory).join("schema-broken.yaml")
      semantic_broken = Pathname.new(directory).join("semantic-broken.yaml")
      registry = YAML.safe_load(ROOT.join("docs/process/lifecycle-registry.yaml").read, aliases: false)

      registry.fetch("stages").first.delete("goal")
      schema_broken.write(YAML.dump(registry))
      output, status = run_command("scripts/verify-lifecycle-registry", "--registry", schema_broken.to_s)
      refute status.success?, output
      assert_includes output, "JSON Schema 校验失败"

      registry = YAML.safe_load(ROOT.join("docs/process/lifecycle-registry.yaml").read, aliases: false)
      registry.fetch("gates").first["trigger"] = "被静默改变的语义。"
      semantic_broken.write(YAML.dump(registry))
      output, status = run_command("scripts/verify-lifecycle-registry", "--registry", semantic_broken.to_s)
      refute status.success?, output
      assert_includes output, "语义快照已变化"
    end
  end

  def test_policy_documents_do_not_reintroduce_stale_counts
    forbidden_count = /\d+\s*个(?:主阶段|门禁|工作单元|职责点)/
    assert_match forbidden_count, "必须按 8 个主阶段推进"

    [
      "AGENTS.md",
      "README.md",
      "docs/user-guide/产品生命周期工作流.md",
      ".agents/skills/yss-product-lifecycle/SKILL.md"
    ].each do |relative_path|
      body = ROOT.join(relative_path).read
      refute_match(forbidden_count, body, relative_path)
    end
  end
end
