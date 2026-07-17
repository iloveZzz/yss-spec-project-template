#!/usr/bin/env bash
set -u

usage() {
  echo "Usage: $0 <project-root>" >&2
}

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

root=$1
if [ ! -d "$root" ]; then
  echo "ERROR: project root does not exist: $root" >&2
  exit 2
fi

if command -v rg >/dev/null 2>&1; then
  search() { rg -n --hidden --glob '!target/**' --glob '!.git/**' --glob '*.java' --glob '*.yml' --glob '*.yaml' --glob '*.properties' --glob 'pom.xml' "$1" "$root" 2>/dev/null || true; }
  files() { rg --files "$root" -g '*.yml' -g '*.yaml' -g '*.properties' -g '*.java' -g 'pom.xml'; }
else
  search() { grep -REn "$1" "$root" --include='*.java' --include='*.yml' --include='*.yaml' --include='*.properties' --include='pom.xml' 2>/dev/null || true; }
  files() { find "$root" -type f \( -name '*.java' -o -name '*.yml' -o -name '*.yaml' -o -name '*.properties' -o -name 'pom.xml' \); }
fi

tmp=${TMPDIR:-/tmp}/yss-cache-inspect.$$
trap 'rm -f "$tmp"' EXIT HUP INT TERM
files >"$tmp"
if [ ! -s "$tmp" ]; then
  echo "ERROR: no Java, Maven, or configuration files found under $root" >&2
  exit 2
fi

fail=0
echo "YSS cache usage inspection: $root"

report() {
  level=$1
  title=$2
  pattern=$3
  result=$(search "$pattern")
  if [ -n "$result" ]; then
    echo
    echo "[$level] $title"
    echo "$result" | sed -n '1,20p'
  fi
}

report INFO "Cache component dependencies" 'yss-component-(cache-starter|spring-cache|redis-cache|caffeine-cache|hazelcast-cache|jetcache)'
report INFO "Cache enable annotations" '@EnableYssCloud(Cache|RedisCache)'
report INFO "YSS cache annotations" '@(QueryCache|UpdateCache|ClearCache)'
report INFO "Configured backend and TTL" 'yss\.cache\.(active-type|default-ttl)|active-type:|default-ttl:'
report INFO "Redis fallback configuration" 'fallback-(enabled|type)|clear-fallback-on-recovery'
report INFO "RedisTemplate injection contracts" 'RedisTemplate[[:space:]]*<'

sentinel=$(search 'spring\.redis\.sentinel|sentinel:')
cluster=$(search 'spring\.redis\.cluster|cluster:')
if [ -n "$sentinel" ] && [ -n "$cluster" ]; then
  echo
  echo "[ERROR] Both Redis Sentinel and Cluster configuration markers were found. Confirm they are not active in the same profile."
  fail=1
fi

if [ -n "$cluster" ]; then
  nonzero=$(search 'spring\.redis\.database[[:space:]]*=[[:space:]]*[1-9][0-9]*|database:[[:space:]]*[1-9][0-9]*')
  if [ -n "$nonzero" ]; then
    echo
    echo "[ERROR] Redis Cluster requires database 0."
    echo "$nonzero" | sed -n '1,20p'
    fail=1
  fi
fi

clear_without_key=$(search '@ClearCache[[:space:]]*(\([^)]*\))?')
if [ -n "$clear_without_key" ]; then
  echo
  echo "[REVIEW] ClearCache usages found. Verify each use has a stable key or explicit allEntries=true; no-arg methods produce SimpleKey.EMPTY."
fi

query=$(search '@QueryCache')
update=$(search '@(UpdateCache|ClearCache)')
if [ -n "$query" ] && [ -z "$update" ]; then
  echo
  echo "[REVIEW] QueryCache is used but no UpdateCache/ClearCache annotation was found. Inspect explicit invalidation paths."
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "RESULT: blocking cache configuration defects found"
  exit 1
fi

echo
echo "RESULT: no statically provable blocking cache defect found; REVIEW items still require code inspection"
exit 0
