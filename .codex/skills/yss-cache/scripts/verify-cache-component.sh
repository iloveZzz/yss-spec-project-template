#!/usr/bin/env bash
set -u

source_root=""
consumer_root=""
consumer_module=""

usage() {
  echo "Usage: $0 [--source-root PATH] [--consumer-root PATH --consumer-module MODULE]" >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --source-root) [ "$#" -ge 2 ] || { usage; exit 2; }; source_root=$2; shift 2 ;;
    --consumer-root) [ "$#" -ge 2 ] || { usage; exit 2; }; consumer_root=$2; shift 2 ;;
    --consumer-module) [ "$#" -ge 2 ] || { usage; exit 2; }; consumer_module=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done

if [ -z "$source_root" ]; then
  source_root=${YSS_SOURCE_ROOT:-}
fi
if [ -z "$source_root" ]; then
  for candidate in "$PWD" "$PWD/.." "$HOME/Projects/yss-cloud-microservice" "$HOME/Documents/yss-project/yss-cloud-microservice"; do
    if [ -d "$candidate/yss-microservice-components/yss-component-cache-parent" ]; then
      source_root=$candidate
      break
    fi
  done
fi

parent="${source_root%/}/yss-microservice-components/yss-component-cache-parent"
if [ -z "$source_root" ] || [ ! -f "$parent/pom.xml" ]; then
  echo "ERROR: cannot locate cache parent; use --source-root or YSS_SOURCE_ROOT" >&2
  exit 2
fi
if [ ! -x "$source_root/mvnw" ]; then
  echo "ERROR: Maven wrapper is missing or not executable: $source_root/mvnw" >&2
  exit 2
fi
if { [ -n "$consumer_root" ] && [ -z "$consumer_module" ]; } || { [ -z "$consumer_root" ] && [ -n "$consumer_module" ]; }; then
  echo "ERROR: --consumer-root and --consumer-module must be provided together" >&2
  exit 2
fi

echo "== Cache reactor verify =="
(cd "$source_root" && ./mvnw -f "$parent/pom.xml" verify) || exit 1

echo "== Docker integration status =="
report="$parent/yss-component-redis-cache/target/surefire-reports/TEST-com.yss.cloud.cache.redis.config.RedisStandaloneIntegrationTest.xml"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [ ! -f "$report" ]; then
    echo "ERROR: Docker is available but Redis integration report is missing" >&2
    exit 1
  fi
  if grep -Eq 'skipped="[1-9]' "$report"; then
    echo "ERROR: Docker is available but Redis integration test was skipped" >&2
    exit 1
  fi
  echo "PASS: real Redis integration test executed"
else
  echo "SKIP: Docker is unavailable; Redis integration test may be skipped by assumption"
fi

echo "== Diff whitespace =="
if command -v git >/dev/null 2>&1 && git -C "$source_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$source_root" diff --check || exit 1
else
  echo "SKIP: source root is not a Git worktree"
fi

echo "== Java 8 bytecode =="
classes=$(find "$parent" -path '*/target/classes/*.class' -type f | head -1)
if [ -z "$classes" ]; then
  echo "ERROR: no compiled cache class found" >&2
  exit 1
fi
if ! command -v javap >/dev/null 2>&1; then
  echo "ERROR: javap is required for bytecode verification" >&2
  exit 2
fi
majors=$(find "$parent" -path '*/target/classes/*.class' -type f -exec javap -verbose {} \; 2>/dev/null | sed -n 's/.*major version: *//p' | sort -u)
if [ "$majors" != "52" ]; then
  echo "ERROR: expected only Java 8 major version 52, found: $majors" >&2
  exit 1
fi
echo "PASS: all cache classes use major version 52"

if [ -n "$consumer_root" ]; then
  echo "== Consumer build =="
  if [ ! -x "$consumer_root/mvnw" ] || [ ! -f "$consumer_root/pom.xml" ]; then
    echo "ERROR: invalid consumer root: $consumer_root" >&2
    exit 2
  fi
  (cd "$consumer_root" && ./mvnw -pl "$consumer_module" -am -DskipTests package) || exit 1
fi

echo "RESULT: cache verification passed"
exit 0
