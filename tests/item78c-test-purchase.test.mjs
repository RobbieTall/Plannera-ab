import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ACCEPTANCE_SHA, BRANCH, validateProtection, authorize } from '../scripts/item78c-test-purchase-authorize.mjs';
import { TARGETS, OPERATION, ACCOUNT, configuration, prepare, validateSession } from '../scripts/item78c-test-purchase-prepare.mjs';
import { safeSummary } from '../scripts/item78c-test-purchase-summary.mjs';

const NOW=Date.parse('2026-09-28T12:00:00Z'), SHA='a'.repeat(40);
mock.method(Date,'now',()=>NOW);
const hash=s=>createHash('sha256').update(s.replace(/\s+/g,' ').trim().toLowerCase()).digest('hex');
function envFor(council='BYRON'){
 const t=TARGETS[council],proposal='Synthetic replacement machinery shed';
 return {
  GITHUB_REPOSITORY:'RobbieTall/Plannera-ab',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REF:'refs/heads/'+BRANCH,GITHUB_SHA:SHA,ITEM78C_PREPARE_ONLY:'true',
  ITEM78C_PREPARE_EXPECTED_SHA:SHA,ITEM78C_PREPARE_CONFIRMATION:'PREPARE TWO PREVIEW TEST PURCHASES',
  ITEM78C_PREPARE_TARGET_CONFIRMATION:'PROTECTED NON-PRODUCTION',
  PLANNING_PACK_CHECKOUT_ENABLED:'false',SUBMISSION_SEE_CHECKOUT_ENABLED:'false',
  ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT:SHA,ITEM74H_WORKFLOW_AUTHORIZED_COMMIT:ACCEPTANCE_SHA,
  ITEM78C_PREPARE_COUNCIL:council,PLANNERA_STRIPE_TEST_BASE_URL:t.alias,
  PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL:t.alias,PLANNERA_STRIPE_TEST_PROJECT_ID:t.project,
  PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID:t.other,PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID:t.qsc,
  ITEM74H_AUTHORIZED_DATABASE_TARGET:t.endpoint,PLANNERA_STRIPE_TEST_PROPOSAL:proposal,
  PLANNERA_STRIPE_TEST_OTHER_PROPOSAL:'Different synthetic proposal',
  PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON:JSON.stringify({projectId:t.project,proposalBrief:proposal}),
  ITEM74H_PREVIEW_DATABASE_URL:'postgresql://synthetic:synthetic@'+t.endpoint+'.ap-southeast-2.aws.neon.tech/neondb?sslmode=require',
  STRIPE_TEST_SECRET_KEY:'sk_test_SYNTHETIC01234567890123456789',ITEM78A_STRIPE_TEST_SESSION_ID:'cs_test_OldSynthetic',
  PLANNERA_STRIPE_TEST_SESSION_COOKIE:'next-auth.session-token=synthetic-token',
  PLANNERA_STRIPE_TEST_VERCEL_BYPASS:'syntheticBypass000000',ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN:'synthetic-vercel',
  GH_TOKEN:'synthetic-github',
 };
}
function fixture(council='BYRON'){
 const env=envFor(council),config=configuration(env,NOW),t=config.target;
 const scope={userId:'synthetic-user',projectId:t.project,quickSiteCheckArtefactId:t.qsc,
  proposalFingerprint:config.proposalFingerprint,productCode:'planning_controls_pack',productVersion:'v1',
  scopeKey:'synthetic-new-scope',amountMinor:4900,currency:'AUD'};
 const source={...scope,id:'old-purchase',scopeKey:'synthetic-old-scope',proposalFingerprint:hash('Old synthetic proposal'),
  status:'PAID',providerName:'stripe',providerReference:config.oldSessionId};
 source.entitlement={...source,purchaseId:source.id,activeScopeKey:source.scopeKey,status:'ACTIVE'};
 const state={source,scope,purchases:[],sessions:[],creates:0,attaches:0,opens:0,closed:0,
  account:ACCOUNT,tax:true,hook:true,negativePaid:false,events:[],failCreate:false,mutateOld:false};
 const checkout=p=>({id:'cs_test_Replacement'+council,livemode:false,mode:'payment',status:'open',payment_status:'unpaid',
  metadata:{purchase_id:p.id,item78c_operation:OPERATION,item78c_council:council},
  amount_total:4900,currency:'aud',automatic_tax:{enabled:true},expires_at:NOW/1000+3600,
  url:'https://checkout.stripe.com/c/pay/cs_test_Replacement'+council,
  success_url:t.alias+'/projects/'+t.project+'/workspace?checkout=success',
  cancel_url:t.alias+'/projects/'+t.project+'/workspace?checkout=cancelled'});
 const db={session:{findUnique:async()=>({userId:scope.userId,expires:new Date(NOW+3600000)})},
  project:{findUnique:async()=>({userId:scope.userId,siteContext:{lgaName:council}})},
  purchase:{findMany:async a=>a.where.providerReference?[state.source]:state.purchases,
   findUnique:async()=>state.source}};
 const service={resolveScope:async()=>state.scope,
  findCurrentScopePurchaseStatus:async p=>({state:p.projectId!==t.project||p.proposalBrief!==config.proposal
   ?(state.negativePaid?'paid':'available'):(state.purchases.length?'waiting':'available')}),
  attachProviderCheckout:async(id,ref)=>{state.attaches++;state.purchases[0].providerReference=ref;}};
 const stripe={accounts:{retrieve:async()=>({id:state.account})},
  tax:{settings:{retrieve:async()=>({status:state.tax?'active':'pending'})},
   registrations:{list:async()=>({data:[{country:'AU',status:'active',livemode:false}],has_more:false})}},
  webhookEndpoints:{list:async()=>({data:state.hook?[{livemode:false,status:'enabled',
   url:t.alias+'/api/webhooks/stripe',enabled_events:['checkout.session.completed']}]:[],has_more:false})},
  checkout:{sessions:{list:async()=>({data:state.sessions,has_more:false}),
   retrieve:async id=>id===config.oldSessionId?{id,livemode:false,payment_status:'paid',status:'complete',
    metadata:{purchase_id:source.id}}:state.sessions.find(s=>s.id===id)}}};
 const runtime={db,stripe,service,close:async()=>{state.closed++;},createCheckout:async()=>{
  state.creates++;let p=state.purchases[0];
  if(!p){p={...scope,id:'new-purchase',status:'PENDING',providerName:'stripe',createdAt:new Date(NOW)};state.purchases.push(p);}
  const s=checkout(p);state.sessions.push(s);
  if(state.failCreate)throw new Error('PRIVATE_TRANSITIVE_ERROR');
  p.providerReference=s.id;if(state.mutateOld)state.source.status='CANCELLED';return {id:s.id,url:s.url};
 }};
 const deployment={id:t.deployment,readyState:'READY',target:null,projectId:'prj_zrdipeAvEKDJWlMDarjpDaxkHsVv',
  meta:{githubCommitSha:t.sha,githubCommitRef:t.branch},alias:[new URL(t.alias).hostname]};
 const request=async(url,options)=>{state.events.push('deployment');assert.equal(options.redirect,'error');
  assert.match(url,/^https:\/\/api\.vercel\.com\/v13\/deployments\/dpl_/);return new Response(JSON.stringify(deployment));};
 const open=async()=>{state.events.push('runtime');state.opens++;return runtime;};
 return {env,config,state,runtime,deployment,open,request,checkout,run:()=>prepare(env,open,request,NOW)};
}
const protection={deployment_branch_policy:{custom_branch_policies:true,protected_branches:false},
 can_admins_bypass:false,protection_rules:[{type:'required_reviewers',reviewers:[{type:'User',reviewer:{id:106786418}}]}]};
