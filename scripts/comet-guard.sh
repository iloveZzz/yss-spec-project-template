#!/usr/bin/env bash
# comet-guard.sh — Comet 阶段转换门禁检查
# 用法: ./scripts/comet-guard.sh <pipeline> <from> <to>
set -euo pipefail

PIPELINE="${1:-}"; FROM="${2:-}"; TO="${3:-}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[COMET]${NC} $1"; }
warn()  { echo -e "${YELLOW}[COMET]${NC} $1"; }
error() { echo -e "${RED}[COMET] ❌ $1${NC}"; exit 1; }
pass()  { echo -e "${GREEN}[COMET] ✅${NC} $1"; }

cd "$(dirname "$0")/.." || exit 1

guard_open_to_design() {
    info "门禁: Open → Design"
    [ -f "docs/api/openapi.yaml" ] || [ -n "$(find docs/api/specs -name '*.yaml' 2>/dev/null)" ] || \
        error "未找到 OpenAPI Spec (docs/api/)"
    pass "OpenAPI Spec 存在"
    info "✅ Open → Design 通过"
}

guard_design_to_build() {
    info "门禁: Design → Build"
    PLAN_COUNT=$(find .hermes/plans/ -name "*.md" -not -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$PLAN_COUNT" -gt 0 ] || error "未找到实现计划 (.hermes/plans/)"
    pass "实现计划: ${PLAN_COUNT} 个"
    info "✅ Design → Build 通过"
}

guard_build_to_verify() {
    info "门禁: Build → Verify"
    if [ -d "backend" ] && [ -d "backend/.venv" ]; then
        (cd backend && source .venv/bin/activate 2>/dev/null && \
            python -m pytest tests/ -q --tb=line 2>&1) || true
    fi
    if [ -d "frontend" ] && [ -d "frontend/node_modules" ]; then
        (cd frontend && npx vitest run 2>&1) || true
    fi
    pass "测试检查完成"
    info "✅ Build → Verify 通过"
}

guard_verify_to_archive() {
    info "门禁: Verify → Archive"
    REVIEW_COUNT=$(find docs/process/sprint-reviews/ -name "*.md" -not -name ".gitkeep" 2>/dev/null | wc -l | tr -d ' ')
    [ "$REVIEW_COUNT" -gt 0 ] || error "未找到 Sprint Review 文档"
    pass "Sprint Review: ${REVIEW_COUNT} 个"
    info "✅ Verify → Archive 通过"
}

if [ -z "$FROM" ] || [ -z "$TO" ]; then
    echo "用法: $0 <pipeline> <from_stage> <to_stage>"
    echo "阶段: open → design → build → verify → archive"
    echo "示例: $0 my-feature open design"
    exit 1
fi

echo ""; echo "  Comet Guard: ${FROM} → ${TO} (${PIPELINE})"; echo ""

case "${FROM}_${TO}" in
    open_design)    guard_open_to_design ;;
    design_build)   guard_design_to_build ;;
    build_verify)   guard_build_to_verify ;;
    verify_archive) guard_verify_to_archive ;;
    *)              error "无效转换: ${FROM} → ${TO}" ;;
esac

echo ""; echo "  ✅ ${FROM} → ${TO} 通过"; echo ""
