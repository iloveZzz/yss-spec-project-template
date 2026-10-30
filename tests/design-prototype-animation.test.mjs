import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, '.agents/skills/yss-design-system');
const asset = path.join(skill, 'assets/prototype');
const guide = fs.readFileSync(path.join(skill, 'references/shadcn-vue-prototype.md'), 'utf8');
const imports = [...guide.matchAll(/@import "([^"\n]+)";/g)].map(match => match[1]);

test('原型指南的动画样式与锁定依赖一同提供', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(asset, 'package.json'), 'utf8'));
  assert.match(pkg.devDependencies['tw-animate-css'] ?? '', /^\d+\.\d+\.\d+$/);
  assert.ok(imports.includes('tailwindcss'));
  assert.ok(imports.includes('tw-animate-css'));
});

test('原型构建生成固定组件所需的动画样式', t => {
  const configured = process.env.YSS_DESIGN_PROTOTYPE_TOOLCHAIN;
  const instructions = '请将 .agents/skills/yss-design-system/assets/prototype/{package.json,pnpm-lock.yaml} 复制到隔离目录，用 pnpm 10.32.1 执行 pnpm install --frozen-lockfile --ignore-scripts，再设置 YSS_DESIGN_PROTOTYPE_TOOLCHAIN 指向该目录';
  assert.ok(configured, `缺少原型构建工具链。${instructions}`);
  assert.ok(fs.existsSync(configured), `原型工具链目录不存在：${configured}。${instructions}`);
  const toolchain = fs.realpathSync(configured);
  for (const file of ['package.json', 'pnpm-lock.yaml']) {
    const candidate = path.join(toolchain, file);
    assert.ok(fs.existsSync(candidate), `原型工具链缺少 ${file}。${instructions}`);
    assert.ok(fs.readFileSync(candidate).equals(fs.readFileSync(path.join(asset, file))), `原型工具链 ${file} 与当前技能不一致。${instructions}`);
  }
  const installedLock = path.join(toolchain, 'node_modules/.pnpm/lock.yaml');
  assert.ok(fs.existsSync(installedLock), `原型工具链未按 pnpm 安装依赖。${instructions}`);
  assert.ok(fs.readFileSync(installedLock).equals(fs.readFileSync(path.join(asset, 'pnpm-lock.yaml'))), `已安装依赖锁与当前技能不一致。${instructions}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(asset, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    const installed = path.join(toolchain, 'node_modules', name, 'package.json');
    assert.ok(fs.existsSync(installed), `原型工具链缺少依赖 ${name}。${instructions}`);
    assert.equal(JSON.parse(fs.readFileSync(installed, 'utf8')).version, version, `原型工具链依赖 ${name} 版本不一致。${instructions}`);
  }
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-design-animation-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.symlinkSync(path.join(toolchain, 'node_modules'), path.join(project, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  fs.copyFileSync(path.join(asset, 'vite.config.ts'), path.join(project, 'vite.config.ts'));
  fs.writeFileSync(path.join(project, 'package.json'), '{"type":"module"}');
  fs.mkdirSync(path.join(project, 'src'));
  fs.writeFileSync(path.join(project, 'index.html'), '<div class="animate-in animate-out fade-in-0 zoom-in-95 slide-in-from-left"></div><script type="module" src="/src/main.ts"></script>');
  fs.writeFileSync(path.join(project, 'src/main.ts'), "import './style.css';");
  fs.writeFileSync(path.join(project, 'src/style.css'), imports.map(name => `@import "${name}";`).join('\n'));
  const built = spawnSync(process.execPath, [path.join(toolchain, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: project, encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const output = path.join(project, 'dist/assets');
  const css = fs.readdirSync(output).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(output, name), 'utf8')).join('\n');
  for (const name of ['animate-in', 'animate-out', 'fade-in-0', 'zoom-in-95', 'slide-in-from-left']) assert.ok(css.includes(`.${name}`), name);
});
