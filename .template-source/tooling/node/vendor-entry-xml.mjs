import { XMLParser, XMLValidator } from "fast-xml-parser";

function rootDeclaration(source) {
  const match = source.match(/<([A-Za-z_][\w:.-]*)(\s[^>]*)?>/);
  if (!match) throw new TypeError("XML 缺少根元素");
  return { name: match[1], attributes: match[2] ?? "" };
}

export function parseXmlDocument(source, { expectedRoot, expectedNamespace } = {}) {
  if (typeof source !== "string") throw new TypeError("XML 输入必须是 UTF-8 字符串");
  if (/<!DOCTYPE/i.test(source)) throw new TypeError("XML 不允许 DOCTYPE");
  const validation = XMLValidator.validate(source);
  if (validation !== true) throw new TypeError(`XML 无法解析: ${validation.err.msg}`);
  const root = rootDeclaration(source);
  if (expectedRoot && root.name.split(":").at(-1) !== expectedRoot) throw new TypeError(`XML 根元素必须是 ${expectedRoot}`);
  if (expectedNamespace) {
    const namespace = root.attributes.match(/\sxmlns\s*=\s*["']([^"']+)["']/)?.[1];
    if (namespace !== expectedNamespace) throw new TypeError(`XML 默认命名空间必须是 ${expectedNamespace}`);
  }
  return new XMLParser({
    allowBooleanAttributes: false,
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
    processEntities: false,
    removeNSPrefix: false,
    trimValues: false
  }).parse(source);
}
