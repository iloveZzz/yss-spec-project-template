### Core Checks

- Completeness: null rate by column; null rate by partition, segment, and time bucket; unexpected empty strings or sentinel values; required-column population rate.
- Uniqueness: exact duplicate rows, duplicate primary keys, duplicate composite keys, and proportion unique for semi-unique fields such as emails or device IDs.
- Validity: type conformance after casting; format checks for IDs, emails, URLs,
  enums, country codes, and timestamps; range checks for measures, percentages,
  counts, and dates; allowed-values checks for controlled vocabularies.
- Consistency: cross-field rule checks, units or currency consistency, status and timestamp alignment, and agreement between duplicated fields from different sources.
- Integrity: parent-child key coverage, orphan records, unexpected many-to-many joins, and broken slowly changing dimension joins.
- Timeliness: freshness lag from source event time to load time, freshness lag from load time to report time, missing recent partitions, and unexplained historical rewrites or backfills.
- Volume and shape: row-count drift, distinct-count drift, distribution drift,
  share-of-total drift for major categories, and new or disappeared categories.

### Specific Check Guidance

- Duplicates and keys: check exact duplicates, primary key duplicates, composite key duplicates at the intended grain, and near-duplicates caused by whitespace,
  casing, formatting, or late updates. Report count, share of affected rows,
  duplicated keys, and whether duplication is isolated to a time range, source,
  or segment.
- Missingness: distinguish acceptable sparsity from broken completeness. Check null rates over time, newly null columns after schema or pipeline changes, and sentinel values such as `''`, `'unknown'`, `'n/a'`, `0`, or `-1`.
- Domain validity: check malformed identifiers, country codes, timestamps,
  impossible values, values outside allowed sets, and cross-field contradictions such as `is_cancelled = false` with a non-null `cancelled_at`.
- Join coverage: when multiple datasets are involved, check foreign keys that do not match a parent table, unexpected one-to-many expansion, coverage loss when joining to dimensions or experiments, and row counts before and after joins.
- Freshness and schema drift: check row-count changes against recent history,
  lag on important date columns, added/removed/retyped columns, and shifts in sparsity or cardinality that suggest upstream changes.
- Outliers and distribution shifts: use robust methods such as quantiles, MAD,
  or IQR before defaulting to z-scores. Check sudden changes in mean, median,
  variance, zero rate, category share, and long-tail behavior.
- Leakage, backfill, and time travel: check features populated before they should exist, future-dated records, late-arriving data causing unstable recent partitions, and backfills that change historical counts without annotation.
