#!/usr/bin/env python3
"""Generate PO/Mapper files from a reviewed database-model.json v1 (Python 3.10+)."""

from __future__ import annotations

import argparse
import difflib
import json
import os
from pathlib import Path
import re
import string
import sys

VERSION = '1.0.0'

# Java keywords and literals, including the reserved underscore identifier.
RESERVED = set(('abstract assert boolean break byte case catch char class const continue default do '
                'double else enum extends final finally float for goto if implements import instanceof '
                'int interface long native new package private protected public return short static '
                'strictfp super switch synchronized this throw throws transient try void volatile while '
                'true false null _').split())
IDENTIFIER = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*\Z')
ID_TYPES = {'AUTO', 'NONE', 'INPUT', 'ASSIGN_ID', 'ASSIGN_UUID'}
STRATEGIES = {'DEFAULT', 'ALWAYS', 'NOT_NULL', 'NOT_EMPTY', 'NEVER'}
JDBC_TYPES = set(('ARRAY BIT TINYINT SMALLINT INTEGER BIGINT FLOAT REAL DOUBLE NUMERIC DECIMAL CHAR '
                  'VARCHAR LONGVARCHAR DATE TIME TIMESTAMP BINARY VARBINARY LONGVARBINARY NULL OTHER '
                  'BLOB CLOB BOOLEAN CURSOR UNDEFINED NVARCHAR NCHAR NCLOB STRUCT JAVA_OBJECT DISTINCT '
                  'REF DATALINK ROWID LONGNVARCHAR SQLXML DATETIMEOFFSET TIME_WITH_TIMEZONE '
                  'TIMESTAMP_WITH_TIMEZONE').split())
JAVA_TYPES = {name: 'java.lang.' + name for name in
              ('String', 'Long', 'Integer', 'Short', 'Byte', 'Boolean', 'Float', 'Double')}
JAVA_TYPES.update({name: 'java.time.' + name for name in
                   ('LocalDateTime', 'LocalDate', 'LocalTime', 'OffsetDateTime', 'Instant')})
JAVA_TYPES['BigDecimal'] = 'java.math.BigDecimal'
JAVA_TYPES['UUID'] = 'java.util.UUID'


class GenerationError(ValueError):
    """Invalid or unsupported generation input; no output may be written."""


def _require(condition, message):
    if not condition:
        raise GenerationError(message)


def _text(value, label, *, empty=False):
    _require(isinstance(value, str) and (empty or bool(value.strip())), f'{label}: expected text')
    _require(not any(ord(char) < 32 or 0xD800 <= ord(char) <= 0xDFFF for char in value),
             f'{label}: control characters are unsupported')
    return value


def _identifier(value, label):
    _require(isinstance(value, str) and IDENTIFIER.fullmatch(value) and value not in RESERVED,
             f'{label}: invalid Java identifier {value!r}')
    return value


def _package(value, label):
    _text(value, label)
    for part in value.split('.'):
        _identifier(part, label)
    return value


def _fqcn(value, label):
    _package(value, label)
    _require('.' in value, f'{label}: expected a fully qualified Java class name')
    return value


def _comment(value, label):
    _require(isinstance(value, str) and bool(value.strip()), f'{label}: missing Javadoc text')
    _require(not any(0xD800 <= ord(char) <= 0xDFFF for char in value),
             f'{label}: invalid Unicode surrogate in Javadoc')
    # Java processes Unicode escapes before parsing comments. HTML entities retain
    # the displayed backslash without allowing an input comment to break source.
    return value.replace('\\', '&#92;').replace('*/', '* /').replace('\r', ' ').replace('\n', ' ')


def _sql_type(value):
    _text(value, 'field.type')
    return re.sub(r'\s+', ' ', value.strip()).upper()


def _type_name(value):
    _text(value, 'Java type')
    qualified = JAVA_TYPES.get(value, value)
    _fqcn(qualified, 'Java type')
    return qualified


