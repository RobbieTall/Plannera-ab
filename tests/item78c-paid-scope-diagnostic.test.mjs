import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {ACCEPTANCE_SHA,ACCEPTANCE_BRANCH,BRANCH,EXPIRES_AT,authorize,validateRequest,validateProtection,validateGit} from '../scripts/item78c-paid-scope-authorize.mjs';
import {diagnose} from '../scripts/item78c-paid-scope-diagnostic.mjs';
const oldNow=Date.now,oldFetch=globalThis.fetch;
Date.now=()=>Date.parse('2026-09-28T00:10:00Z');
globalThis.fetch=()=>{throw Error('Unexpected real network access');};
after(()=>{Date.now=oldNow;globalThis.fetch=oldFetch;});
const SHA='a'.repeat(40),COOKIE='session=synthetic-session-do-not-print',BYPASS='synthetic-bypass-do-not-print-123456',PROPOSAL='Synthetic exact proposal do not print',OTHER='Synthetic different proposal do not print',TOKEN='synthetic-github-token-do-not-print';
const targets={
 BYRON:['cmp6uspof0000k10420hkjz9b','cmpmfohu20000jm04g67x29l4','cmu46wmy60001jw04kzysjnph','https://plannera-ab-git-accept-item-78c-byr-57ba55-robbietalls-projects.vercel.app','https://plannera-8lkwbwyg4-robbietalls-projects.vercel.app'],
 KEMPSEY:['cmpmfohu20000jm04g67x29l4','cmp6uspof0000k10420hkjz9b','cmu46zfph0001l4042nja8wf2','https://plannera-ab-git-accept-item-78c-byr-c36eb6-robbietalls-projects.vercel.app','https://plannera-8ibu6w7b0-robbietalls-projects.vercel.app'],
};
function env(council='BYRON'){
 const [project,alternate,qsc,alias]=targets[council];
 return {GITHUB_REPOSITORY:'RobbieTall/Plannera-ab',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/'+BRANCH,GITHUB_SHA:SHA,
 ITEM78C_DIAGNOSTIC_EXPECTED_SHA:SHA,ITEM78C_DIAGNOSTIC_CONFIRMATION:'READ ONLY PREVIEW SCOPE CHECK',
 PLANNING_PACK_CHECKOUT_ENABLED:'false',SUBMISSION_SEE_CHECKOUT_ENABLED:'false',
 ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT:SHA,ITEM74H_WORKFLOW_AUTHORIZED_COMMIT:ACCEPTANCE_SHA,
 ITEM78C_DIAGNOSTIC_COUNCIL:council,GH_TOKEN:TOKEN,
 PLANNERA_STRIPE_TEST_BASE_URL:alias,PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:alias,
 PLANNERA_STRIPE_TEST_PROJECT_ID:project,PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID:alternate,PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID:qsc,
 PLANNERA_STRIPE_TEST_PROPOSAL:PROPOSAL,PLANNERA_STRIPE_TEST_OTHER_PROPOSAL:OTHER,
 PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON:JSON.stringify({projectId:project,proposalBrief:PROPOSAL}),
 PLANNERA_STRIPE_TEST_SESSION_COOKIE:COOKIE,PLANNERA_STRIPE_TEST_VERCEL_BYPASS:BYPASS};
}
function protection(){return {deployment_branch_policy:{custom_branch_policies:true,protected_branches:false},can_admins_bypass:false,protection_rules:[{type:'required_reviewers',reviewers:[{type:'User',reviewer:{id:106786418}}]}]};}
function policies(){return {total_count:2,branch_policies:[BRANCH,ACCEPTANCE_BRANCH].map(name=>({name,type:'branch'}))};}
function git(args){
 if(args[0]==='fetch')return {status:0};
 if(args[0]==='rev-parse')return {status:0,stdout:SHA+'\n'};
 return {status:args[2]===ACCEPTANCE_SHA?0:1};
}
function response(state){return new Response(JSON.stringify({enabled:true,state}),{status:200});}
function noLeaks(summary){
 const text=JSON.stringify(summary);
 for(const value of [COOKIE,BYPASS,PROPOSAL,OTHER,TOKEN,...Object.values(targets).flat()])assert.equal(text.includes(value),false);
 assert.equal(summary.containsSensitiveValues,false);
 assert.equal(summary.acceptanceDecisionUnchanged,true);
 assert.equal(text.includes('READY_FOR_NON_PRODUCTION_ACCEPTANCE'),false);
}
for(const council of Object.keys(targets))test(council+': exactly three fixed read-only endpoint requests',async()=>{
 const calls=[];
 const result=await diagnose(env(council),async(url,options)=>{calls.push({url,options});return response(calls.length===1?'paid':'available');});
 assert.equal(calls.length,3);
 for(const {url,options}of calls){
  assert.equal(url,targets[council][4]+'/api/planning-pack/status');
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  assert.equal(options.headers.cookie,COOKIE);assert.equal(options.headers['x-vercel-protection-bypass'],BYPASS);
  assert.equal(options.headers.Authorization,undefined);assert.ok(options.signal instanceof AbortSignal);
 }
 assert.deepEqual(calls.map(c=>JSON.parse(c.options.body)),[
 {projectId:targets[council][0],proposalBrief:PROPOSAL},
 {projectId:targets[council][0],proposalBrief:OTHER},
 {projectId:targets[council][1],proposalBrief:PROPOSAL}]);
 assert.equal(result.completed,true);assert.equal(result.reason,'three_scope_checks_match');
 assert.deepEqual(result.checks,{exactPaid:true,changedProposalNotPaid:true,otherProjectNotPaid:true,inputProposalsDiffer:true});noLeaks(result);
});
for(const [states,reason]of [
 [['waiting','available','available'],'exact_scope_not_paid'],
 [['available','available','available'],'exact_scope_not_paid'],
 [['paid','paid','available'],'changed_proposal_paid'],
 [['paid','available','paid'],'other_project_paid'],
 [['paid','revoked','refunded'],'three_scope_checks_match'],
])test('classifies '+states.join('/'),async()=>{
 let i=0;const result=await diagnose(env(),async()=>response(states[i++]));
 assert.equal(result.reason,reason);assert.equal(result.completed,true);noLeaks(result);
});
const invalid={
 GITHUB_REPOSITORY:'attacker/repo',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'b'.repeat(40),
 ITEM78C_DIAGNOSTIC_EXPECTED_SHA:'$(touch /tmp/never)',ITEM78C_DIAGNOSTIC_CONFIRMATION:'READ ONLY PREVIEW SCOPE CHECK; uname',
 ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT:'b'.repeat(40),ITEM74H_WORKFLOW_AUTHORIZED_COMMIT:SHA,
 PLANNING_PACK_CHECKOUT_ENABLED:'true',SUBMISSION_SEE_CHECKOUT_ENABLED:'true',ITEM78C_DIAGNOSTIC_COUNCIL:'PRODUCTION',
 PLANNERA_STRIPE_TEST_BASE_URL:'https://plannera-ab.vercel.app',PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:'https://attacker.invalid',
 PLANNERA_STRIPE_TEST_PROJECT_ID:'other',PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID:'other',PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID:'other',
 PLANNERA_STRIPE_TEST_PROPOSAL:'',PLANNERA_STRIPE_TEST_OTHER_PROPOSAL:'',
 PLANNERA_STRIPE_TEST_SESSION_COOKIE:'cookie\r\nInjected: true',PLANNERA_STRIPE_TEST_VERCEL_BYPASS:'short',
 PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON:'{invalid',
};
for(const [key,value]of Object.entries(invalid))test('denies invalid '+key+' before network',async()=>{
 let calls=0;const result=await diagnose({...env(),[key]:value},()=>{calls++;throw Error('unexpected');});
 assert.equal(calls,0);assert.equal(result.reason,'configuration_denied');assert.equal(result.council,null);noLeaks(result);
});
for(const suffix of ['/wrong','?query=1','#fragment'])test('rejects URL suffix '+suffix,async()=>{
 let calls=0;const e=env();e.PLANNERA_STRIPE_TEST_BASE_URL+=suffix;
 const result=await diagnose(e,()=>{calls++;});assert.equal(calls,0);assert.equal(result.reason,'configuration_denied');
});
test('rejects HTTP and URL credentials',async()=>{
 for(const url of [targets.BYRON[3].replace('https://','http://'),targets.BYRON[3].replace('https://','https://user:pass@')]){
 let calls=0;const result=await diagnose({...env(),PLANNERA_STRIPE_TEST_BASE_URL:url},()=>{calls++;});
 assert.equal(calls,0);assert.equal(result.reason,'configuration_denied');}
});
test('rejects extra DPP properties and oversized inputs',async()=>{
 const e=env();
 for(const change of [
 {PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON:JSON.stringify({...JSON.parse(e.PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON),extra:'x'})},
 {PLANNERA_STRIPE_TEST_PROPOSAL:'a'.repeat(32769)},{PLANNERA_STRIPE_TEST_SESSION_COOKIE:'a'.repeat(16385)}]){
 let calls=0;const result=await diagnose({...e,...change},()=>{calls++;});
 assert.equal(calls,0);assert.equal(result.reason,'configuration_denied');}
});
test('expiry fails closed',()=>{
 validateRequest(env(),Date.parse(EXPIRES_AT)-1);
 for(const now of [Date.parse(EXPIRES_AT),Date.parse(EXPIRES_AT)+1,NaN,0])assert.throws(()=>validateRequest(env(),now),/authorization_denied/);
});
test('shell-like proposal remains JSON data',async()=>{
 const e=env(),malicious='$(touch /tmp/never); " & || '+String.fromCharCode(96)+'uname';
 e.PLANNERA_STRIPE_TEST_PROPOSAL=malicious;
 e.PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON=JSON.stringify({projectId:targets.BYRON[0],proposalBrief:malicious});
 let calls=0;const result=await diagnose(e,async(_,options)=>{
 const body=JSON.parse(options.body);if(calls!==1)assert.equal(body.proposalBrief,malicious);
 return response(calls++===0?'paid':'available');});
 assert.equal(calls,3);assert.equal(JSON.stringify(result).includes(malicious),false);
});
for(const [name,make,reason]of [
 ...[401,403,404,500,302].map(code=>[String(code),()=>new Response('private raw error',{status:code}),[401,403,404].includes(code)?'http_'+code:'http_other']),
 ['html',()=>new Response('<html>private</html>'),'response_contract_invalid'],
 ['extra',()=>new Response(JSON.stringify({enabled:true,state:'paid',secret:COOKIE})),'response_contract_invalid'],
 ['unknown',()=>response('unrecognised'),'response_contract_invalid'],
 ['disabled',()=>new Response(JSON.stringify({enabled:false,state:'free'})),'checkout_disabled'],
 ['oversized',()=>new Response('x'.repeat(2049)),'response_contract_invalid'],
 ['empty',()=>new Response(null),'response_contract_invalid'],
])test('safe response failure '+name,async()=>{
 const result=await diagnose(env(),async()=>make());assert.equal(result.completed,false);assert.equal(result.checks,null);
 assert.deepEqual(Object.values(result.requestErrors),[reason,reason,reason]);assert.equal(JSON.stringify(result).includes('private'),false);noLeaks(result);
});
test('exceptions sanitized and partial states preserved',async()=>{
 let count=0;const result=await diagnose(env(),async()=>{if(count++===1)throw Error(COOKIE+BYPASS);return response('paid');});
 assert.equal(result.completed,false);assert.deepEqual(result.statuses,{exact:'paid',changedProposal:null,otherProject:'paid'});
 assert.equal(result.requestErrors.changedProposal,'network_or_redirect_denied');assert.equal(result.checks,null);noLeaks(result);
});
for(const other of [PROPOSAL,'  '+PROPOSAL+'  ','\t'+PROPOSAL+'\n'])test('identical normalized proposals denied: '+JSON.stringify(other),async()=>{
 const e=env();e.PLANNERA_STRIPE_TEST_OTHER_PROPOSAL=other;
 let calls=0;
 const result=await diagnose(e,async()=>response(calls++===0?'paid':'available'));
 assert.equal(calls,0);assert.equal(result.completed,false);
 assert.equal(result.reason,'configuration_denied');assert.equal(result.checks,null);
 assert.deepEqual(result.statuses,{exact:null,changedProposal:null,otherProject:null});noLeaks(result);
});
test('distinct trimmed proposals preserve normal diagnostic behavior',async()=>{
 const e=env();e.PLANNERA_STRIPE_TEST_PROPOSAL='  '+PROPOSAL+'  ';
 e.PLANNERA_STRIPE_TEST_OTHER_PROPOSAL='  '+OTHER+'  ';
 let calls=0;
 const result=await diagnose(e,async(_,options)=>{
 const body=JSON.parse(options.body);
 assert.equal(body.proposalBrief,calls===1?OTHER:PROPOSAL);
 return response(calls++===0?'paid':'available');});
 assert.equal(calls,3);assert.equal(result.completed,true);
 assert.equal(result.reason,'three_scope_checks_match');assert.equal(result.checks.inputProposalsDiffer,true);
});
test('Git evidence uses exact argument arrays',()=>{
 const calls=[];validateGit(env(),args=>{calls.push(args);return git(args);});
 assert.deepEqual(calls,[['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],
 ['rev-parse','HEAD'],['merge-base','--is-ancestor',ACCEPTANCE_SHA,SHA],['merge-base','--is-ancestor',SHA,'refs/remotes/origin/main']]);
});
for(const [name,override]of [
 ['fetch failure',args=>args[0]==='fetch'?{status:128}:git(args)],
 ['wrong checkout',args=>args[0]==='rev-parse'?{status:0,stdout:'b'.repeat(40)}:git(args)],
 ['not descendant',args=>args[0]==='merge-base'&&args[2]===ACCEPTANCE_SHA?{status:1}:git(args)],
 ['already main',args=>args[0]==='merge-base'&&args[2]===SHA?{status:0}:git(args)],
 ['main evidence error',args=>args[0]==='merge-base'&&args[2]===SHA?{status:128}:git(args)],
])test('denies '+name,()=>assert.throws(()=>validateGit(env(),override),/authorization_denied/));
test('exact branch protections accepted',()=>validateProtection(protection(),policies()));
test('unrelated protection rules remain compatible',()=>{
 const e=protection();e.protection_rules.push({type:'wait_timer',wait_timer:1},{type:'branch_policy'});
 validateProtection(e,policies());
});
for(const phase of ['credential-free','protected'])test('extra reviewer denies '+phase+' authorization',async()=>{
 const e=protection();e.protection_rules[0].reviewers.push({type:'User',reviewer:{id:1}});
 let calls=0;
 await assert.rejects(authorize(env(),phase,git,async url=>{
 calls++;return {ok:true,json:async()=>url.includes('deployment-branch-policies')?policies():e};
 }),/authorization_denied/);
 assert.equal(calls,2);
});
for(const [name,mutate]of [
 ['admin bypass',e=>{e.can_admins_bypass=true;}],['missing admin policy',e=>{delete e.can_admins_bypass;}],
 ['no reviewers',e=>{e.protection_rules=[];}],['wrong reviewer',e=>{e.protection_rules[0].reviewers[0].reviewer.id=1;}],
 ['extra user reviewer',e=>{e.protection_rules[0].reviewers.push({type:'User',reviewer:{id:1}});}],
 ['extra team reviewer',e=>{e.protection_rules[0].reviewers.push({type:'Team',reviewer:{id:106786418}});}],
 ['duplicate reviewer',e=>{e.protection_rules[0].reviewers.push({...e.protection_rules[0].reviewers[0]});}],
 ['team instead of Robbie',e=>{e.protection_rules[0].reviewers[0].type='Team';}],
 ['string reviewer ID',e=>{e.protection_rules[0].reviewers[0].reviewer.id='106786418';}],
 ['duplicate reviewer rule',e=>{e.protection_rules.push(structuredClone(e.protection_rules[0]));}],
 ['alternative reviewer rule',e=>{e.protection_rules.push({type:'required_reviewers',reviewers:[{type:'User',reviewer:{id:1}}]});}],
 ['protected branches',e=>{e.deployment_branch_policy.protected_branches=true;}],
 ['wildcard',(_,p)=>{p.branch_policies[0].name='*';}],['tag',(_,p)=>{p.branch_policies[0].type='tag';}],
 ['extra branch',(_,p)=>{p.total_count=3;p.branch_policies.push({name:'extra',type:'branch'});}],
 ['missing branch',(_,p)=>{p.total_count=1;p.branch_policies.pop();}],
 ['duplicate branch',(_,p)=>{p.branch_policies[0].name=ACCEPTANCE_BRANCH;}],
])test('denies protection '+name,()=>{const e=protection(),p=policies();mutate(e,p);assert.throws(()=>validateProtection(e,p),/authorization_denied/);});
for(const phase of ['credential-free','protected'])test('authorizes '+phase+' with mocked metadata only',async()=>{
 let calls=0;await authorize(env(),phase,git,async(url,options)=>{
 calls++;assert.match(url,/^https:\/\/api\.github\.com\/repos\/RobbieTall\/Plannera-ab\/environments\/item78c-(byron|kempsey)-preview/);
 assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
 return {ok:true,json:async()=>url.includes('deployment-branch-policies')?policies():protection()};});assert.equal(calls,4);
});
test('failed protected pin stops metadata calls',async()=>{
 let calls=0;await assert.rejects(authorize({...env(),ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT:'bad'},'protected',git,()=>{calls++;}));assert.equal(calls,0);
});
test('invalid dispatch stops Git and network',async()=>{
 let calls=0;await assert.rejects(authorize({...env(),GITHUB_REF:'refs/heads/main'},'credential-free',()=>{calls++;},()=>{calls++;}));assert.equal(calls,0);
});
for(const [name,request]of [
 ['metadata denied',async()=>({ok:false})],['metadata network error',async()=>{throw Error('synthetic private error');}],
 ['metadata malformed',async()=>({ok:true,json:async()=>({})})],
])test(name+' fails closed',async()=>assert.rejects(authorize(env(),'credential-free',git,request)));
test('CLIs refuse missing configuration without secret output',()=>{
 for(const [script,args]of [['scripts/item78c-paid-scope-authorize.mjs',['credential-free']],['scripts/item78c-paid-scope-diagnostic.mjs',[]]]){
 const result=spawnSync(process.execPath,[script,...args],{cwd:new URL('..',import.meta.url),
 env:{PLANNERA_STRIPE_TEST_SESSION_COOKIE:COOKIE},encoding:'utf8',timeout:10000});
 assert.equal(result.status,1);assert.equal(result.stderr,'');assert.equal(result.stdout.includes(COOKIE),false);}
});
test('workflow gates credential placement and preserves old jobs',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/item78c-session-preflight.yml',import.meta.url),'utf8');
 const prerequisite=workflow.split('\n  scope-authorize:')[1].split('\n  scope-diagnose:')[0];
 const execution=workflow.split('\n  scope-diagnose:')[1],open='$'+'{{';
 assert.doesNotMatch(prerequisite,/secrets\./);assert.match(execution,/needs: scope-authorize/);
 assert.ok(execution.includes('environment: '+open+' matrix.environment }}'));
 assert.ok(execution.indexOf('node scripts/item78c-paid-scope-authorize.mjs protected')<execution.indexOf('secrets.'));
 assert.equal((execution.match(/secrets\./g)||[]).length,5);
 assert.doesNotMatch(prerequisite+execution,/npm |npx |prisma |upload-artifact|continue-on-error|DATABASE_URL|STRIPE_SECRET_KEY|BLOB_READ_WRITE_TOKEN|VERCEL_TOKEN/);
 assert.match(execution,/ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT/);assert.match(execution,/ITEM74H_WORKFLOW_AUTHORIZED_COMMIT/);
 assert.equal(workflow.split('if: '+open+' !inputs.scope_only }}').length-1,2);
 assert.match(workflow,/scope_only:[\s\S]*?default: false/);
 for(const line of workflow.split('\n').filter(l=>l.trim().startsWith('run:')))assert.equal(line.includes(open),false);
 for(const match of workflow.matchAll(/uses: ([^\s]+)/g))assert.match(match[1],/^[\w/-]+@[a-f0-9]{40}$/);
});
test('new diagnostic branch automatic deployment disabled',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.equal(config.git.deploymentEnabled[BRANCH],false);
});