const policies={total_count:2,branch_policies:[{type:'branch',name:BRANCH},
 {type:'branch',name:'accept/item-78c-byron-kempsey-20260914'}]};
const git=a=>({status:a[0]==='merge-base'&&a.at(-1)==='refs/remotes/origin/main'?1:0,stdout:SHA+'\n'});
const gh=async u=>({ok:true,json:async()=>u.includes('/deployment-branch-policies')?policies:protection});
for(const council of ['BYRON','KEMPSEY']){
 test(council+' create once and recover exact Checkout on replay',async()=>{
  const f=fixture(council),old=JSON.stringify(f.state.source),r=await f.run();
  assert.equal(r.prepared,true);assert.equal(r.reason,'prepared');
  assert.deepEqual(f.state.events,['deployment','runtime']);
  const retry=await f.run();assert.equal(retry.prepared,true);assert.equal(retry.reason,'recovered');
  assert.equal(f.state.creates,1);assert.equal(f.state.purchases.length,1);assert.equal(f.state.sessions.length,1);
  assert.equal(JSON.stringify(f.state.source),old);assert.equal(r.paymentPerformed,false);
  assert.equal(safeSummary(JSON.stringify(r),council,'success').passed,true);
 });
 test(council+' uncertain provider creation recovers without duplicate',async()=>{
  const f=fixture(council);f.state.failCreate=true;
  const r=await f.run();assert.equal(r.prepared,false);assert.equal(r.mutationMayHaveOccurred,true);
  assert.equal(r.reason,'preparation_failed');
  const retry=await f.run();assert.equal(retry.prepared,true);assert.equal(retry.reason,'recovered');
  assert.equal(f.state.creates,1);assert.equal(f.state.attaches,1);
 });
 test(council+' already paid operation is never paid or created again',async()=>{
  const f=fixture(council);await f.run();Object.assign(f.state.sessions[0],{status:'complete',payment_status:'paid',url:null});
  f.state.purchases[0].status='PAID';
  const r=await f.run();assert.equal(r.prepared,true);assert.equal(r.reason,'operation_already_paid');
  assert.equal(r.paymentPerformed,false);assert.equal(f.state.creates,1);
 });
}
for(const hasReference of [true,false])test('PAID purchase with unpaid Checkout refuses without mutation; reference='+hasReference,async()=>{
 const f=fixture();await f.run();
 f.state.purchases[0].status='PAID';
 if(!hasReference)f.state.purchases[0].providerReference=null;
 const before=JSON.stringify(f.state.purchases),old=JSON.stringify(f.state.source);
 const creates=f.state.creates,attaches=f.state.attaches;
 const r=await f.run();
 assert.equal(r.prepared,false);assert.equal(r.reason,'preflight_refused');
 assert.equal(r.mutationMayHaveOccurred,false);assert.equal(r.paymentPerformed,false);
 assert.equal(f.state.creates,creates);assert.equal(f.state.attaches,attaches);
 assert.equal(JSON.stringify(f.state.purchases),before);assert.equal(JSON.stringify(f.state.source),old);
});
const invalids=[
 ['ITEM78C_PREPARE_ONLY','false'],['ITEM78C_PREPARE_CONFIRMATION','$(touch /tmp/never)'],
 ['ITEM78C_PREPARE_EXPECTED_SHA','a'.repeat(40)+';id'],['GITHUB_REF','refs/heads/main'],
 ['GITHUB_EVENT_NAME','push'],['GITHUB_REPOSITORY','attacker/fork'],
 ['ITEM78C_PREPARE_TARGET_CONFIRMATION','PRODUCTION'],['ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT','b'.repeat(40)],
 ['ITEM74H_WORKFLOW_AUTHORIZED_COMMIT','b'.repeat(40)],['PLANNING_PACK_CHECKOUT_ENABLED','true'],
 ['SUBMISSION_SEE_CHECKOUT_ENABLED','true'],['ITEM78C_PREPARE_COUNCIL','PRODUCTION'],
 ['PLANNERA_STRIPE_TEST_BASE_URL','https://plannera-ab.vercel.app'],['PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL',TARGETS.KEMPSEY.alias],
 ['PLANNERA_STRIPE_TEST_PROJECT_ID',TARGETS.KEMPSEY.project],['PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID','wrong'],
 ['ITEM74H_AUTHORIZED_DATABASE_TARGET',TARGETS.KEMPSEY.endpoint],
 ['ITEM74H_PREVIEW_DATABASE_URL','postgresql://u:p@localhost/neondb?sslmode=require'],
 ['ITEM74H_PREVIEW_DATABASE_URL','postgresql://u:p@'+TARGETS.BYRON.endpoint+'.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&host=evil'],
 ['STRIPE_TEST_SECRET_KEY','sk_live_012345678901234567890'],['ITEM78A_STRIPE_TEST_SESSION_ID','cs_test_ok/../../secret'],
 ['ITEM78A_STRIPE_TEST_SESSION_ID','cs_test_'],['ITEM78A_STRIPE_TEST_SESSION_ID','cs_test_'+'a'.repeat(248)],
 ['PLANNERA_STRIPE_TEST_SESSION_COOKIE','next-auth.session-token=a;next-auth.session-token=a'],
 ['PLANNERA_STRIPE_TEST_SESSION_COOKIE','next-auth.session-token=a;__Secure-next-auth.session-token=b'],
 ['PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON','{"projectId":"wrong","proposalBrief":"wrong"}'],
 ['PLANNERA_STRIPE_TEST_OTHER_PROPOSAL','Synthetic replacement machinery shed'],['ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN','']];