def _mapped_type(sql_type, type_overrides=None):
    kind = _sql_type(sql_type)
    overrides = {_sql_type(key): _type_name(value) for key, value in (type_overrides or {}).items()}
    if kind in overrides:
        return overrides[kind]
    simple = {
        'BIGINT': 'Long', 'INT': 'Integer', 'INTEGER': 'Integer', 'SMALLINT': 'Short',
        'BOOLEAN': 'Boolean', 'DATE': 'LocalDate', 'TEXT': 'String', 'JSON': 'String', 'JSONB': 'String',
    }.get(kind)
    if re.fullmatch(r'(?:VARCHAR|CHAR)(?:\(\s*\d+\s*\))?', kind):
        simple = 'String'
    elif re.fullmatch(r'TIMESTAMP(?:\(\s*\d+\s*\))?(?: (?:WITH|WITHOUT) TIME ZONE)?', kind):
        simple = 'OffsetDateTime' if kind.endswith(' WITH TIME ZONE') else 'LocalDateTime'
    elif re.fullmatch(r'TIME(?:\(\s*\d+\s*\))?(?: WITHOUT TIME ZONE)?', kind):
        simple = 'LocalTime'
    elif re.fullmatch(r'(?:DECIMAL|NUMERIC)(?:\(\s*\d+(?:\s*,\s*\d+)?\s*\))?', kind):
        simple = 'BigDecimal'
    _require(simple is not None, f'Unsupported SQL type {sql_type!r}; configure type_overrides')
    return JAVA_TYPES[simple]


def java_type(sql_type, type_overrides=None):
    """Return the Java simple name; rendering also imports its qualified type."""
    return _mapped_type(sql_type, type_overrides).rsplit('.', 1)[-1]


def property_name(column, naming=None):
    """Convert snake_case to a Java field, using only explicit naming options."""
    naming = naming or {}
    _text(column, 'field.name')
    value = column[3:] if naming.get('strip_is_prefix', False) and column.startswith('is_') else column
    head, *tail = value.split('_')
    result = head + ''.join(word.capitalize() for word in tail)
    if result in RESERVED:
        result += naming.get('reserved_word_suffix', '')
    return _identifier(result, f'field {column!r}')


def _class_name(table_name, naming):
    prefix = naming.get('strip_table_prefix', '')
    value = table_name.removeprefix(prefix) if prefix else table_name
    result = ''.join(word.capitalize() for word in value.split('_'))
    _identifier(result, f'table {table_name!r}')
    return result


def _package_for(group, config):
    _package(group, 'table group')
    pattern = config.get('package_pattern', '{base_package}.{group}.persistence')
    _text(pattern, 'package_pattern')
    try:
        for _, field, spec, conversion in string.Formatter().parse(pattern):
            _require(field is None or (field in {'base_package', 'group'} and not spec and not conversion),
                     'package_pattern only supports {base_package} and {group}')
        package = pattern.format(base_package=config['base_package'], group=group)
    except (ValueError, KeyError) as error:
        raise GenerationError(f'Invalid package_pattern: {error}') from error
    _package(package, 'generated package')
    base = config['base_package']
    _require(package == base or package.startswith(base + '.'), 'generated package must remain under base_package')
    return package


