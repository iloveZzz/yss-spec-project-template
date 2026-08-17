#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"
require "yaml"

module YssRepositoryMode
  VALID_MODES = %w[template-source project-instance].freeze

  module_function

  def read(root = Pathname.new(__dir__).join("..").realpath)
    path = root.join("yss-project.yaml")
    manifest = YAML.safe_load(path.read, permitted_classes: [], aliases: false)
    unless manifest.is_a?(Hash) && manifest.keys.sort == %w[repository_mode schema_version] &&
           manifest["schema_version"] == 1 && VALID_MODES.include?(manifest["repository_mode"])
      raise ArgumentError, "yss-project.yaml 必须只声明 schema_version: 1 和合法 repository_mode"
    end

    manifest.fetch("repository_mode")
  rescue Errno::ENOENT => error
    raise ArgumentError, "缺少 yss-project.yaml: #{error.message}"
  rescue Psych::Exception => error
    raise ArgumentError, "无法解析 yss-project.yaml: #{error.message}"
  end

  def template_source?(root)
    read(root) == "template-source"
  end

  def project_instance?(root)
    read(root) == "project-instance"
  end
end

if $PROGRAM_NAME == __FILE__
  root = Pathname.new(Dir.pwd)
  puts YssRepositoryMode.read(root)
end
