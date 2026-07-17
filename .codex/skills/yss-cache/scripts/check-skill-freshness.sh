#!/usr/bin/env bash
set -u

skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

locate_source() {
  if [ "$#" -gt 0 ] && [ -n "$1" ]; then
    if [ -d "$1/yss-microservice-components/yss-component-cache-parent" ]; then
      echo "$1"
      return 0
    fi
    return 1
  fi
  if [ -n "${YSS_SOURCE_ROOT:-}" ] && [ -d "$YSS_SOURCE_ROOT/yss-microservice-components/yss-component-cache-parent" ]; then
    echo "$YSS_SOURCE_ROOT"
    return 0
  fi
  for candidate in "$PWD" "$PWD/.." "$HOME/Projects/yss-cloud-microservice" "$HOME/Documents/yss-project/yss-cloud-microservice"; do
    if [ -d "$candidate/yss-microservice-components/yss-component-cache-parent" ]; then
      (CDPATH= cd -- "$candidate" && pwd)
      return 0
    fi
  done
  return 1
}

source_root=$(locate_source "${1:-}") || {
  echo "ERROR: cannot locate yss-component-cache-parent; pass source root or set YSS_SOURCE_ROOT" >&2
  exit 2
}

parent="$source_root/yss-microservice-components/yss-component-cache-parent"
annotation="$parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/annotation/ClearCache.java"
properties="$parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/YssCacheProperties.java"
connection="$parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/RedisConnFactoryConfig.java"
index="$skill_dir/references/source-index.md"
fail=0

require_text() {
  file=$1
  pattern=$2
  label=$3
  if ! grep -Eq "$pattern" "$file"; then
    echo "STALE: $label not found in $file"
    fail=1
  fi
}

require_text "$annotation" 'boolean allEntries\(\)' 'ClearCache.allEntries'
require_text "$annotation" 'boolean beforeInvocation\(\)' 'ClearCache.beforeInvocation'
require_text "$properties" 'private Duration defaultTtl' 'yss.cache.default-ttl'
require_text "$properties" 'private boolean fallbackEnabled' 'Redis fallback-enabled'
require_text "$properties" 'private String fallbackType' 'Redis fallback-type'
require_text "$properties" 'private boolean clearFallbackOnRecovery' 'Redis clear-fallback-on-recovery'
require_text "$connection" 'cannot be configured together' 'Sentinel/Cluster mutual exclusion'
require_text "$connection" 'database must be 0' 'Cluster database 0 guard'

for module in yss-component-spring-cache yss-component-redis-cache yss-component-caffeine-cache yss-component-cache-starter yss-component-jetcache; do
  if ! grep -q "$module" "$index"; then
    echo "STALE: source-index is missing module $module"
    fail=1
  fi
done

generated=$(sed -n 's/^Generated: //p' "$index" | head -1)
if [ -z "$generated" ]; then
  echo "STALE: source-index has no Generated timestamp"
  fail=1
else
  echo "INFO: source-index generated at $generated"
fi

if [ "$annotation" -nt "$index" ] || [ "$properties" -nt "$index" ] || [ "$connection" -nt "$index" ]; then
  echo "STALE: critical cache source is newer than source-index"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "RESULT: skill/source contract drift detected; refresh with yss-source-index and review semantic references"
  exit 1
fi

echo "RESULT: yss-cache critical contracts match source at $source_root"
exit 0