def _validate_config(config):
    _require(isinstance(config, dict), 'config: expected an object')
    supported = {'format_version', 'output_root', 'base_package', 'package_pattern', 'table_groups',
                 'naming', 'mapper_base', 'id_type', 'json', 'type_overrides', 'default_insert_strategy',
                 'default_update_strategy', 'generated_by', 'to_string_fields'}
    _require(not set(config) - supported, f'Unknown config keys: {sorted(set(config) - supported)}')
    _require(type(config.get('format_version')) is int and config['format_version'] == 1,
             'config.format_version must be 1')
    _package(config.get('base_package'), 'base_package')
    _text(str(config.get('output_root', '')), 'output_root')
    _require(isinstance(config.get('output_root'), (str, Path)), 'output_root: expected a path')
    _fqcn(config.get('mapper_base'), 'mapper_base')
    _require(isinstance(config.get('id_type'), str) and config['id_type'] in ID_TYPES,
             'id_type must explicitly select a supported IdType')
    _text(config.get('generated_by'), 'generated_by')
    naming = config.get('naming', {})
    _require(isinstance(naming, dict), 'naming: expected an object')
    _require(not set(naming) - {'strip_table_prefix', 'strip_is_prefix', 'reserved_word_suffix'},
             'naming: unknown naming option')
    for name in ('strip_table_prefix', 'reserved_word_suffix'):
        _text(naming.get(name, ''), 'naming.' + name, empty=True)
    _require(type(naming.get('strip_is_prefix', False)) is bool, 'naming.strip_is_prefix: expected boolean')
    for name in ('default_insert_strategy', 'default_update_strategy'):
        _require(config.get(name) is None or (isinstance(config[name], str) and config[name] in STRATEGIES),
                 f'{name}: unsupported strategy')
    _require(isinstance(config.get('type_overrides', {}), dict), 'type_overrides: expected an object')
    normalized = [_sql_type(key) for key in config.get('type_overrides', {})]
    _require(len(normalized) == len(set(normalized)), 'type_overrides: duplicate normalized SQL types')
    for value in config.get('type_overrides', {}).values():
        _type_name(value)
    included = config.get('to_string_fields', [])
    _require(isinstance(included, list) and all(isinstance(item, str) for item in included),
             'to_string_fields: expected an array of column names')
    json_config = config.get('json', {})
    _require(isinstance(json_config, dict), 'json: expected an object')
    _require(not set(json_config) - {'type_handler', 'jdbc_type'}, 'json: unknown JSON mapping option')
    if json_config:
        _fqcn(json_config.get('type_handler'), 'json.type_handler')
        _require(isinstance(json_config.get('jdbc_type'), str) and json_config['jdbc_type'] in JDBC_TYPES,
                 'json.jdbc_type: unsupported JdbcType')


