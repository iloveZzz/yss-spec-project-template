import {readContractSource} from './contract-source.mjs';
import { existsSync, readFileSync, withValidationPhase } from "./validation-phase.mjs";
import { parseSliceYaml } from "./slice-contract.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { validateJsonSchema } from "./json-schema.mjs";
import { openApiDigest, resolveOpenApiRef } from "./openapi-draft-validation.mjs";
import { nativeContractVerify, assertNativeCapabilities, NEEDS } from "./native-evidence.mjs";

const TEMPLATE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = path.join(TEMPLATE_ROOT, ".template-spec/process/schemas/api-contract-decision.schema.json");
const fail = (message) => { throw new TypeError(message); };
const readBound = (root, ref, label) => {
  const file = resolveOpenApiRef(root, ref);
  const bytes = readFileSync(file);
  return { file, bytes, digest: openApiDigest(bytes), label };
};
const requireDigest = (asset, expected) => { if (asset.digest !== expected) fail(`${asset.label}摘要漂移`); };

export function validateApiContractDecision(binding, options = {}) {return withValidationPhase({root:options.root||TEMPLATE_ROOT,purpose:'api-decision',slice_id:binding?.ref,readOnly:true},()=>validate(binding,options));}
function validate(binding, { root = TEMPLATE_ROOT } = {}) {
  if (!binding || !binding.ref || !binding.version || !binding.digest || !["required", "not-applicable"].includes(binding.impact)) fail("缺少 API Contract Decision 当前版本绑定");
  const projectRoot = path.resolve(root);
  const decisionAsset = readBound(projectRoot, binding.ref, "API Contract Decision");
  requireDigest(decisionAsset, binding.digest);
  const document = parseDocument(decisionAsset.bytes.toString("utf8"), { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) fail(`API Contract Decision 无法解析: ${document.errors[0].message}`);
  const original = parseSliceYaml(decisionAsset.bytes);
  validateJsonSchema(original, original.schema_version===2?SCHEMA.replace(".schema", "-v2.schema"):SCHEMA, { cwd: TEMPLATE_ROOT, label: "API Contract Decision" });
  if(original.status!=="approved")fail("API Contract Decision 必须经生命周期批准为 approved");
  const decision={...structuredClone(original),current_version:true}; // Derived only after schema and current raw binding checks; never persisted.
  if (decision.decision_version !== binding.version || decision.impact !== binding.impact) fail("API Contract Decision 版本或影响结论与合同不一致");
  requireDigest(readBound(projectRoot, decision.assessment_ref, "API 影响评估"), decision.assessment_digest);
  for (const ref of decision.evidence_refs) readBound(projectRoot, ref, "API Decision 证据");
  if (decision.impact === "not-applicable") return { decision, binding: { ref: binding.ref, version: binding.version, digest: binding.digest, impact: decision.impact } };

  const draft = readBound(projectRoot, decision.openapi.ref, "OpenAPI YAML");
  requireDigest(draft, decision.openapi.digest);
  const validation = readBound(projectRoot, decision.validation_record.ref, "OpenAPI Validation");
  requireDigest(validation, decision.validation_record.digest);
  const review = readBound(projectRoot, decision.draft_review.ref, "OpenAPI Draft Review");
  requireDigest(review, decision.draft_review.digest);
  const reviewDocument = parseDocument(review.bytes.toString("utf8"), { uniqueKeys: true, maxAliasCount: 0 });
  if (reviewDocument.errors.length) fail(`OpenAPI Draft Review 无法解析: ${reviewDocument.errors[0].message}`);
  const reviewRecord = reviewDocument.toJS({ maxAliasCount: 0 });
  if (reviewRecord?.result !== "approved" || !Array.isArray(reviewRecord.blocking_findings) || reviewRecord.blocking_findings.length > 0) fail("OpenAPI Draft Review 实际记录未批准或仍有阻断项");
  if (reviewRecord.draft_ref !== decision.openapi.ref || reviewRecord.draft_digest !== decision.openapi.digest) fail("OpenAPI Draft Review 实际记录未绑定当前权威 YAML");
  if (!Array.isArray(reviewRecord.evidence_refs) || !reviewRecord.evidence_refs.length) fail("OpenAPI Draft Review 缺少实际证据");
  for (const ref of reviewRecord.evidence_refs) readBound(projectRoot, ref, "OpenAPI Draft Review 实际证据");
  if(original.schema_version===2){
    decision.draft_review={...decision.draft_review,result:reviewRecord.result,blocking_findings:reviewRecord.blocking_findings,draft_ref:reviewRecord.draft_ref,draft_digest:reviewRecord.draft_digest,evidence_refs:reviewRecord.evidence_refs};
    decision.freeze={...decision.freeze,draft_ref:decision.openapi.ref,draft_digest:decision.openapi.digest};
  }
  for (const ref of decision.draft_review.evidence_refs) readBound(projectRoot, ref, "OpenAPI Draft Review 证据");
  assertNativeCapabilities(NEEDS.openapiValidation);
  const verified = nativeContractVerify({ root: projectRoot, kind: 'openapi-validation', file: validation.file });
  if (verified.exitCode !== 0) fail(`OpenAPI Validation: ${verified.message}`);
  // 将原生读取的文件纳入外层验证阶段，防止校验后到工作流返回前发生漂移。
  const inputs = verified.envelope.result?.inputs;
  if (!Array.isArray(inputs) || ![decision.validation_record.ref, decision.openapi.ref].every(ref => inputs.some(input => input.root === projectRoot && input.ref === ref && input.descriptor?.type === 'file'))) fail('NATIVE_PROTOCOL: OpenAPI 校验缺少输入依据');
  for (const input of inputs) {
    if (input.root !== projectRoot || typeof input.ref !== 'string' || path.isAbsolute(input.ref) || input.ref.includes('\\') || input.ref.split('/').some(part => !part || part === '.' || part === '..')) fail('NATIVE_PROTOCOL: OpenAPI 校验输入越界');
    if (input.descriptor?.type === 'file') {
      if (openApiDigest(readFileSync(resolveOpenApiRef(projectRoot, input.ref))) !== `sha256:${input.descriptor.digest}`) fail(`VALIDATION_INPUT_CHANGED: ${input.ref}`);
    } else if (input.descriptor?.type === 'missing') {
      if (existsSync(path.resolve(projectRoot, input.ref))) fail(`VALIDATION_INPUT_CHANGED: ${input.ref}`);
    } else fail('NATIVE_PROTOCOL: OpenAPI 校验输入类型未知');
  }
  const validated = verified.envelope.result?.coverage?.openapi_validation;
  if (validated?.template !== false || validated.draft_ref !== decision.openapi.ref || validated.draft_sha256 !== decision.openapi.digest) fail("OpenAPI Validation 未绑定当前权威 YAML");
  if (decision.draft_review.draft_ref !== decision.openapi.ref || decision.draft_review.draft_digest !== decision.openapi.digest || decision.draft_review.blocking_findings.length) fail("OpenAPI Draft Review 未批准当前权威 YAML");
  if (decision.freeze.version !== decision.openapi.version || decision.freeze.draft_ref !== decision.openapi.ref || decision.freeze.draft_digest !== decision.openapi.digest) fail("OpenAPI Freeze 未绑定当前权威 YAML 版本和摘要");
  return { decision, openapi: decision.openapi, binding: { ref: binding.ref, version: binding.version, digest: binding.digest, impact: decision.impact } };
}

/** Source selectors contain business choices; digests are always derived from original bytes. */
export function prepareApiContractDecision(input,{root=TEMPLATE_ROOT}={}) {
 return withValidationPhase({root,purpose:'api-prepare',slice_id:input.decision_id,readOnly:true},()=>{
  if(input.schema_version!==undefined&&input.schema_version!==2)fail('旧 schema 必须通过显式 migrate 迁移');
  if(input.kind!==undefined&&input.kind!=='api-contract-decision')fail('来源 kind 与 API 决定冲突');
  const allowed=new Set(['schema_version','kind','decision_id','decision_version','status','impact','assessment_ref','assessment_digest','evidence_refs','reason','openapi','validation_record','draft_review','freeze']);
  for(const key of Object.keys(input))if(!allowed.has(key))fail(`未分类约束需人工处理: ${key}`);
  if(input.status&&input.status!=='draft')fail('准备器不能创建批准身份或更新已批准合同');
  const result=structuredClone(input);Object.assign(result,{schema_version:2,kind:'api-contract-decision',status:'draft'});
  const conflicts=[];
  const bind=(value,label)=>{try{return {...value,...readContractSource(value,{root}).binding};}catch(error){conflicts.push({field:label,source_ref:value.ref,reason:error.message,conflicts:error.conflicts||[],recovery:'核对双方来源并补齐当前文件后重新准备'});return value;}};
  result.assessment_digest=bind({ref:input.assessment_ref,...(input.assessment_digest?{digest:input.assessment_digest}:{})},'API 影响评估').digest;
  for(const key of ['openapi','validation_record','draft_review'])if(result[key])result[key]=bind(result[key],key);
  for(const ref of result.evidence_refs||[])try{readBound(root,ref,'API 决定证据');}catch(error){conflicts.push({field:'evidence_refs',source_ref:ref,reason:error.message,recovery:'补齐当前证据后重新准备'});}
  if(conflicts.length)throw Object.assign(new TypeError(conflicts.map(item=>`${item.field}: ${item.reason}; 恢复: ${item.recovery}`).join('\n')),{code:'API_SOURCE_CONFLICT',conflicts});
  validateJsonSchema(result,SCHEMA.replace('.schema','-v2.schema'),{label:'API Contract Decision v2 草案'});
  return result;
 });
}
export function migrateApiContractDecision(binding,{root=TEMPLATE_ROOT,version}={}) {
 return withValidationPhase({root,purpose:'api-migrate',slice_id:binding?.ref,readOnly:true},()=>{
  const validated=validateApiContractDecision(binding,{root}),old=validated.decision;
  if(old.schema_version!==1)fail('显式迁移只接受 v1');
  if(!/^v[1-9][0-9]*$/.test(version)||BigInt(version.slice(1))<=BigInt(old.decision_version.slice(1)))fail('迁移必须选择新的递增决定版本');
  const result=structuredClone(old);result.schema_version=2;result.decision_version=version;result.status='draft';delete result.current_version;
  if(result.draft_review){result.evidence_refs=[...new Set([...result.evidence_refs,...result.draft_review.evidence_refs])];result.draft_review={ref:result.draft_review.ref,digest:result.draft_review.digest};result.freeze={version:result.freeze.version,frozen_at:result.freeze.frozen_at};}
  return prepareApiContractDecision(result,{root});
 });
}