for(const [i,[field,value]] of invalids.entries())test('configuration guard '+i+' '+field,async()=>{
 const f=fixture();f.env[field]=value;let calls=0;
 const r=await prepare(f.env,async()=>{calls++;throw Error();},async()=>{calls++;throw Error();},NOW);
 assert.equal(r.reason,'configuration_denied');assert.equal(calls,0);
});
test('expiry denies',()=>assert.throws(()=>configuration(envFor(),Date.parse('2026-09-30T00:00:00Z'))));
test('malicious dispatch fails before git/network',async()=>{
 const e=envFor();e.ITEM78C_PREPARE_EXPECTED_SHA='$(curl attacker)';let calls=0;
 await assert.rejects(authorize(e,'credential-free',()=>{calls++;},async()=>{calls++;}));assert.equal(calls,0);
});
test('actual policies pass independent authorization',async()=>{await authorize(envFor(),'credential-free',git,gh);});
test('protected authorization needs new pin before API',async()=>{
 const e=envFor();delete e.ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT;let calls=0;
 await assert.rejects(authorize(e,'protected',git,async()=>{calls++;}));assert.equal(calls,0);
 await authorize(envFor(),'protected',git,gh);
});
test('Git ancestry rejects main-contained commit despite permitted branch',async()=>{
 await assert.rejects(authorize(envFor(),'credential-free',()=>({status:0,stdout:SHA+'\n'}),gh));
});
test('Git ancestry rejects missing acceptance ancestor',async()=>{
 await assert.rejects(authorize(envFor(),'credential-free',a=>({status:a[0]==='merge-base'?1:0,stdout:SHA+'\n'}),gh));
});
for(const mode of ['bypass','reviewer','wildcard','tag','extra'])test('protection rejects '+mode,()=>{
 const p=structuredClone(protection),q=structuredClone(policies);
 if(mode==='bypass')p.can_admins_bypass=true;if(mode==='reviewer')p.protection_rules=[];
 if(mode==='wildcard')q.branch_policies[0].name='*';if(mode==='tag')q.branch_policies[0].type='tag';
 if(mode==='extra'){q.total_count++;q.branch_policies.push({type:'branch',name:'other'});}
 assert.throws(()=>validateProtection(p,q));
});
for(const field of ['target','sha','alias','deployment'])test('deployment '+field+' refuses before runtime',async()=>{
 const f=fixture();if(field==='target')f.deployment.target='production';
 if(field==='sha')f.deployment.meta.githubCommitSha='0'.repeat(40);
 if(field==='alias')f.deployment.alias=[];if(field==='deployment')f.deployment.id='wrong';
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.opens,0);
});
for(const field of ['account','tax','hook','old-unpaid','entitlement','qsc','negative','project-owner'])
 test('preflight '+field+' refuses writes',async()=>{
  const f=fixture();if(field==='account')f.state.account='acct_other';if(field==='tax')f.state.tax=false;
  if(field==='hook')f.state.hook=false;if(field==='old-unpaid')f.state.source.status='PENDING';
  if(field==='entitlement')f.state.source.entitlement.status='REVOKED';
  if(field==='qsc')f.state.scope.quickSiteCheckArtefactId='changed';if(field==='negative')f.state.negativePaid=true;
  if(field==='project-owner')f.runtime.db.project.findUnique=async()=>({userId:'other'});
  assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,0);
 });
