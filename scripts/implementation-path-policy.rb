# frozen_string_literal: true

require "pathname"

# Harness 内运行时代码路径的机器可执行策略。
module YssImplementationPathPolicy
  PROJECT_NAME = /\A[a-z][a-z0-9-]*\z/
  IMPLEMENTATION_KINDS = %w[backend frontend].freeze
  CONTAINER_ROOTS = %w[apps/backend apps/frontend].freeze
  FORBIDDEN_ROOTS = %w[app/backend app/frontend].freeze

  module_function

  def normalize(path)
    return nil unless path.is_a?(String) && !path.empty?

    candidate = path.sub(%r{/$}, "")
    clean = Pathname.new(candidate).cleanpath.to_s
    return nil if clean != candidate || Pathname.new(clean).absolute? || clean.start_with?("../")

    clean
  rescue ArgumentError
    nil
  end

  def violation(path, enforce_harness: true)
    clean = normalize(path)
    return "implementation path must be a clean relative path" unless clean
    return nil unless enforce_harness

    parts = clean.split("/")
    root = parts.take(2).join("/")

    if parts.length >= 2 && parts[0] == "app" && IMPLEMENTATION_KINDS.include?(parts[1])
      return "singular app implementation root is forbidden: #{root}/"
    end

    return nil unless parts[0] == "apps" && IMPLEMENTATION_KINDS.include?(parts[1])
    return "implementation container root is not a project root: #{root}/" if parts.length < 3

    project = parts[2]
    return "implementation project segment must be a concrete project name: #{project}" unless project.match?(PROJECT_NAME)

    nil
  end

  def valid?(path, enforce_harness: true)
    violation(path, enforce_harness: enforce_harness).nil?
  end
end
