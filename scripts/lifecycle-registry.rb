#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"
require "json"
require "digest"
require "yaml"

module LifecycleRegistry
  ROOT = Pathname.new(__dir__).join("..").realpath
  DEFAULT_REGISTRY = ROOT.join("docs/process/lifecycle-registry.yaml")
  DEFAULT_BASELINE = ROOT.join("docs/process/lifecycle-registry-baseline.json")
  ID_PATTERN = /\A(stage|gate|artifact|work-unit|evidence)\.[a-z0-9][a-z0-9-]*\z/

  module_function

  def load_registry(path = DEFAULT_REGISTRY)
    YAML.safe_load(Pathname.new(path).read, permitted_classes: [], aliases: false)
  rescue Psych::Exception => error
    raise ArgumentError, "无法解析生命周期注册表: #{error.message}"
  end

  def validate!(registry, baseline: DEFAULT_BASELINE)
    required_top_level = %w[schema_version registry_id status id_policy stages gates artifacts work_units evidence]
    missing = required_top_level - registry.keys
    raise ArgumentError, "生命周期注册表缺少字段: #{missing.join(', ')}" unless missing.empty?
    raise ArgumentError, "仅支持 lifecycle registry schema_version: 1" unless registry["schema_version"] == 1
    raise ArgumentError, "registry_id 必须为 yss.lifecycle" unless registry["registry_id"] == "yss.lifecycle"
    raise ArgumentError, "status 必须为 shadow 或 active" unless %w[shadow active].include?(registry["status"])

    policy = registry.fetch("id_policy")
    %w[pattern published_ids_immutable baseline deprecated_ids].each do |key|
      raise ArgumentError, "id_policy 缺少字段: #{key}" unless policy.key?(key)
    end
    raise ArgumentError, "published_ids_immutable 必须为 true" unless policy["published_ids_immutable"] == true
    raise ArgumentError, "id_policy.pattern 不符合固定命名空间" unless policy["pattern"] == "^(stage|gate|artifact|work-unit|evidence)\\.[a-z0-9][a-z0-9-]*$"
    raise ArgumentError, "id_policy.baseline 必须指向发布基线" unless policy["baseline"] == "docs/process/lifecycle-registry-baseline.json"
    raise ArgumentError, "deprecated_ids 必须是数组" unless policy["deprecated_ids"].is_a?(Array)

    ids = {}
    %w[stages gates artifacts work_units evidence].each do |collection|
      records = registry.fetch(collection)
      raise ArgumentError, "#{collection} 必须是非空数组" unless records.is_a?(Array) && !records.empty?
      records.each do |record|
        id = record["id"]
        raise ArgumentError, "#{collection} 中存在无效 ID: #{id.inspect}" unless id.is_a?(String) && id.match?(ID_PATTERN)
        raise ArgumentError, "生命周期 ID 重复: #{id}" if ids.key?(id)
        expected_prefix = collection == "work_units" ? "work-unit." : collection.delete_suffix("s") + "."
        raise ArgumentError, "#{id} 与 #{collection} 类型不匹配" unless id.start_with?(expected_prefix)
        raise ArgumentError, "#{id} 缺少名称" unless record["name"].is_a?(String) && !record["name"].empty?
        ids[id] = collection
      end
    end

    registry.fetch("gates").each do |gate|
      require_reference!(ids, gate.fetch("stage"), "#{gate["id"]}.stage")
      unless ids[gate.fetch("stage")] == "stages"
        raise ArgumentError, "#{gate["id"]}.stage 必须引用 stage.*"
      end
      evidence = gate.fetch("evidence")
      raise ArgumentError, "#{gate["id"]}.evidence 必须是非空数组" unless evidence.is_a?(Array) && !evidence.empty?
      evidence.each do |reference|
        require_reference!(ids, reference, "#{gate["id"]}.evidence")
        raise ArgumentError, "#{gate["id"]}.evidence 必须引用 evidence.*" unless ids[reference] == "evidence"
      end
    end

    registry.fetch("artifacts").each do |artifact|
      require_reference!(ids, artifact.fetch("stage"), "#{artifact["id"]}.stage")
      raise ArgumentError, "#{artifact["id"]}.stage 必须引用 stage.*" unless ids[artifact.fetch("stage")] == "stages"
    end
    validate_baseline!(registry, ids, Pathname.new(baseline)) if baseline
    registry
  end

  def require_reference!(ids, reference, field)
    raise ArgumentError, "#{field} 引用了不存在的引用: #{reference}" unless ids.key?(reference)
  end

  def semantic_projection(registry)
    %w[stages gates artifacts work_units evidence].flat_map do |collection|
      registry.fetch(collection).map do |record|
        {
          "kind" => collection,
          "record" => canonicalize(record)
        }
      end
    end.sort_by { |entry| entry.fetch("record").fetch("id") }
  end

  def canonicalize(value)
    case value
    when Hash
      value.keys.sort.to_h { |key| [key, canonicalize(value.fetch(key))] }
    when Array
      value.map { |item| canonicalize(item) }
    else
      value
    end
  end

  def semantic_digest(registry)
    Digest::SHA256.hexdigest(JSON.generate(semantic_projection(registry)))
  end

  def validate_baseline!(registry, ids, baseline_path)
    raise ArgumentError, "缺少生命周期已发布基线: #{baseline_path.relative_path_from(ROOT)}" unless baseline_path.file?
    baseline = JSON.parse(baseline_path.read)
    unless baseline["schema_version"] == 1 && baseline["registry_id"] == registry["registry_id"]
      raise ArgumentError, "生命周期已发布基线版本或 registry_id 不匹配"
    end
    published_ids = baseline["published_ids"]
    raise ArgumentError, "生命周期已发布基线缺少 published_ids" unless published_ids.is_a?(Array) && published_ids.uniq == published_ids
    published_ids.each do |id|
      raise ArgumentError, "生命周期已发布基线包含无效 ID: #{id.inspect}" unless id.is_a?(String) && id.match?(ID_PATTERN)
    end

    active_ids = ids.keys.sort
    deprecated_ids = registry.fetch("id_policy").fetch("deprecated_ids")
    unless deprecated_ids.uniq == deprecated_ids && deprecated_ids.all? { |id| published_ids.include?(id) } && (deprecated_ids & active_ids).empty?
      raise ArgumentError, "deprecated_ids 必须唯一、来自已发布 ID，且不得仍为活跃对象"
    end
    expected_active_ids = (published_ids - deprecated_ids).sort
    raise ArgumentError, "生命周期活跃 ID 与已发布基线不一致；新增、移除或弃用必须先更新发布基线" unless active_ids == expected_active_ids
    raise ArgumentError, "生命周期稳定 ID 的语义快照已变化；不得复用已发布 ID" unless baseline["semantic_sha256"] == semantic_digest(registry)
  rescue JSON::ParserError => error
    raise ArgumentError, "无法解析生命周期已发布基线: #{error.message}"
  end

  def render_lifecycle_structure(registry)
    lines = []
    lines << "<!-- lifecycle-registry:structure:start -->"
    lines << "> 此结构区由 `docs/process/lifecycle-registry.yaml` 生成。当前为 `#{registry.fetch("status")}` 模式：它校验结构和派生文档，不改变运行时状态 schema 或人工批准语义。"
    lines << ""
    lines << "## 1. 主阶段"
    lines << ""
    lines << "| 稳定 ID | 阶段 | 目标 | 退出标准 |"
    lines << "|---|---|---|---|"
    registry.fetch("stages").each { |stage| lines << "| `#{stage["id"]}` | #{stage["name"]} | #{stage["goal"]} | #{stage["exit_criteria"]} |" }
    lines << ""
    lines << "## 2. 生命周期对象"
    lines << ""
    lines << "门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 `not-applicable` 及原因，不生成空文档。"
    lines << ""
    lines << "### 2.1 条件门禁"
    lines << ""
    lines << "| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 必须留下的证据 |"
    lines << "|---|---|---|---|---|"
    registry.fetch("gates").each do |gate|
      evidence = gate.fetch("evidence").map { |id| "`#{id}`" }.join("、")
      lines << "| `#{gate["id"]}` | #{gate["name"]} | `#{gate["stage"]}` | #{gate["trigger"]} | #{evidence} |"
    end
    lines << ""
    lines << "### 2.2 生命周期产物"
    lines << ""
    lines << "| 稳定 ID | 产物 | 所属阶段 | 触发条件 |"
    lines << "|---|---|---|---|"
    registry.fetch("artifacts").each { |artifact| lines << "| `#{artifact["id"]}` | #{artifact["name"]} | `#{artifact["stage"]}` | #{artifact["trigger"]} |" }
    lines << ""
    lines << "### 2.3 执行证据"
    lines << ""
    lines << "| 稳定 ID | 证据 | 说明 |"
    lines << "|---|---|---|"
    registry.fetch("evidence").each { |evidence| lines << "| `#{evidence["id"]}` | #{evidence["name"]} | #{evidence["description"]} |" }
    lines << "<!-- lifecycle-registry:structure:end -->"
    lines.join("\n") + "\n"
  end

  def render_work_units(registry)
    lines = []
    lines << "<!-- lifecycle-registry:work-units:start -->"
    lines << "> 此表由 `docs/process/lifecycle-registry.yaml` 生成；它只描述 `template-source` 的 Harness 工作单元。"
    lines << ""
    lines << "| 稳定 ID | 工作单元 | 输入 | 输出 | 完成条件 |"
    lines << "|---|---|---|---|---|"
    registry.fetch("work_units").each do |unit|
      lines << "| `#{unit["id"]}` | #{unit["name"]} | #{unit["input"]} | #{unit["output"]} | #{unit["completion"]} |"
    end
    lines << "<!-- lifecycle-registry:work-units:end -->"
    lines.join("\n") + "\n"
  end

  def replace_region!(path, start_marker, end_marker, replacement, check: false)
    body = path.read
    expression = /#{Regexp.escape(start_marker)}.*?#{Regexp.escape(end_marker)}\n?/m
    raise ArgumentError, "派生文档缺少生成区: #{path.relative_path_from(ROOT)}" unless body.match?(expression)
    expected = body.sub(expression, replacement)
    if check
      raise ArgumentError, "派生文档与注册表漂移: #{path.relative_path_from(ROOT)}；运行 scripts/generate-lifecycle-artifacts --write" unless expected == body
    else
      path.write(expected)
    end
  end
end
