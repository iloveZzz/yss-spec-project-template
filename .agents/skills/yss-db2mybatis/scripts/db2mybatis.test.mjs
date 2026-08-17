import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const skillRoot = path.resolve(import.meta.dirname, '..');
const script = path.join(skillRoot, 'scripts', 'db2mybatis.mjs');
const run = (args, cwd = process.cwd()) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'yss-db2mybatis-node-'));
const scaffoldArgs = (root, metadata, extra = []) => ['scaffold', '--skill-root', skillRoot, '--metadata-file', metadata, '--base-package', 'com.yss.demo', '--domain-segment', 'example', '--domain-java-root', path.join(root, 'domain'), '--infra-java-root', path.join(root, 'infra'), ...extra];

test('DDL 转 metadata，并保留主键、类型与注释', () => {
  const root = temp(); const metadata = path.join(root, 'metadata.json');
  const result = run(['ddl2metadata', '--ddl-sql', "CREATE TABLE t_order (id bigint NOT NULL COMMENT '主键', amount decimal(10,2), PRIMARY KEY (id)) COMMENT='订单';", '--db-type', 'mysql', '--database', 'demo', '--output', metadata]);
  assert.equal(result.status, 0, result.stderr); const parsed = JSON.parse(fs.readFileSync(metadata, 'utf8'));
  assert.equal(parsed.tables[0].table_name, 't_order'); assert.deepEqual(parsed.tables[0].primary_keys, ['id']); assert.equal(parsed.tables[0].columns[1].sql_type, 'decimal(10,2)');
});

test('scaffold dry-run 不写文件，正常生成拒绝既有目标', () => {
  const root = temp(); const metadata = path.join(root, 'metadata.json');
  fs.writeFileSync(metadata, JSON.stringify({ tables: [{ table_name: 't_order', table_comment: '订单', primary_keys: ['id'], columns: [{ name: 'id', sql_type: 'bigint', primary: true, nullable: false, auto_increment: false }], indexes: [], foreign_keys: [] }] }));
  const dryRun = run(scaffoldArgs(root, metadata, ['--dry-run'])); assert.equal(dryRun.status, 0, dryRun.stderr); assert.match(dryRun.stdout, /planned:/); assert.equal(fs.existsSync(path.join(root, 'domain')), false);
  const generated = run(scaffoldArgs(root, metadata)); assert.equal(generated.status, 0, generated.stderr); const again = run(scaffoldArgs(root, metadata)); assert.equal(again.status, 2); assert.match(again.stderr, /文件已存在/);
});

test('非法参数和缺失数据库驱动均以退出码 2 失败', () => {
  const invalid = run(['ddl2metadata', '--output', path.join(temp(), 'out.json')]); assert.equal(invalid.status, 2); assert.match(invalid.stderr, /请提供 --ddl-file 或 --ddl-sql/);
  const unknown = run(['ddl2metadata', '--ddl-sql', 'CREATE TABLE t_x (id bigint)', '--output', path.join(temp(), 'out.json'), '--unexpected', 'x']); assert.equal(unknown.status, 2); assert.match(unknown.stderr, /未知参数/);
  const missing = run(['extract', '--db-type', 'mysql', '--host', '127.0.0.1', '--port', '3306', '--user', 'u', '--password', 'p', '--database', 'd', '--output', path.join(temp(), 'out.json')], temp()); assert.equal(missing.status, 2); assert.match(missing.stderr, /YSS_DB2MYBATIS_DRIVER_ROOT/);
});
