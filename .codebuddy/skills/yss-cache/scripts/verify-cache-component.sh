#!/usr/bin/env bash
set -u

platform_line=""
source_root=""
consumer_root=""
consumer_module=""

usage() {
  echo "Usage: $0 --platform-line <boot2-java8|boot3-java17> [--source-root PATH] [--consumer-root PATH --consumer-module MODULE]" >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --platform-line) [ "$#" -ge 2 ] || { usage; exit 2; }; platform_line=$2; shift 2 ;;
    --source-root) [ "$#" -ge 2 ] || { usage; exit 2; }; source_root=$2; shift 2 ;;
    --consumer-root) [ "$#" -ge 2 ] || { usage; exit 2; }; consumer_root=$2; shift 2 ;;
    --consumer-module) [ "$#" -ge 2 ] || { usage; exit 2; }; consumer_module=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done

case "$platform_line" in
  boot2-java8) expected_major=52; configured_root=${YSS_SOURCE_ROOT_BOOT2_JAVA8:-} ;;
  boot3-java17) expected_major=61; configured_root=${YSS_SOURCE_ROOT_BOOT3_JAVA17:-} ;;
  *) usage; exit 2 ;;
esac

if [ -z "$source_root" ]; then
  source_root=$configured_root
fi

parent="${source_root%/}/yss-microservice-components/yss-component-cache-parent"
if [ -z "$source_root" ] || [ ! -f "$parent/pom.xml" ]; then
  echo "ERROR: cannot locate cache parent for $platform_line; use --source-root or its generation-specific YSS_SOURCE_ROOT variable" >&2
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
(cd "$source_root" && ./mvnw -f "$parent/pom.xml" clean verify) || exit 1

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
  git -C "$source_root" diff --check -- yss-microservice-components/yss-component-cache-parent || exit 1
else
  echo "SKIP: source root is not a Git worktree"
fi

echo "== $platform_line bytecode (major $expected_major) =="
class_count=$(find "$parent" -path '*/target/classes/*.class' -type f | wc -l | tr -d ' ')
if [ "$class_count" -eq 0 ]; then
  echo "ERROR: no compiled cache class found" >&2
  exit 1
fi
if ! command -v javap >/dev/null 2>&1; then
  echo "ERROR: javap is required for bytecode verification" >&2
  exit 2
fi
major_lines=$(find "$parent" -path '*/target/classes/*.class' -type f -exec javap -verbose {} \; 2>/dev/null | sed -n 's/.*major version: *//p')
checked_count=$(printf '%s\n' "$major_lines" | sed '/^$/d' | wc -l | tr -d ' ')
if [ "$checked_count" -ne "$class_count" ]; then
  echo "ERROR: javap inspected $checked_count of $class_count compiled cache classes" >&2
  exit 1
fi
majors=$(printf '%s\n' "$major_lines" | sort -u)
if [ "$majors" != "$expected_major" ]; then
  echo "ERROR: expected only $platform_line major version $expected_major, found: $majors" >&2
  exit 1
fi
echo "PASS: all cache classes use major version $expected_major"

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
