import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { parseXmlDocument } from "../vendor/xml.mjs";
import { runCommand } from "./command-runner.mjs";
import { assertJavaPlatform, platformDigest } from "./backend-platform.mjs";

const array = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
const fail = message => { throw new TypeError(`platform-dependencies: ${message}`); };
const gav = item => `${item.groupId}:${item.artifactId}`;
export async function platformEvidenceArtifacts(evidenceDir) {
  const artifacts = [];
  for (const entry of await readdir(evidenceDir, { withFileTypes: true })) {
    if (entry.isFile() && (entry.name.endsWith('.log') || ['effective-pom.xml', 'boot-bom-effective.xml', 'dependency-trees.json', 'platform-tests.xml'].includes(entry.name))) {
      artifacts.push({ ref: entry.name, digest: platformDigest(await readFile(path.join(evidenceDir, entry.name))) });
    }
  }
  return artifacts.sort((a, b) => a.ref.localeCompare(b.ref));
}
export function checkPlatformTests(source, capabilities = []) {
  const suite = parseXmlDocument(source).testsuite;
  const cases = array(suite?.testcase);
  const required = ['httpJsonRoundTrip', 'httpValidationRejectsBlank', 'validationAndJsonAutoConfiguration', 'mybatisCanMapVerificationQuery', ...(capabilities.includes('feign-client') ? ['feignCanDecodeJson'] : [])];
  if (!suite || required.some(name => !cases.some(item => item['@_name'] === name && !['failure', 'error', 'skipped'].some(key => Object.hasOwn(item, key))))) fail('integration tests missing, failed or skipped');
  return { status: 'passed', test_count: cases.length };
}
export async function verifyPlatformTests(projectRoot, evidenceDir, manifest, startedAt) {
  try {
    const module = `${manifest.project_name}-${manifest.architecture_family === 'domain-driven' ? 'bootstrap' : 'server'}`;
    const reportPath = path.join(projectRoot, module, 'target/surefire-reports', `TEST-${manifest.base_package}.PlatformIntegrationTest.xml`);
    if (!startedAt || (await stat(reportPath)).mtimeMs < startedAt) fail("stale integration test report");
    const source = await readFile(reportPath, 'utf8');
    await writeFile(path.join(evidenceDir, 'platform-tests.xml'), source);
    return checkPlatformTests(source, manifest.module_profile?.requested_capabilities);
  } catch (error) { return { status: 'failed', error: error.message }; }
}
export function checkPlatformDependencies(profile, effectivePom, dependencyTrees, { bootBom, mainArtifact, components = {} } = {}) {
  const xml = parseXmlDocument(effectivePom);
  const projects = array(xml.projects?.project ?? xml.project);
  if (!projects.length || !dependencyTrees.length) fail("missing effective POM or dependency tree");
  const main = dependencyTrees.filter(item => gav(item) === mainArtifact);
  if (main.length !== 1) fail("missing or duplicate startup-module runtime tree");
  const nodes = [];
  const visit = item => { if (!["compile", "runtime"].includes(item.scope ?? "compile")) return; nodes.push(item); array(item.children).forEach(visit); };
  array(main[0].children).forEach(visit);
  const bom = parseXmlDocument(bootBom ?? "<missing/>").project;
  if (bom?.groupId !== "org.springframework.boot" || bom.artifactId !== "spring-boot-dependencies" || bom.version !== profile.spring_boot_version) fail("wrong or missing independent Boot BOM");
  const managed = new Map(array(bom.dependencyManagement?.dependencies?.dependency).map(item => [gav(item), item.version]));
  if (!managed.size) fail("empty Boot BOM dependency management");
  for (const item of nodes) {
    const expected = managed.get(gav(item)) ?? components[gav(item)];
    if (/^(com\.baomidou|org\.springdoc|org\.springframework\.cloud|com\.yss\.cloud)$/.test(item.groupId) && !expected) fail(`missing component recipe: ${gav(item)}`);
    if (expected && String(item.version) !== String(expected)) fail(`resolved version differs from BOM/recipe: ${gav(item)}`);
    if (/^(org\.springframework(?:\.boot)?$|org\.apache\.tomcat\.embed|jakarta\.(servlet|validation)|javax\.(servlet|validation)|(?:tools|com\.fasterxml)\.jackson|org\.slf4j|ch\.qos\.logback)/.test(item.groupId) && !expected) fail(`unmanaged platform runtime artifact: ${gav(item)}`);
  }
  const requireArtifact = (group, artifact, match) => {
    const hits = nodes.filter(item => gav(item) === `${group}:${artifact}`);
    if (!hits.length || hits.some(item => !match(String(item.version)))) fail(`${group}:${artifact} absent or incompatible`);
  };
  const line = (version, prefix) => version === prefix || version.startsWith(`${prefix}.`);
  requireArtifact("org.springframework.boot", profile.web_starter, version => version === profile.spring_boot_version);
  requireArtifact("org.springframework", "spring-webmvc", version => line(version, profile.framework_line));
  requireArtifact("org.apache.tomcat.embed", "tomcat-embed-core", version => line(version, profile.tomcat_line));
  requireArtifact("com.baomidou", profile.mybatis_plus_starter, version => /^3\./.test(version));
  requireArtifact(profile.jackson_major === 3 ? "tools.jackson.core" : "com.fasterxml.jackson.core", "jackson-databind", version => version.startsWith(`${profile.jackson_major}.`));
  for (const item of nodes) {
    if (item.groupId === "org.springframework.boot" && String(item.version) !== profile.spring_boot_version) fail(`Boot dependency mismatch: ${gav(item)}`);
    if (item.groupId === "org.springframework" && !line(String(item.version), profile.framework_line)) fail(`Spring dependency mismatch: ${gav(item)}`);
    if (item.groupId === "org.apache.tomcat.embed" && !line(String(item.version), profile.tomcat_line)) fail(`Tomcat dependency mismatch: ${gav(item)}`);
    if (item.groupId === "org.springframework.cloud" && /openfeign/.test(item.artifactId) && !line(String(item.version), profile.openfeign_line)) fail("OpenFeign line mismatch");
    if (item.groupId === "org.springdoc" && !String(item.version).startsWith(`${profile.springdoc_major}.`)) fail("springdoc major mismatch");
    if (profile.validation_namespace === "jakarta" && ["javax.servlet", "javax.validation"].includes(item.groupId)) fail(`legacy Java EE API: ${gav(item)}`);
    if (profile.validation_namespace === "jakarta" && item.groupId === "jakarta.validation" && !String(item.version).startsWith("3.")) fail("Jakarta Validation version mismatch");
    if (item.groupId === "jakarta.servlet" && !line(String(item.version), profile.servlet_version)) fail("Servlet API version mismatch");
    if (profile.validation_namespace === "javax" && item.groupId === "jakarta.validation" && !String(item.version).startsWith("2.")) fail("Boot 2 requires javax Validation classes");
    if (profile.validation_namespace === "javax" && item.groupId === "javax.servlet" && !String(item.version).startsWith("4.")) fail("Boot 2 Servlet mismatch");
    if (item.groupId === "com.baomidou" && /spring-boot[34]-starter|mybatis-plus-boot-starter/.test(item.artifactId) && item.artifactId !== profile.mybatis_plus_starter) fail("mixed MyBatis-Plus starters");
  }
  let bootPluginFound = false;
  for (const project of projects) {
    const target = project.properties?.["maven.compiler.release"] ?? project.properties?.["maven.compiler.target"] ?? project.properties?.["java.version"];
    if (![String(profile.java_version), ...(profile.java_version === 8 ? ["1.8"] : [])].includes(String(target))) fail("effective Java target mismatch");
    for (const plugin of array(project.build?.plugins?.plugin)) if (gav(plugin) === "org.springframework.boot:spring-boot-maven-plugin") {
      bootPluginFound = true;
      if (plugin.version !== profile.spring_boot_version) fail("Boot plugin version mismatch");
    }
  }
  if (!bootPluginFound) fail("Boot plugin absent");
  return { status: "passed", runtime_artifacts: nodes, artifact_count: nodes.length, effective_pom_digest: platformDigest(effectivePom), dependency_tree_digest: platformDigest(dependencyTrees) };
}