test('duplicate pending scopes refuse',async()=>{
 const f=fixture();f.state.purchases.push({...f.state.scope,id:'one',status:'PENDING'},{...f.state.scope,id:'two',status:'PENDING'});
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,0);
});
test('duplicate operation sessions refuse',async()=>{
 const f=fixture();await f.run();f.state.sessions.push({...f.state.sessions[0],id:'cs_test_Another'});
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,1);
});
test('same operation changed proposal refuses',async()=>{
 const f=fixture();await f.run();f.state.purchases=[];
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,1);
});
test('old pending intent outside recovery window refuses',async()=>{
 const f=fixture();f.state.purchases.push({...f.state.scope,id:'pending',status:'PENDING',createdAt:new Date(NOW-3600001)});
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,0);
});
test('unrelated provider reference refuses',async()=>{
 const f=fixture();f.state.purchases.push({...f.state.scope,id:'pending',status:'PENDING',providerReference:'cs_test_Unknown'});
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,0);
});
test('exhausted pagination refuses',async()=>{
 const f=fixture();let i=0;f.runtime.stripe.checkout.sessions.list=async()=>({data:[{id:'page'+i++}],has_more:true});
 assert.equal((await f.run()).prepared,false);assert.equal(i,20);assert.equal(f.state.creates,0);
});
test('expired recovery is not replaced automatically',async()=>{
 const f=fixture();await f.run();f.state.sessions[0].expires_at=NOW/1000-1;
 assert.equal((await f.run()).prepared,false);assert.equal(f.state.creates,1);
});
test('old purchase change detected without rollback',async()=>{
 const f=fixture();f.state.mutateOld=true;const r=await f.run();
 assert.equal(r.prepared,false);assert.equal(r.oldPurchasePreserved,false);assert.equal(r.reason,'preparation_failed');
});
test('errors and credentials never enter summary',async()=>{
 const f=fixture();f.state.failCreate=true;const raw=JSON.stringify(await f.run());
 for(const value of [f.env.STRIPE_TEST_SECRET_KEY,f.env.ITEM74H_PREVIEW_DATABASE_URL,
  f.env.PLANNERA_STRIPE_TEST_SESSION_COOKIE,'PRIVATE_TRANSITIVE_ERROR','cs_test_'])assert.equal(raw.includes(value),false);
});
for(const field of ['livemode','amount_total','metadata','success_url','url'])test('session rejects '+field,()=>{
 const f=fixture(),p={id:'new'},s=f.checkout(p);if(field==='livemode')s.livemode=true;
 if(field==='amount_total')s.amount_total=74900;if(field==='metadata')s.metadata.item78c_council='KEMPSEY';
 if(field==='success_url')s.success_url='https://plannera-ab.vercel.app/';
 if(field==='url')s.url='https://checkout.stripe.com.attacker.example/c/pay/'+s.id;
 assert.throws(()=>validateSession(s,p,f.config));
});
test('summary refuses extras/council mismatch/log injection and failed process',async()=>{
 const f=fixture(),r=await f.run();
 assert.throws(()=>safeSummary(JSON.stringify({...r,secret:'never-print'}),'BYRON','success'));
 assert.throws(()=>safeSummary(JSON.stringify(r),'KEMPSEY','success'));
 assert.throws(()=>safeSummary('transitive log\n'+JSON.stringify(r),'BYRON','success'));
 assert.equal(safeSummary(JSON.stringify(r),'BYRON','failure').passed,false);
});
const workflow=readFileSync(new URL('../.github/workflows/stripe-test-session-prepare.yml',import.meta.url),'utf8');
test('workflow isolates legacy path and serializes protected replacement',()=>{
 assert.match(workflow,/!inputs\.item78c_prepare_only && github\.ref == 'refs\/heads\/main'/);
 for(const pattern of [/needs: item78c-authorize/,/max-parallel: 1/,/cancel-in-progress: false/,
  /environment: \$\{\{ matrix\.environment \}\}/,
  /ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT: \$\{\{ vars\.ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT \}\}/])assert.match(workflow,pattern);
});
test('new mode no shell input interpolation, artifacts, builds or migrations',()=>{
 const added=workflow.slice(workflow.indexOf('  item78c-authorize:'));
 const commands=added.split('\n').filter(l=>/^\s+run:|^\s{10}(?:node|umask|rm)/.test(l));
 assert.equal(commands.some(l=>l.includes('$'+'{{')),false);
 assert.doesNotMatch(added,/upload-artifact|npm run build|prisma migrate|db push|refund/i);
});
test('application credentials only final protected execution step',()=>{
 const added=workflow.slice(workflow.indexOf('  item78c-authorize:'));
 assert.doesNotMatch(added.slice(0,added.indexOf('  item78c-prepare:')),/secrets\./);
 const steps=added.slice(added.indexOf('  item78c-prepare:'));
 const start=steps.indexOf('      - name: Prepare or recover'),end=steps.indexOf('      - name: Emit allowlisted');
 assert.doesNotMatch(steps.slice(0,start),/secrets\./);assert.doesNotMatch(steps.slice(end),/secrets\./);
 assert.match(steps.slice(0,start),/item78c-test-purchase-authorize\.mjs protected/);
 assert.match(steps,/node --import tsx .* > "\$RUNNER_TEMP\/item78c-replacement\.json" 2> "\$RUNNER_TEMP\/item78c-replacement\.stderr"/);
 assert.match(steps,/if: \$\{\{ always\(\) \}\}/);
});
