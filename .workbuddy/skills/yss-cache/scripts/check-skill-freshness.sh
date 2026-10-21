#!/usr/bin/env bash
set -u

skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

locate_source() {
  if [ "$#" -gt 0 ] && [ -n "$1" ]; then
    if [ -d "$1/yss-microservice-components/yss-component-cache-parent" ]; then
      (CDPATH= cd -- "$1" && pwd)
      return 0
    fi
  fi
  return 1
}

platform_line=${1:-}
if [ "$platform_line" != "boot2-java8" ] && [ "$platform_line" != "boot3-java17" ]; then
  echo "usage: check-skill-freshness.sh <boot2-java8|boot3-java17> [source-root]" >&2
  exit 2
fi

configured_root=""
if [ "$platform_line" = "boot2-java8" ]; then configured_root=${YSS_SOURCE_ROOT_BOOT2_JAVA8:-}; fi
if [ "$platform_line" = "boot3-java17" ]; then configured_root=${YSS_SOURCE_ROOT_BOOT3_JAVA17:-}; fi

source_root=$(locate_source "${2:-$configured_root}") || {
  echo "ERROR: cannot locate yss-component-cache-parent for $platform_line; pass its source root or set the generation-specific environment variable" >&2
  exit 2
}

parent="$source_root/yss-microservice-components/yss-component-cache-parent"
annotation="$parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/annotation/ClearCache.java"
properties="$parent/yss-component-spring-cache/src/main/java/com/yss/cloud/cache/YssCacheProperties.java"
connection="$parent/yss-component-redis-cache/src/main/java/com/yss/cloud/cache/redis/config/RedisConnFactoryConfig.java"
index="$skill_dir/references/source-index.$platform_line.md"
fail=0

node "$skill_dir/../yss-skill-source-index-refresh/scripts/check-backend-skill-source-index.mjs" \
  --skill yss-cache \
  --platform-line "$platform_line" \
  --source-root "$source_root" \
  --skills-root "$skill_dir/.." || exit 1

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
  echo "RESULT: skill/source contract drift detected; refresh with yss-skill-source-index-refresh and review semantic references"
  exit 1
fi

echo "RESULT: yss-cache critical contracts match source at $source_root"
exit 0
