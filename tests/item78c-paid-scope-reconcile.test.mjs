import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { configuration, reconcile, CHECKS, QUERY } from '../scripts/item78c-paid-scope-reconcile.mjs';
import { ACCEPTANCE_SHA, BRANCH } from '../scripts/item78c-paid-scope-authorize.mjs';

const oldNow=Date.now, oldFetch=globalThis.fetch;
Date.now=()=>Date.parse('2026-09-28T02:00:00Z');
globalThis.fetch=()=>{throw Error('Unexpected live request');};
after(()=>{Date.now=oldNow;globalThis.fetch=oldFetch;});
const SHA='a'.repeat(40), TOKEN='syntheticSessionDoNotPrint', PROPOSAL='Synthetic exact proposal',
 OTHER='Synthetic different proposal', BYPASS='syntheticBypassDoNotPrint123456', CS='cs_test_syntheticOnly';
const targets={
 BYRON:['ep-wild-water-a796xzd7','cmp6uspof0000k10420hkjz9b','cmpmfohu20000jm04g67x29l4','cmu46wmy60001jw04kzysjnph','57ba55'],
 KEMPSEY:['ep-muddy-dawn-a7tfo3kp','cmpmfohu20000jm04g67x29l4','cmp6uspof0000k10420hkjz9b','cmu46zfph0001l4042nja8wf2','c36eb6'],
};
function env(council='BYRON'){
 const [endpoint,project,other,qsc,suffix]=targets[council];
 const alias='https://plannera-ab-git-accept-item-78c-byr-'+suffix+'-robbietalls-projects.vercel.app';
 return {GITHUB_REPOSITORY:'RobbieTall/Plannera-ab',GITHUB_EVENT_NAME:'workflow_dispatch',
 GITHUB_REF:'refs/heads/'+BRANCH,GITHUB_SHA:SHA,ITEM78C_DIAGNOSTIC_EXPECTED_SHA:SHA,
 ITEM78C_DIAGNOSTIC_CONFIRMATION:'READ ONLY PREVIEW SCOPE CHECK',ITEM78C_DIAGNOSTIC_COUNCIL:council,
 ITEM78C_SCOPE_RECONCILE_ONLY:'true',ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT:SHA,
 ITEM74H_WORKFLOW_AUTHORIZED_COMMIT:ACCEPTANCE_SHA,PLANNING_PACK_CHECKOUT_ENABLED:'false',SUBMISSION_SEE_CHECKOUT_ENABLED:'false',
 PLANNERA_STRIPE_TEST_BASE_URL:alias,PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:alias,
 PLANNERA_STRIPE_TEST_PROJECT_ID:project,PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID:other,
 PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID:qsc,PLANNERA_STRIPE_TEST_PROPOSAL:PROPOSAL,PLANNERA_STRIPE_TEST_OTHER_PROPOSAL:OTHER,
 PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON:JSON.stringify({projectId:project,proposalBrief:PROPOSAL}),
 PLANNERA_STRIPE_TEST_SESSION_COOKIE:'__Secure-next-auth.session-token='+TOKEN,
 PLANNERA_STRIPE_TEST_VERCEL_BYPASS:BYPASS,PLANNERA_STRIPE_TEST_SESSION_ID:CS,
 ITEM74H_PREVIEW_DATABASE_URL:'postgresql://synthetic:syntheticPassword@'+endpoint+'.ap-southeast-2.aws.neon.tech/neondb?sslmode=require'};
}
const row=()=>Object.fromEntries(CHECKS.map(k=>[k,true]));
const payload=r=>({results:[{command:'SELECT',rowCount:1,rows:[r]}]});
const response=r=>new Response(JSON.stringify(payload(r)));
function noLeaks(result,e=env()){
 const out=JSON.stringify(result);
 for(const value of [TOKEN,PROPOSAL,OTHER,BYPASS,CS,e.ITEM74H_PREVIEW_DATABASE_URL,'syntheticPassword',
 ...Object.values(targets).flat().filter(v=>v.length>10)])
 assert.equal(out.includes(value),false);
 assert.equal(result.containsSensitiveValues,false);assert.equal(result.acceptanceDecisionUnchanged,true);
 assert.equal(out.includes('READY_FOR_NON_PRODUCTION_ACCEPTANCE'),false);
}
for(const council of Object.keys(targets))test(council+' sends one fixed read-only parameterized batch',async()=>{
 const e=env(council);let calls=0;
 const result=await reconcile(e,async(url,opt)=>{
 calls++;assert.equal(url,'https://api.ap-southeast-2.aws.neon.tech/sql');
 assert.equal(opt.method,'POST');assert.equal(opt.redirect,'error');assert.equal(opt.cache,'no-store');
 assert.ok(opt.signal instanceof AbortSignal);assert.equal(opt.headers['Neon-Batch-Read-Only'],'true');
 assert.equal(opt.headers['Neon-Batch-Isolation-Level'],'RepeatableRead');
 assert.equal(opt.headers['Neon-Connection-String'],e.ITEM74H_PREVIEW_DATABASE_URL);
 assert.equal(opt.headers.cookie,undefined);assert.equal(opt.headers.Authorization,undefined);
 const body=JSON.parse(opt.body);assert.deepEqual(Object.keys(body),['queries']);assert.equal(body.queries.length,1);
 assert.equal(body.queries[0].query,QUERY);
 const params=body.queries[0].params;assert.equal(params.length,6);
 assert.equal(params[0],TOKEN);assert.equal(params[1],targets[council][1]);assert.equal(params[2],targets[council][3]);
 assert.equal(params[3],createHash('sha256').update(PROPOSAL.toLowerCase()).digest('hex'));
 assert.equal(params[5],CS);
 assert.equal(opt.body.includes(PROPOSAL),false);assert.equal(opt.body.includes(BYPASS),false);
 return response(row());});
 assert.equal(calls,1);assert.equal(result.completed,true);assert.equal(result.reason,'saved_inputs_match_database');
 assert.deepEqual(result.mismatches,[]);noLeaks(result,e);
});
test('SQL is a fixed SELECT and returns only declared booleans',()=>{
 assert.doesNotMatch(QUERY,/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|COPY|CALL|DO)\b/i);
 assert.doesNotMatch(QUERY,/;/);
 assert.deepEqual([...QUERY.matchAll(/AS "([^"]+)"/g)].map(m=>m[1]),CHECKS);
 assert.match(QUERY,/current_setting\('transaction_read_only'\)/);
 assert.match(QUERY,/"providerReference" = \$6/);
 assert.match(QUERY,/"sessionToken" = \$1/);
});
for(const [key,value] of [
 ['ITEM78C_SCOPE_RECONCILE_ONLY','false'],['GITHUB_REF','refs/heads/main'],
 ['GITHUB_SHA','b'.repeat(40)],['ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT','b'.repeat(40)],
 ['PLANNING_PACK_CHECKOUT_ENABLED','true'],['PLANNERA_STRIPE_TEST_SESSION_ID','cs_live_forbidden'],
 ['PLANNERA_STRIPE_TEST_SESSION_ID','cs_test_x; rm -rf /'],['PLANNERA_STRIPE_TEST_SESSION_ID','cs_test_'+ 'a'.repeat(248)],
 ['PLANNERA_STRIPE_TEST_OTHER_PROPOSAL',PROPOSAL.toUpperCase()],
 ['PLANNERA_STRIPE_TEST_SESSION_COOKIE','unrelated='+TOKEN],
 ['PLANNERA_STRIPE_TEST_SESSION_COOKIE','__Secure-next-auth.session-token='+TOKEN+'; __Secure-next-auth.session-token='+TOKEN],
 ['PLANNERA_STRIPE_TEST_SESSION_COOKIE','__Secure-next-auth.session-token='+TOKEN+'; next-auth.session-token=different'],
 ['PLANNERA_STRIPE_TEST_SESSION_COOKIE','__Secure-next-auth.session-token=$()'],
 ['ITEM74H_PREVIEW_DATABASE_URL',''],
 ...['https://user:pass@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech/neondb?sslmode=require',
 'postgresql://u:p@ep-muddy-dawn-a7tfo3kp.ap-southeast-2.aws.neon.tech/neondb?sslmode=require',
 'postgresql://u:p@ep-wild-water-a796xzd7.evil.example/neondb?sslmode=require',
 'postgresql://u:p@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech:444/neondb?sslmode=require',
 'postgresql://u:p@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech/production?sslmode=require',
 'postgresql://u:p@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech/neondb?sslmode=disable',
 'postgresql://u:p@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&options=evil',
 'postgresql://u:p@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&sslmode=require',
 'postgresql://u:p@ep-wild-water-a796xzd7.ap-southeast-2.aws.neon.tech/neondb?sslmode=require#fragment',
 ].map(v=>['ITEM74H_PREVIEW_DATABASE_URL',v]),
])test('bad configuration stops before any request: '+key+' '+String(value).slice(0,25),async()=>{
 let calls=0;const result=await reconcile({...env(),[key]:value},()=>{calls++;throw Error('no');});
 assert.equal(calls,0);assert.equal(result.reason,'configuration_denied');assert.equal(result.completed,false);noLeaks(result);
});
test('pooler accepted only for same council; identical cookie variants accepted',()=>{
 const e=env();e.ITEM74H_PREVIEW_DATABASE_URL=e.ITEM74H_PREVIEW_DATABASE_URL.replace('.ap-','-pooler.ap-');
 e.PLANNERA_STRIPE_TEST_SESSION_COOKIE+='; next-auth.session-token='+TOKEN;
 assert.equal(configuration(e).council,'BYRON');
});
test('proposal normalization exactly preserves application comparison semantics',()=>{
 const e=env();e.PLANNERA_STRIPE_TEST_PROPOSAL='  SYNTHETIC\tExact \n Proposal ';
 e.PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON=JSON.stringify({projectId:targets.BYRON[1],proposalBrief:e.PLANNERA_STRIPE_TEST_PROPOSAL.trim()});
 assert.equal(configuration(e).params[3],configuration(env()).params[3]);
});
for(const [field,reason]of [
 ['sessionPresent','saved_session_mismatch'],['sessionUnexpired','saved_session_mismatch'],
 ['sessionOwnsProject','saved_session_mismatch'],['sourcePurchasePresent','saved_checkout_reference_mismatch'],
 ['sourcePurchaseUnique','saved_checkout_reference_mismatch'],['sourcePurchaseOwnerMatches','purchase_identity_mismatch'],
 ['sourcePurchaseProjectMatches','purchase_identity_mismatch'],['qscMatches','quick_site_check_mismatch'],
 ['qscIsOnlySavedCheck','quick_site_check_mismatch'],['proposalMatches','saved_proposal_mismatch'],
 ['productMatches','purchase_or_entitlement_mismatch'],['sourceEntitlementActive','purchase_or_entitlement_mismatch'],
])test('distinguishes '+field,async()=>{
 const r=row();r[field]=false;const result=await reconcile(env(),async()=>response(r));
 assert.equal(result.completed,true);assert.equal(result.reason,reason);assert.deepEqual(result.mismatches,[field]);noLeaks(result);
});
test('unconfirmed read-only transaction never reports a comparison',async()=>{
 const r=row();r.transactionReadOnly=false;
 const result=await reconcile(env(),async()=>response(r));
 assert.equal(result.completed,false);assert.equal(result.reason,'database_response_invalid');assert.equal(result.checks,null);
});
for(const [name,make]of [
 ['HTML',()=>new Response('<html>'+TOKEN+'</html>')],
 ['oversized',()=>new Response('x'.repeat(16385))],
 ['empty',()=>new Response(null)],
 ['wrong type',()=>response({...row(),proposalMatches:'true'})],
 ['unexpected field',()=>response({...row(),secret:TOKEN})],
 ['missing field',()=>response(Object.fromEntries(Object.entries(row()).slice(1)))],
 ['multiple rows',()=>new Response(JSON.stringify({results:[{command:'SELECT',rowCount:2,rows:[row(),row()]}]}))],
 ['wrong command',()=>new Response(JSON.stringify({results:[{command:'UPDATE',rowCount:1,rows:[row()]}]}))],
 ['multiple results',()=>new Response(JSON.stringify({results:[...payload(row()).results,...payload(row()).results]}))],
])test('response fails closed: '+name,async()=>{
 const result=await reconcile(env(),async()=>make());assert.equal(result.completed,false);
 assert.equal(result.reason,'database_response_invalid');assert.equal(result.checks,null);noLeaks(result);
});
test('HTTP failure and raw provider exceptions never leak',async()=>{
 for(const fetcher of [async()=>new Response(TOKEN,{status:403}),async()=>{throw Error(env().ITEM74H_PREVIEW_DATABASE_URL);}]) {
 const result=await reconcile(env(),fetcher);assert.equal(result.completed,false);assert.equal(result.checks,null);noLeaks(result);
 }
});
test('shell/SQL-like input stays a hashed parameter',async()=>{
 const e=env();e.PLANNERA_STRIPE_TEST_PROPOSAL='$(uname); SELECT secret FROM private --';
 e.PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON=JSON.stringify({projectId:targets.BYRON[1],proposalBrief:e.PLANNERA_STRIPE_TEST_PROPOSAL});
 const result=await reconcile(e,async(_,options)=>{
 assert.equal(JSON.parse(options.body).queries[0].query,QUERY);assert.equal(options.body.includes('$(uname)'),false);
 return response(row());});noLeaks(result);
});
test('CLI refuses empty environment with no stderr or sensitive output',()=>{
 const r=spawnSync(process.execPath,['scripts/item78c-paid-scope-reconcile.mjs'],
 {cwd:new URL('..',import.meta.url),env:{ITEM74H_PREVIEW_DATABASE_URL:env().ITEM74H_PREVIEW_DATABASE_URL},encoding:'utf8',timeout:10000});
 assert.equal(r.status,1);assert.equal(r.stderr,'');noLeaks(JSON.parse(r.stdout));
});
const root=new URL('..',import.meta.url);
const parsed=spawnSync('/usr/bin/ruby',['-rpsych','-rjson','-e',
 'puts JSON.generate(Psych.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false))',
 '.github/workflows/item77-protected-commercial-journey.yml'],{cwd:root,encoding:'utf8',timeout:10000});
