(function englishModule(){
'use strict';
const VIDEO_ID='nSrjNHK6slw', DAYS=30, SEGMENTS=8, INITIAL_SECONDS=100*3600;
const ESC_MAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>ESC_MAP[ch]);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const pad=n=>String(n).padStart(2,'0');
function time(seconds){let s=Math.floor(Math.max(0,seconds));return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;}
function plan(total,day,segment=null){
 const start=Math.round(total*(day-1)/DAYS),end=Math.round(total*day/DAYS);
 if(segment===null)return{start,end};
 return{start:Math.round(start+(end-start)*segment/SEGMENTS),end:Math.round(start+(end-start)*(segment+1)/SEGMENTS)};
}
function normalized(raw){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const total=Number(r.totalSeconds);
 const s={totalSeconds:Number.isFinite(total)&&total>=3600&&total<=200*3600?Math.round(total):INITIAL_SECONDS,
 selectedDay:clamp(Math.floor(Number(r.selectedDay)||1),1,DAYS),
 startDate:typeof r.startDate==='string'?r.startDate:null,
 days:{}};
 for(let day=1;day<=DAYS;day++){
  const d=r.days?.[day]||{};
  const range=plan(s.totalSeconds,day);
  s.days[day]={checks:Array.from({length:SEGMENTS},(_,i)=>d.checks?.[i]===true),
   completed:d.completed===true,
   practice:d.practice===true,
   notes:typeof d.notes==='string'?d.notes.slice(0,2000):'',
   lastSecond:clamp(Number.isFinite(Number(d.lastSecond))?Number(d.lastSecond):range.start,range.start,range.end)};
 }
 return s;
}
function prettyDate(day,startDate){
 if(!startDate||!/^\d{4}-\d\d-\d\d$/.test(startDate))return '';
 const d=new Date(startDate+'T12:00:00');
 if(!Number.isFinite(+d))return '';
 d.setDate(d.getDate()+day-1);
 return new Intl.DateTimeFormat('ar-DZ',{day:'numeric',month:'short'}).format(d);
}
let playing=null;
function view(api){
 const s=normalized(api.getMeta('englishPlan'));
 const day=s.selectedDay,d=s.days[day],range=plan(s.totalSeconds,day);
 const completed=Object.values(s.days).filter(x=>x.completed).length;
 const sessions=Object.values(s.days).reduce((n,x)=>n+x.checks.filter(Boolean).length,0);
 const count=d.checks.filter(Boolean).length;
 const remaining=DAYS-completed;
 const videoShown=playing&&playing.day===day;
 const ytHref=(sec)=>`https://www.youtube.com/watch?v=${VIDEO_ID}&t=${Math.floor(sec)}s`;
 const percent=Math.round(completed/DAYS*100);
 const lessonButtons=Array.from({length:SEGMENTS},(_,i)=>{
  const part=plan(s.totalSeconds,day,i),checked=d.checks[i];
  return `<div class="eng-segment ${checked?'is-done':''}">
    <div class="eng-segment-details"><b>الحصة ${i+1}</b><span dir="ltr">${time(part.start)} – ${time(part.end)}</span></div>
    <div class="eng-segment-actions">
     <button class="btn tiny ${videoShown&&playing.segment===i?'primary':'secondary'}" data-action="eng-play" data-segment="${i}" aria-label="شغّل الحصة ${i+1}">▶ تشغيل</button>
     <button class="btn tiny ${checked?'primary':'secondary'}" data-action="eng-check" data-segment="${i}" aria-pressed="${checked}">${checked?'✓ تمت':'علّم كمكتملة'}</button>
    </div></div>`;
 }).join('');
 const days=Array.from({length:DAYS},(_,idx)=>{
  const i=idx+1,r=plan(s.totalSeconds,i),done=s.days[i].completed,n=s.days[i].checks.filter(Boolean).length;
  return `<button class="eng-day ${day===i?'selected':''} ${done?'finished':''}" data-action="eng-select-day" data-day="${i}" aria-pressed="${day===i}">
     <span class="eng-day-top"><b>اليوم ${pad(i)}</b><span>${done?'✓':`${n}/8`}</span></span>
     <small>${prettyDate(i,s.startDate)||`من ${time(r.start)}`}</small>
   </button>`;
 }).join('');
 const footer=`<p class="eng-note">هذه تقسيمة زمنية من 100 ساعة بحسب وصف الدورة، وليست فهرساً مؤكداً لمواضيع الفيديو. علامات الإنجاز يدوية؛ تشغيل الفيديو وحده لا يعني أنك شاهدت الحصة كاملة. إذا اختلفت المدة الحقيقية، عدّلها من إعدادات الخطة.</p>`;
 return `<div class="eng-root">
  <header class="page-head"><div><div class="eyebrow">KHOTWA • ENGLISH JOURNEY</div><h1>الإنجليزية في 30 يوم 🇬🇧</h1><p>قسّمنا محتوى الدورة إلى حصص صغيرة. تقدّم بالراحة تاعك، وارجع وين حبست.</p></div></header>
  <section class="eng-hero">
    <div class="eng-hero-upper"><span class="eng-pill">دورة دليلك للإنجليزي</span><span class="eng-pill">30 يوم</span></div>
    <h2>مهمة كبيرة، خطوات صغيرة.</h2>
    <p>البرنامج المكثّف الكامل: <strong>${Math.round(s.totalSeconds/3600*10)/10} ساعة</strong> من الفيديو على 30 يوم. كل يوم <strong>${time(range.end-range.start)}</strong> = 8 حصص قصيرة. ماشي لازم تكمل كل شيء دفعة واحدة.</p>
    <div class="eng-figures"><div><b>${completed}/30</b><span>أيام مكتملة</span></div><div><b>${sessions}/240</b><span>حصص تعلّمتها</span></div><div><b>${remaining}</b><span>يوم باقي</span></div></div>
    <div class="eng-progress" role="progressbar" aria-label="تقدم خطة الإنجليزية" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div>
    <div class="eng-hero-actions">
      ${s.startDate?`<span class="eng-muted">بديت الخطة: ${esc(s.startDate)}</span>`:`<button class="btn secondary" data-action="eng-start-plan">ابدأ تحدي 30 يوم من اليوم</button>`}
      <button class="btn secondary" data-action="eng-next-pending">روح لأول يوم مازال</button>
    </div>
  </section>
  <div class="eng-columns">
    <section class="eng-main">
      <div class="eng-section-head"><div><div class="eyebrow">YOUR SESSION</div><h2>اليوم ${day} <small>${time(range.start)} → ${time(range.end)}</small></h2></div><span class="eng-pill">${count}/8 حصص</span></div>
      <div class="eng-video">
       ${videoShown?`<iframe id="eng-player" src="https://www.youtube-nocookie.com/embed/${VIDEO_ID}?start=${playing.second}&rel=0" title="دورة تعلم الإنجليزية - اليوم ${day}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`:`<div class="eng-video-placeholder"><span class="eng-play-symbol">▶</span><h3>درس اليوم جاهز</h3><p>ابدأ من الدقيقة اللي وقفت عندها، أو اختار حصة من القائمة.</p><button class="btn primary" data-action="eng-resume">▶ استأنف درس اليوم</button></div>`}
      </div>
      <div class="eng-tools">
        <button class="btn primary" data-action="eng-resume">▶ ${videoShown?'ارجع لآخر موضع':'استأنف من آخر موضع'}</button>
        <a class="btn secondary" href="${ytHref(d.lastSecond)}" target="_blank" rel="noopener noreferrer">افتح في YouTube ↗</a>
        <button class="btn secondary" data-action="eng-save-position">احفظ موضع جديد</button>
      </div>
      <p class="eng-muted">الموضع المحفوظ: <b dir="ltr">${time(d.lastSecond)}</b>. إذا منع YouTube التشغيل داخل الموقع، افتحه من الرابط الخارجي. التنقل بين الحصص يحفظ بدايتها تلقائياً.</p>
      <div class="eng-section-head" style="margin-top:24px"><h3>حصص اليوم — 25 دقيقة تقريباً</h3><span class="eng-muted">اختار حصة وكملها حسب قدرتك</span></div>
      <div class="eng-sessions">${lessonButtons}</div>
      <div class="eng-study-box">
       <label for="eng-notes"><strong>ملاحظات اليوم</strong> — كلمات وجمل جديدة</label>
       <textarea id="eng-notes" rows="3" maxlength="2000" placeholder="مثال: I would like to... / مثال صغير من الدرس">${esc(d.notes)}</textarea>
       <p class="eng-muted">الملاحظات تتحفظ محلياً عندما تخرج من الخانة.</p>
       <label class="eng-practice"><input id="eng-practice" type="checkbox" ${d.practice?'checked':''}/> جرّبت نستعمل الإنجليزية اليوم: كررت جملة أو تكلمت دقيقتين</label>
       <button class="btn ${d.completed?'secondary':'primary'} full" data-action="eng-complete-day">${d.completed?'✓ اليوم مكتمل — اضغط لإلغاء العلامة':'✓ علّم اليوم كمكتمل'}</button>
      </div>
      <div class="eng-move"><button class="btn secondary" data-action="eng-prev" ${day===1?'disabled':''}>السابق</button><button class="btn primary" data-action="eng-next" ${day===DAYS?'disabled':''}>اليوم التالي ←</button></div>
    </section>
    <aside class="eng-aside">
      <div class="eng-section-head"><h3>خريطة 30 يوم</h3><span class="eng-muted">${completed} مكتملة</span></div>
      <div class="eng-days">${days}</div>
      <div class="eng-setting"><h3>إعدادات المدة</h3><p>اعتمدنا 100 ساعة كما ورد في وصف الدورة. إذا شفت مدة مختلفة في YouTube، غيّرها هنا باش تتصحح نقاط البداية والنهاية تلقائياً.</p>
       <form id="eng-duration-form"><label for="eng-duration">المدة الكاملة بالساعات</label><div class="eng-duration-row"><input id="eng-duration" name="hours" type="number" min="1" max="200" step="0.01" value="${+(s.totalSeconds/3600).toFixed(2)}" required/><button class="btn secondary" type="submit">اعتمد</button></div></form>
      </div>
    </aside>
  </div>${footer}
 </div>`;
}
async function action(name,node,api){
 const s=normalized(api.getMeta('englishPlan'));
 const day=s.selectedDay,d=s.days[day];
 const paint=()=>{api.render();};
 const save=async()=>{await api.setMeta('englishPlan',{...s,days:s.days});};
 const select=async n=>{s.selectedDay=clamp(n,1,DAYS);playing=null;await save();paint();};
 switch(name){
 case 'eng-select-day':return select(Number(node.dataset.day));
 case 'eng-prev':return select(day-1);
 case 'eng-next':return select(day+1);
 case 'eng-next-pending':return select((Array.from({length:DAYS},(_,i)=>i+1).find(n=>!s.days[n].completed))||DAYS);
 case 'eng-start-plan':if(!s.startDate){const now=new Date();s.startDate=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;await save();paint();}return;
 case 'eng-play':{
  const seg=clamp(Number(node.dataset.segment)||0,0,SEGMENTS-1),start=plan(s.totalSeconds,day,seg).start;
  d.lastSecond=start;playing={day,segment:seg,second:start};await save();paint();return;
 }
 case 'eng-resume':{
  const sec=clamp(d.lastSecond,plan(s.totalSeconds,day).start,plan(s.totalSeconds,day).end);
  const seg=clamp(Math.floor((sec-plan(s.totalSeconds,day).start)/(plan(s.totalSeconds,day).end-plan(s.totalSeconds,day).start)*SEGMENTS),0,SEGMENTS-1);
  playing={day,segment:seg,second:Math.floor(sec)};paint();return;
 }
 case 'eng-check':{
  const n=Number(node.dataset.segment);if(!Number.isInteger(n)||n<0||n>=SEGMENTS)return;
  d.checks[n]=!d.checks[n];await save();paint();return;
 }
 case 'eng-complete-day':{
  d.completed=!d.completed;await save();paint();return;
 }
 case 'eng-save-position':{
  const input=prompt('اكتب توقيت الفيديو الحالي بصيغة HH:MM:SS (مثال 03:15:00)',time(d.lastSecond));
  if(input===null)return;
  const m=input.trim().match(/^(\d{1,3}):([0-5]\d):([0-5]\d)$/);
  if(!m){api.notify('التوقيت غير صحيح. استعمل HH:MM:SS.');return;}
  const sec=Number(m[1])*3600+Number(m[2])*60+Number(m[3]),r=plan(s.totalSeconds,day);
  if(sec<r.start||sec>r.end){api.notify(`توقيت اليوم لازم يكون بين ${time(r.start)} و${time(r.end)}.`);return;}
  d.lastSecond=sec;await save();api.notify('تحفظ التوقيت.');paint();return;
 }
 }
}
async function change(node,api){
 const s=normalized(api.getMeta('englishPlan')),d=s.days[s.selectedDay];
 if(node.id==='eng-notes'){d.notes=node.value.slice(0,2000);await api.setMeta('englishPlan',s);}
 if(node.id==='eng-practice'){d.practice=node.checked;await api.setMeta('englishPlan',s);}
}
async function submit(form,api){
 if(form.id!=='eng-duration-form')return false;
 const hours=Number(new FormData(form).get('hours'));
 if(!Number.isFinite(hours)||hours<1||hours>200){api.notify('المدة لازم تكون بين ساعة و200 ساعة.');return true;}
 const s=normalized(api.getMeta('englishPlan')),total=Math.round(hours*3600);
 if(total===s.totalSeconds){api.notify('المدة محفوظة بالفعل.');return true;}
 if(Object.values(s.days).some(d=>d.completed||d.checks.some(Boolean))){
  if(!confirm('تغيير المدة راح يبدّل بدايات ونهايات الحصص. علامات الإنجاز والملاحظات تبقى محفوظة. تواصل؟'))return true;
 }
 s.totalSeconds=total;
 for(let i=1;i<=DAYS;i++){const r=plan(total,i);s.days[i].lastSecond=r.start;}
 playing=null;await api.setMeta('englishPlan',s);api.render();return true;
}
window.KhotwaEnglish={view,action,change,submit,plan,time,normalized};
})();