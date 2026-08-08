# frozen_string_literal: true

require "json"
require "minitest/autorun"
require "open3"
require "pathname"
require "tmpdir"

ROOT = Pathname.new(__dir__).parent.expand_path
EXPORTER = ROOT.join("scripts", "export-yss-skills")
REMOVED_SKILLS = %w[
  yss-dir
  yss-duckdb
  yss-file
  yss-filerunner
  yss-mail
  yss-mapper-dynamic
  yss-quality
  yss-sql-condition
  yss-sql-tpl
].freeze

class ExportYssSkillsTest < Minitest::Test
  def run_export(output, *arguments)
    Open3.capture3("ruby", EXPORTER.to_s, "--output", output.to_s, *arguments, chdir: ROOT.to_s)
  end

  def test_exports_manifest_groups_and_portable_content
    Dir.mktmpdir("yss-export-test-") do |directory|
      output = Pathname.new(directory)
      stdout, stderr, result = run_export(output)

      assert result.success?, "#{stdout}\n#{stderr}"
      assert_equal 46, Dir.glob(output.join("skills", "*").to_s).count { |path| File.directory?(path) }

      manifest = JSON.parse(output.join(".yss-export-manifest.json").read)
      assert_equal 46, manifest.fetch("skills").length
      assert_operator manifest.fetch("generated_files_sha256").length, :>, 46
      REMOVED_SKILLS.each do |skill_name|
        refute output.join("skills", skill_name).exist?, "removed skill was exported: #{skill_name}"
      end

      page = JSON.parse(output.join("skills.sh.json").read)
      grouped = page.fetch("groupings").flat_map { |group| group.fetch("skills") }
      assert_equal 46, grouped.uniq.length
      assert_equal 46, grouped.length

      exported_text = Dir.glob(output.join("skills", "**", "*").to_s)
        .select { |path| File.file?(path) }
        .map { |path| File.binread(path).force_encoding(Encoding::UTF_8) }
        .select(&:valid_encoding?)
        .join("\n")
      REMOVED_SKILLS.each do |skill_name|
        refute_match(/\b#{Regexp.escape(skill_name)}\b/, exported_text, "removed skill is still referenced: #{skill_name}")
      end

      formily_examples = output.join("skills", "yss-formily", "references", "examples.md").read
      assert_includes formily_examples, "../../yss-ui/assets/docs/components/formily.md"
      refute_includes formily_examples, ".trae/skills"
      refute_includes formily_examples, "${base_project}"

      datasource = output.join("skills", "yss-db2mybatis", "references", "datasource-config.example.json").read
      assert_includes datasource, '"password": "CHANGE_ME"'
      refute_includes datasource, '"password": "root"'

      _, check_stderr, check_result = run_export(output, "--check")
      assert check_result.success?, check_stderr
    end
  end

  def test_check_detects_drift
    Dir.mktmpdir("yss-export-test-") do |directory|
      output = Pathname.new(directory)
      stdout, stderr, result = run_export(output)
      assert result.success?, "#{stdout}\n#{stderr}"

      skill = output.join("skills", "yss-validation", "SKILL.md")
      assert_match(/\A---\r?\nname:\s+\S+\r?\ndescription:\s+\S+/, skill.read)
      skill.open("a") { |file| file.puts("\n<!-- drift -->") }
      _, check_stderr, check_result = run_export(output, "--check")
      refute check_result.success?
      assert_includes check_stderr, "out of date"
    end
  end

  def test_rejects_output_that_overlaps_canonical_source
    source_skill = ROOT.join(".agents", "skills", "yss-validation", "SKILL.md")
    original = source_skill.binread
    stdout, stderr, result = run_export(ROOT.join(".agents"))

    refute result.success?
    assert_includes stderr, "overlap canonical skills"
    assert_equal original, source_skill.binread
  end

  def test_check_rejects_template_assets_in_public_root
    Dir.mktmpdir("yss-export-test-") do |directory|
      output = Pathname.new(directory)
      stdout, stderr, result = run_export(output)
      assert result.success?, "#{stdout}\n#{stderr}"

      output.join("AGENTS.md").write("must not be published\n")
      _, check_stderr, check_result = run_export(output, "--check")
      refute check_result.success?
      assert_includes check_stderr, "forbidden project file"
    end
  end

  def test_preserves_executable_source_index_paths
    Dir.mktmpdir("yss-export-test-") do |directory|
      output = Pathname.new(directory)
      stdout, stderr, result = run_export(output)
      assert result.success?, "#{stdout}\n#{stderr}"

      source_index = Dir.glob(output.join("skills", "yss-source-index", "**", "*").to_s)
        .select { |path| File.file?(path) }
        .map { |path| File.binread(path).force_encoding(Encoding::UTF_8) }
        .select(&:valid_encoding?)
        .join("\n")

      refute_includes source_index, "/absolute./path"
      refute_includes source_index, "YSS_SKILLS_ROOT=$YSS_SKILLS_ROOT"
      refute_match(/YSS_SKILLS_ROOT=(?:[\"']?)\$YSS_SKILLS_ROOT/, source_index)
      assert_includes source_index, 'export YSS_SKILLS_ROOT="./path/to/yss-skills"'
      assert_includes source_index, "YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice"
    end
  end
end
