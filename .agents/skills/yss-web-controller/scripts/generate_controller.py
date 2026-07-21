#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import re
import sys
from string import Template

def to_camel_case(snake_str):
    components = snake_str.lower().split('_')
    return "".join(x.title() for x in components)

def to_lower_camel_case(snake_str):
    camel = to_camel_case(snake_str)
    if not camel:
        return ""
    return camel[0].lower() + camel[1:]

def to_kebab_case(snake_str):
    return snake_str.lower().replace('_', '-')

def package_to_path(package_name):
    return package_name.replace(".", os.sep)

def ensure_subdir(root_path, subdir_name):
    if os.path.basename(os.path.normpath(root_path)) == subdir_name:
        return root_path
    return os.path.join(root_path, subdir_name)

TYPE_MAPPING = {
    "bigint": "Long",
    "int": "Integer",
    "integer": "Integer",
    "smallint": "Integer",
    "tinyint": "Integer",
    "number": "Long",
    "numeric": "BigDecimal",
    "decimal": "BigDecimal",
    "float": "Float",
    "double": "Double",
    "real": "Float",
    "varchar": "String",
    "varchar2": "String",
    "nvarchar2": "String",
    "char": "String",
    "nchar": "String",
    "text": "String",
    "clob": "String",
    "nclob": "String",
    "date": "LocalDateTime",
    "datetime": "LocalDateTime",
    "timestamp": "LocalDateTime",
    "timestamp with time zone": "LocalDateTime",
    "boolean": "Boolean",
    "bool": "Boolean",
    "bit": "Boolean",
    "json": "String",
    "jsonb": "String",
    "uuid": "String"
}

def get_java_type(sql_type):
    sql_type = sql_type.lower()
    # Handle types like varchar(255)
    base_type = re.split(r'\(', sql_type)[0]
    return TYPE_MAPPING.get(base_type, "String")

def generate_fields(columns, skip_pk=False, is_cmd=False, skip_audit=True):
    fields = []
    for col in columns:
        col_name = col["name"]
        if skip_pk and col.get("primary"):
            continue

        # Skip audit columns if they are standard
        if skip_audit and col_name.lower() in ["create_time", "update_time", "create_by", "update_by", "deleted", "version"]:
            continue

        java_type = get_java_type(col["sql_type"])
        java_name = to_lower_camel_case(col_name)
        comment = col.get("comment", "")

        field_str = ""
        if comment:
            field_str += f"    /**\n     * {comment}\n     */\n"

        if is_cmd:
            if not col.get("nullable"):
                if java_type == "String":
                    field_str += f"    @NotBlank(message = \"{comment or java_name}不能为空\")\n"
                else:
                    field_str += f"    @NotNull(message = \"{comment or java_name}不能为空\")\n"

        field_str += f"    private {java_type} {java_name};"
        fields.append(field_str)

    return "\n\n".join(fields)