export async function platformCommand(projectRoot, evidenceDir, label, args, environment, options = {}) {
  const stdout_ref = path.join(evidenceDir, `${label}.stdout.log`);
  const stderr_ref = path.join(evidenceDir, `${label}.stderr.log`);
  const executed_at = new Date().toISOString();
  const start = Date.now();
  const result = await runCommand(path.join(projectRoot, "mvnw"), args, { cwd: projectRoot, env: environment, timeoutMs: options.timeoutMs || 180000, signal: options.signal, stdoutFile: stdout_ref, stderrFile: stderr_ref, secrets: [environment.MAVEN_REPO_USERNAME, environment.MAVEN_REPO_PASSWORD], progress: true });
  return { command: `./mvnw ${args.join(" ")}`, exit_code: result.status, termination: result.termination, executed_at, duration_ms: Date.now() - start, stdout_ref, stderr_ref, stdout: result.stdout, stderr: result.stderr };
}
export async function verifyPlatformDependencies(projectRoot, evidenceDir, profile, environment, options = {}) {
  const commands = [];
  const run = async (label, args) => {
    const result = await platformCommand(projectRoot, evidenceDir, label, args, environment, options);
    const { stdout, stderr, ...record } = result;
    commands.push(record);
    if (result.exit_code !== 0) fail(`${label} failed; see ${record.stderr_ref}`);
    return result;
  };
  try {
    const java = await run("platform-java", ["-version"]);
    assertJavaPlatform(`${java.stdout}\n${java.stderr}`, { java_version: profile.java_version });
    const pom = path.join(evidenceDir, "effective-pom.xml");
    const bootBom = path.join(evidenceDir, "boot-bom-effective.xml");
    await run("platform-boot-bom", ["org.apache.maven.plugins:maven-help-plugin:3.5.1:effective-pom", `-Dartifact=org.springframework.boot:spring-boot-dependencies:${profile.spring_boot_version}`, `-Doutput=${bootBom}`]);
    await run("platform-effective-pom", ["org.apache.maven.plugins:maven-help-plugin:3.5.1:effective-pom", `-Doutput=${pom}`]);
    await run("platform-dependency-tree", ["org.apache.maven.plugins:maven-dependency-plugin:3.8.1:tree", "-DoutputType=json", "-DoutputFile=.yss/platform-dependencies.json"]);
    const trees = [];
    const visited = new Set();
    for (const directory of [projectRoot, ...(await readdir(projectRoot, { withFileTypes: true })).filter(item => item.isDirectory() && item.name.startsWith(`${path.basename(projectRoot)}-`)).map(item => path.join(projectRoot, item.name))]) {
      const candidates = [directory];
      // DDD adapter contains the nested web module.
      for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isDirectory() && entry.name.startsWith(`${path.basename(projectRoot)}-`)) candidates.push(path.join(directory, entry.name));
      for (const candidate of candidates) {
        if (visited.has(candidate)) continue;
        visited.add(candidate);
        try { trees.push(JSON.parse(await readFile(path.join(candidate, ".yss/platform-dependencies.json"), "utf8"))); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      }
    }
    await writeFile(path.join(evidenceDir, "dependency-trees.json"), JSON.stringify(trees, null, 2));
    return { ...checkPlatformDependencies(profile, await readFile(pom, "utf8"), trees, { bootBom: await readFile(bootBom, "utf8"), mainArtifact: `${options.manifest.maven_coordinates.group_id}:${options.manifest.project_name}-${options.manifest.architecture_family === "domain-driven" ? "bootstrap" : "server"}`, components: options.components }), commands };
  } catch (error) { return { status: "failed", error: error.message, commands }; }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
export function checkRuntimeArchive(entries, artifacts, { providedLombokVersion } = {}) {
  if (!Array.isArray(artifacts) || !artifacts.length) fail("missing runtime artifact inventory");
  const names = new Set(entries.split(/\r?\n/));
  const expected = new Set();
  for (const item of artifacts.filter(item => (item.type ?? "jar") === "jar")) {
    const name = `BOOT-INF/lib/${item.artifactId}-${item.version}${item.classifier ? `-${item.classifier}` : ""}.jar`;
    expected.add(name);
    if (!names.has(name)) fail(`runtime jar missing ${name}`);
  }
  const bootVersion = artifacts.find(item => item.groupId === "org.springframework.boot")?.version;
  // Boot's repackage goal injects its matching jarmode helper outside the dependency tree.
  for (const name of names) if (name.startsWith("BOOT-INF/lib/") && name.endsWith(".jar") && !expected.has(name)
    && name !== `BOOT-INF/lib/lombok-${providedLombokVersion}.jar`
    && !["tools", "layertools"].some(kind => name === `BOOT-INF/lib/spring-boot-jarmode-${kind}-${bootVersion}.jar`)) fail(`unexpected packaged runtime jar: ${name}`);
  return { status: "passed" };
}
async function inspectRuntimeJar(jar, evidenceDir, environment, options) {
  const tool = environment.JAVA_HOME ? path.join(environment.JAVA_HOME, "bin/jar") : "jar";
  const stdoutFile = path.join(evidenceDir, "runtime-jar-entries.log");
  const stderrFile = path.join(evidenceDir, "runtime-jar.stderr.log");
  const result = await runCommand(tool, ["tf", jar], { env: environment, timeoutMs: 30000, stdoutFile, stderrFile });
  if (result.status !== 0) fail("cannot inspect packaged runtime jar");
  return checkRuntimeArchive(result.stdout, options.runtimeArtifacts, options);
}
export async function verifyPlatformStartup(projectRoot, evidenceDir, manifest, environment, options = {}) {
  const runtimeModule = `${manifest.project_name}-${manifest.architecture_family === "domain-driven" ? "bootstrap" : "server"}`;
  const runtimeTarget = path.join(projectRoot, runtimeModule, "target");
  try {
    const packaged = (await readdir(runtimeTarget)).filter(name => name.endsWith(".jar") && !/-sources|-javadoc|-tests/.test(name));
    if (packaged.length !== 1) fail("expected exactly one production runtime jar");
    await inspectRuntimeJar(path.join(runtimeTarget, packaged[0]), evidenceDir, environment, options);
  } catch (error) { return { status: "failed", error: error.message, commands: [] }; }
  const packaging = await platformCommand(projectRoot, evidenceDir, "platform-local-package", ["-Pscaffold-local", "package", "-DskipTests"], environment, options);
  const { stdout: ignoredOut, stderr: ignoredErr, ...command } = packaging;
  if (packaging.exit_code !== 0) return { status: "failed", error: "local packaging failed", commands: [command] };
  const module = `${manifest.project_name}-${manifest.architecture_family === "domain-driven" ? "bootstrap" : "server"}`;
  const target = path.join(projectRoot, module, "target");
  const jars = (await readdir(target)).filter(name => name.endsWith(".jar") && !/-sources|-javadoc|-tests/.test(name));
  if (jars.length !== 1) return { status: "failed", error: "expected exactly one executable jar", commands: [command] };
  const port = await freePort();
  const java = environment.JAVA_HOME ? path.join(environment.JAVA_HOME, "bin/java") : "java";
  const args = ["-jar", path.join(target, jars[0]), "--spring.profiles.active=scaffold-local", "--server.address=127.0.0.1", `--server.port=${port}`];
  const processStartedAt = new Date().toISOString();
  let output = "", errors = "", started = false, exited = false;
  const child = spawn(java, args, { cwd: projectRoot, env: environment, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", data => { output += data; if (/Started .* in /.test(output)) started = true; });
  child.stderr.on("data", data => { errors += data; });
  child.on("error", error => { errors += error.message; exited = true; });
  const closed = new Promise(resolve => child.once("close", code => { exited = true; resolve(code); }));
  let passed = false;
  const deadline = Date.now() + Math.min(options.timeoutMs || 60000, 120000);
  try {
    while (!exited && Date.now() < deadline && !options.signal?.aborted) {
      if (started) {
        try { const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) }); if (response.status > 0 && response.status < 500) { passed = true; break; } } catch {}
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } finally {
    if (!exited) child.kill("SIGTERM");
    const killTimer = setTimeout(() => { if (!exited) child.kill("SIGKILL"); }, 3000);
    await closed; clearTimeout(killTimer);
  }
  const redact = text => [environment.MAVEN_REPO_USERNAME, environment.MAVEN_REPO_PASSWORD].filter(Boolean).reduce((value, secret) => value.replaceAll(secret, "[REDACTED]"), text);
  await writeFile(path.join(evidenceDir, "startup.stdout.log"), redact(output));
  await writeFile(path.join(evidenceDir, "startup.stderr.log"), redact(errors));
  return { status: passed ? "passed" : "failed", commands: [command], executed_at: processStartedAt, artifact_digest: platformDigest(await readFile(path.join(target, jars[0]))), stdout_ref: path.join(evidenceDir, "startup.stdout.log"), stderr_ref: path.join(evidenceDir, "startup.stderr.log") };
}
