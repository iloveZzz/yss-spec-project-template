import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Actual bytecode checks. Explicit classpath override supports CI caches without downloading dependencies.
const repo = process.env.MAVEN_LOCAL_REPOSITORY || path.join(os.homedir(),'.m2/repository');
const classpath = process.env.YSS_ARCHUNIT_TEST_CLASSPATH || [
  'com/tngtech/archunit/archunit/1.2.1/archunit-1.2.1.jar',
  'com/tngtech/archunit/archunit-junit5-api/1.2.1/archunit-junit5-api-1.2.1.jar',
  'org/slf4j/slf4j-api/1.7.26/slf4j-api-1.7.26.jar'
].map(p=>path.join(repo,p)).join(path.delimiter);
const javaHome = process.env.YSS_ARCHUNIT_TEST_JAVA_HOME || process.env.JAVA_HOME;
const tool = name => javaHome ? path.join(javaHome,'bin',name) : name;
const template = fs.readFileSync(new URL('../../../.agents/skills/yss-ddd-scaffold-generator/assets/templates/java/architecture-rules-test.java.template',import.meta.url),'utf8').replaceAll('{{base_package}}','demo');
function execute(sources, properties=[], mvc=false) {
  const architecture = mvc ? fs.readFileSync(new URL('../../../.agents/skills/yss-layered-mvc-scaffold-generator/assets/templates/architecture-rules-test.java.template',import.meta.url),'utf8').replaceAll('{{base_package}}','demo') : template;
  const rulePackage = mvc ? 'demo.architecture' : 'demo';
  const ruleType = mvc ? 'LayeredMvcArchitectureTest' : 'ArchitectureRulesTest';
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'yss-archunit-'));
  try {
    const files = [];
    const all = {...sources, [`${rulePackage.replaceAll('.','/')}/${ruleType}.java`]:architecture,
      'org/springframework/stereotype/Controller.java':'package org.springframework.stereotype; import java.lang.annotation.*; @Retention(RetentionPolicy.RUNTIME) @Target({ElementType.TYPE,ElementType.ANNOTATION_TYPE}) public @interface Controller {}',
      'org/springframework/web/bind/annotation/RestController.java':'package org.springframework.web.bind.annotation; import java.lang.annotation.*; @org.springframework.stereotype.Controller @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE) public @interface RestController {}',
      [`${rulePackage.replaceAll('.','/')}/Runner.java`]:`package ${rulePackage}; public class Runner { public static void main(String[] args) { ${ruleType}.boundaries(new com.tngtech.archunit.core.importer.ClassFileImporter().importPackages("demo")); } }`};
    for(const [ref,content] of Object.entries(all)) {const p=path.join(root,ref);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);files.push(p);}
    const compile=spawnSync(tool('javac'),['-source','8','-target','8','-cp',classpath,...files],{encoding:'utf8'});
    assert.equal(compile.status,0,compile.stderr);
    return spawnSync(tool('java'),[...properties,'-cp',`${root}${path.delimiter}${classpath}`,`${rulePackage}.Runner`],{encoding:'utf8'});
  } finally {fs.rmSync(root,{recursive:true,force:true});}
}
test('renamed Controller cannot invoke a Domain Gateway even when business assertions pass',()=>{
 const run=execute({'demo/domain/Access.java':'package demo.domain; public interface Access {}',
 'demo/adapter/web/Login.java':'package demo.adapter.web; @org.springframework.web.bind.annotation.RestController public class Login { demo.domain.Access access; }'});
 assert.notEqual(run.status,0);assert.match(run.stderr,/demo.domain.Access/);
});
test('Domain technology leaks and infrastructure to web dependencies fail',()=>{
 for(const sources of [
 {'demo/domain/Bad.java':'package demo.domain; @org.springframework.stereotype.Controller public class Bad {}'},
 {'demo/rest/Dto.java':'package demo.rest; public class Dto {}','demo/infrastructure/Bad.java':'package demo.infrastructure; public class Bad { demo.rest.Dto dto; }'}
 ]) {const run=execute(sources);assert.notEqual(run.status,0);assert.match(run.stderr,/AssertionError/);}
});
test('exception translation may refer to Domain errors and empty skeleton is allowed',()=>{
 const run=execute({'demo/domain/Problem.java':'package demo.domain; public class Problem extends RuntimeException {}',
 'demo/adapter/web/Advice.java':'package demo.adapter.web; public class Advice { public void translate(demo.domain.Problem error) {} }'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(execute({}).status,0);
 assert.notEqual(execute({},['-Dyss.firstSlice=true','-Dyss.arch.requiredTypes=demo.adapter.web.Missing']).status,0);
});
test('contract-bound custom application packages cannot depend on infrastructure',()=>{
 const run=execute({'demo/usecase/Action.java':'package demo.usecase; public class Action { demo/store/Bad nope; }'.replace('demo/store/Bad','demo.store.Bad'),
 'demo/store/Bad.java':'package demo.store; public class Bad {}'},['-Dyss.arch.application=demo.usecase','-Dyss.arch.infrastructure=demo.store']);
 assert.notEqual(run.status,0);assert.match(run.stderr,/AssertionError/);
});
test('binding one aggregate leaf does not hide sibling Domain gateways',()=>{
 const run=execute({'demo/domain/model/Good.java':'package demo.domain.model; public class Good {}',
 'demo/domain/gateway/Access.java':'package demo.domain.gateway; public interface Access {}',
 'demo/adapter/web/Login.java':'package demo.adapter.web; @org.springframework.web.bind.annotation.RestController public class Login { demo.domain.gateway.Access access; }'},
 ['-Dyss.firstSlice=true','-Dyss.arch.domain=demo.domain.model','-Dyss.arch.requiredTypes=demo.domain.model.Good,demo.adapter.web.Login']);
 assert.notEqual(run.status,0);assert.match(run.stderr,/demo.domain.gateway.Access/);
});
test('ordinary web DTO cannot stand in for an actual Controller',()=>{
 const run=execute({'demo/adapter/web/Dto.java':'package demo.adapter.web; public class Dto {}'},
 ['-Dyss.firstSlice=true','-Dyss.arch.requireController=true','-Dyss.arch.requiredTypes=demo.adapter.web.Dto']);
 assert.notEqual(run.status,0);assert.match(run.stderr,/actual Controller/);
});

test('MVC permits service to Repository but rejects Controller bypass',()=>{
 const sources={'demo/repository/Store.java':'package demo.repository; public class Store {}',
 'demo/service/UseCase.java':'package demo.service; public class UseCase { demo.repository.Store store; }',
 'demo/adapter/web/Entry.java':'package demo.adapter.web; @org.springframework.web.bind.annotation.RestController public class Entry { demo.service.UseCase useCase; }'};
 assert.equal(execute(sources,[],true).status,0);
 sources['demo/adapter/web/Entry.java']=sources['demo/adapter/web/Entry.java'].replace('demo.service.UseCase','demo.repository.Store');
 const failed=execute(sources,[],true);assert.notEqual(failed.status,0);assert.match(failed.stderr,/demo.repository.Store/);
});
