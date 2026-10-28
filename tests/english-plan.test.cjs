// Run: node --test tests/english-plan.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../english.js'),'utf8');
const sandbox={window:{},Date,Intl,Number,Math,Array,Object,String,Set,RegExp,JSON};
vm.runInNewContext(source,sandbox,{filename:'english.js'});
const english=sandbox.window.KhotwaEnglish;
test('100 hours split into 30 days of eight 25-minute segments',()=>{
 assert.equal(english.plan(360000,1).start,0);
 assert.equal(english.plan(360000,30).end,360000);
 for(let d=1;d<=30;d++){
  const range=english.plan(360000,d);
  assert.equal(range.end-range.start,12000);
  for(let s=0;s<8;s++){
   const chunk=english.plan(360000,d,s);
   assert.equal(chunk.end-chunk.start,1500);
   if(s<7)assert.equal(chunk.end,english.plan(360000,d,s+1).start);
  }
  if(d<30)assert.equal(range.end,english.plan(360000,d+1).start);
 }
});
test('study progress, notes and manual completion are persisted',async()=>{
 const store=new Map();
 const api={getMeta:k=>store.get(k),setMeta:async(k,v)=>store.set(k,JSON.parse(JSON.stringify(v))),render:()=>{},notify:()=>{}};
 await english.action('eng-start-plan',{},api);
 await english.action('eng-check',{dataset:{segment:'0'}},api);
 assert.equal(store.get('englishPlan').days[1].checks[0],true);
 await english.action('eng-select-day',{dataset:{day:'12'}},api);
 await english.change({id:'eng-notes',value:'I can learn every day.'},api);
 await english.action('eng-complete-day',{},api);
 assert.equal(store.get('englishPlan').days[12].notes,'I can learn every day.');
 assert.equal(store.get('englishPlan').days[12].completed,true);
 assert.match(english.view(api),/12\/30|1\/30/);
});
test('untrusted notes are escaped before HTML rendering',async()=>{
 const store=new Map();
 const api={getMeta:k=>store.get(k),setMeta:async(k,v)=>store.set(k,v),render:()=>{},notify:()=>{}};
 await english.change({id:'eng-notes',value:'<script>alert(1)</script>'},api);
 const markup=english.view(api);
 assert.ok(markup.includes('&lt;script&gt;'));
 assert.ok(!markup.includes('<script>alert(1)</script>'));
});