def main():
    parser = argparse.ArgumentParser(description="Generate YSS Web Controller and DTOs")
    parser.add_argument("--metadata-file", required=True, help="Path to metadata.json")
    parser.add_argument("--base-package", required=True, help="Base package name")
    parser.add_argument("--module-name", required=True, help="Module name")
    parser.add_argument("--output-dir", default="./output", help="Output directory")
    parser.add_argument("--domain-project-dir", help="Domain module root directory")
    parser.add_argument("--web-project-dir", help="Web module root directory")
    parser.add_argument("--domain-output-dir", help="Domain module output directory (for DTOs/VOs)")
    parser.add_argument("--web-output-dir", help="Web module output directory (for Controller)")
    parser.add_argument("--author", default="System", help="Author name")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    parser.add_argument("--domain-segment", required=True, help="Domain segment package name")

    args = parser.parse_args()

    if not os.path.exists(args.metadata_file):
        print(f"Error: Metadata file not found: {args.metadata_file}")
        sys.exit(1)

    try:
        with open(args.metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    except Exception as e:
        print(f"Error reading metadata file: {e}")
        sys.exit(1)

    tables = metadata.get("tables", [])
    if not tables:
        print("Warning: No tables found in metadata.")
        return

    script_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(script_dir, "../assets/templates")

    def load_tpl(name):
        path = os.path.join(templates_dir, name)
        if not os.path.exists(path):
            print(f"Warning: Template not found: {path}")
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()

    controller_tpl = load_tpl("Controller.java.template")
    web_convertor_tpl = load_tpl("WebConvertor.java.template")
    vo_tpl = load_tpl("domain/vo/VO.java.template")
    add_cmd_tpl = load_tpl("domain/dto/cmd/AddCmd.java.template")
    update_cmd_tpl = load_tpl("domain/dto/cmd/UpdateCmd.java.template")
    page_query_tpl = load_tpl("domain/dto/query/PageQuery.java.template")
    package_path = package_to_path(args.base_package)

    if args.domain_output_dir:
        domain_base_root = args.domain_output_dir
    elif args.domain_project_dir:
        domain_base_root = os.path.join(args.domain_project_dir, "src", "main", "java", package_path)
    else:
        domain_base_root = os.path.join(args.output_dir, package_path)

    if args.web_output_dir:
        web_base_root = args.web_output_dir
    elif args.web_project_dir:
        web_base_root = os.path.join(args.web_project_dir, "src", "main", "java", package_path)
    else:
        web_base_root = os.path.join(args.output_dir, package_path)

    domain_root = ensure_subdir(domain_base_root, "client")
    web_root = ensure_subdir(web_base_root, "rest")

    for table in tables:
        table_name = table["table_name"]
        clean_name = to_camel_case(table_name)

        domain_class = clean_name
        domain_var = to_lower_camel_case(table_name)
        domain_desc = table.get("table_comment") or domain_class
        domain_desc = domain_desc.strip().replace('\n', ' ')
        domain_pkg_name = args.domain_segment
        domain_url_path = to_kebab_case(table_name)

        gateway_pkg = f"{args.base_package}.domain.{domain_pkg_name}.gateway"
        domain_model_pkg = f"{args.base_package}.domain.{domain_pkg_name}.model"
        web_convertor_pkg = f"{args.base_package}.rest.convertor"

        # Field generation for DTOs
        columns = table.get("columns", [])
        field_declarations_vo = generate_fields(columns, skip_audit=False)
        field_declarations_add = generate_fields(columns, skip_pk=True, is_cmd=True, skip_audit=True)
        field_declarations_update = generate_fields(columns, skip_pk=False, is_cmd=True, skip_audit=True)
        field_declarations_query = generate_fields(columns, skip_audit=True) # Query usually has all fields as optional filters

        use_gateway = True
        vo_class = f"{domain_class}VO"
        add_cmd_class = f"{domain_class}AddCmd"
        update_cmd_class = f"{domain_class}UpdateCmd"
        query_class = f"{domain_class}Page"
        domain_import = f"import {domain_model_pkg}.{domain_class};"

        query_call = f"{domain_var}Gateway.page{domain_class}(query)"
        detail_call = f"{domain_var}Gateway.get{domain_class}ById(id).orElse(null)"
        add_call = f"{domain_var}Gateway.add{domain_class}(CONVERTOR.toDomain(cmd))"
        update_call = f"{domain_var}Gateway.update{domain_class}(CONVERTOR.toDomain(cmd))"
        delete_call = f"{domain_var}Gateway.delete{domain_class}(id)"

        gateway_import = f"import {gateway_pkg}.{domain_class}Gateway;" if use_gateway else ""
        dto_imports = "\n".join([
            f"import {args.base_package}.client.dto.cmd.{domain_class}AddCmd;",
            f"import {args.base_package}.client.dto.cmd.{domain_class}UpdateCmd;",
            f"import {args.base_package}.client.dto.query.{domain_class}Page;",
            f"import {args.base_package}.client.vo.{domain_class}VO;"
        ])
        gateway_field = f"private final {domain_class}Gateway {domain_var}Gateway;" if use_gateway else ""
        web_convertor_class = f"{domain_class}WebConvertor"
        web_convertor_import = f"import {web_convertor_pkg}.{web_convertor_class};"

        ctx = {
            "base_package": args.base_package,
            "module_name": args.module_name,
            "domain_class": domain_class,
            "domain_var": domain_var,
            "domain_desc": domain_desc,
            "domain_url_path": domain_url_path,
            "domain_pkg_name": domain_pkg_name,
            "author": args.author,
            "dto_imports": dto_imports,
            "gateway_import": gateway_import,
            "domain_import": domain_import,
            "web_convertor_import": web_convertor_import,
            "web_convertor_class": web_convertor_class,
            "gateway_pkg": gateway_pkg,
            "gateway_field": gateway_field,
            "query_call": query_call,
            "detail_call": detail_call,
            "add_call": add_call,
            "update_call": update_call,
            "delete_call": delete_call,
            "vo_class": vo_class,
            "add_cmd_class": add_cmd_class,
            "update_cmd_class": update_cmd_class,
            "query_class": query_class,
            "field_declarations": "" # placeholder
        }

        def write_file(path, content):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            if not os.path.exists(path) or args.force:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Generated: {path}")
            else:
                print(f"Skipped (exists): {path}")

        # 1. Controller (Web Layer)
        write_file(os.path.join(web_root, f"{domain_class}Controller.java"), Template(controller_tpl).substitute(ctx))
        write_file(
            os.path.join(web_root, "convertor", f"{web_convertor_class}.java"),
            Template(web_convertor_tpl).substitute(ctx)
        )

        # 2. DTOs & VO (Domain Layer)
        ctx["field_declarations"] = field_declarations_vo
        write_file(os.path.join(domain_root, "vo", f"{domain_class}VO.java"), Template(vo_tpl).substitute(ctx))

        ctx["field_declarations"] = field_declarations_add
        write_file(os.path.join(domain_root, "dto/cmd", f"{domain_class}AddCmd.java"), Template(add_cmd_tpl).substitute(ctx))

        ctx["field_declarations"] = field_declarations_update
        write_file(os.path.join(domain_root, "dto/cmd", f"{domain_class}UpdateCmd.java"), Template(update_cmd_tpl).substitute(ctx))

        ctx["field_declarations"] = field_declarations_query
        write_file(os.path.join(domain_root, "dto/query", f"{domain_class}Page.java"), Template(page_query_tpl).substitute(ctx))

if __name__ == "__main__":
    main()