def _render_table(table, group, config):
    _require(isinstance(table, dict), 'table: expected an object')
    _text(table.get('name'), 'table.name')
    _comment(table.get('title'), f'{table["name"]}.title')
    description = _comment(table.get('comment', table['title']), f'{table["name"]}.comment')
    package = _package_for(group, config)
    name = _class_name(table['name'], config.get('naming', {}))
    fields = table.get('fields')
    _require(isinstance(fields, list) and bool(fields), f'{table["name"]}: fields must be a nonempty array')
    pk = table.get('pk')
    _require(isinstance(pk, list) and len(pk) == 1 and isinstance(pk[0], str),
             f'{table["name"]}: only a single-column primary key is supported')
    field_names, properties, resolved_types = [], [], []
    annotations = []
    json_config = config.get('json', {})
    for field in fields:
        _require(isinstance(field, dict), f'{table["name"]}: field must be an object')
        field_name = _text(field.get('name'), 'field.name')
        field_names.append(field_name)
        properties.append(property_name(field_name, config.get('naming')))
        _comment(field.get('comment'), f'{table["name"]}.{field_name}.comment')
        resolved_types.append(_mapped_type(field.get('type'), config.get('type_overrides')))
        persistence = field.get('persistence', {})
        _require(isinstance(persistence, dict), f'{field_name}.persistence: expected an object')
        strategies = []
        for action in ('insert', 'update'):
            value = persistence.get(action + '_strategy', config.get('default_' + action + '_strategy'))
            _require(value is None or (isinstance(value, str) and value in STRATEGIES),
                     f'{field_name}.{action}_strategy: unsupported strategy')
            if value is not None:
                strategies.append(f'{action}Strategy = FieldStrategy.{value}')
        is_json = _sql_type(field.get('type')) in {'JSON', 'JSONB'}
        if is_json:
            _require(bool(json_config), f'{field_name}: JSON requires explicit handler and JDBC type')
            _require(field_name != pk[0], f'{field_name}: JSON primary keys are unsupported')
        annotations.append((strategies, is_json))
    _require(len(field_names) == len(set(field_names)), f'{table["name"]}: duplicate field names')
    _require(len(properties) == len(set(properties)), f'{table["name"]}: duplicate Java property names')
    _require(pk[0] in field_names, f'{table["name"]}: primary key column is missing')
    imports = [
        'com.baomidou.mybatisplus.annotation.FieldStrategy', 'com.baomidou.mybatisplus.annotation.IdType',
        'com.baomidou.mybatisplus.annotation.TableField', 'com.baomidou.mybatisplus.annotation.TableId',
        'com.baomidou.mybatisplus.annotation.TableName', 'lombok.Getter', 'lombok.Setter', 'lombok.ToString',
    ]
    if any(item[1] for item in annotations):
        imports += [json_config['type_handler'], 'org.apache.ibatis.type.JdbcType']
    imports += [kind for kind in set(resolved_types) if not kind.startswith('java.lang.')]
    simple_imports = {}
    for imported in imports + resolved_types:
        simple = imported.rsplit('.', 1)[-1]
        _require(simple not in simple_imports or simple_imports[simple] == imported,
                 f'{table["name"]}: ambiguous Java type {simple}')
        _require(simple != name + 'PO', f'{table["name"]}: Java type conflicts with generated PO')
        simple_imports[simple] = imported
    lines = ['package ' + package + '.po;', '']
    lines += ['import ' + value + ';' for value in sorted(set(imports))]
    lines += ['', '/** ' + description + '。由 ' + _comment(config['generated_by'], 'generated_by') + ' 生成。 */',
              '@Getter', '@Setter', '@ToString(onlyExplicitlyIncluded = true)',
              f'@TableName(value = {json.dumps(table["name"], ensure_ascii=False)}, autoResultMap = true)',
              'public class ' + name + 'PO {']
    for field, prop, kind, (strategies, is_json) in zip(fields, properties, resolved_types, annotations):
        column = field['name']
        lines += ['', '    /** ' + _comment(field['comment'], 'field.comment') + ' */']
        if column in config.get('to_string_fields', []):
            lines.append('    @ToString.Include')
        if column == pk[0]:
            lines.append(f'    @TableId(value = {json.dumps(column, ensure_ascii=False)}, type = IdType.{config["id_type"]})')
        else:
            attributes = []
            if is_json:
                handler = json_config['type_handler'].rsplit('.', 1)[-1]
                attributes.append(f'jdbcType = JdbcType.{json_config["jdbc_type"]}, typeHandler = {handler}.class')
            attributes += strategies
            if attributes:
                lines.append('    @TableField(value = ' + json.dumps(column, ensure_ascii=False) + ',')
                # Keep the reviewed legacy layout when both strategies exist.
                if is_json and strategies:
                    lines.append('            ' + attributes[0] + ',')
                    lines.append('            ' + ', '.join(strategies) + ')')
                else:
                    lines.append('            ' + ', '.join(attributes) + ')')
            else:
                lines.append('    @TableField(value = ' + json.dumps(column, ensure_ascii=False) + ')')
        lines.append('    private ' + kind.rsplit('.', 1)[-1] + ' ' + prop + ';')
    lines += ['}', '']
    base = config['mapper_base']
    _require(base.rsplit('.', 1)[-1] not in {name + 'Mapper', name + 'PO', 'Mapper'},
             f'{table["name"]}: Mapper base simple name conflicts with generated/imported type')
    mapper = '\n'.join([
        'package ' + package + '.mapper;', '',
        f'import {package}.po.{name}PO;', f'import {base};',
        'import org.apache.ibatis.annotations.Mapper;', '',
        '/** ' + _comment(table['title'], 'table.title') + '的内部持久化映射。 */', '@Mapper',
        f'public interface {name}Mapper extends {base.rsplit(".", 1)[-1]}<{name}PO> {{', '}', '',
    ])
    return name, '\n'.join(lines), mapper


def render_table(table, group, config):
    """Render one table without filesystem access; callers may reuse legacy APIs."""
    _validate_config(config)
    return _render_table(table, group, config)


def _inside(root, path, label):
    try:
        resolved = path.resolve()
        resolved.relative_to(root)
    except (ValueError, OSError, RuntimeError) as error:
        raise GenerationError(f'{label}: path or symlink escapes project root: {path}') from error
    return resolved


