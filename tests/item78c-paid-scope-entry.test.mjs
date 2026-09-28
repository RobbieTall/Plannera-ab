import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('..',import.meta.url);
function yaml(path){
 const result=spawnSync('/usr/bin/ruby',['-rpsych','-rjson','-e',
 'puts JSON.generate(Psych.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false))',path],
 {cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
 return JSON.parse(result.stdout);
}
const entry=yaml('.github/workflows/item77-protected-commercial-journey.yml');
const original=yaml('.github/workflows/item78c-session-preflight.yml');
const jobs=entry.jobs;
const triggers=entry.on||entry.true;
const legacy=['commercial-journey','session-diagnostic','session-authorize','presence-authorize','presence'];
function evaluate(expression,inputs,event='workflow_dispatch'){
 assert.equal(expression.slice(0,3),'$'+'{{');
 const body=expression.slice(3,-2);
 return Function('inputs','github','return ('+body+');')(inputs,{event_name:event});
}
test('existing manual entry has explicit default-off scope switch and no new automatic triggers',()=>{
 assert.deepEqual(Object.keys(triggers).sort(),['pull_request','workflow_dispatch']);
 assert.deepEqual(triggers.workflow_dispatch.inputs.scope_only,{
 description:'Run ONLY the reviewed read-only paid-scope diagnostic; leave other mode boxes unchecked',
 type:'boolean',required:false,default:false});
 assert.ok(triggers.workflow_dispatch.inputs.expected_commit);
 assert.ok(triggers.workflow_dispatch.inputs.confirmation);
});
for(const diagnostic_only of [false,true])for(const presence_only of [false,true]){
 test('scope mode excludes all legacy jobs '+diagnostic_only+'/'+presence_only,()=>{
 const inputs={scope_only:true,diagnostic_only,presence_only};
 for(const name of legacy)assert.equal(evaluate(jobs[name].if,inputs),false,name);
 for(const name of ['scope-authorize','scope-diagnose'])assert.equal(evaluate(jobs[name].if,inputs),true,name);
 assert.equal(evaluate(entry.concurrency['cancel-in-progress'],inputs),false);
 });
 test('scope off preserves legacy dispatch routing '+diagnostic_only+'/'+presence_only,()=>{
 const inputs={scope_only:false,diagnostic_only,presence_only};
 const expected={'commercial-journey':!diagnostic_only&&!presence_only,
 'session-authorize':diagnostic_only&&!presence_only,'session-diagnostic':diagnostic_only&&!presence_only,
 'presence-authorize':presence_only,'presence':diagnostic_only&&presence_only};
 for(const [name,value]of Object.entries(expected))assert.equal(evaluate(jobs[name].if,inputs),value,name);
 for(const name of ['scope-authorize','scope-diagnose'])assert.equal(evaluate(jobs[name].if,inputs),false);
 });
}
test('pull requests never select protected diagnostic jobs',()=>{
 for(const scope_only of [false,true]){
 const inputs={scope_only,diagnostic_only:false,presence_only:false};
 for(const name of ['scope-authorize','scope-diagnose','session-authorize','session-diagnostic','presence-authorize','presence'])
 assert.equal(evaluate(jobs[name].if,inputs,'pull_request'),false,name);
 }
 assert.equal(evaluate(jobs['commercial-journey'].if,{scope_only:false,diagnostic_only:false,presence_only:false},'pull_request'),true);
});
test('scope jobs retain the reviewed steps and environment boundary',()=>{
 for(const name of ['scope-authorize','scope-diagnose']){
 assert.deepEqual(jobs[name].steps,original.jobs[name].steps);
 assert.deepEqual(jobs[name].permissions,{contents:'read',actions:'read'});
 assert.equal(jobs[name]['timeout-minutes'],5);
 assert.equal(jobs[name].env.PLANNING_PACK_CHECKOUT_ENABLED,'false');
 assert.equal(jobs[name].env.SUBMISSION_SEE_CHECKOUT_ENABLED,'false');
 assert.equal(jobs[name].env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA,'$'+'{{ inputs.expected_commit }}');
 assert.equal(jobs[name].env.ITEM78C_DIAGNOSTIC_CONFIRMATION,'$'+'{{ inputs.confirmation }}');
 }
 assert.equal(jobs['scope-diagnose'].needs,'scope-authorize');
 assert.equal(jobs['scope-diagnose'].environment,'$'+'{{ matrix.environment }}');
 assert.deepEqual(jobs['scope-diagnose'].strategy.matrix.include,[
 {council:'BYRON',environment:'item78c-byron-preview'},{council:'KEMPSEY',environment:'item78c-kempsey-preview'}]);
});
test('prerequisite has no application secrets; scope runner contains no database/payment/build command',()=>{
 const first=JSON.stringify(jobs['scope-authorize']),second=JSON.stringify(jobs['scope-diagnose']);
 assert.equal(first.includes('secrets.'),false);
 assert.equal((second.match(/secrets\./g)||[]).length,5);
 assert.doesNotMatch(first+second,/npm |npx |prisma |upload-artifact|DATABASE_URL|STRIPE_SECRET_KEY|BLOB_READ_WRITE_TOKEN|VERCEL_TOKEN/);
 const steps=jobs['scope-diagnose'].steps;
 const guard=steps.findIndex(s=>s.run==='node scripts/item78c-paid-scope-authorize.mjs protected');
 const credentials=steps.findIndex(s=>JSON.stringify(s).includes('secrets.'));
 assert.ok(guard>=0&&guard<credentials);
 assert.equal(steps[guard]['continue-on-error'],undefined);
 assert.equal(steps[credentials].run,'node scripts/item78c-paid-scope-diagnostic.mjs');
});
test('scope run steps do not interpolate inputs into shell',()=>{
 for(const name of ['scope-authorize','scope-diagnose'])for(const step of jobs[name].steps){
 if(step.run)assert.equal(step.run.includes('$'+'{{'),false);
 if(step.uses)assert.match(step.uses,/^[\w/-]+@[a-f0-9]{40}$/);
 }
});
test('deployment remains excluded for this branch',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.git.deploymentEnabled['diag/item78c-paid-scope-20260928'],false);
 assert.equal(config.git.deploymentEnabled['accept/item-78c-byron-kempsey-20260914'],false);
});
