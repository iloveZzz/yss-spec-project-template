import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [root,recipe]=process.argv.slice(2);
if(!root||!['backend.ddd-http-api','backend.mvc-http-api'].includes(recipe))throw new Error('Usage: node reproduce-existing-project-compiler.mjs <governance-root> <backend.ddd-http-api|backend.mvc-http-api>');
const {compileDefaultImplementationContract}=await import(pathToFileURL(path.join(root,'scripts/lib/implementation-contract-compiler.mjs')));
const registration=JSON.parse(readFileSync(path.join(root,'docs/.scratch/target-preview-pilot/architecture/repository-registration.json')));
try {
 const result=compileDefaultImplementationContract({root,recipeIds:[recipe],conditions:['backend-technical-design-impact'],slice_id:'slice.target-preview-delivery-identity',architecture_identity:registration.architecture_identity,architecture_evidence:{repository_registration:registration}});
 console.log(JSON.stringify({result:'compiled',value:result},null,2));
} catch(error) {
 console.error(JSON.stringify({result:'blocked',recipe,error:error.message,registration_ref:'docs/.scratch/target-preview-pilot/architecture/repository-registration.json',missing_identity:registration.architecture_identity===undefined,scope:'real prerequisite failure, not S0/S2/S3/S4 acceptance test'},null,2));process.exitCode=1;
}