def output_root(config, project_root):
    """Resolve the directory corresponding to base_package within the project."""
    root = Path(project_root).resolve(strict=True)
    _require(root.is_dir(), 'project_root must be an existing directory')
    value = Path(config['output_root'])
    return _inside(root, value if value.is_absolute() else root / value, 'output_root')


def render_outputs(model, config, project_root):
    """Validate all inputs and return absolute Path -> UTF-8 source, without writes."""
    _validate_config(config)
    _require(isinstance(model, dict) and type(model.get('format_version')) is int and model['format_version'] == 1,
             'model.format_version must be 1')
    tables = model.get('tables')
    _require(isinstance(tables, list) and bool(tables), 'model.tables must be a nonempty array')
    groups = config.get('table_groups')
    _require(isinstance(groups, dict) and bool(groups), 'table_groups must map groups to stable table IDs')
    owners = {}
    for group, table_ids in groups.items():
        _package_for(group, config)
        _require(isinstance(table_ids, (list, tuple)) and bool(table_ids), f'{group}: expected nonempty table ID array')
        for table_id in table_ids:
            _text(table_id, 'table ID')
            _require(table_id not in owners, f'Duplicate table ownership: {table_id}')
            owners[table_id] = group
    ids, physical, table_names = [], set(), set()
    for table in tables:
        _require(isinstance(table, dict), 'table: expected an object')
        ids.append(_text(table.get('id'), 'table.id'))
        key = (_text(table.get('schema'), 'table.schema', empty=True), _text(table.get('name'), 'table.name'))
        _require(key not in physical, f'Duplicate schema/table name: {key}')
        physical.add(key)
        _require(key[1] not in table_names,
                 f'{key[1]}: same table name across schemas requires separate generation '
                 'by data source/schema; this generator does not configure schema routing')
        table_names.add(key[1])
    _require(len(ids) == len(set(ids)), 'Duplicate model table IDs')
    _require(set(ids) == set(owners), 'Table ownership coverage differs from model IDs')
    root = Path(project_root).resolve(strict=True)
    directory = output_root(config, root)
    bindings, path_keys = {}, set()
    for table in tables:
        group = owners[table['id']]
        name, po, mapper = _render_table(table, group, config)
        package = _package_for(group, config)
        suffix = package[len(config['base_package']):].lstrip('.')
        package_path = directory.joinpath(*suffix.split('.')) if suffix else directory
        for subdir, filename, content in [('po', name + 'PO.java', po), ('mapper', name + 'Mapper.java', mapper)]:
            path = _inside(root, package_path / subdir / filename, 'generated output')
            key = str(path).casefold()
            _require(key not in path_keys, f'Duplicate output path: {path}')
            path_keys.add(key)
            bindings[path] = content
    return bindings


def _encoded_outputs(bindings):
    """Encode every expected file before any filesystem mutation can begin."""
    encoded = {}
    for path, content in bindings.items():
        _require(isinstance(content, str), f'{path}: expected source text')
        try:
            encoded[path] = content.encode('utf-8')
        except UnicodeError as error:
            raise GenerationError(f'{path}: generated source is not valid UTF-8 text') from error
    return encoded


def inspect_outputs(bindings, scan_root, generated_by, project_root):
    """Return missing/different/stale files without changing any filesystem entry."""
    encoded = _encoded_outputs(bindings)
    root = Path(project_root).resolve(strict=True)
    scan_root = _inside(root, Path(scan_root), 'scan_root')
    marker = _comment(generated_by, 'generated_by')
    missing, different, stale = [], [], []
    for path, content in bindings.items():
        safe = _inside(root, path, 'generated output')
        _require(safe == path, f'Output path changed after rendering: {path}')
        parent = path.parent
        while parent != root:
            _require(not parent.exists() or parent.is_dir(), f'Output parent is not a directory: {parent}')
            parent = parent.parent
        if path.exists():
            _require(path.is_file(), f'Output is not a regular file: {path}')
            if path.read_bytes() != encoded[path]:
                different.append(path)
        else:
            missing.append(path)
    expected_names = {path.name for path in bindings}
    if scan_root.exists():
        _require(scan_root.is_dir(), f'scan_root is not a directory: {scan_root}')
        for directory, _, files in os.walk(scan_root, followlinks=False):
            for filename in sorted(files):
                if not filename.endswith('.java'):
                    continue
                path = Path(directory) / filename
                safe = _inside(root, path, 'existing Java file')
                if path in bindings:
                    continue
                _require(safe.is_file(), f'Existing Java path is not a file: {path}')
                source = safe.read_bytes().decode('utf-8', errors='replace')
                if (marker in source or filename in expected_names
                        or (filename.endswith('Mapper.java')
                            and re.search(r'/\*\* [^\n]*的内部持久化映射。 \*/', source))):
                    stale.append(path)
    return missing, different, sorted(stale)


