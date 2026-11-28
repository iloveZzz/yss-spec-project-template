"""将固定版 shadcn-vue 源码和所选组件转换为独立的 Vue / A2UI 目录。"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import shutil
import sys
from zipfile import ZipFile


ASSETS = Path(__file__).resolve().parents[1] / "assets/shadcn"
COMMON = "https://a2ui.org/specification/v1_0/common_types.json#/$defs/"
CATALOG_ID = "urn:yss:a2ui:shadcn-vue:v1"
MODEL_PROPS = ["modelValue", "open", "pressed", "checked", "page", "expanded", "collapsed", "step", "value"]
EVENTS = ["click", "select", "submit", "change", "complete", "close"]


def json_file(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def dependency_closure(names, groups):
    found = set()
    pending = list(names)
    while pending:
        name = pending.pop()
        if name not in groups:
            raise ValueError(f"未登记组件组 {name}")
        if name not in found:
            found.add(name)
            pending.extend(groups[name]["requires"])
    return sorted(found)


def wire_name(group, component):
    return "UiSonner" if group == "sonner" and component == "Toaster" else "Ui" + component


def exported_components(group):
    return [*group["exports"], *group.get("scrmExports", {})]


def adapt_source(text, group, filename):
    # 私有 ui/ 子树内互引，避免与宿主现有或定制过的同名组件混用。
    def relative(match):
        target = posixpath.relpath(match[2], start=group)
        if not target.startswith("."):
            target = "./" + target
        return match[1] + target + match[1]
    text = re.sub(r"""(["'])@/registry/new-york-v4/ui/([^"']+)\1""", relative, text)
    if group == "toast":
        text = text.replace('"lucide-vue-next"', '"@lucide/vue"')
    if group == "toast" and filename == "use-toast.ts":
        # 数组每次整体替换；避免对 VNode / 组件类型做深层响应式展开。
        text = text.replace("computed, ref", "computed, shallowReactive")
        text = text.replace("ref<State>(", "shallowReactive<State>(").replace("state.value.toasts", "state.toasts")
    if group == "native-select" and filename == "NativeSelect.vue":
        text = text.replace('"update:modelValue": AcceptableValue\n', '"update:modelValue": [value: AcceptableValue | AcceptableValue[]]\n')
    if group == "carousel" and filename == "CarouselContent.vue":
        # 函数 ref 显式登记和释放 Embla 的视口元素，也可被严格的 vue-tsc 识别。
        text = text.replace("</script>", """function setViewport(el: unknown) {
  carouselRef.value = el instanceof HTMLElement ? el : undefined
}
</script>""").replace('ref="carouselRef"', ':ref="setViewport"')
    return text


def catalog(names):
    fields = {name: {"$ref": COMMON + kind} for name, kind in [
        ("children", "ChildList"), ("text", "DynamicString"), ("model", "DataBinding"),
        ("options", "DataBinding"), ("action", "Action"),
    ]}
    for name, values in [("event", EVENTS), ("modelProp", MODEL_PROPS), ("codec", ["date", "dateRange"])]:
        fields[name] = {"type": "string", "enum": values}
    components = {
        n: {"type": "object", "properties": {"component": {"const": n}, **fields}, "required": ["component"]}
        for n in names
    }
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": CATALOG_ID,
        "catalogId": CATALOG_ID, "protocolVersion": "1.0", "title": "shadcn-vue 原型组件",
        "components": components,
        "$defs": {"anyComponent": {"oneOf": [{"$ref": "#/components/" + n} for n in names],
                                  "discriminator": {"propertyName": "component"}},
                  "anyFunction": {"not": {}}},
    }


def generate(out, names, inventory, archive, examples):
    imports = ["import type { Component } from 'vue'"]
    views = []
    packages = {"@internationalized/date"}
    groups = inventory["groups"]
    for name in names:
        group = groups[name]
        folder = out / "ui" / name
        folder.mkdir(parents=True)
        if group.get("recipe"):
            component, = group["exports"]
            shutil.copyfile(ASSETS / "recipes" / (component + ".vue"), folder / (component + ".vue"))
            (folder / "index.ts").write_text(f"export {{ default as {component} }} from './{component}.vue'\n", encoding="utf-8")
        else:
            for route in archive.namelist():
                if route.startswith(f"ui/{name}/"):
                    text = adapt_source(archive.read(route).decode("utf-8"), name, Path(route).name)
                    (folder / Path(route).name).write_text(text, encoding="utf-8")
        if extras := group.get("scrmExports"):
            with (folder / "index.ts").open("a", encoding="utf-8") as index:
                for component, module in extras.items():
                    symbol = component
                    if module.startswith("./"):
                        filename = component + ".vue"
                        shutil.copyfile(ASSETS / "recipes" / filename, folder / filename)
                        symbol = "default as " + component
                    index.write(f"\nexport {{ {symbol} }} from '{module}'\n")
        packages.update(group["packages"])
        alias = "group" + "".join(word.title() for word in name.split("-"))
        imports.append(f"import * as {alias} from './ui/{name}'")
        if name == "sonner":
            imports.append("import 'vue-sonner/style.css'")
        for component in exported_components(group):
            wire = wire_name(name, component)
            views.append((wire, f"{alias}.{component}"))
        for component in group.get("helpers", []):
            shutil.copyfile(ASSETS / "recipes" / (component + ".vue"), folder / (component + ".vue"))
            imports.append(f"import {component} from './ui/{name}/{component}.vue'")
            views.append(("Ui" + component, component))
    keys = [wire for wire, target in views]
    if len(set(keys)) != len(keys):
        raise ValueError("目录存在重名节点")
    registry = [*imports, "", "export const views: Record<string, Component> = {"]
    registry.extend(f"  {wire}: {target}," for wire, target in views)
    (out / "registry.ts").write_text("\n".join([*registry, "}", ""]), encoding="utf-8")
    shutil.copyfile(ASSETS / "extension.ts", out / "extension.ts")
    (out / "LICENSE").write_bytes(archive.read("LICENSE"))
    json_file(out / "catalog.json", catalog(keys))
    deps = {name: inventory["packages"][name] for name in sorted(packages)}
    json_file(out / "dependencies.json", deps)
    if examples:
        json_file(out / "examples.json", examples)
        shutil.copyfile(ASSETS / "Preview.vue", out / "Preview.vue")
    print(f"{len(names)} 组，{len(views)} 个 Vue 组件。输出目录 {out}")
    print("本次选中组件的包版本：", " ".join(f"{k}@{v}" for k, v in deps.items()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="新目录，约定为原型 src/shadcn")
    parser.add_argument("--examples", action="store_true", help="同时生成所选组件组的可操作示例与预览入口")
    parser.add_argument("groups", nargs="+", help="目录组名，或 all")
    args = parser.parse_args()
    inventory = json.loads((ASSETS / "inventory.json").read_text(encoding="utf-8"))
    groups = inventory["groups"]
    selected = sorted(groups) if args.groups == ["all"] else args.groups
    names = dependency_closure(selected, groups)
    examples = {}
    if args.examples:
        samples = json.loads((ASSETS / "examples.json").read_text(encoding="utf-8"))
        examples = {g: samples[g] for g in selected}
        owners = {wire_name(g, component): g for g, spec in groups.items()
                  for component in [*exported_components(spec), *spec.get("helpers", [])]}
        preview_groups = {owners[n["component"]] for sample in examples.values() for n in sample["components"]}
        names = dependency_closure([*names, *preview_groups, "native-select"], groups)
    source = ASSETS / "upstream.zip"
    if hashlib.sha256(source.read_bytes()).hexdigest() != inventory["archiveSha256"]:
        raise ValueError("组件快照与登记摘要不符")
    out = args.output
    out.parent.mkdir(parents=True, exist_ok=True)
    os.mkdir(out)
    try:
        with ZipFile(source) as archive:
            generate(out, names, inventory, archive, examples)
    except BaseException:
        shutil.rmtree(out)
        raise


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        sys.exit(str(error))