assert.equal(parsed.status,0,parsed.stderr);
const workflow=JSON.parse(parsed.stdout), jobs=workflow.jobs;
function runCondition(expr,inputs,event='workflow_dispatch'){
 return Boolean(Function('inputs','github','return ('+expr.slice(3,-2)+')')(inputs,{event_name:event}));
}
test('default-off reconciliation selects only its prerequisite and protected matrix',()=>{
 const inputs={scope_reconcile_only:true,scope_only:false,diagnostic_only:false,presence_only:false};
 for(const [name,job]of Object.entries(jobs))assert.equal(runCondition(job.if,inputs),name.startsWith('scope-reconcile'),name);
 assert.equal(runCondition(workflow.concurrency['cancel-in-progress'],inputs),false);
 assert.equal((workflow.on||workflow.true).workflow_dispatch.inputs.scope_reconcile_only.default,false);
});
test('mixed modes and PR cannot release reconciliation credentials',()=>{
 for(const flag of ['scope_only','diagnostic_only','presence_only']){
 const inputs={scope_reconcile_only:true,[flag]:true};
 for(const [name,job]of Object.entries(jobs))assert.equal(runCondition(job.if,inputs),false,name);
 }
 const inputs={scope_reconcile_only:true};
 for(const [name,job]of Object.entries(jobs))assert.equal(runCondition(job.if,inputs,'pull_request'),false,name);
});
test('new credentials exist only in final step after both authorizations',()=>{
 const pre=jobs['scope-reconcile-authorize'],job=jobs['scope-reconcile'];
 assert.equal(JSON.stringify(pre).includes('secrets.'),false);
 assert.equal(job.needs,'scope-reconcile-authorize');
 assert.equal(job.environment,'$'+'{{ matrix.environment }}');
 assert.deepEqual(job.permissions,{contents:'read',actions:'read'});
 assert.deepEqual(job.strategy.matrix.include,jobs['scope-diagnose'].strategy.matrix.include);
 assert.equal(job.steps.length,4);
 assert.equal(job.steps[1].run,'node scripts/item78c-paid-scope-authorize.mjs protected');
 for(const step of job.steps.slice(0,-1))assert.equal(JSON.stringify(step).includes('secrets.'),false);
 const last=job.steps.at(-1);
 assert.equal(last.run,'node scripts/item78c-paid-scope-reconcile.mjs');
 assert.equal(last.env.ITEM74H_PREVIEW_DATABASE_URL,'$'+'{{ secrets.ITEM74H_PREVIEW_DATABASE_URL }}');
 assert.equal(last.env.PLANNERA_STRIPE_TEST_SESSION_ID,'$'+'{{ secrets.ITEM78A_STRIPE_TEST_SESSION_ID }}');
 assert.equal((JSON.stringify(last).match(/secrets\./g)||[]).length,7);
 assert.equal(last.env.ITEM78C_SCOPE_RECONCILE_ONLY,'true');
 assert.equal(last.env.NODE_OPTIONS,'');
 assert.doesNotMatch(JSON.stringify(job),/npm |npx |prisma |STRIPE_TEST_SECRET_KEY|STRIPE_SECRET_KEY|BLOB_READ_WRITE_TOKEN|upload-artifact/);
 for(const step of [...pre.steps,...job.steps]){
 assert.equal(step['continue-on-error'],undefined);
 if(step.run)assert.equal(step.run.includes('$'+'{{'),false);
 if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);
 }
});