def write_outputs(bindings, project_root):
    """Create only missing files after caller preflight; never overwrite a file."""
    encoded = _encoded_outputs(bindings)
    root = Path(project_root).resolve(strict=True)
    # Preflight every file again, including raw bytes, before creating the first.
    for path, content in bindings.items():
        _require(_inside(root, path, 'generated output') == path, f'Output path changed: {path}')
        if path.exists():
            _require(path.is_file() and path.read_bytes() == encoded[path],
                     f'Existing generated file differs; review before replacing: {path}')
        parent = path.parent
        while parent != root:
            _require(not parent.exists() or parent.is_dir(), f'Output parent is not a directory: {parent}')
            parent = parent.parent
    for path, content in bindings.items():
        _require(_inside(root, path, 'generated output') == path, f'Output path changed: {path}')
        if path.exists():
            _require(path.is_file() and path.read_bytes() == encoded[path],
                     f'Existing generated file differs; review before replacing: {path}')
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        _require(_inside(root, path, 'generated output') == path, f'Output path changed: {path}')
        with path.open('xb') as output:
            output.write(encoded[path])


def _load_json(path):
    def unique_keys(pairs):
        result = {}
        for key, value in pairs:
            _require(key not in result, f'{path}: duplicate JSON key {key!r}')
            result[key] = value
        return result
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_keys)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root', required=True, type=Path)
    parser.add_argument('--model', required=True, type=Path)
    parser.add_argument('--config', required=True, type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--dry-run', action='store_true', help='Preview only (default)')
    modes.add_argument('--check', action='store_true', help='Check without writing; differences exit 1')
    modes.add_argument('--write', action='store_true', help='Create missing files; conflicts exit 2')
    args = parser.parse_args(argv)
    try:
        root = args.project_root.resolve(strict=True)
        paths = [value if value.is_absolute() else root / value for value in (args.model, args.config)]
        model, config = [_load_json(path) for path in paths]
        bindings = render_outputs(model, config, root)
        protected = {path.resolve() for path in paths} | {Path(__file__).resolve()}
        _require(not protected.intersection(bindings), 'An output would replace an input or the generator')
        missing, different, stale = inspect_outputs(bindings, output_root(config, root), config['generated_by'], root)
        for path in missing:
            print(f'MISSING {path.relative_to(root)}')
        for path in different:
            print(f'CONFLICT {path.relative_to(root)}')
            if not args.check and not args.write:
                current = path.read_bytes().decode('utf-8', errors='replace').splitlines(keepends=True)
                print(''.join(difflib.unified_diff(current, bindings[path].splitlines(keepends=True),
                                                 fromfile=str(path), tofile=str(path) + ' (expected)')), end='')
        for path in stale:
            print(f'STALE {path.relative_to(root)}')
        if args.write and (different or stale):
            raise GenerationError('Existing or stale generated files require review; no files were written')
        if args.write:
            write_outputs(bindings, root)
        mode = 'Generated' if args.write else ('Checked' if args.check else 'Previewed')
        print(f'{mode} {len(bindings) // 2} POs and {len(bindings) // 2} mapper interfaces; '
              f'{len(missing)} missing, {len(different)} different, {len(stale)} stale.')
        return 1 if args.check and (missing or different or stale) else 0
    except (GenerationError, OSError, UnicodeError, json.JSONDecodeError, TypeError, KeyError, RuntimeError) as error:
        print(f'Generation failed: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
