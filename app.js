// ─── HELPERS ───────────────────────────────────────────
const P=v=>'₱'+parseFloat(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
const pct=(a,b)=>b===0?0:Math.min(100,Math.round((a/b)*100))
const uid=()=>Math.random().toString(36).slice(2,9)
const tod=()=>new Date().toISOString().slice(0,10)
const addD=(d,n)=>{const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()+n);return dt.toISOString().slice(0,10)}
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const fmtD=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}catch{return d}}
const monthName=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('en-PH',{month:'long',year:'numeric'})}catch{return d}}
const dleft=b=>{const endField=b.end||b.end_date||'';if(!endField)return 0;const e=new Date(endField+'T23:59:59'),n=new Date();const diff=Math.ceil((e-n)/(864e5));return isNaN(diff)?0:Math.max(0,diff)}

let _CH={}
let _trendView={} // per-budget trend chart type: 'bar'|'line'
function setTrendView(bid,type,btn){
  _trendView[bid]=type
  document.querySelectorAll(`#trend-bar-${bid},#trend-line-${bid}`).forEach(b=>{b.style.background='';b.style.color='';b.style.borderColor=''})
  if(btn){btn.style.background='var(--pink)';btn.style.color='#fff';btn.style.borderColor='transparent'}
  // Re-render just the chart
  const scope=btn?.closest('[id$="-bcontent"]')?.id?.includes('partner')?'partner':'mine'
  const cc=CC(); const b2=getBudget(bid); if(!b2)return
  const exps=budgetExps(bid); const byDate={}; exps.forEach(e=>{byDate[e.date]=(byDate[e.date]||0)+e.amt})
  const allDates=[]; let cur=new Date(b2.start+'T12:00:00'); const endD=new Date(b2.end+'T12:00:00')
  while(cur<=endD&&allDates.length<31){allDates.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1)}
  const canvas=document.getElementById('bLine-'+bid); if(!canvas)return
  const ctx=canvas.getContext('2d'); const g=ctx.createLinearGradient(0,0,0,175); g.addColorStop(0,cc.g1); g.addColorStop(1,cc.g2)
  mkChart('bLine-'+bid,{type,data:{labels:allDates.map(d=>d.slice(5)),datasets:[{label:'Daily Spend',data:allDates.map(d=>byDate[d]||0),borderColor:cc.pink,backgroundColor:type==='bar'?cc.pink+'cc':g,fill:type==='line',tension:.42,borderWidth:type==='bar'?0:2.5,borderRadius:type==='bar'?5:0,pointRadius:type==='line'?3:0,pointBackgroundColor:cc.pink,pointBorderColor:cc.bg2,pointBorderWidth:2,pointHoverRadius:7}]},options:{...bOpts(cc),scales:{...bOpts(cc).scales,x:{...bOpts(cc).scales.x,ticks:{...bOpts(cc).scales.x.ticks,maxTicksLimit:8}}}}})}
function mkChart(id,cfg){if(_CH[id])try{_CH[id].destroy()}catch(e){}; const el=document.getElementById(id);if(!el)return null;_CH[id]=new Chart(el,cfg);return _CH[id]}

// ─── CHART THEME ────────────────────────────────────────
function CC(){
  const d=document.documentElement.getAttribute('data-theme')==='dark'
  return {
    bg2:d?'#1a1018':'#fae6ed',txt:d?'#f5e8ef':'#2a1520',txt2:d?'#c090a8':'#7a4a5a',
    txt3:d?'#80506a':'#b08090',border:d?'#3a2030':'#e8c4d4',
    pink:d?'#e0607e':'#d4537e',teal:d?'#4dc898':'#3aaa7e',
    coin:d?'#f0b830':'#e0a020',purple:d?'#bb88d8':'#9b59b6',
    info:d?'#60b8f0':'#3498db',danger:d?'#ff6b6b':'#e74c3c',
    g1:d?'rgba(224,96,126,.85)':'rgba(212,83,126,.88)',g2:d?'rgba(224,96,126,0)':'rgba(212,83,126,0)',
    t1:d?'rgba(77,200,152,.7)':'rgba(58,170,126,.7)',t2:d?'rgba(77,200,152,0)':'rgba(58,170,126,0)',
  }
}
function bOpts(cc){
  return{responsive:true,maintainAspectRatio:false,animation:{duration:700,easing:'easeOutQuart'},
    plugins:{legend:{display:false},tooltip:{backgroundColor:cc.bg2,titleColor:cc.txt,bodyColor:cc.txt2,borderColor:cc.border,borderWidth:1.5,cornerRadius:12,padding:11,titleFont:{family:'Quicksand',weight:'700',size:13},bodyFont:{family:'DM Sans',size:12}}},
    scales:{x:{grid:{display:false},ticks:{color:cc.txt3,font:{family:'DM Sans',size:11}},border:{display:false}},
            y:{grid:{color:cc.border+'55'},ticks:{color:cc.txt3,font:{family:'DM Sans',size:11},callback:v=>'₱'+Math.round(v/1000)+'k'},border:{display:false}}}}
}
function dOpts(cc){return{responsive:true,maintainAspectRatio:false,cutout:'68%',animation:{duration:700},plugins:{legend:{display:false},tooltip:{backgroundColor:cc.bg2,titleColor:cc.txt,bodyColor:cc.txt2,borderColor:cc.border,borderWidth:1.5,cornerRadius:12,padding:11}}}}
function pinkGrad(ctx,h=200){const g=ctx.createLinearGradient(0,0,0,h);const c=CC();g.addColorStop(0,c.g1);g.addColorStop(1,c.g2);return g}

// ─── STATE ──────────────────────────────────────────────
const USERS={
  u1:{id:'u1',name:'You',email:'you@pairly.app',avatar:'🐱',photo:null,inviteCode:'MY34PL01'},
  u2:{id:'u2',name:'Partner',email:'partner@pairly.app',avatar:'🐈',photo:null,inviteCode:'PT78PL02'},
}
let AU='u1' // active user

let S={
  cats:[
    {id:'cat1',name:'Food & Dining',icon:'🍜',color:'#d4537e'},
    {id:'cat2',name:'Groceries',icon:'🛒',color:'#e07e3a'},
    {id:'cat3',name:'Transport',icon:'🚗',color:'#3aaa7e'},
    {id:'cat4',name:'Bills',icon:'📱',color:'#6b7bdb'},
    {id:'cat5',name:'Entertainment',icon:'🎮',color:'#9b59b6'},
    {id:'cat6',name:'Health',icon:'💊',color:'#e74c3c'},
    {id:'cat7',name:'Shopping',icon:'🛍️',color:'#f39c12'},
    {id:'cat8',name:'Other',icon:'✨',color:'#95a5a6'},
  ],
  budgets:{u1:[],u2:[]},
  expenses:{u1:[],u2:[]},
  insts:{u1:[],u2:[]},
  instPays:[],
  // MULTIPLE SAVINGS GOALS
  goals:[],
  // WISHLIST per user
  wishlist:{u1:[],u2:[]},
  // SCHOOL SCHEDULE per user
  schedule:{u1:[],u2:[]},
  todos:[],
  _ctx:null,_piUid:null,_piIid:null,
  _histPage:0,_ipPage:0,_todoFilter:'all',_calDate:new Date(),
  _todoUser:'mine',_schedUser:'mine',_wishUser:'mine'
}

// ─── GETTERS ─────────────────────────────────────────────
const getCat=id=>S.cats.find(c=>c.id===id)||S.cats.find(c=>c.name==='Other')||S.cats[0]
const catBadge=id=>{const c=getCat(id);return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.icon} ${esc(c.name)}</span>`}
const getAllBudgets=uid=>(S.budgets[uid]||[])
const getActiveBudgets=uid=>(S.budgets[uid]||[]).filter(b=>b.status==='active')
const getPastBudgets=uid=>(S.budgets[uid]||[]).filter(b=>b.status!=='active')
const getBudget=id=>[...Object.values(S.budgets).flat()].find(b=>b.id===id)
const budgetExps=bid=>[...(S.expenses.u1||[]),...(S.expenses.u2||[])].filter(e=>e.bid===bid)
const allExps=()=>[...(S.expenses.u1||[]),...(S.expenses.u2||[])]
const allInsts=()=>[...(S.insts.u1||[]),...(S.insts.u2||[])]
const goalTotal=g=>g.contributions.reduce((a,c)=>a+c.amt,0)
const PM_LABELS={'cash':'💵 Cash','card':'💳 Card','gcash':'📱 GCash','bank':'🏦 Bank','online':'🌐 Online'}

function populateCatSel(selId,selCatId){
  const el=document.getElementById(selId);if(!el)return
  el.innerHTML=S.cats.map(c=>`<option value="${c.id}" ${c.id===selCatId?'selected':''}>${c.icon} ${esc(c.name)}</option>`).join('')
  el.onchange=()=>toggleCustCat(selId)
}
function toggleCustCat(selId){
  const sel=document.getElementById(selId)
  const v=sel?.value
  const cat=S.cats.find(c=>c.id===v)
  const isOther=cat?.name==='Other'||(sel?.options[sel?.selectedIndex]?.textContent||'').includes('Other')
  const cc=document.getElementById('exp-custcat')
  if(cc) cc.style.display=(isOther?'block':'none')
}
function selPM(el,groupId){document.querySelectorAll(`#${groupId} .pm-btn`).forEach(b=>b.classList.remove('sel'));el.classList.add('sel')}
function getPM(groupId){return document.querySelector(`#${groupId} .pm-btn.sel`)?.dataset?.pm||'cash'}

// ─── NAVIGATION ──────────────────────────────────────────
let CUR='overview'
const PM={
  overview:{t:'Overview',s:'Your financial snapshot'},
  mine:{t:'My Budget 👤',s:'Personal budget cycles'},
  partner:{t:'Partner Budget 💑',s:"Partner's budget overview"},
  shared:{t:'Shared Savings 🏦',s:'Multiple savings goals'},
  reports:{t:'Reports & History 📈',s:'Spending comparison and full history'},
  categories:{t:'Categories 🏷️',s:'Manage custom expense categories'},
  todo:{t:'To-Do & Schedule ✅',s:'Tasks, reminders, and calendar'},
  wishlist:{t:'Wishlist 🛍️',s:'Items you want to buy or save for'},
  profile:{t:'Profile ⚙️',s:'Account settings'},
}
function gp(page,btn){
  CUR=page
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'))
  const el=document.getElementById('page-'+page);if(el)el.classList.add('active')
  if(btn)btn.classList.add('active')
  const m=PM[page]||{}
  document.getElementById('tpTitle').textContent=m.t||page
  document.getElementById('tpSub').textContent=m.s||''
  closeMobMenu()   // auto-close drawer on navigate
  renderPage(page)
}
function renderPage(p){
  if(p==='overview')  renderOV()
  if(p==='mine')      renderBP('mine')
  if(p==='partner')   renderBP('partner')
  if(p==='shared')    renderShared()
  if(p==='reports')   renderReports()
  if(p==='categories')renderCats()
  if(p==='todo')      renderTodo()
  if(p==='wishlist')  renderWishlist()
  if(p==='profile')   renderProfile()
}

// ─── THEME ────────────────────────────────────────────────
let DARK=true
function toggleTheme(e){CP(e);DARK=!DARK;document.documentElement.setAttribute('data-theme',DARK?'dark':'light');document.getElementById('themeEm').textContent=DARK?'🌙':'☀️';document.getElementById('ttTrack').classList.toggle('on',!DARK);setTimeout(()=>renderPage(CUR),60)}

// ─── SIDEBAR TOGGLE (desktop) ────────────────────────────
let SBopen=true
// ─── SIDEBAR TOGGLE (all breakpoints) ────────────────────


function toggleSB(){
  const w=window.innerWidth
  if(w<=1024){
    // Tablet / mobile: use drawer mode
    toggleMobMenu()
  } else {
    // Desktop: collapse to icon-only
    SBopen=!SBopen
    document.getElementById('SB').classList.toggle('col',!SBopen)
    document.getElementById('MC').classList.toggle('wide',!SBopen)
  }
}

function toggleMobMenu(){
  const sb=document.getElementById('SB')
  const isOpen=sb.classList.contains('mob-open')
  if(isOpen){ closeMobMenu() } else { openMobMenu() }
}

function openMobMenu(){
  const sb=document.getElementById('SB')
  const bd=document.getElementById('mobBd')
  const btn=document.getElementById('hamBtn')
  if(sb){
    sb.classList.add('mob-open')
    // Force z-index inline as a backup (overrides any CSS conflicts)
    sb.style.zIndex='2000'
    sb.style.pointerEvents='auto'
    sb.style.transform='translateX(0)'
  }
  if(bd){
    bd.classList.add('show')
    bd.style.zIndex='1200'  // always below open sidebar
  }
  if(btn)btn.classList.add('open')
  document.body.style.overflow='hidden'
}

function closeMobMenu(){
  const sb=document.getElementById('SB')
  const bd=document.getElementById('mobBd')
  const btn=document.getElementById('hamBtn')
  if(sb){
    sb.classList.remove('mob-open')
    // Clear inline styles so CSS takes over for closed state
    sb.style.zIndex=''
    sb.style.transform=''
    sb.style.pointerEvents=''
  }
  if(bd){
    bd.classList.remove('show')
    bd.style.zIndex=''
  }
  if(btn)btn.classList.remove('open')
  document.body.style.overflow=''
}

// Close drawer when window resizes to desktop
window.addEventListener('resize',()=>{
  if(window.innerWidth>=1280){
    closeMobMenu()
    // Restore desktop state
    const sb=document.getElementById('SB')
    const mc=document.getElementById('MC')
    if(sb){sb.style.transform='';sb.classList.remove('col')}
    if(mc)mc.classList.remove('wide')
    SBopen=true
  }
})

// Swipe to close drawer on mobile/tablet
;(function(){
  let startX=0,startY=0
  document.addEventListener('touchstart',e=>{
    startX=e.touches[0].clientX;startY=e.touches[0].clientY
  },{passive:true})
  document.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-startX
    const dy=Math.abs(e.changedTouches[0].clientY-startY)
    // Swipe left ≥60px and mostly horizontal → close drawer
    if(dx < -60 && dy < 60){
      const sb=document.getElementById('SB')
      if(sb&&sb.classList.contains('mob-open')) closeMobMenu()
    }
  },{passive:true})
})()

// ─── ACCOUNT ─────────────────────────────────────────────
function switchAcc(e){
  CP(e)
  // In Supabase mode, switching is view-only (see partner data)
  AU=AU==='u1'?'u2':'u1'
  updateSBAv()
  toast(`Viewing ${USERS[AU].name}'s perspective 👀`)
  renderPage(CUR)
}
async function signOut(e){
  CP(e)
  // Sign out immediately — no confirm() since it gets silently blocked on mobile
  if(SB_READY){ try{ await _sb.auth.signOut() }catch(err){ console.warn('signOut error:',err) } }
  AU_SB_ID=null; AU_PARTNER_ID=null
  AU='u1'
  resetLocalData()
  updateSBAv()
  renderPage('overview')
  showAuthOverlay()
  toast('Signed out 🚪')
}
function updateSBAv(){
  const u=USERS[AU]
  const spanEl=document.getElementById('sbAvInner')
  const imgEl=document.getElementById('sbAvImg')
  if(u.photo&&u.photo!=='null'&&u.photo!=='undefined'){
    if(spanEl)spanEl.style.display='none'
    if(imgEl){imgEl.src=u.photo;imgEl.style.display='block'}
  } else {
    if(spanEl){spanEl.style.display='inline';spanEl.textContent=u.avatar||'🐱'}
    if(imgEl)imgEl.style.display='none'
  }
  document.getElementById('sbName').textContent=u.name
}

// ─── OVERVIEW ────────────────────────────────────────────
function renderOV(){
  const pu=AU==='u1'?'u2':'u1'
  const myE=S.expenses[AU]||[]; const ptE=S.expenses[pu]||[]
  const mySpent=myE.reduce((a,e)=>a+e.amt,0); const ptSpent=ptE.reduce((a,e)=>a+e.amt,0)
  const myAct=getActiveBudgets(AU); const myBudTot=myAct.reduce((a,b)=>a+b.amt,0)
  const totSav=S.goals.reduce((a,g)=>a+goalTotal(g),0)
  document.getElementById('ov-sub').textContent=`${USERS[AU].name} & ${USERS[pu].name} — ${new Date().toLocaleDateString('en-PH',{month:'long',year:'numeric'})}`

  document.getElementById('ov-stats').innerHTML=`
    <div class="sc sp"><div class="sc-ico">💰</div><div class="sc-lbl">My Budget</div><div class="sc-val vp">${P(myBudTot)}</div><span class="sdelta dn">${myAct.length} active plan${myAct.length!==1?'s':''}</span></div>
    <div class="sc si"><div class="sc-ico">💸</div><div class="sc-lbl">Total Expenses</div><div class="sc-val vi">${P(mySpent+ptSpent)}</div><span class="sdelta dn">both users</span></div>
    <div class="sc sg"><div class="sc-ico">🏦</div><div class="sc-lbl">Total Savings</div><div class="sc-val vg">${P(totSav)}</div><span class="sdelta du">↑ growing</span></div>
    <div class="sc sc2"><div class="sc-ico">🎯</div><div class="sc-lbl">Savings Goals</div><div class="sc-val vc">${S.goals.length}</div><span class="sdelta dn">active goals</span></div>
  `
  // Donut
  const cTot={}; myE.forEach(e=>{cTot[e.catId]=(cTot[e.catId]||0)+e.amt})
  const sorted=Object.entries(cTot).sort((a,b)=>b[1]-a[1]).slice(0,7)
  const dtot=sorted.reduce((a,[,v])=>a+v,0)
  document.getElementById('ovDV').textContent=P(dtot)
  const cc=CC()
  mkChart('ovDonut',{type:'doughnut',data:{datasets:[{data:sorted.map(([,v])=>v),backgroundColor:sorted.map(([k])=>getCat(k).color),borderWidth:2,borderColor:cc.bg2,hoverOffset:8}]},options:dOpts(cc)})
  document.getElementById('ovCatList').innerHTML=sorted.length===0?'<div style="color:var(--txt3);font-size:12px">No expenses</div>':sorted.map(([k,v])=>{const c=getCat(k);const p=pct(v,dtot);return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)"><span style="width:8px;height:8px;border-radius:50%;background:${c.color};flex-shrink:0"></span><span style="flex:1;font-size:12px">${c.icon} ${esc(c.name)}</span><span style="font-size:11px;color:var(--txt3)">${p}%</span><span style="font-size:12px;font-weight:700">${P(v)}</span></div>`}).join('')
  // Budget progress
  const bps=[...myAct.map(b=>({name:`${b.type} ${esc(b.title)}`,spent:b.spent,bud:b.amt,pf:'pfp'})),{name:'🏦 Savings',spent:totSav,bud:S.goals.reduce((a,g)=>a+g.target,0),pf:'pft'}]
  document.getElementById('ovBudList').innerHTML=bps.map(item=>{const p=pct(item.spent,item.bud);return`<div style="padding:9px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:12px;font-weight:600">${item.name}</span><span style="font-size:12px;font-weight:700">${p}%</span></div><div class="pw"><div class="pf ${item.pf}" style="width:${p}%"></div></div><div class="pmeta"><span>${P(item.spent)}</span><span>${P(item.bud)}</span></div></div>`}).join('')
  // Cash flow
  const lbl=['May 1','May 3','May 5','May 7','May 9','May 11','May 13','May 15']
  const iD=[myBudTot,0,0,0,0,0,0,0]; const eD=[0,320,840,0,430,0,1200,0]
  const opts=bOpts(cc)
  mkChart('ovCF',{type:'line',data:{labels:lbl,datasets:[{label:'Income',data:iD,borderColor:cc.teal,backgroundColor:cc.t1,fill:true,tension:.4,borderWidth:2.5,pointRadius:3,pointBackgroundColor:cc.teal},{label:'Expenses',data:eD,borderColor:cc.pink,backgroundColor:cc.g1+'44',fill:true,tension:.4,borderWidth:2.5,pointRadius:3,pointBackgroundColor:cc.pink}]},options:{...opts,plugins:{...opts.plugins,legend:{display:false}}}})
  // Recent
  const rec=allExps().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6)
  document.getElementById('ovRecent').innerHTML=rec.length===0?'<div class="empty" style="padding:18px"><div class="empty-ico">💸</div><p>No transactions</p></div>':rec.map(e=>{const cat=getCat(e.catId);const isMe=e.uid===AU;return`<div class="row"><div class="rico" style="background:${cat.color}22">${cat.icon}</div><div class="rinfo"><div class="rname">${esc(e.desc)}</div><div class="rsub">${fmtD(e.date)} · ${isMe?USERS[AU].name:USERS[AU==='u1'?'u2':'u1'].name} · ${PM_LABELS[e.pm]||e.pm}</div></div><div class="rright"><div class="ramt" style="color:var(--pink)">−${P(e.amt)}</div></div></div>`}).join('')
}

// ─── BUDGET PAGE ──────────────────────────────────────────
let _actTab={mine:null,partner:null}

function renderBP(scope){
  const uid=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  const u=USERS[uid],isOwn=scope==='mine'
  document.getElementById(scope+'-title').textContent=isOwn?`${u.name}'s Budget 👤`:`${u.name}'s Budget 💑`
  if(!isOwn)document.getElementById('partner-sub').textContent=`${u.name}'s budget overview`
  const active=getActiveBudgets(uid),past=getPastBudgets(uid)
  // Tabs
  if(!_actTab[scope]||!active.find(b=>b.id===_actTab[scope]))_actTab[scope]=active[0]?.id||null
  document.getElementById(scope+'-btabs').innerHTML=active.map(b=>`<div class="btab ${b.id===_actTab[scope]?'active':''}" onclick="selBTab('${scope}','${b.id}',this)">${b.type} ${esc(b.title)} <span style="font-size:10px;opacity:.8">${pct(b.spent,b.amt)}%</span></div>`).join('')+(active.length===0?'':``)
  // Content
  if(!_actTab[scope]){document.getElementById(scope+'-bcontent').innerHTML='<div class="empty"><div class="empty-ico">💸</div><div class="empty-t">No active budget</div><p>Create a new budget to get started</p></div>'}
  else renderBContent(scope,_actTab[scope],isOwn)
  // Past summaries at bottom
  renderPastSummaries(scope,uid)
}

function selBTab(scope,bid,el){
  _actTab[scope]=bid
  document.querySelectorAll('#'+scope+'-btabs .btab').forEach(t=>t.classList.remove('active'))
  el.classList.add('active'); CP({clientX:el.getBoundingClientRect().left+40,clientY:el.getBoundingClientRect().bottom-10})
  const uid=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  renderBContent(scope,bid,scope==='mine')
}

function renderBContent(scope,bid,isOwn){
  const b=getBudget(bid);if(!b)return
  const uid=b.uid; const exps=budgetExps(bid); const insts=(S.insts[uid]||[])
  const rem=b.amt-b.spent; const dl=dleft(b); const urg=dl<=5
  const daysEl=Math.max(0,Math.floor((new Date()-new Date(b.start+'T12:00:00'))/864e5))
  const dailyAvg=daysEl>0?b.spent/daysEl:0; const proj=Math.round(dailyAvg*b.days)
  const bp=pct(b.spent,b.amt)

  // Category pie data
  const cTot={}; exps.forEach(e=>{cTot[e.catId]=(cTot[e.catId]||0)+e.amt})
  const pieData=Object.entries(cTot).sort((a,b2)=>b2[1]-a[1]).slice(0,6)
  const pieTot=pieData.reduce((a,[,v])=>a+v,0)

  // Expense rows
  const expRows=exps.length===0?'<div class="empty" style="padding:18px"><div class="empty-ico">💸</div><p>No expenses yet</p></div>'
    :[...exps].sort((a,b2)=>new Date(b2.date)-new Date(a.date)).map(e=>{
      const cat=getCat(e.catId);const custLbl=e.custCat?` (${esc(e.custCat)})`:'';
      return`<div class="row"><div class="rico" style="background:${cat.color}22">${cat.icon}</div><div class="rinfo"><div class="rname">${esc(e.desc)}</div><div class="rsub">${fmtD(e.date)} · ${catBadge(e.catId)}${custLbl} · ${PM_LABELS[e.pm]||e.pm}</div></div><div class="rright"><div class="ramt" style="color:var(--pink)">−${P(e.amt)}</div>${isOwn?`<div class="racts"><button class="btn-ico btn btn-xs" onclick="openEditExp(event,'${scope}','${bid}','${e.id}')">✏️</button><button class="btn-ico btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete Expense','Remove &ldquo;${esc(e.desc)}&rdquo;?',()=>delExp('${scope}','${bid}','${e.id}'))">🗑️</button></div>`:''}
      </div></div>`
    }).join('')

  // Installment rows
  const instRows=insts.length===0?'<div class="empty" style="padding:18px"><div class="empty-ico">📦</div><p>No installments</p></div>'
    :insts.map(inst=>{const done=inst.status==='completed';const p=pct(inst.paid,inst.numPay);const remBal=Math.max(0,inst.total-inst.down-(inst.paid*inst.payAmt));return`<div style="padding:11px 0;border-bottom:1.5px solid var(--border)"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px"><div><div style="font-size:13px;font-weight:700">${esc(inst.name)} ${done?'<span class="badge bg">Done</span>':''}</div><div style="font-size:11px;color:var(--txt3)">${P(inst.payAmt)}/${inst.freq} · ${inst.paid}/${inst.numPay} paid · ${P(remBal)} left · ${PM_LABELS[inst.pm]||inst.pm}</div></div><div style="display:flex;gap:4px;flex-shrink:0">${!done&&isOwn?`<button class="btn btn-o btn-xs" onclick="openPayInst(event,'${uid}','${inst.id}')">💳 Pay</button>`:''}<button class="btn-ico btn btn-xs" onclick="viewIP(event,'${inst.id}')">📋</button>${isOwn?`<button class="btn-ico btn btn-xs" onclick="openEditInst(event,'${uid}','${inst.id}')">✏️</button><button class="btn-ico btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete Installment','Remove &ldquo;${esc(inst.name)}&rdquo;?',()=>delInst('${uid}','${inst.id}'))">🗑️</button>`:''}</div></div><div class="pw"><div class="pf ${done?'pft':'pfp'}" style="width:${p}%"></div></div><div class="pmeta"><span>${p}% paid</span><span>Total: ${P(inst.total)}</span></div></div>`}).join('')

  document.getElementById(scope+'-bcontent').innerHTML=`
    <div class="g3" style="margin-bottom:14px">
      <div class="sc sp" style="margin:0"><div class="sc-ico">💰</div><div class="sc-lbl">Budget</div><div class="sc-val vp">${P(b.amt)}</div><span class="sdelta dn">${b.days}-day cycle</span></div>
      <div class="sc si" style="margin:0"><div class="sc-ico">💸</div><div class="sc-lbl">Spent</div><div class="sc-val vi">${P(b.spent)}</div><span class="sdelta ${bp>70?'dd':'du'}">${bp}% used</span></div>
      <div class="sc sg" style="margin:0"><div class="sc-ico">✅</div><div class="sc-lbl">Remaining</div><div class="sc-val vg">${P(rem)}</div><span class="sdelta ${urg?'dd':'dn'}">${dl} days left</span></div>
    </div>
    <div class="cdchip ${urg?'urg':''}">
      <div class="cd-num">${dl}</div>
      <div class="cd-txt"><strong>days remaining</strong><br><span style="font-size:11px">${fmtD(b.start)} → ${fmtD(b.end)} · Daily avg: ${P(dailyAvg)}/day · Projected: ${P(proj)}</span></div>
    </div>
    <div class="card card-sm" style="margin-bottom:14px">
      <div class="chd" style="margin-bottom:10px"><span class="ctitle">${b.type} ${esc(b.title)}</span><div style="display:flex;gap:6px;align-items:center"><span class="badge ${bp>85?'bd':'ba'}">${bp}% used</span>${isOwn?`<button class="btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete Budget','Delete &ldquo;${esc(b.title)}&rdquo; and all its expenses? This cannot be undone.',()=>delBudget('${scope}','${bid}'))">🗑️ Delete</button>`:''}</div></div>
      <div class="pw" style="height:12px"><div class="pf ${bp>85?'pfd':'pfp'}" style="width:${bp}%"></div></div>
      <div class="pmeta"><span>${P(b.spent)} spent</span><span>${P(rem)} left</span></div>
    </div>
    <!-- PIE CHART + SPENDING TREND -->
    <div class="g2" style="margin-bottom:14px">
      <div class="card" style="margin:0">
        <div class="chd"><span class="ctitle">🍩 Spending by Category</span></div>
        ${pieData.length===0?'<div class="empty" style="padding:18px"><p>No expenses yet</p></div>':'<div style="height:190px;position:relative"><canvas id="bPie-'+bid+'"></canvas></div><div style="margin-top:10px" id="bPieLeg-'+bid+'"></div>'}
      </div>
      <div class="card" style="margin:0">
        <div class="chd">
          <span class="ctitle">📉 Spending Trend</span>
          <div style="display:flex;gap:5px;align-items:center">
            <button class="btn btn-xs btn-g" id="trend-bar-${bid}" onclick="setTrendView('${bid}','bar',this)" style="background:var(--pink);color:#fff;border-color:transparent">Bar</button>
            <button class="btn btn-xs btn-g" id="trend-line-${bid}" onclick="setTrendView('${bid}','line',this)">Line</button>
          </div>
        </div>
        <div style="font-size:11px;color:var(--txt3);margin-bottom:10px">Daily spending amounts across this budget cycle. Each bar/point = total spent on that day.</div>
        <div style="height:175px;position:relative"><canvas id="bLine-${bid}"></canvas></div>
        <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--txt3);flex-wrap:wrap">
          <span>📊 Days with spending: <strong style="color:var(--txt)">${Object.keys((()=>{const m={};exps.forEach(e=>{m[e.date]=(m[e.date]||0)+e.amt});return m})()).length}</strong></span>
          <span>📈 Highest day: <strong style="color:var(--pink)">${P(Math.max(0,...exps.reduce((m,e)=>{m[e.date]=(m[e.date]||0)+e.amt;return m},{}) && Object.values(exps.reduce((m,e)=>{m[e.date]=(m[e.date]||0)+e.amt;return m},{})).concat([0])))}</strong></span>
        </div>
      </div>
    </div>
    <div class="g2">
      <div class="card" style="margin:0"><div class="chd"><span class="ctitle">💸 Expenses</span>${isOwn?`<button class="btn btn-p btn-sm" onclick="openAddExp(event,'${scope}','${bid}')">+ Add</button>`:'<span style="font-size:11px;color:var(--txt3)">View only</span>'}</div>${expRows}</div>
      <div class="card" style="margin:0"><div class="chd"><span class="ctitle">📦 Installments</span>${isOwn?`<button class="btn btn-o btn-sm" onclick="openAddInst(event,'${uid}')">+ Add</button>`:'<span class="badge bn">'+(insts.filter(i=>i.status==='active').length)+' active</span>'}</div>${instRows}</div>
    </div>
  `
  // Draw charts
  setTimeout(()=>{
    const cc=CC()
    // Pie
    if(pieData.length>0){
      mkChart('bPie-'+bid,{type:'doughnut',data:{datasets:[{data:pieData.map(([,v])=>v),backgroundColor:pieData.map(([k])=>getCat(k).color),borderWidth:2,borderColor:cc.bg2,hoverOffset:8}]},options:dOpts(cc)})
      const legEl=document.getElementById('bPieLeg-'+bid)
      if(legEl)legEl.innerHTML=pieData.map(([k,v])=>{const c=getCat(k);const p=pct(v,pieTot);return`<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="width:8px;height:8px;border-radius:50%;background:${c.color};flex-shrink:0"></span><span style="flex:1;font-size:11px">${c.icon} ${esc(c.name)}</span><span style="font-size:10px;color:var(--txt3)">${p}%</span><span style="font-size:11px;font-weight:700">${P(v)}</span></div>`}).join('')
    }
    // Spending trend (bar default, switchable to line)
    const byDate={}; exps.forEach(e=>{byDate[e.date]=(byDate[e.date]||0)+e.amt})
    const dates=Object.keys(byDate).sort()
    // Also fill in zero-spend days within budget range for complete picture
    const startD=new Date(b.start+'T12:00:00'), endD=new Date(b.end+'T12:00:00')
    const allDates=[]; let cur=new Date(startD)
    while(cur<=endD&&allDates.length<31){allDates.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1)}
    const trendLabels=allDates.map(d=>d.slice(5)) // MM-DD
    const trendData=allDates.map(d=>byDate[d]||0)
    const canvas=document.getElementById('bLine-'+bid)
    if(canvas){
      const ctx=canvas.getContext('2d'); const g=ctx.createLinearGradient(0,0,0,175); g.addColorStop(0,cc.g1); g.addColorStop(1,cc.g2)
      const trendType=_trendView[bid]||'bar'
      mkChart('bLine-'+bid,{type:trendType,data:{labels:trendLabels,datasets:[{label:'Daily Spend',data:trendData,borderColor:cc.pink,backgroundColor:trendType==='bar'?cc.pink+'cc':g,fill:trendType==='line',tension:.42,borderWidth:trendType==='bar'?0:2.5,borderRadius:trendType==='bar'?5:0,pointRadius:trendType==='line'?3:0,pointBackgroundColor:cc.pink,pointBorderColor:cc.bg2,pointBorderWidth:2,pointHoverRadius:7}]},options:{...bOpts(cc),scales:{...bOpts(cc).scales,x:{...bOpts(cc).scales.x,ticks:{...bOpts(cc).scales.x.ticks,maxTicksLimit:8}}}}})
    }
  },60)
}

// ─── PAST SUMMARIES ───────────────────────────────────────
function renderPastSummaries(scope,uid){
  const past=getPastBudgets(uid)
  const secEl=document.getElementById(scope+'-past')
  const gridEl=document.getElementById(scope+'-past-grid')
  if(!past.length){if(secEl)secEl.style.display='none';return}
  if(secEl)secEl.style.display='block'
  if(!gridEl)return
  gridEl.innerHTML=past.map(b=>{
    const saved=b.xfer||0; const over=b.spent>b.amt; const savePct=b.amt>0?pct(saved,b.amt):0
    const ratePct=pct(b.spent,b.amt)
    let cls='zero',badge='No savings'
    if(over){cls='poor';badge='Overspent ⚠️'}
    else if(saved>=(b.amt*0.15)){cls='good';badge='Great savings 🎉'}
    else if(saved>0){cls='ok';badge='Some savings 👍'}
    // Month label from start date
    let monthLbl=''; try{monthLbl=new Date(b.start+'T12:00:00').toLocaleDateString('en-PH',{month:'long',year:'numeric'})}catch(err){monthLbl=b.start}
    const stmt=saved>0
      ? `${monthLbl}: Saved <strong>${P(saved)}</strong> out of <strong>${P(b.amt)}</strong>`
      : over
        ? `${monthLbl}: Overspent by <strong>${P(b.spent-b.amt)}</strong>`
        : `${monthLbl}: Saved <strong>₱0.00</strong> out of <strong>${P(b.amt)}</strong>`
    return`<div class="pcard ${cls}">
      <span class="pc-badge">${badge}</span>
      <div class="pc-name">${esc(b.title)}</div>
      <div class="pc-stmt">${stmt}</div>
      <div class="pc-save">${saved>0?'+'+P(saved):over?'−'+P(b.spent-b.amt):'₱0.00'}</div>
      <div class="pc-bar-wrap"><div class="pc-bar-fill" style="width:${Math.min(100,ratePct)}%"></div></div>
      <div style="font-size:10px;color:var(--txt3);margin-top:5px">${ratePct}% of ${P(b.amt)} budget spent · ${fmtD(b.start)} → ${fmtD(b.end)}</div>
    </div>`
  }).join('')
}

// ─── SHARED SAVINGS ───────────────────────────────────────
function renderShared(){
  const totSav=S.goals.reduce((a,g)=>a+goalTotal(g),0)
  const totTarget=S.goals.reduce((a,g)=>a+g.target,0)
  const allContribs=S.goals.flatMap(g=>g.contributions)
  const u1T=allContribs.filter(c=>c.uid==='u1').reduce((a,c)=>a+c.amt,0)
  const u2T=allContribs.filter(c=>c.uid==='u2').reduce((a,c)=>a+c.amt,0)

  // Stat cards
  document.getElementById('sh-stats').innerHTML=`
    <div class="sc sg"><div class="sc-ico">🏦</div><div class="sc-lbl">Total Saved</div><div class="sc-val vg">${P(totSav)}</div><span class="sdelta du">↑ growing</span></div>
    <div class="sc sc2"><div class="sc-ico">🎯</div><div class="sc-lbl">Total Target</div><div class="sc-val vc">${P(totTarget)}</div><span class="sdelta dn">${pct(totSav,totTarget)}% achieved</span></div>
    <div class="sc sp"><div class="sc-ico">📊</div><div class="sc-lbl">Active Goals</div><div class="sc-val vp">${S.goals.length}</div><span class="sdelta dn">goals</span></div>
    <div class="sc si"><div class="sc-ico">🔄</div><div class="sc-lbl">Auto-Transfers</div><div class="sc-val vi">${P(allContribs.filter(c=>c.source==='auto'||c.source==='auto_transfer').reduce((a,c)=>a+c.amt,0))}</div><span class="sdelta du">from budgets</span></div>
  `
  // Goals list
  const goalsEl=document.getElementById('sh-goals-list')
  goalsEl.innerHTML=S.goals.map(g=>{
    const cur=goalTotal(g); const p=pct(cur,g.target); const over=p>=100
    return`<div class="goal-card">
      <div class="goal-hd">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="goal-icon" style="background:${g.color}22;border:1.5px solid ${g.color}44">${g.icon}</div>
          <div><div class="goal-title">${esc(g.title)}</div><div class="goal-sub">${g.contributions.length} contributions</div></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="goal-pct-lbl" style="color:${g.color}">${p}%</div>
          <div style="font-size:11px;color:var(--txt3)">${over?'🎉 Goal reached!':P(g.target-cur)+' to go'}</div>
        </div>
      </div>
      <div class="pw" style="height:10px"><div class="pf" style="width:${p}%;background:linear-gradient(90deg,${g.color}88,${g.color})"></div></div>
      <div class="pmeta"><span>${P(cur)} saved</span><span>Goal: ${P(g.target)}</span></div>
      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-sm" style="background:${g.color};color:#fff;border-color:transparent" onclick="openAddSavToGoal(event,'${g.id}')">+ Deposit</button>
        <button class="btn btn-xs btn-g" onclick="openEditGoal(event,'${g.id}')">✏️ Edit</button>
        <button class="btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete Goal','Delete &ldquo;${esc(g.title)}&rdquo;? Contributions will also be removed.',()=>delGoal('${g.id}'))">🗑️</button>
      </div>
    </div>`
  }).join('')+'<button class="btn btn-p" style="width:100%;margin-top:4px" onclick="openModal(\'m-newGoal\');CP(event)">+ Add New Goal</button>'

  // Pie of goals distribution
  const cc=CC()
  mkChart('shPie',{type:'doughnut',data:{datasets:[{data:S.goals.map(g=>goalTotal(g)),backgroundColor:S.goals.map(g=>g.color+'cc'),borderWidth:2,borderColor:cc.bg2,hoverOffset:8}],labels:S.goals.map(g=>g.title)},options:{...dOpts(cc),plugins:{...dOpts(cc).plugins,legend:{display:true,position:'right',labels:{color:cc.txt2,font:{family:'DM Sans',size:11},usePointStyle:true,boxWidth:10,padding:10}},tooltip:{backgroundColor:cc.bg2,titleColor:cc.txt,bodyColor:cc.txt2,borderColor:cc.border,borderWidth:1.5,cornerRadius:12,callbacks:{label:ctx=>`${P(ctx.parsed)} (${pct(ctx.parsed,totSav)}%)`}}}}})

  // Contribution split
  document.getElementById('shContrib').innerHTML=`<div style="margin-top:10px;padding-top:10px;border-top:1.5px solid var(--border)"><div style="font-size:12px;font-weight:700;margin-bottom:10px">Contribution Split</div>`+
    [{uid:'u1',name:USERS.u1.name,av:USERS.u1.avatar,total:u1T,pf:'pfp'},{uid:'u2',name:USERS.u2.name,av:USERS.u2.avatar,total:u2T,pf:'pft'}].map(r=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="font-size:20px">${r.av}</span><div style="flex:1"><div style="font-size:12px;font-weight:600">${esc(r.name)}</div><div class="pw" style="margin-top:4px"><div class="pf ${r.pf}" style="width:${pct(r.total,totSav)}%"></div></div></div><div style="font-size:13px;font-weight:700">${P(r.total)}</div></div>`).join('')+'</div>'

  // Transaction history
  document.getElementById('sh-cnt').textContent=allContribs.length+' entries'
  document.getElementById('sh-txns').innerHTML=allContribs.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(c=>{
    const isAuto=c.source==='auto'||c.source==='auto_transfer'; const u=USERS[c.uid]||{};const g=S.goals.find(g=>g.contributions.find(x=>x.id===c.id))
    return`<div class="row"><div class="rico" style="background:${isAuto?'var(--teal-bg)':'var(--coin-bg)'}">${isAuto?'🔄':'💸'}</div><div class="rinfo"><div class="rname">${isAuto?'Auto-transfer':'Manual deposit'} — ${esc(u.name||'')} → ${g?esc(g.title):''}</div><div class="rsub">${fmtD(c.date)}${c.note?' · '+esc(c.note):''} <span class="badge ${isAuto?'bi':'bg'}" style="font-size:9px">${isAuto?'auto':'manual'}</span></div></div><div class="rright"><div class="ramt" style="color:var(--teal)">+${P(c.amt)}</div><div class="racts"><button class="btn-ico btn btn-xs" onclick="openEditSav(event,'${c.id}')">✏️</button><button class="btn-ico btn btn-xs btn-d" onclick="delConfirm('🗑️ Remove','Remove +${P(c.amt)} contribution?',()=>delSav('${c.id}'))">🗑️</button></div></div></div>`
  }).join('')

  // Past budget transfers as summaries
  const allPast=[...getPastBudgets('u1'),...getPastBudgets('u2')].filter(b=>(b.xfer||0)>0)
  const shPastEl=document.getElementById('sh-past'), shPastGrid=document.getElementById('sh-past-grid')
  if(allPast.length>0){if(shPastEl)shPastEl.style.display='block';if(shPastGrid)shPastGrid.innerHTML=allPast.map(b=>{const saved=b.xfer||0;const user=USERS[b.uid]||{};return`<div class="pcard good"><span class="pc-badge">🔄 Auto-transfer</span><div class="pc-name">${esc(b.title)} — ${esc(user.name||'')}</div><div class="pc-stmt">${new Date(b.start+'T12:00:00').toLocaleDateString('en-PH',{month:'long',year:'numeric'})}: <strong>+${P(saved)}</strong> transferred from budget</div><div class="pc-save">+${P(saved)}</div><div style="font-size:10px;color:var(--txt3);margin-top:5px">${fmtD(b.start)} → ${fmtD(b.end)}</div></div>`}).join('')}
  else{if(shPastEl)shPastEl.style.display='none'}
}

// ─── REPORTS ─────────────────────────────────────────────
function buildRepOptions(){
  const selA=document.getElementById('repA'),selB=document.getElementById('repB')
  if(!selA||!selB)return
  const all=[...getAllBudgets('u1'),...getAllBudgets('u2')]
  const opts=all.map(b=>`<option value="${b.id}">${USERS[b.uid]?.name} · ${esc(b.title)} (${fmtD(b.start)})</option>`).join('')
  const pa=selA.value,pb=selB.value; selA.innerHTML=opts; selB.innerHTML=opts
  if(all.find(b=>b.id===pa))selA.value=pa; if(all.find(b=>b.id===pb)&&pb!==selA.value)selB.value=pb; else if(all.length>1)selB.value=all[1].id
}

function renderReports(){
  buildRepOptions()
  const bidA=document.getElementById('repA')?.value, bidB=document.getElementById('repB')?.value
  const bA=getBudget(bidA),bB=getBudget(bidB); if(!bA)return
  const exA=budgetExps(bidA),exB=bB?budgetExps(bidB):[],tA=exA.reduce((a,e)=>a+e.amt,0),tB=exB.reduce((a,e)=>a+e.amt,0)
  const diff=tB>0?Math.round(((tA-tB)/tB)*100):null

  // Insights
  const ins=[]
  if(diff!==null){if(diff>10)ins.push({t:'dd',icon:'⚠️',head:`Spending up ${diff}% vs "${bB.title}"`,body:`${P(tA)} vs ${P(tB)}`});else if(diff<-5)ins.push({t:'du',icon:'🎉',head:`Spending down ${Math.abs(diff)}% — great job!`,body:`${P(tA)} vs ${P(tB)}`});else ins.push({t:'dn',icon:'📊',head:`Spending roughly stable (${diff}% diff)`,body:'Consistency is good for long-term budgeting.'})}
  const bigCatEntry=Object.entries(exA.reduce((a,e)=>{a[e.catId]=(a[e.catId]||0)+e.amt;return a},{})).sort((a,b)=>b[1]-a[1])[0]
  if(bigCatEntry){const bc=getCat(bigCatEntry[0]);ins.push({t:'dn',icon:'🏷️',head:`${bc.icon} ${bc.name} is your top category`,body:`${P(bigCatEntry[1])} (${pct(bigCatEntry[1],tA)}% of total expenses)`})}
  if(bA.xfer>0)ins.push({t:'du',icon:'💰',head:`${P(bA.xfer)} auto-transferred to savings from this budget`,body:'Keep maintaining a surplus to hit savings goals faster.'})
  document.getElementById('rep-insights').innerHTML=ins.map(i=>{const col=i.t==='du'?'var(--teal)':i.t==='dd'?'var(--danger)':'var(--txt3)';return`<div style="display:flex;gap:10px;padding:12px 14px;border-radius:11px;border:1.5px solid ${col}44;background:${col}0d;margin-bottom:10px"><span style="font-size:18px">${i.icon}</span><div><div style="font-size:13px;font-weight:700;color:${col}">${i.head}</div><div style="font-size:12px;color:var(--txt2);margin-top:2px">${i.body}</div></div></div>`}).join('')

  const cc=CC()
  // Bar comparison
  const cats=S.cats.slice(0,6); const catA=cats.map(c=>exA.filter(e=>e.catId===c.id).reduce((a,e)=>a+e.amt,0)); const catB=cats.map(c=>exB.filter(e=>e.catId===c.id).reduce((a,e)=>a+e.amt,0))
  const bo=bOpts(cc)
  mkChart('repBar',{type:'bar',data:{labels:cats.map(c=>`${c.icon} ${c.name}`),datasets:[{label:esc(bA.title),data:catA,backgroundColor:cc.pink+'cc',borderRadius:7,borderSkipped:false},{label:bB?esc(bB.title):'—',data:catB,backgroundColor:cc.teal+'88',borderRadius:7,borderSkipped:false}]},options:{...bo,plugins:{...bo.plugins,legend:{display:true,position:'top',align:'end',labels:{color:cc.txt2,font:{family:'DM Sans',size:11},usePointStyle:true,boxWidth:9}}}}})
  // Pie for budget A
  const pieD=cats.map((c,i)=>({c,amt:catA[i]})).filter(x=>x.amt>0)
  mkChart('repPie',{type:'doughnut',data:{labels:pieD.map(x=>`${x.c.icon} ${x.c.name}`),datasets:[{data:pieD.map(x=>x.amt),backgroundColor:pieD.map(x=>x.c.color+'cc'),borderWidth:2,borderColor:cc.bg2,hoverOffset:8}]},options:{...dOpts(cc),plugins:{...dOpts(cc).plugins,legend:{display:true,position:'right',labels:{color:cc.txt2,font:{family:'DM Sans',size:11},usePointStyle:true,boxWidth:10,padding:8}}}}})

  // Budget history table
  const allB=[...getAllBudgets('u1'),...getAllBudgets('u2')]
  document.getElementById('rep-btable').innerHTML=`<table><thead><tr><th>Budget</th><th>User</th><th>Budget Amt</th><th>Spent</th><th>Saved</th><th>%</th><th>Status</th></tr></thead><tbody>${allB.map(b=>`<tr><td><strong>${esc(b.title)}</strong><br><span style="font-size:10px;color:var(--txt3)">${fmtD(b.start)}</span></td><td>${USERS[b.uid]?.avatar} ${USERS[b.uid]?.name}</td><td>${P(b.amt)}</td><td style="color:var(--pink);font-weight:700">${P(b.spent)}</td><td style="color:var(--teal);font-weight:700">${(b.xfer||0)>0?'+'+P(b.xfer||0):'—'}</td><td><div style="display:flex;align-items:center;gap:6px"><div class="pw" style="width:60px;display:inline-block"><div class="pf ${pct(b.spent,b.amt)>90?'pfd':'pfp'}" style="width:${pct(b.spent,b.amt)}%"></div></div><span style="font-size:11px">${pct(b.spent,b.amt)}%</span></div></td><td><span class="badge ${b.status==='active'?'ba':b.status==='auto-transferred'?'bi':'bg'}">${b.status}</span></td></tr>`).join('')}</tbody></table>`

  // History log
  renderHist()
  // Installment log
  renderIPLog()
}

// ─── HISTORY (integrated into Reports) ────────────────────
let _hp=0,_ipp=0
function clearHF(){document.getElementById('hf-user').value='all';document.getElementById('hf-cat').value='all';document.getElementById('hf-type').value='all';document.getElementById('hf-q').value='';_hp=0;renderHist()}
function renderHist(){
  // Populate cat filter
  const cSel=document.getElementById('hf-cat')
  if(cSel&&cSel.options.length<=1)S.cats.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.icon} ${c.name}`;cSel.appendChild(o)})
  const fu=document.getElementById('hf-user')?.value||'all'
  const fc=document.getElementById('hf-cat')?.value||'all'
  const ft=document.getElementById('hf-type')?.value||'all'
  const fq=(document.getElementById('hf-q')?.value||'').toLowerCase()
  let items=[]
  if(ft==='all'||ft==='expense')allExps().forEach(e=>{if(fu!=='all'&&e.uid!==fu)return;if(fc!=='all'&&e.catId!==fc)return;if(fq&&!e.desc.toLowerCase().includes(fq))return;const cat=getCat(e.catId);items.push({ico:cat.icon,nm:e.desc,sub:`${fmtD(e.date)} · ${cat.name} · ${USERS[e.uid]?.name} · ${PM_LABELS[e.pm]||e.pm}`,amt:e.amt,col:'var(--pink)',sign:'−',dt:e.date})})
  if(ft==='all'||ft==='savings')S.goals.flatMap(g=>g.contributions.map(c=>({...c,gTitle:g.title}))).forEach(c=>{if(fu!=='all'&&c.uid!==fu)return;if(fq&&!(c.note||'').toLowerCase().includes(fq))return;items.push({ico:c.source==='auto'?'🔄':'💸',nm:(c.source==='auto'?'Auto-transfer':'Manual deposit')+` — ${USERS[c.uid]?.name} → ${c.gTitle}`,sub:`${fmtD(c.date)}${c.note?' · '+c.note:''}`,amt:c.amt,col:'var(--teal)',sign:'+',dt:c.date})})
  if(ft==='all'||ft==='install')S.instPays.forEach(ip=>{if(fu!=='all'&&ip.uid!==fu)return;const inst=allInsts().find(i=>i.id===ip.iid);const nm=inst?inst.name:ip.iid;if(fq&&!nm.toLowerCase().includes(fq))return;items.push({ico:'📦',nm:`Installment: ${esc(nm)}`,sub:`${fmtD(ip.date)} · ${ip.uname} · ${PM_LABELS[ip.pm]||ip.pm}`,amt:ip.amt,col:'var(--purple)',sign:'−',dt:ip.date})})
  items.sort((a,b)=>new Date(b.dt)-new Date(a.dt))
  const PAGE=10,tp=Math.ceil(items.length/PAGE);_hp=Math.min(_hp,Math.max(0,tp-1))
  const slice=items.slice(_hp*PAGE,(_hp+1)*PAGE)
  const logEl=document.getElementById('hist-log')
  if(logEl)logEl.innerHTML=slice.length===0?'<div class="empty" style="padding:20px"><div class="empty-ico">🗂️</div><p>No items match your filters</p></div>':slice.map(item=>`<div class="row"><div class="rico" style="background:${item.col}22">${item.ico}</div><div class="rinfo"><div class="rname">${item.nm}</div><div class="rsub">${item.sub}</div></div><div class="rright"><div class="ramt" style="color:${item.col}">${item.sign}${P(item.amt)}</div></div></div>`).join('')
  const paEl=document.getElementById('hist-pagi')
  if(paEl)paEl.innerHTML=tp<=1?'':`<button class="btn btn-sm btn-g" onclick="_hp=${_hp-1};renderHist()" ${_hp===0?'disabled':''}>‹ Prev</button><span>Page ${_hp+1}/${tp}</span><button class="btn btn-sm btn-g" onclick="_hp=${_hp+1};renderHist()" ${_hp>=tp-1?'disabled':''}>Next ›</button>`
}
function renderIPLog(){
  const all=S.instPays.slice().sort((a,b)=>new Date(b.date)-new Date(a.date))
  const PAGE=8,tp=Math.ceil(all.length/PAGE);_ipp=Math.min(_ipp,Math.max(0,tp-1))
  const slice=all.slice(_ipp*PAGE,(_ipp+1)*PAGE)
  const instNm=id=>allInsts().find(i=>i.id===id)?.name||id
  const el=document.getElementById('rep-iplog')
  if(el)el.innerHTML=`<table><thead><tr><th>Installment</th><th>Amount</th><th>Date</th><th>Payer</th><th>Payment Method</th><th>Auto-Expensed</th></tr></thead><tbody>${slice.map(ip=>`<tr><td><strong>${esc(instNm(ip.iid))}</strong></td><td style="font-weight:700;color:var(--purple)">${P(ip.amt)}</td><td>${fmtD(ip.date)}</td><td>${ip.uname}</td><td>${PM_LABELS[ip.pm]||ip.pm||'—'}</td><td><span class="badge ${ip.autoExp?'ba':'bn'}">${ip.autoExp?'Yes':'No'}</span></td></tr>`).join('')}</tbody></table>`
  const pa=document.getElementById('rep-ipagi')
  if(pa)pa.innerHTML=tp<=1?'':`<button class="btn btn-sm btn-g" onclick="_ipp=${_ipp-1};renderIPLog()" ${_ipp===0?'disabled':''}>‹ Prev</button><span>Page ${_ipp+1}/${tp}</span><button class="btn btn-sm btn-g" onclick="_ipp=${_ipp+1};renderIPLog()" ${_ipp>=tp-1?'disabled':''}>Next ›</button>`
}

// ─── CATEGORIES ───────────────────────────────────────────
function renderCats(){
  const aExps=allExps()
  document.getElementById('cat-list').innerHTML=S.cats.map(c=>{const cnt=aExps.filter(e=>e.catId===c.id).length;return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1.5px solid var(--border)"><div style="width:32px;height:32px;border-radius:9px;background:${c.color}22;border:1.5px solid ${c.color}44;display:flex;align-items:center;justify-content:center;font-size:16px">${c.icon}</div><div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(c.name)}</div><div style="font-size:11px;color:var(--txt3)">${cnt} expense${cnt!==1?'s':''}</div></div><button class="btn-ico btn btn-xs" onclick="openEditCat(event,'${c.id}')">✏️</button><button class="btn-ico btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete Category','Expenses in &ldquo;${esc(c.name)}&rdquo; will move to Other.',()=>delCat('${c.id}'))">🗑️</button></div>`}).join('')
  const cc=CC()
  const catD=S.cats.map(c=>({c,amt:aExps.filter(e=>e.catId===c.id).reduce((a,e)=>a+e.amt,0)})).filter(x=>x.amt>0)
  mkChart('catPie',{type:'doughnut',data:{labels:catD.map(x=>`${x.c.icon} ${x.c.name}`),datasets:[{data:catD.map(x=>x.amt),backgroundColor:catD.map(x=>x.c.color+'dd'),borderWidth:2,borderColor:cc.bg2,hoverOffset:10}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',animation:{duration:700},plugins:{legend:{display:true,position:'right',labels:{color:cc.txt2,font:{family:'DM Sans',size:11},usePointStyle:true,boxWidth:10,padding:12}},tooltip:{backgroundColor:cc.bg2,titleColor:cc.txt,bodyColor:cc.txt2,borderColor:cc.border,borderWidth:1.5,cornerRadius:12}}}})
}

// ─── TODO ─────────────────────────────────────────────────
let _calDate=new Date()
const TODO_CAT_ICONS={finance:'💰',personal:'👤',couple:'💑',work:'💼',health:'💊',other:'✨'}
const DAYS_ORDER=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SCHED_TYPE={class:'class',lab:'lab',study:'study'}

function setTodoUser(mode,el){
  S._todoUser=mode
  document.querySelectorAll('.tut[id^="tut-"]').forEach(b=>b.classList.remove('active'))
  if(el)el.classList.add('active')
  const tu=mode==='mine'?AU:(AU==='u1'?'u2':'u1')
  document.getElementById('todo-list-title').textContent=mode==='mine'?`📝 ${USERS[AU].name}'s Tasks`:`📝 ${USERS[tu].name}'s Tasks`
  renderTodo()
}
function setSchedUser(mode,el){
  S._schedUser=mode
  document.querySelectorAll('[id^="schedtab-"]').forEach(b=>{b.style.background='';b.style.color='';b.style.borderColor=''})
  if(el){el.style.background='var(--pink)';el.style.color='#fff';el.style.borderColor='transparent'}
  renderSched()
}

function renderTodo(){
  const tu=S._todoUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const filter=S._todoFilter||'all'
  let items=S.todos.filter(t=>t.uid===tu)
  if(filter==='pending')items=items.filter(t=>!t.done)
  if(filter==='done')items=items.filter(t=>t.done)
  const allU=S.todos.filter(t=>t.uid===tu)
  document.getElementById('td-pending-ct').textContent=allU.filter(t=>!t.done).length
  document.getElementById('td-done-ct').textContent=allU.filter(t=>t.done).length
  const now=new Date();now.setHours(0,0,0,0)
  document.getElementById('todo-list').innerHTML=items.length===0
    ?'<div class="empty" style="padding:18px"><div class="empty-ico">✅</div><p>No tasks here</p></div>'
    :items.map(t=>{
      const due=t.due?new Date(t.due+'T12:00:00'):null;const overdue=due&&due<now&&!t.done
      const priCls=t.pri==='high'?'pri-high':t.pri==='mid'?'pri-mid':'pri-low'
      const priLbl=t.pri==='high'?'🔴 High':t.pri==='mid'?'🟡 Medium':'🟢 Low'
      return`<div class="todo-item ${t.done?'done':''}">
        <div class="todo-cb ${t.done?'checked':''}" onclick="toggleTodo('${t.id}')"></div>
        <div class="todo-text">
          <div class="todo-title">${TODO_CAT_ICONS[t.cat]||'✨'} ${esc(t.title)} <span class="todo-priority ${priCls}">${priLbl}</span></div>
          ${t.due?`<div class="todo-due ${overdue?'overdue':''}">📅 ${fmtD(t.due)}${overdue?' · Overdue!':''}</div>`:''}
          ${t.notes?`<div style="font-size:11px;color:var(--txt3);margin-top:2px">${esc(t.notes)}</div>`:''}
        </div>
        <div class="racts">
          <button class="btn-ico btn btn-xs" onclick="openEditTodo(event,'${t.id}')">✏️</button>
          <button class="btn-ico btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete Task','Remove task &ldquo;${esc(t.title)}&rdquo;?',()=>delTodo('${t.id}'))">🗑️</button>
        </div>
      </div>`
    }).join('')
  renderSched()
  renderCal()
}

function renderSched(){
  const su=S._schedUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const sched=(S.schedule[su]||[])
  const byDay={}; DAYS_ORDER.forEach(d=>byDay[d]=[])
  sched.forEach(e=>{if(byDay[e.day])byDay[e.day].push(e)})
  byDay['Saturday']=byDay['Saturday']||[]; byDay['Sunday']=byDay['Sunday']||[]
  const todayName=new Date().toLocaleDateString('en-US',{weekday:'long'})
  const el=document.getElementById('sched-body'); if(!el)return
  el.innerHTML=DAYS_ORDER.filter(d=>byDay[d].length>0).map(d=>{
    const isToday=d===todayName
    return`<div class="sched-day-block">
      <div class="sched-day-label"><span class="day-dot" style="${isToday?'background:var(--pink)':'background:var(--txt3)'}"></span>${d}${isToday?' <span style="font-size:10px;color:var(--pink);font-weight:800">TODAY</span>':''}</div>
      ${byDay[d].sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`
        <div class="sched-item" style="${isToday?'border-color:var(--pink-mid);background:var(--pink-l)':''}">
          <div class="sched-time">⏰ ${e.start} – ${e.end}</div>
          <div style="flex:1"><div class="sched-label">${esc(e.label)}</div>${e.room?`<div class="sched-room">📍 ${esc(e.room)}</div>`:''}</div>
          <span class="sched-type stype-${e.type||'class'}">${e.type==='lab'?'🔬 Lab':e.type==='study'?'📖 Study':'📚 Class'}</span>
          <div class="racts">
            <button class="btn-ico btn btn-xs" onclick="openEditSched(event,'${su}','${e.id}')">✏️</button>
            <button class="btn-ico btn btn-xs btn-d" onclick="delConfirm('🗑️ Delete','Remove &ldquo;${esc(e.label)}&rdquo;?',()=>delSched('${su}','${e.id}'))">🗑️</button>
          </div>
        </div>`).join('')}
    </div>`
  }).join('')||(sched.length===0?'<div class="empty" style="padding:18px"><div class="empty-ico">📅</div><p>No schedule entries yet. Add your classes!</p></div>':'')
}

function filterTodo(f,btn){
  S._todoFilter=f
  document.querySelectorAll('#tf-all,#tf-pending,#tf-done').forEach(b=>{b.style.background='';b.style.color='';b.style.borderColor=''})
  if(btn){btn.style.background='var(--pink)';btn.style.color='#fff';btn.style.borderColor='transparent'}
  renderTodo()
}

async function toggleTodo(id){
  const t=S.todos.find(x=>x.id===id);if(!t)return
  t.done=!t.done
  if(SB_READY&&AU_SB_ID)await sbUpdateTodo(id,{is_done:t.done,done_at:t.done?new Date().toISOString():null})
  renderTodo();toast(t.done?'Task completed! 🎉':'Task reopened 🔄')
}

// ─── CALENDAR ─────────────────────────────────────────────
function navCal(dir){_calDate=new Date(_calDate.getFullYear(),_calDate.getMonth()+dir,1);renderCal()}
function renderCal(){
  const y=_calDate.getFullYear(),m=_calDate.getMonth()
  document.getElementById('cal-month-lbl').textContent=_calDate.toLocaleDateString('en-PH',{month:'long',year:'numeric'})
  const days=['Su','Mo','Tu','We','Th','Fr','Sa']
  document.getElementById('cal-hd').innerHTML=days.map(d=>`<div class="cal-day-hd">${d}</div>`).join('')
  const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate()
  const todayStr=tod()
  const tu=S._todoUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const taskDates=S.todos.filter(t=>t.uid===tu&&!t.done).map(t=>t.due).filter(Boolean)
  const cells=[]
  for(let i=0;i<first;i++)cells.push(`<div class="cal-day other-month"></div>`)
  for(let d=1;d<=last;d++){
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const isToday=ds===todayStr,hasTask=taskDates.includes(ds)
    cells.push(`<div class="cal-day ${isToday?'today':''} ${hasTask?'has-task':''}" onclick="calDayClick('${ds}',this)">${d}</div>`)
  }
  document.getElementById('cal-body').innerHTML=cells.join('')
}
function calDayClick(ds,el){
  document.querySelectorAll('.cal-day.selected').forEach(x=>{x.classList.remove('selected');x.style.outline=''})
  el.classList.add('selected');el.style.outline='2px solid var(--pink)'
  const tu=S._todoUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const tasks=S.todos.filter(t=>t.due===ds&&t.uid===tu)
  const taskEl=document.getElementById('cal-day-tasks');if(!taskEl)return
  taskEl.innerHTML=tasks.length===0?`<div style="font-size:12px;color:var(--txt3)">No tasks for ${fmtD(ds)}</div>`
    :`<div style="font-size:12px;font-weight:700;margin-bottom:6px">Tasks for ${fmtD(ds)}</div>`+tasks.map(t=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;gap:6px;align-items:center"><span>${t.done?'✅':'⭕'}</span><span style="${t.done?'text-decoration:line-through;color:var(--txt3)':''}">${esc(t.title)}</span></div>`).join('')
}

// ─── WISHLIST ──────────────────────────────────────────────
function setWishUser(mode,el){
  S._wishUser=mode
  document.querySelectorAll('.tut[id^="wt-"]').forEach(b=>b.classList.remove('active'))
  if(el)el.classList.add('active')
  renderWishlist()
}

function renderWishlist(){
  const wu=S._wishUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const items=S.wishlist[wu]||[]
  const isOwn=wu===AU
  // Stats
  const total=items.reduce((a,w)=>a+w.price,0)
  const saving=items.filter(w=>w.status==='saving')
  const done=items.filter(w=>w.status==='completed')
  const statsEl=document.getElementById('wish-stats')
  if(statsEl)statsEl.innerHTML=`
    <div class="sc sp" style="margin:0"><div class="sc-ico">🛍️</div><div class="sc-lbl">Total Items</div><div class="sc-val vp">${items.length}</div><span class="sdelta dn">${done.length} completed</span></div>
    <div class="sc sc2" style="margin:0"><div class="sc-ico">💰</div><div class="sc-lbl">Total Value</div><div class="sc-val vc">${P(total)}</div><span class="sdelta dn">all items</span></div>
    <div class="sc sg" style="margin:0"><div class="sc-ico">💾</div><div class="sc-lbl">Currently Saving</div><div class="sc-val vg">${saving.length}</div><span class="sdelta dn">${P(saving.reduce((a,w)=>a+w.price,0))} value</span></div>
  `
  // List
  const listEl=document.getElementById('wish-list')
  if(!listEl)return
  if(items.length===0){listEl.innerHTML='<div class="empty"><div class="empty-ico">🛍️</div><div class="empty-t">Wishlist is empty</div><p>Add items you want to buy or save for!</p></div>';return}
  // Group by status
  const groups={saving:items.filter(w=>w.status==='saving'),planned:items.filter(w=>w.status==='planned'),completed:items.filter(w=>w.status==='completed')}
  const statusLabel={saving:'💰 Currently Saving',planned:'📋 Planned',completed:'✅ Completed'}
  listEl.innerHTML=Object.entries(groups).filter(([,arr])=>arr.length>0).map(([status,arr])=>`
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:800;color:var(--txt3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">${statusLabel[status]}</div>
      ${arr.map(w=>`
        <div class="wcard ${w.status}">
          <div class="wcard-top">
            <div>
              <span class="ws-badge ws-${w.status}">${w.status==='saving'?'💰 Saving':w.status==='completed'?'✅ Done':'📋 Planned'}</span>
              <div class="wcard-name" style="margin-top:6px">${esc(w.name)}</div>
              ${w.notes?`<div class="wcard-notes">${esc(w.notes)}</div>`:''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div class="wcard-price">${P(w.price)}</div>
              ${isOwn?`<div style="display:flex;gap:4px;margin-top:8px;justify-content:flex-end">
                <button class="btn btn-xs btn-g" onclick="editWish(event,'${wu}','${w.id}')">✏️</button>
                <button class="btn btn-xs btn-d" onclick="delConfirm('🗑️ Remove Item','Remove &ldquo;${esc(w.name)}&rdquo; from wishlist?',()=>delWish('${wu}','${w.id}'))">🗑️</button>
                ${w.status!=='completed'?`<button class="btn btn-xs btn-g" onclick="markWishDone('${wu}','${w.id}')" title="Mark completed">✅</button>`:''}
              </div>`:''}
            </div>
          </div>
        </div>`).join('')}
    </div>`).join('')
}

async function saveWish(e){
  CP(e)
  const eid=document.getElementById('wish-eid').value
  const wu=S._wishUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const sbUserId=wu==='u1'?AU_SB_ID:AU_PARTNER_ID
  const name=document.getElementById('wish-name').value.trim()
  const price=parseFloat(document.getElementById('wish-price').value)||0
  const notes=document.getElementById('wish-notes').value.trim()
  const status=document.getElementById('wish-status').value
  if(!name){showErr('wish-err','Enter an item name');return}
  if(!S.wishlist[wu])S.wishlist[wu]=[]
  if(eid){
    if(SB_READY&&sbUserId)await sbUpdateWishItem(eid,{item_name:name,target_price:price,notes,status})
    const idx=S.wishlist[wu].findIndex(w=>w.id===eid)
    if(idx>-1)S.wishlist[wu][idx]={...S.wishlist[wu][idx],name,price,notes,status}
    toast('Wishlist item updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&sbUserId){
      const saved=await sbCreateWishItem({user_id:sbUserId,item_name:name,target_price:price,notes,status,url:''})
      if(saved)newId=saved.id; else{showErr('wish-err','Failed to save');return}
    }
    S.wishlist[wu].unshift({id:newId,uid:wu,name,price,notes,status,url:''})
    toast(`"${name}" added to wishlist! 🛍️`)
  }
  cm('m-addWish');renderWishlist()
}

function editWish(e,wu,wid){
  CP(e)
  const w=(S.wishlist[wu]||[]).find(x=>x.id===wid);if(!w)return
  document.getElementById('wish-eid').value=wid
  document.getElementById('wish-name').value=w.name
  document.getElementById('wish-price').value=w.price
  document.getElementById('wish-notes').value=w.notes||''
  document.getElementById('wish-status').value=w.status
  document.getElementById('wish-mtitle').textContent='✏️ Edit Wishlist Item'
  document.getElementById('wish-err').style.display='none'
  document.getElementById('m-addWish').style.display='flex'
}

async function delWish(wu,wid){
  if(SB_READY&&AU_SB_ID)await sbDeleteWishItem(wid)
  S.wishlist[wu]=(S.wishlist[wu]||[]).filter(w=>w.id!==wid)
  toast('Item removed 🗑️');renderWishlist()
}

async function markWishDone(wu,wid){
  const w=(S.wishlist[wu]||[]).find(x=>x.id===wid);if(!w)return
  if(SB_READY&&AU_SB_ID)await sbUpdateWishItem(wid,{status:'completed'})
  w.status='completed';toast(`"${w.name}" marked as completed! 🎉`);renderWishlist()
}

// ─── SCHEDULE ──────────────────────────────────────────────
async function saveSched(e){
  CP(e)
  const eid=document.getElementById('sched-eid').value
  const su=S._schedUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const sbUserId=su==='u1'?AU_SB_ID:AU_PARTNER_ID
  const label=document.getElementById('sched-label').value.trim()
  const day=document.getElementById('sched-day').value
  const start=document.getElementById('sched-start').value
  const end=document.getElementById('sched-end').value
  const room=document.getElementById('sched-room').value.trim()
  const type=document.getElementById('sched-type').value
  const custType=type==='other'?(document.getElementById('sched-custtype')?.value?.trim()||''): ''
  if(!label||!day||!start||!end){showErr('sched-err','Fill all required fields');return}
  if(!S.schedule[su])S.schedule[su]=[]
  if(eid){
    if(SB_READY&&sbUserId)await _sb.from('schedules').update({label,day_of_week:day,start_time:start,end_time:end,location:room,sched_type:type,custom_type:custType}).eq('id',eid)
    const idx=S.schedule[su].findIndex(s=>s.id===eid)
    if(idx>-1)S.schedule[su][idx]={...S.schedule[su][idx],label,day,start,end,room,type,custType}
    toast('Class updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&sbUserId){
      const saved=await sbCreateScheduleEntry({user_id:sbUserId,label,day_of_week:day,start_time:start,end_time:end,location:room,sched_type:type,custom_type:custType})
      if(saved) newId=saved.id
      else toast('Saved locally — sync Supabase later','⚠️')
    }
    S.schedule[su].push({id:newId,uid:su,label,day,start,end,room,type,custType})
    toast(`"${label}" added to schedule! 📅`)
  }
  cm('m-addSched');renderSched()
}

function openEditSched(e,su,sid){
  CP(e)
  const s=(S.schedule[su]||[]).find(x=>x.id===sid);if(!s)return
  document.getElementById('sched-eid').value=sid
  document.getElementById('sched-label').value=s.label
  document.getElementById('sched-day').value=s.day
  document.getElementById('sched-start').value=s.start
  document.getElementById('sched-end').value=s.end
  document.getElementById('sched-room').value=s.room||''
  document.getElementById('sched-type').value=s.type||'class'
  document.getElementById('sched-mtitle').textContent='✏️ Edit Class'
  document.getElementById('sched-err').style.display='none'
  document.getElementById('m-addSched').style.display='flex'
}

async function delSched(su,sid){
  if(SB_READY&&AU_SB_ID)await sbDeleteScheduleEntry(sid)
  S.schedule[su]=(S.schedule[su]||[]).filter(s=>s.id!==sid)
  toast('Class removed 🗑️');renderSched()
}

// ─── PROFILE ──────────────────────────────────────────────
function renderProfile(){
  const u=USERS[AU]
  document.getElementById('profAvSpan').textContent=u.avatar||'🐱'
  const img=document.getElementById('profAvImg')
  if(u.photo&&u.photo!=='null'&&u.photo!=='undefined'){
    img.src=u.photo; img.style.display='block'
    document.getElementById('profAvSpan').style.display='none'
  } else {
    img.style.display='none'
    document.getElementById('profAvSpan').style.display='block'
  }
  document.getElementById('prof-name').textContent=u.name
  document.getElementById('prof-email').textContent=u.email
  document.getElementById('edit-name').value=u.name
  document.getElementById('edit-av').value=u.avatar
  // Show real invite code (from Supabase) or loading indicator
  const codeEl=document.getElementById('myCode')
  if(codeEl) codeEl.textContent=u.inviteCode||'Loading…'
  // Partner status: show proper message
  const pid=AU==='u1'?'u2':'u1'
  const partnerEl=document.getElementById('partnerStatus')
  if(partnerEl){
    if(AU_PARTNER_ID&&USERS[pid].name&&USERS[pid].name!=='Partner'){
      partnerEl.innerHTML=`<span style="color:var(--teal);font-weight:700">✓ Linked:</span> ${USERS[pid].avatar} ${esc(USERS[pid].name)} (${esc(USERS[pid].email||'')})`
    } else if(AU_PARTNER_ID){
      partnerEl.innerHTML=`<span style="color:var(--teal);font-weight:700">✓ Linked</span> — loading partner info…`
    } else {
      partnerEl.innerHTML=`<span style="color:var(--txt3)">No partner linked yet.</span> Share your code above!`
    }
  }
}

// Compress image to max 280x280 JPEG at 75% quality — prevents browser crash on large files
function compressImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=ev=>{
      const dataUrl=ev.target.result
      // Create a blob URL as fallback for formats the browser can decode
      const blob=new Blob([file],{type:file.type||'image/jpeg'})
      const blobUrl=URL.createObjectURL(blob)
      const img=new Image()
      img.onload=()=>{
        URL.revokeObjectURL(blobUrl)
        const MAX=300
        let w=img.naturalWidth||img.width
        let h=img.naturalHeight||img.height
        if(!w||!h){ reject(new Error('Could not read image dimensions')); return }
        if(w>MAX||h>MAX){const r=Math.min(MAX/w,MAX/h);w=Math.round(w*r);h=Math.round(h*r)}
        const canvas=document.createElement('canvas')
        canvas.width=w; canvas.height=h
        const ctx=canvas.getContext('2d')
        ctx.fillStyle='#ffffff' // white background (avoids transparent PNG issues)
        ctx.fillRect(0,0,w,h)
        ctx.drawImage(img,0,0,w,h)
        resolve(canvas.toDataURL('image/jpeg',0.80))
      }
      img.onerror=()=>{
        URL.revokeObjectURL(blobUrl)
        // Try again with the FileReader data URL directly
        const img2=new Image()
        img2.onload=()=>{
          const MAX=300
          let w=img2.naturalWidth||img2.width||280
          let h=img2.naturalHeight||img2.height||280
          if(w>MAX||h>MAX){const r=Math.min(MAX/w,MAX/h);w=Math.round(w*r);h=Math.round(h*r)}
          const canvas=document.createElement('canvas')
          canvas.width=w; canvas.height=h
          const ctx=canvas.getContext('2d')
          ctx.fillStyle='#ffffff'
          ctx.fillRect(0,0,w,h)
          ctx.drawImage(img2,0,0,w,h)
          resolve(canvas.toDataURL('image/jpeg',0.80))
        }
        img2.onerror=reject
        img2.src=dataUrl
      }
      img.src=blobUrl
    }
    reader.onerror=reject
    reader.readAsDataURL(file)
  })
}

async function uploadAvatar(ev){
  const file=ev.target.files[0]; if(!file)return
  // Validate file size (max 20MB raw — compressed will be tiny)
  if(file.size > 20*1024*1024){ toast('Image too large. Please use a photo under 20MB.','⚠️'); return }
  try{
    toast('Processing photo… 📷')
    // Compress to ≤280px JPEG — avoids Supabase Storage RLS/bucket issues entirely
    const compressed=await compressImage(file)
    // Show preview immediately
    USERS[AU].photo=compressed
    updateSBAv(); renderProfile()
    // Save compressed base64 directly into profiles.avatar_url (small enough for a text column)
    if(SB_READY&&AU_SB_ID){
      const {error}=await _sb.from('profiles').update({avatar_url:compressed}).eq('id',AU_SB_ID)
      if(error){ console.error('Avatar save error:',error); toast('Photo preview shown — save failed: '+error.message,'⚠️'); return }
      toast('Profile photo saved! 📷')
    } else {
      toast('Photo shown locally (Supabase not connected) 📷')
    }
  }catch(err){
    console.error('Avatar upload error:',err)
    toast('Photo upload failed — try a smaller image','❌')
  }
}

async function saveProfile(e){
  CP(e)
  const name=document.getElementById('edit-name').value.trim()
  const av=document.getElementById('edit-av').value.trim()||'🐱'
  if(!name)return
  USERS[AU].name=name;USERS[AU].avatar=av
  if(SB_READY&&AU_SB_ID)await sbSaveProfile(AU_SB_ID,{display_name:name,avatar_emoji:av})
  updateSBAv();renderProfile();toast('Profile updated! 🐾')
}

async function linkPartner(e){
  CP(e)
  const code=document.getElementById('partnerCodeInp').value.trim().toUpperCase()
  if(!code){ toast('Enter your partner\u2019s code first','⚠️'); return }
  if(!SB_READY||!AU_SB_ID){ toast('Supabase not connected — cannot link partner','⚠️'); return }
  if(code===USERS.u1.inviteCode){ toast("That’s your own code! Enter your partner’s code","⚠️"); return }

  const btn=document.querySelector('[onclick="linkPartner(event)"]')
  if(btn){btn.textContent='Linking…';btn.disabled=true}

  try{
    // Use RPC to bypass RLS — this updates BOTH profiles safely server-side
    const {data,error}=await _sb.rpc('link_partner',{
      my_id:AU_SB_ID,
      partner_code:code
    })
    if(btn){btn.textContent='Link Partner';btn.disabled=false}
    if(error||data===false){
      toast('Code not found. Ask your partner to share their code from Profile.','❌')
      return
    }
    // Reload profile to get the new partner_id
    const profile=await sbLoadProfile(AU_SB_ID)
    if(profile?.partner_id){
      AU_PARTNER_ID=profile.partner_id
      USERS.u1.inviteCode=profile.invite_code||USERS.u1.inviteCode
      const pp=await sbLoadProfile(AU_PARTNER_ID)
      if(pp){
        USERS.u2.name=pp.display_name||'Partner'
        USERS.u2.avatar=pp.avatar_emoji||'🐈'
        USERS.u2.id=AU_PARTNER_ID
        USERS.u2.inviteCode=pp.invite_code||''
      }
    }
    await loadAllDataFromSB()
    updateSBAv(); renderProfile()
    toast("🎉 Partner linked! You can now see each other's data.")
  }catch(err){
    if(btn){btn.textContent='Link Partner';btn.disabled=false}
    console.error('Link partner error:',err)
    toast('Link failed: '+err.message,'❌')
  }
}

// ─── MODAL SYSTEM ─────────────────────────────────────────
function openModal(id,ctx){
  S._ctx=ctx||null
  document.querySelectorAll(`#${id} .err`).forEach(e=>e.style.display='none')
  // Reset hidden edit-id fields so we're in "add" mode by default
  const eid=document.querySelector(`#${id} input[type=hidden][id$="-eid"]`)
  if(eid)eid.value=''
  // Reset modal title to default "add" state
  const titleMap={'m-addWish':'🛍️ Add to Wishlist','m-addSched':'📅 Add Class / Event','m-addTodo':'✅ New Task','m-addCat':'🏷️ New Category','m-newGoal':'🎯 New Savings Goal','m-addSav':'🏦 Add to Savings','m-newBudget':'🐱 New Budget Cycle'}
  const titleEl=document.querySelector(`#${id} .mtitle`)
  if(titleEl&&titleMap[id])titleEl.textContent=titleMap[id]
  document.getElementById(id).style.display='flex'
}
function cm(id){document.getElementById(id).style.display='none'}
function obg(e,id){if(e.target.classList.contains('overlay'))cm(id)}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.overlay').forEach(m=>m.style.display='none')})

function delConfirm(title,body,fn){
  document.getElementById('del-title').textContent=title
  document.getElementById('del-body').innerHTML=body
  document.getElementById('del-ok').onclick=()=>{fn();cm('m-del')}
  document.getElementById('m-del').style.display='flex'
}

// ─── CREATE BUDGET ────────────────────────────────────────
async function createBudget(e){
  CP(e)
  const scope=S._ctx||'mine',uid2=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  const title=document.getElementById('nb-title').value.trim(),amt=parseFloat(document.getElementById('nb-amt').value),start=document.getElementById('nb-start').value,days=parseInt(document.getElementById('nb-days').value),type=document.getElementById('nb-type').value,notes=document.getElementById('nb-notes').value
  if(!title||!amt||!start||!days){showErr('nb-err','Fill all fields');return}
  const sbUserId=uid2==='u1'?AU_SB_ID:AU_PARTNER_ID
  const localObj={id:uid(),uid:uid2,title,type,amt,spent:0,start,days,end:addD(start,days-1),status:'active',notes}
  if(SB_READY&&sbUserId){
    const dbRow={user_id:sbUserId,title,budget_type:type,amount:amt,start_date:start,end_date:addD(start,days-1),status:'active',notes}
    const saved=await sbCreateBudget(dbRow)
    if(saved){localObj.id=saved.id}else{showErr('nb-err','Failed to save. Check Supabase connection.');return}
  }
  if(!S.budgets[uid2])S.budgets[uid2]=[]
  S.budgets[uid2].push(localObj)
  cm('m-newBudget');buildRepOptions();toast(`"${title}" budget created! 🐱`);renderPage(CUR)
}

async function delBudget(scope,bid){
  const uid2=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  const b=getBudget(bid)
  if(SB_READY&&AU_SB_ID){ await sbDeleteBudget(bid) }
  S.budgets[uid2]=(S.budgets[uid2]||[]).filter(x=>x.id!==bid)
  S.expenses[uid2]=(S.expenses[uid2]||[]).filter(e=>e.bid!==bid)
  _actTab[scope]=null
  buildRepOptions()
  toast(`"${b?.title||'Budget'}" deleted 🗑️`)
  renderPage(CUR)
}

// ─── EXPENSES ─────────────────────────────────────────────
function openAddExp(e,scope,bid){
  CP(e);populateCatSel('exp-cat',null)
  document.getElementById('exp-eid').value='';document.getElementById('exp-eoldamt').value='';document.getElementById('exp-esc').value=scope;document.getElementById('exp-ebid').value=bid
  document.getElementById('exp-desc').value='';document.getElementById('exp-amt').value='';document.getElementById('exp-date').value=tod();document.getElementById('exp-custcat').style.display='none'
  document.querySelectorAll('#exp-pm .pm-btn').forEach((b,i)=>{b.classList.toggle('sel',i===0)})
  document.getElementById('exp-mtitle').textContent='+ Add Expense';document.getElementById('exp-err').style.display='none'
  document.getElementById('m-addExp').style.display='flex'
}
function openEditExp(e,scope,bid,eid){
  CP(e);const uid2=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  const exp=(S.expenses[uid2]||[]).find(x=>x.id===eid);if(!exp)return
  populateCatSel('exp-cat',exp.catId)
  document.getElementById('exp-eid').value=eid;document.getElementById('exp-eoldamt').value=exp.amt;document.getElementById('exp-esc').value=scope;document.getElementById('exp-ebid').value=bid
  document.getElementById('exp-desc').value=exp.desc;document.getElementById('exp-amt').value=exp.amt;document.getElementById('exp-date').value=exp.date
  const custEl=document.getElementById('exp-custcat');custEl.value=exp.custCat||'';custEl.style.display=exp.catId==='cat8'?'block':'none'
  document.querySelectorAll('#exp-pm .pm-btn').forEach(b=>b.classList.toggle('sel',b.dataset.pm===exp.pm))
  document.getElementById('exp-mtitle').textContent='✏️ Edit Expense';document.getElementById('exp-err').style.display='none'
  document.getElementById('m-addExp').style.display='flex'
}
async function saveExp(e){
  CP(e);const eid=document.getElementById('exp-eid').value,oldAmt=parseFloat(document.getElementById('exp-eoldamt').value)||0,scope=document.getElementById('exp-esc').value,bid=document.getElementById('exp-ebid').value
  const desc=document.getElementById('exp-desc').value.trim(),amt=parseFloat(document.getElementById('exp-amt').value),date=document.getElementById('exp-date').value,catId=document.getElementById('exp-cat').value,custCat=document.getElementById('exp-custcat').value.trim(),pm=getPM('exp-pm')
  const uid2=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  const sbUserId=uid2==='u1'?AU_SB_ID:AU_PARTNER_ID
  if(!desc||!amt||!date){showErr('exp-err','Fill all fields');return}
  if(!S.expenses[uid2])S.expenses[uid2]=[]
  if(eid){
    if(SB_READY&&sbUserId){await sbUpdateExpense(eid,{description:desc,amount:amt,expense_date:date,category_id:catId,custom_category:custCat,payment_method:pm})}
    const idx=S.expenses[uid2].findIndex(x=>x.id===eid);if(idx>-1){S.expenses[uid2][idx]={...S.expenses[uid2][idx],desc,amt,date,catId,custCat,pm};const b=getBudget(bid);if(b)b.spent=Math.max(0,b.spent+(amt-oldAmt))};toast('Expense updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&sbUserId){
      const saved=await sbCreateExpense({user_id:sbUserId,budget_id:bid,description:desc,amount:amt,expense_date:date,category_id:catId,custom_category:custCat,payment_method:pm})
      if(saved)newId=saved.id; else{showErr('exp-err','Failed to save');return}
    }
    S.expenses[uid2].push({id:newId,uid:uid2,bid,desc,amt,date,catId,custCat,pm})
    const b=getBudget(bid);if(b)b.spent+=amt;toast('Expense added! 🐾')
  }
  cm('m-addExp');buildRepOptions();renderPage(CUR)
}
async function delExp(scope,bid,eid){
  const uid2=scope==='mine'?AU:(AU==='u1'?'u2':'u1')
  const exp=(S.expenses[uid2]||[]).find(x=>x.id===eid);if(!exp)return
  if(SB_READY&&AU_SB_ID)await sbDeleteExpense(eid)
  S.expenses[uid2]=S.expenses[uid2].filter(x=>x.id!==eid);const b=getBudget(bid);if(b)b.spent=Math.max(0,b.spent-exp.amt)
  toast('Expense deleted 🗑️');buildRepOptions();renderPage(CUR)
}

// ─── INSTALLMENTS ─────────────────────────────────────────
function openAddInst(e,uid2){
  CP(e);document.getElementById('inst-eid').value='';document.getElementById('inst-uid').value=uid2
  ;['inst-name','inst-total','inst-pay'].forEach(id=>document.getElementById(id).value='')
  document.getElementById('inst-down').value='0';document.getElementById('inst-freq').value='monthly';document.getElementById('inst-count').value='12';document.getElementById('inst-due').value=tod();document.getElementById('inst-auto').checked=true
  document.querySelectorAll('#inst-pm .pm-btn').forEach((b,i)=>b.classList.toggle('sel',i===0))
  document.getElementById('inst-mtitle').textContent='📦 New Installment';document.getElementById('inst-err').style.display='none'
  document.getElementById('m-addInst').style.display='flex'
}
function openEditInst(e,uid2,iid){
  CP(e);const inst=(S.insts[uid2]||[]).find(x=>x.id===iid);if(!inst)return
  document.getElementById('inst-eid').value=iid;document.getElementById('inst-uid').value=uid2
  document.getElementById('inst-name').value=inst.name;document.getElementById('inst-total').value=inst.total;document.getElementById('inst-down').value=inst.down;document.getElementById('inst-pay').value=inst.payAmt;document.getElementById('inst-freq').value=inst.freq;document.getElementById('inst-count').value=inst.numPay;document.getElementById('inst-due').value=inst.nextDue||tod();document.getElementById('inst-auto').checked=inst.auto
  document.querySelectorAll('#inst-pm .pm-btn').forEach(b=>b.classList.toggle('sel',b.dataset.pm===inst.pm))
  document.getElementById('inst-mtitle').textContent='✏️ Edit Installment';document.getElementById('inst-err').style.display='none'
  document.getElementById('m-addInst').style.display='flex'
}
async function saveInst(e){
  CP(e);const eid=document.getElementById('inst-eid').value,uid2=document.getElementById('inst-uid').value
  const name=document.getElementById('inst-name').value.trim(),total=parseFloat(document.getElementById('inst-total').value),down=parseFloat(document.getElementById('inst-down').value)||0,payAmt=parseFloat(document.getElementById('inst-pay').value),freq=document.getElementById('inst-freq').value,numPay=parseInt(document.getElementById('inst-count').value),nextDue=document.getElementById('inst-due').value,auto=document.getElementById('inst-auto').checked,pm=getPM('inst-pm')
  const sbUserId=uid2==='u1'?AU_SB_ID:AU_PARTNER_ID
  if(!name||!total||!payAmt||!numPay){showErr('inst-err','Fill required fields');return}
  if(!S.insts[uid2])S.insts[uid2]=[]
  if(eid){
    if(SB_READY&&sbUserId)await _sb.from('installments').update({item_name:name,total_cost:total,down_payment:down,payment_amount:payAmt,frequency:freq,total_payments:numPay,next_due_date:nextDue||null,auto_add_expense:auto,payment_method:pm}).eq('id',eid)
    const idx=S.insts[uid2].findIndex(x=>x.id===eid);if(idx>-1)S.insts[uid2][idx]={...S.insts[uid2][idx],name,total,down,payAmt,freq,numPay,nextDue:nextDue||null,auto,pm};toast('Installment updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&sbUserId){
      const saved=await sbCreateInstallment({user_id:sbUserId,item_name:name,total_cost:total,down_payment:down,payment_amount:payAmt,frequency:freq,total_payments:numPay,payments_made:0,next_due_date:nextDue||null,auto_add_expense:auto,payment_method:pm,status:'active'})
      if(saved)newId=saved.id; else{showErr('inst-err','Failed to save');return}
    }
    S.insts[uid2].push({id:newId,uid:uid2,name,total,down,payAmt,freq,numPay,paid:0,nextDue:nextDue||null,auto,status:'active',pm});toast('Installment created! 📦')
  }
  cm('m-addInst');renderPage(CUR)
}
async function delInst(uid2,iid){if(SB_READY&&AU_SB_ID){await _sb.from('installments').delete().eq('id',iid)};S.insts[uid2]=(S.insts[uid2]||[]).filter(x=>x.id!==iid);S.instPays=S.instPays.filter(x=>x.iid!==iid);toast('Installment deleted 🗑️');renderPage(CUR)}
function openPayInst(e,uid2,iid){
  CP(e);const inst=(S.insts[uid2]||[]).find(x=>x.id===iid);if(!inst)return
  S._piUid=uid2;S._piIid=iid
  document.getElementById('pi-txt').textContent=`Record ${P(inst.payAmt)} payment for "${inst.name}" (${inst.paid+1}/${inst.numPay})`
  document.getElementById('pi-date').value=tod();document.getElementById('m-payInst').style.display='flex'
}
async function payInst(e){
  CP(e);const uid2=S._piUid,iid=S._piIid;const inst=(S.insts[uid2]||[]).find(x=>x.id===iid);if(!inst)return
  const date=document.getElementById('pi-date').value
  const sbUserId=uid2==='u1'?AU_SB_ID:AU_PARTNER_ID
  inst.paid++;if(inst.paid>=inst.numPay)inst.status='completed'
  let expId=null
  if(inst.auto){
    const acts=getActiveBudgets(uid2)
    if(acts.length){
      if(!S.expenses[uid2])S.expenses[uid2]=[]
      let newExpId=uid()
      if(SB_READY&&sbUserId){
        const saved=await sbCreateExpense({user_id:sbUserId,budget_id:acts[0].id,description:`Installment: ${inst.name}`,amount:inst.payAmt,expense_date:date,category_id:(S.cats.find(c=>c.name==='Bills')||S.cats.find(c=>c.name==='Other')||S.cats[0])?.id||'',payment_method:inst.pm})
        if(saved){newExpId=saved.id;expId=saved.id}
      }
      S.expenses[uid2].push({id:newExpId,uid:uid2,bid:acts[0].id,desc:`Installment: ${inst.name}`,amt:inst.payAmt,date,catId:(S.cats.find(c=>c.name==='Bills')||S.cats.find(c=>c.name==='Other')||S.cats[0])?.id||'cat4',pm:inst.pm,custCat:''})
      acts[0].spent+=inst.payAmt
    }
  }
  if(SB_READY&&sbUserId){
    await sbRecordInstallmentPayment({installment_id:iid,user_id:sbUserId,amount:inst.payAmt,payment_date:date,payment_method:inst.pm,auto_expensed:inst.auto,expense_id:expId})
    await _sb.from('installments').update({payments_made:inst.paid,status:inst.status}).eq('id',iid)
  }
  S.instPays.push({id:uid(),iid,uid:uid2,uname:USERS[uid2]?.name||uid2,amt:inst.payAmt,date,autoExp:inst.auto,pm:inst.pm})
  cm('m-payInst');toast(`Payment recorded! 💳 (${inst.paid}/${inst.numPay})`);renderPage(CUR)
}
function viewIP(e,iid){
  CP(e);const inst=allInsts().find(i=>i.id===iid);const pays=S.instPays.filter(p=>p.iid===iid)
  document.getElementById('vip-title').textContent=`💳 ${inst?.name||''} — Payment History`
  document.getElementById('vip-body').innerHTML=pays.length===0?'<div class="empty" style="padding:18px"><div class="empty-ico">📋</div><p>No payments yet</p></div>':`<table><thead><tr><th>Amount</th><th>Date</th><th>Payer</th><th>Method</th><th>Auto-Expensed</th></tr></thead><tbody>${pays.map(p=>`<tr><td style="font-weight:700">${P(p.amt)}</td><td>${fmtD(p.date)}</td><td>${esc(p.uname)}</td><td>${PM_LABELS[p.pm]||p.pm||'—'}</td><td><span class="badge ${p.autoExp?'ba':'bn'}">${p.autoExp?'Yes':'No'}</span></td></tr>`).join('')}</tbody></table>`
  document.getElementById('m-viewIP').style.display='flex'
}

// ─── SAVINGS ──────────────────────────────────────────────
function openAddSavToGoal(e,gid){
  CP(e);document.getElementById('sav-eid').value='';document.getElementById('sav-gid').value=gid||''
  document.getElementById('sav-amt').value='';document.getElementById('sav-note').value=''
  // Populate goal select
  const sel=document.getElementById('sav-goal')
  sel.innerHTML=S.goals.map(g=>`<option value="${g.id}" ${g.id===gid?'selected':''}>${g.icon} ${esc(g.title)}</option>`).join('')
  document.getElementById('sav-mtitle').textContent='🏦 Add to Savings';document.getElementById('sav-err').style.display='none'
  document.getElementById('m-addSav').style.display='flex'
}
function openEditSav(e,cid){
  CP(e);let found=null,foundG=null
  S.goals.forEach(g=>{const c=g.contributions.find(x=>x.id===cid);if(c){found=c;foundG=g}})
  if(!found)return
  document.getElementById('sav-eid').value=cid
  const sel=document.getElementById('sav-goal');sel.innerHTML=S.goals.map(g=>`<option value="${g.id}" ${g.id===foundG.id?'selected':''}>${g.icon} ${esc(g.title)}</option>`).join('')
  document.getElementById('sav-amt').value=found.amt;document.getElementById('sav-note').value=found.note||''
  document.getElementById('sav-mtitle').textContent='✏️ Edit Contribution';document.getElementById('sav-err').style.display='none'
  document.getElementById('m-addSav').style.display='flex'
}
async function saveSav(e){
  CP(e);const eid=document.getElementById('sav-eid').value,gid=document.getElementById('sav-goal').value,amt=parseFloat(document.getElementById('sav-amt').value),note=document.getElementById('sav-note').value.trim()
  if(!amt||amt<=0){showErr('sav-err','Enter a valid amount');return}
  const goal=S.goals.find(g=>g.id===gid);if(!goal){showErr('sav-err','Goal not found');return}
  if(eid){
    if(SB_READY&&AU_SB_ID)await _sb.from('savings_contributions').update({amount:amt,note}).eq('id',eid)
    S.goals.forEach(g=>{const idx=g.contributions.findIndex(c=>c.id===eid);if(idx>-1)g.contributions[idx]={...g.contributions[idx],amt,note}});toast('Contribution updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&AU_SB_ID){
      const saved=await sbAddContribution({goal_id:gid,user_id:AU_SB_ID,amount:amt,source:'manual',note,contribution_date:tod()})
      if(saved)newId=saved.id; else{showErr('sav-err','Failed to save');return}
    }
    goal.contributions.unshift({id:newId,uid:AU,amt,source:'manual',note,date:tod()});toast(`${P(amt)} deposited to ${goal.title}! 🏦`)
  }
  cm('m-addSav');renderShared()
}
async function delSav(cid){
  if(SB_READY&&AU_SB_ID)await _sb.from('savings_contributions').delete().eq('id',cid)
  S.goals.forEach(g=>{g.contributions=g.contributions.filter(c=>c.id!==cid)})
  toast('Contribution removed 🗑️');renderShared()
}
// Goal CRUD
function openEditGoal(e,gid){
  CP(e);const g=S.goals.find(x=>x.id===gid);if(!g)return
  document.getElementById('goal-eid').value=gid;document.getElementById('goal-title').value=g.title;document.getElementById('goal-icon').value=g.icon;document.getElementById('goal-target').value=g.target;document.getElementById('goal-color').value=g.color
  document.getElementById('goal-mtitle').textContent='✏️ Edit Goal';document.getElementById('goal-err').style.display='none'
  document.getElementById('m-newGoal').style.display='flex'
}
async function saveGoal(e){
  CP(e);const eid=document.getElementById('goal-eid').value,title=document.getElementById('goal-title').value.trim(),icon=document.getElementById('goal-icon').value.trim()||'🎯',target=parseFloat(document.getElementById('goal-target').value),color=document.getElementById('goal-color').value
  if(!title||!target){showErr('goal-err','Fill all fields');return}
  if(eid){
    if(SB_READY&&AU_SB_ID)await _sb.from('savings_goals').update({title,icon,target_amount:target,color}).eq('id',eid)
    const idx=S.goals.findIndex(g=>g.id===eid);if(idx>-1)S.goals[idx]={...S.goals[idx],title,icon,target,color};toast('Goal updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&AU_SB_ID){
      const saved=await sbCreateGoal({owner_id:AU_SB_ID,title,icon,target_amount:target,color})
      if(saved)newId=saved.id; else{showErr('goal-err','Failed to save');return}
    }
    S.goals.push({id:newId,title,icon,target,color,contributions:[]});toast('Savings goal created! 🎯')
  }
  cm('m-newGoal');renderShared()
}
async function delGoal(gid){if(SB_READY&&AU_SB_ID)await sbDeleteGoal(gid);S.goals=S.goals.filter(g=>g.id!==gid);toast('Goal deleted 🗑️');renderShared()}

// ─── CATEGORIES ───────────────────────────────────────────
function openEditCat(e,cid){
  CP(e);const c=S.cats.find(x=>x.id===cid);if(!c)return
  document.getElementById('cat-eid').value=cid;document.getElementById('cat-name').value=c.name;document.getElementById('cat-icon').value=c.icon;document.getElementById('cat-color').value=c.color
  document.getElementById('cat-mtitle').textContent='✏️ Edit Category';document.getElementById('cat-err').style.display='none'
  document.getElementById('m-addCat').style.display='flex'
}
async function saveCat(e){
  CP(e);const eid=document.getElementById('cat-eid').value,rawName=document.getElementById('cat-name').value.trim(),icon=document.getElementById('cat-icon').value.trim()||rawName.match(/^\p{Emoji}/u)?.[0]||'🏷️',color=document.getElementById('cat-color').value
  if(!rawName){showErr('cat-err','Enter a category name');return}
  if(eid){
    if(SB_READY&&AU_SB_ID)await _sb.from('categories').update({name:rawName,icon,color}).eq('id',eid)
    const idx=S.cats.findIndex(c=>c.id===eid);if(idx>-1)S.cats[idx]={...S.cats[idx],name:rawName,icon,color};toast('Category updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&AU_SB_ID){const saved=await _sb.from('categories').insert({user_id:AU_SB_ID,name:rawName,icon,color}).select().single();if(saved.data)newId=saved.data.id}
    S.cats.push({id:newId,name:rawName,icon,color});toast('Category created! 🏷️')
  }
  cm('m-addCat');renderCats()
}
function delCat(cid){
  const fb=S.cats.find(c=>c.name==='Other')?.id||S.cats[0]?.id
  S.cats=S.cats.filter(c=>c.id!==cid);['u1','u2'].forEach(u=>(S.expenses[u]||[]).forEach(e=>{if(e.catId===cid)e.catId=fb}))
  toast('Category deleted 🗑️');renderCats()
}

// ─── TODO ─────────────────────────────────────────────────
// ─── TODO CATEGORY HELPERS ────────────────────────────────
function toggleTodoCustCat(){
  const v=document.getElementById('todo-cat')?.value
  const wrap=document.getElementById('todo-custcat-wrap')
  if(wrap)wrap.style.display=(v==='other'?'block':'none')
}
function toggleSchedCustType(){
  const v=document.getElementById('sched-type')?.value
  const wrap=document.getElementById('sched-custtype-wrap')
  if(wrap)wrap.style.display=(v==='other'?'block':'none')
}

// Map category value → display label (supports custCat)
const TODO_CAT_LABELS={
  school:'🎓 School',personal:'👤 Personal',finance:'💰 Finance',
  couple:'💑 Couple',work:'💼 Work',health:'💊 Health',other:'✨ Other'
}
function todoDisplayCat(t){
  if(t.cat==='other'&&t.custCat)return t.custCat
  return TODO_CAT_LABELS[t.cat]||'✨ Other'
}

const SCHED_TYPE_LABELS={
  online:'💻 Online',onsite:'🏫 On-site',lab:'🔬 Lab',study:'📖 Study',other:'✨ Other'
}
function schedDisplayType(s){
  if(s.type==='other'&&s.custType)return s.custType
  return SCHED_TYPE_LABELS[s.type]||'📚 Class'
}

async function saveTodo(e){
  CP(e)
  const eid=document.getElementById('todo-eid').value
  const title=document.getElementById('todo-title').value.trim()
  const due=document.getElementById('todo-due').value
  const pri=document.getElementById('todo-pri').value
  const notes=document.getElementById('todo-notes').value.trim()
  const cat=document.getElementById('todo-cat').value
  const custCat=cat==='other'?(document.getElementById('todo-custcat')?.value?.trim()||''):''
  const tu=S._todoUser==='mine'?AU:(AU==='u1'?'u2':'u1')
  const sbUserId=tu==='u1'?AU_SB_ID:AU_PARTNER_ID
  if(!title){showErr('todo-err','Enter a task title');return}
  if(eid){
    if(SB_READY&&sbUserId)await sbUpdateTodo(eid,{title,due_date:due||null,priority:pri,notes,category:cat,custom_cat:custCat})
    const idx=S.todos.findIndex(t=>t.id===eid)
    if(idx>-1)S.todos[idx]={...S.todos[idx],title,due,pri,notes,cat,custCat}
    toast('Task updated ✏️')
  } else {
    let newId=uid()
    if(SB_READY&&sbUserId){
      const saved=await sbCreateTodo({user_id:sbUserId,title,due_date:due||null,priority:pri,notes,category:cat,custom_cat:custCat,is_done:false})
      if(saved)newId=saved.id; else{showErr('todo-err','Failed to save');return}
    }
    S.todos.push({id:newId,title,due,pri,cat,custCat,notes,done:false,uid:tu})
    toast('Task added! ✅')
  }
  cm('m-addTodo');renderTodo()
}

function openEditTodo(e,id){
  CP(e)
  const t=S.todos.find(x=>x.id===id);if(!t)return
  document.getElementById('todo-eid').value=id
  document.getElementById('todo-title').value=t.title
  document.getElementById('todo-due').value=t.due||''
  document.getElementById('todo-pri').value=t.pri||'mid'
  document.getElementById('todo-notes').value=t.notes||''
  const catEl=document.getElementById('todo-cat')
  if(catEl)catEl.value=t.cat||'personal'
  const custWrap=document.getElementById('todo-custcat-wrap')
  const custInp=document.getElementById('todo-custcat')
  if(custWrap)custWrap.style.display=(t.cat==='other'?'block':'none')
  if(custInp)custInp.value=t.custCat||''
  document.getElementById('todo-mtitle').textContent='✏️ Edit Task'
  document.getElementById('todo-err').style.display='none'
  document.getElementById('m-addTodo').style.display='flex'
}
async function delTodo(id){if(SB_READY&&AU_SB_ID)await sbDeleteTodo(id);S.todos=S.todos.filter(t=>t.id!==id);toast('Task deleted 🗑️');renderTodo()}

// ─── FX ───────────────────────────────────────────────────
const CATS_FX=['🐱','😺','😸','🐾','✨','🎀','💕','🌸','🐈','🌺']
function CP(e){if(!e?.clientX)return;const el=document.createElement('div');el.className='catpop';el.textContent=CATS_FX[Math.floor(Math.random()*CATS_FX.length)];el.style.left=(e.clientX+(Math.random()*20-10))+'px';el.style.top=(e.clientY-14)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),750)}
function toast(msg,icon='✅'){const el=document.createElement('div');el.className='toast';el.innerHTML=`<span>${icon}</span><span>${esc(msg)}</span>`;document.body.appendChild(el);setTimeout(()=>{el.style.transition='opacity .25s';el.style.opacity='0';setTimeout(()=>el.remove(),260)},2800)}
function showErr(id,msg){const el=document.getElementById(id);if(el){el.textContent=msg;el.style.display='block'}}

// ─── INIT ─────────────────────────────────────────────────
async function ensureSBReady(){
  _initSBClient()
  if(SB_READY) return true
  const maxAttempts = 8
  const retryDelay = 250
  for(let i=0;i<maxAttempts && !SB_READY;i++){
    await new Promise(resolve=>setTimeout(resolve, retryDelay))
    _initSBClient()
  }
  return SB_READY
}

window.addEventListener('DOMContentLoaded',async()=>{
  document.getElementById('staticDate').textContent=new Date().toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric',year:'numeric'})
  document.getElementById('ttTrack').classList.toggle('on',!DARK)
  document.querySelectorAll('input[type=date]').forEach(i=>{if(!i.value)i.value=tod()})
  initPetals()
  // Supabase CDN is in <head> — init immediately
  await ensureSBReady()
  _startAuth()
})

// ─── AUTH FLOW ──────────────────────────────────────────────
function showAuthOverlay(){
  const o=document.getElementById('authOverlay'); if(!o)return
  o.style.display='flex'
  // Show local-mode note if Supabase not configured
  const note=document.getElementById('authLocalNote')
  if(note)note.style.display=SB_READY?'none':'block'
}
function hideAuthOverlay(){
  const o=document.getElementById('authOverlay'); if(o)o.style.display='none'
}
function hideAuthOverlayLocalMode(){
  hideAuthOverlay()
  // Run as local-only mode
  updateSBAv(); buildRepOptions(); renderOV()
}
function switchAuthTab(tab){
  const li=document.getElementById('authFormLogin'),re=document.getElementById('authFormRegister')
  const tl=document.getElementById('authTabLogin'),tr=document.getElementById('authTabRegister')
  if(tab==='login'){
    li.style.display='block';re.style.display='none'
    tl.style.background='#d4537e';tl.style.color='#fff'
    tr.style.background='transparent';tr.style.color='#7a4a5a'
  } else {
    li.style.display='none';re.style.display='block'
    tr.style.background='#d4537e';tr.style.color='#fff'
    tl.style.background='transparent';tl.style.color='#7a4a5a'
  }
}
async function doSignIn(){
  const email=document.getElementById('authEmail')?.value.trim()
  const pass=document.getElementById('authPassword')?.value
  const errEl=document.getElementById('authLoginErr')
  const btn=document.getElementById('btnSignIn')
  if(!email||!pass){if(errEl){errEl.textContent='Please fill in email and password';errEl.style.display='block'};return}
  if(!SB_READY){hideAuthOverlayLocalMode();return}
  btn.textContent='Signing in…';btn.disabled=true
  const {data,error}=await _sb.auth.signInWithPassword({email,password:pass})
  btn.textContent='Sign In →';btn.disabled=false
  if(error){if(errEl){errEl.textContent=error.message;errEl.style.display='block'};return}
  // Auth state change handler will fire and call afterSignIn
}
async function doSignUp(){
  const name=document.getElementById('authName')?.value.trim()
  const email=document.getElementById('authRegEmail')?.value.trim()
  const pass=document.getElementById('authRegPassword')?.value
  const errEl=document.getElementById('authRegErr')
  const btn=document.getElementById('btnSignUp')
  if(!name||!email||!pass){if(errEl){errEl.textContent='Please fill all fields';errEl.style.display='block'};return}
  if(pass.length<6){if(errEl){errEl.textContent='Password must be at least 6 characters';errEl.style.display='block'};return}
  if(!SB_READY){hideAuthOverlayLocalMode();return}
  btn.textContent='Creating account…';btn.disabled=true
  const {data,error}=await _sb.auth.signUp({email,password:pass,options:{data:{display_name:name}}})
  btn.textContent='Create Account 🐾';btn.disabled=false
  if(error){if(errEl){errEl.textContent=error.message;errEl.style.display='block'};return}
  // Create profile row
  if(data.user){
    await _sb.from('profiles').upsert({id:data.user.id,display_name:name,email,avatar_emoji:'🐱'},{onConflict:'id'})
    // Seed default categories for new user
    await sbSeedDefaultCategories(data.user.id)
    toast('Account created! Check email to confirm, then sign in 🐾')
    switchAuthTab('login')
  }
}

async function _startAuth(){
  if(!SB_READY){ showAuthOverlay(); return }

  _sb.auth.onAuthStateChange(async(event,session)=>{
    if(session&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')){
      const isNewLogin=AU_SB_ID!==session.user.id
      AU_SB_ID=session.user.id
      USERS.u1.name=session.user.user_metadata?.display_name||'You'
      USERS.u1.email=session.user.email||''
      hideAuthOverlay()
      if(isNewLogin) await afterSignIn()
    } else if(event==='SIGNED_OUT'||(event==='INITIAL_SESSION'&&!session)){
      AU_SB_ID=null; AU_PARTNER_ID=null
      resetLocalData()
      showAuthOverlay()
    }
  })

  // Explicit session check — safety net for when INITIAL_SESSION fires
  // before the listener is registered or supabase loads slowly.
  try{
    const {data:{session}}=await _sb.auth.getSession()
    if(session){
      const isNewLogin = AU_SB_ID!==session.user.id
      AU_SB_ID=session.user.id
      USERS.u1.name=session.user.user_metadata?.display_name||'You'
      USERS.u1.email=session.user.email||''
      hideAuthOverlay()
      if(isNewLogin) await afterSignIn()
    } else if(!session){
      AU_SB_ID=null
      showAuthOverlay()
    }
  }catch(err){
    console.warn('Session check error:',err)
    showAuthOverlay()
  }
}

async function afterSignIn(){
  updateSBAv()
  const profile=await sbLoadProfile(AU_SB_ID)
  if(profile){
    USERS.u1.name    = profile.display_name  || 'You'
    USERS.u1.avatar  = profile.avatar_emoji  || '🐱'
    // ✅ FIX: set the REAL invite code from Supabase (not the hardcoded one)
    USERS.u1.inviteCode = profile.invite_code || 'Loading…'
    // Load photo if saved
    if(profile.avatar_url){ USERS.u1.photo = profile.avatar_url }
    AU_PARTNER_ID = profile.partner_id || null
    if(AU_PARTNER_ID){
      const pp=await sbLoadProfile(AU_PARTNER_ID)
      if(pp){
        USERS.u2.name   = pp.display_name  || 'Partner'
        USERS.u2.avatar = pp.avatar_emoji  || '🐈'
        USERS.u2.id     = AU_PARTNER_ID
        USERS.u2.inviteCode = pp.invite_code || ''
        if(pp.avatar_url) USERS.u2.photo = pp.avatar_url
      }
    }
  }
  updateSBAv()
  await loadAllDataFromSB()
  // loadAllDataFromSB() already calls renderOV + renderPage(CUR) internally
  // but call updateSBAv again in case avatar changed
  updateSBAv()
}

function resetLocalData(){
  S.budgets={u1:[],u2:[]}; S.expenses={u1:[],u2:[]}; S.insts={u1:[],u2:[]}
  S.instPays=[]; S.goals=[]; S.todos=[]; S.wishlist={u1:[],u2:[]}; S.schedule={u1:[],u2:[]}
}

async function loadAllDataFromSB(){
  if(!SB_READY||!AU_SB_ID)return
  try{
    // Budgets (own)
    const budgets=await sbLoadBudgets(AU_SB_ID)
    S.budgets.u1=budgets.map(b=>({id:b.id,uid:'u1',title:b.title,type:b.budget_type||'📋 General',amt:parseFloat(b.amount)||0,spent:parseFloat(b.total_spent)||0,start:b.start_date,days:b.duration_days||30,end:b.end_date,status:b.status,xfer:parseFloat(b.transferred)||0,notes:b.notes||''}))
    // Partner budgets
    if(AU_PARTNER_ID){const pb=await sbLoadBudgets(AU_PARTNER_ID);S.budgets.u2=pb.map(b=>({id:b.id,uid:'u2',title:b.title,type:b.budget_type||'📋 General',amt:parseFloat(b.amount)||0,spent:parseFloat(b.total_spent)||0,start:b.start_date,days:b.duration_days||30,end:b.end_date,status:b.status,xfer:parseFloat(b.transferred)||0,notes:b.notes||''}))}
    // Expenses
    const expenses=await sbLoadExpenses(AU_SB_ID)
    S.expenses.u1=expenses.map(e=>({id:e.id,uid:'u1',bid:e.budget_id,desc:e.description,amt:parseFloat(e.amount)||0,date:e.expense_date,catId:e.category_id||'cat8',pm:e.payment_method||'cash',custCat:e.custom_category||''}))
    if(AU_PARTNER_ID){const pe=await sbLoadExpenses(AU_PARTNER_ID);S.expenses.u2=pe.map(e=>({id:e.id,uid:'u2',bid:e.budget_id,desc:e.description,amt:parseFloat(e.amount)||0,date:e.expense_date,catId:e.category_id||'cat8',pm:e.payment_method||'cash',custCat:e.custom_category||''}))}
    // Installments
    const insts=await sbLoadInstallments(AU_SB_ID)
    S.insts.u1=insts.map(i=>({id:i.id,uid:'u1',name:i.item_name,total:parseFloat(i.total_cost)||0,down:parseFloat(i.down_payment)||0,payAmt:parseFloat(i.payment_amount)||0,freq:i.frequency||'monthly',numPay:i.total_payments||1,paid:i.payments_made||0,nextDue:i.next_due_date,auto:i.auto_add_expense,status:i.status||'active',pm:i.payment_method||'cash'}))
    if(AU_PARTNER_ID){const pi=await sbLoadInstallments(AU_PARTNER_ID);S.insts.u2=pi.map(i=>({id:i.id,uid:'u2',name:i.item_name,total:parseFloat(i.total_cost)||0,down:parseFloat(i.down_payment)||0,payAmt:parseFloat(i.payment_amount)||0,freq:i.frequency||'monthly',numPay:i.total_payments||1,paid:i.payments_made||0,nextDue:i.next_due_date,auto:i.auto_add_expense,status:i.status||'active',pm:i.payment_method||'cash'}))}
    // Savings goals
    const goals=await sbLoadGoals(AU_SB_ID)
    S.goals=goals.map(g=>({id:g.id,title:g.title,icon:g.icon||'🎯',target:parseFloat(g.target_amount)||0,color:g.color||'#d4537e',contributions:(g.savings_contributions||[]).map(c=>({id:c.id,uid:c.user_id===AU_SB_ID?'u1':'u2',amt:parseFloat(c.amount)||0,source:c.source||'manual',note:c.note||'',date:c.contribution_date}))}))
    // Todos
    const todos=await sbLoadTodos(AU_SB_ID)
    S.todos=[...todos.map(t=>({id:t.id,uid:'u1',title:t.title,cat:t.category||'personal',custCat:t.custom_cat||'',pri:t.priority||'mid',due:t.due_date||'',notes:t.notes||'',done:t.is_done||false}))]
    if(AU_PARTNER_ID){const pt=await sbLoadTodos(AU_PARTNER_ID);S.todos=[...S.todos,...pt.map(t=>({id:t.id,uid:'u2',title:t.title,cat:t.category||'personal',custCat:t.custom_cat||'',pri:t.priority||'mid',due:t.due_date||'',notes:t.notes||'',done:t.is_done||false}))]}
    // Wishlist
    const wl=await sbLoadWishlist(AU_SB_ID)
    S.wishlist.u1=wl.map(w=>({id:w.id,uid:'u1',name:w.item_name,price:parseFloat(w.target_price)||0,notes:w.notes||'',status:w.status||'planned',url:w.url||''}))
    if(AU_PARTNER_ID){const pw=await sbLoadWishlist(AU_PARTNER_ID);S.wishlist.u2=pw.map(w=>({id:w.id,uid:'u2',name:w.item_name,price:parseFloat(w.target_price)||0,notes:w.notes||'',status:w.status||'planned',url:w.url||''}))}
    // Schedule
    const sched=await sbLoadSchedule(AU_SB_ID)
    S.schedule.u1=sched.map(s=>({id:s.id,uid:'u1',label:s.label,day:s.day_of_week,start:s.start_time?.slice(0,5)||'',end:s.end_time?.slice(0,5)||'',room:s.location||'',type:s.sched_type||'onsite',custType:s.custom_type||''}))
    if(AU_PARTNER_ID){const ps=await sbLoadSchedule(AU_PARTNER_ID);S.schedule.u2=ps.map(s=>({id:s.id,uid:'u2',label:s.label,day:s.day_of_week,start:s.start_time?.slice(0,5)||'',end:s.end_time?.slice(0,5)||'',room:s.location||'',type:s.sched_type||'onsite',custType:s.custom_type||''}))}
    // Categories — remap local cat1–cat8 IDs to real Supabase UUIDs (fixes FK errors on expense saves)
    const userCats=await sbLoadCategories(AU_SB_ID)
    if(userCats.length>0){
      const sbCatMap={}; userCats.forEach(uc=>sbCatMap[uc.name]=uc.id)
      S.cats=S.cats.map(lc=>{const sbId=sbCatMap[lc.name];return sbId?{...lc,id:sbId}:lc})
      userCats.forEach(uc=>{if(!S.cats.find(sc=>sc.id===uc.id))S.cats.push({id:uc.id,name:uc.name,icon:uc.icon||'🏷️',color:uc.color||'#95a5a6'})})
    }
    toast('Data loaded! 🐾')
  }catch(err){console.error('Load error:',err);toast('Some data failed to load','⚠️')}
  // ── Always re-render after data loads, regardless of timing ──
  try{
    buildRepOptions()
    renderOV()
    renderPage(CUR)
  }catch(e){ console.warn('Render after load error:',e) }
}


// ═══════════════════════════════════════════════════════════
//  🔌 SUPABASE CONFIGURATION — REPLACE THESE TWO VALUES
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL  = 'https://wenbggljligqxmdzmmqx.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbmJnZ2xqbGlncXhtZHptbXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Nzc3NjAsImV4cCI6MjA5NDE1Mzc2MH0.ztz_OwC2FQTxZbMJrjdsbW3QnpVjkym57a76XOK_6vE'

let _sb = null
let SB_READY = false
let AU_SB_ID = null          // Real Supabase user ID after login
let AU_PARTNER_ID = null     // Partner's Supabase user ID

function _initSBClient(){
  try{
    const sbLib = window.supabase || window.Supabase
    if(sbLib && typeof sbLib.createClient === 'function' && SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE'){
      _sb = sbLib.createClient(SUPABASE_URL, SUPABASE_KEY)
      SB_READY = true
      console.log('✅ Supabase connected to:', SUPABASE_URL)
    } else if(!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE'){
      console.warn('⚠️ Supabase URL not set')
    } else if(!sbLib){
      console.error('❌ Supabase library not loaded. window.supabase =', window.supabase)
    }
  }catch(err){
    console.error('❌ Supabase init error:',err)
  }
}

// ── AUTH HELPERS ───────────────────────────────────────────
async function sbSignUp(email, password, name) {
  if (!SB_READY) { toast('⚠️ Supabase not configured yet'); return null }
  const { data, error } = await _sb.auth.signUp({ email, password })
  if (error) { toast('Sign up failed: ' + error.message, '❌'); return null }
  // Create profile row
  await _sb.from('profiles').insert({
    id: data.user.id,
    display_name: name || 'User',
    email: email,
  })
  toast('Account created! Welcome to Pairly 🐾')
  return data.user
}

async function sbSignIn(email, password) {
  if (!SB_READY) { toast('⚠️ Supabase not configured yet'); return null }
  const { data, error } = await _sb.auth.signInWithPassword({ email, password })
  if (error) { toast('Sign in failed: ' + error.message, '❌'); return null }
  toast('Welcome back! 🐾')
  return data.user
}

async function sbSignOut() {
  if (!SB_READY) return
  await _sb.auth.signOut()
}

async function sbGetUser() {
  if (!SB_READY) return null
  const { data } = await _sb.auth.getUser()
  return data?.user || null
}

// ── PROFILE HELPERS ────────────────────────────────────────
async function sbLoadProfile(userId) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('profiles').select('*').eq('id', userId).single()
  if (error) return null
  return data
}

async function sbSaveProfile(userId, updates) {
  if (!SB_READY) return
  const { error } = await _sb.from('profiles').update(updates).eq('id', userId)
  if (error) console.error('Profile save error:', error)
}

async function sbUploadAvatar(userId, file) {
  if (!SB_READY) return null
  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await _sb.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) { console.error('Avatar upload error:', error); return null }
  const { data } = _sb.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// sbLinkPartner is now handled via the link_partner RPC (see linkPartner() above)
// This stub is kept for backwards compatibility
async function sbLinkPartner(myId, partnerCode) {
  if (!SB_READY) return false
  try{
    const {data,error}=await _sb.rpc('link_partner',{my_id:myId,partner_code:partnerCode.toUpperCase()})
    return !error && data!==false
  }catch(err){ console.error('sbLinkPartner error:',err); return false }
}

// ── BUDGET HELPERS ─────────────────────────────────────────
async function sbLoadBudgets(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('budgets')
    .select('*').eq('user_id', userId).order('start_date', { ascending: false })
  if (error) return []
  return data
}

async function sbCreateBudget(budget) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('budgets').insert(budget).select().single()
  if (error) { console.error('Budget create error:', error); return null }
  return data
}

async function sbUpdateBudget(id, updates) {
  if (!SB_READY) return
  const { error } = await _sb.from('budgets').update(updates).eq('id', id)
  if (error) console.error('Budget update error:', error)
}

async function sbDeleteBudget(id) {
  if (!SB_READY) return
  const { error } = await _sb.from('budgets').delete().eq('id', id)
  if (error) console.error('Budget delete error:', error)
}

// ── EXPENSE HELPERS ────────────────────────────────────────
async function sbLoadExpenses(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('expenses')
    .select('*').eq('user_id', userId).order('expense_date', { ascending: false })
  if (error) return []
  return data
}

async function sbCreateExpense(expense) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('expenses').insert(expense).select().single()
  if (error) { console.error('Expense create error:', error); return null }
  return data
}

async function sbUpdateExpense(id, updates) {
  if (!SB_READY) return
  const { error } = await _sb.from('expenses').update(updates).eq('id', id)
  if (error) console.error('Expense update error:', error)
}

async function sbDeleteExpense(id) {
  if (!SB_READY) return
  const { error } = await _sb.from('expenses').delete().eq('id', id)
  if (error) console.error('Expense delete error:', error)
}

// ── INSTALLMENT HELPERS ────────────────────────────────────
async function sbLoadInstallments(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('installments')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) return []
  return data
}

async function sbCreateInstallment(inst) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('installments').insert(inst).select().single()
  if (error) { console.error('Installment create error:', error); return null }
  return data
}

async function sbDeleteInstallment(id) {
  if (!SB_READY) return
  const { error } = await _sb.from('installments').delete().eq('id', id)
  if (error) console.error('Installment delete error:', error)
}

async function sbRecordInstallmentPayment(payment) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('installment_payments').insert(payment).select().single()
  if (error) { console.error('Payment record error:', error); return null }
  return data
}

// ── SAVINGS GOAL HELPERS ───────────────────────────────────
async function sbLoadGoals(userId) {
  if (!SB_READY) return []
  // Load goals owned by this user OR partner (shared savings)
  const ids=[userId]
  if(AU_PARTNER_ID&&AU_PARTNER_ID!==userId)ids.push(AU_PARTNER_ID)
  const { data, error } = await _sb.from('savings_goals')
    .select('*, savings_contributions(*)')
    .in('owner_id', ids)
  if (error) return []
  return data||[]
}

async function sbCreateGoal(goal) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('savings_goals').insert(goal).select().single()
  if (error) { console.error('Goal create error:', error); return null }
  return data
}

async function sbDeleteGoal(id) {
  if (!SB_READY) return
  const { error } = await _sb.from('savings_goals').delete().eq('id', id)
  if (error) console.error('Goal delete error:', error)
}

async function sbAddContribution(contribution) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('savings_contributions').insert(contribution).select().single()
  if (error) { console.error('Contribution error:', error); return null }
  return data
}

// ── CATEGORY HELPERS ───────────────────────────────────────
async function sbLoadCategories(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('categories').select('*').eq('user_id', userId)
  if (error) return []
  return data
}

async function sbSeedDefaultCategories(userId) {
  // Call once on first sign-up to create default categories for the user
  if (!SB_READY) return
  const defaults = [
    { user_id: userId, name: 'Food & Dining',  icon: '🍜', color: '#d4537e', is_default: true },
    { user_id: userId, name: 'Groceries',      icon: '🛒', color: '#e07e3a', is_default: true },
    { user_id: userId, name: 'Transport',      icon: '🚗', color: '#3aaa7e', is_default: true },
    { user_id: userId, name: 'Bills',          icon: '📱', color: '#6b7bdb', is_default: true },
    { user_id: userId, name: 'Entertainment',  icon: '🎮', color: '#9b59b6', is_default: true },
    { user_id: userId, name: 'Health',         icon: '💊', color: '#e74c3c', is_default: true },
    { user_id: userId, name: 'Shopping',       icon: '🛍️', color: '#f39c12', is_default: true },
    { user_id: userId, name: 'Other',          icon: '✨', color: '#95a5a6', is_default: true },
  ]
  await _sb.from('categories').insert(defaults)
}

// ── TODO HELPERS ───────────────────────────────────────────
async function sbLoadTodos(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('todos')
    .select('*').eq('user_id', userId).order('due_date', { ascending: true })
  if (error) return []
  return data
}

async function sbCreateTodo(todo) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('todos').insert(todo).select().single()
  if (error) { console.error('Todo create error:', error); return null }
  return data
}

async function sbUpdateTodo(id, updates) {
  if (!SB_READY) return
  await _sb.from('todos').update(updates).eq('id', id)
}

async function sbDeleteTodo(id) {
  if (!SB_READY) return
  await _sb.from('todos').delete().eq('id', id)
}

// ── SCHEDULE HELPERS ───────────────────────────────────────
async function sbLoadSchedule(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('schedules')
    .select('*').eq('user_id', userId).order('start_time')
  if (error) return []
  return data
}

async function sbCreateScheduleEntry(entry) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('schedules').insert(entry).select().single()
  if (error) { console.error('Schedule create error:', error); return null }
  return data
}

async function sbDeleteScheduleEntry(id) {
  if (!SB_READY) return
  await _sb.from('schedules').delete().eq('id', id)
}

// ── WISHLIST HELPERS ───────────────────────────────────────
async function sbLoadWishlist(userId) {
  if (!SB_READY) return []
  const { data, error } = await _sb.from('wishlist')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) return []
  return data
}

async function sbCreateWishItem(item) {
  if (!SB_READY) return null
  const { data, error } = await _sb.from('wishlist').insert(item).select().single()
  if (error) { console.error('Wishlist create error:', error); return null }
  return data
}

async function sbUpdateWishItem(id, updates) {
  if (!SB_READY) return
  await _sb.from('wishlist').update(updates).eq('id', id)
}

async function sbDeleteWishItem(id) {
  if (!SB_READY) return
  await _sb.from('wishlist').delete().eq('id', id)
}

// ── REALTIME SUBSCRIPTION ──────────────────────────────────
// Uncomment and call subscribeRealtime() after user signs in
// to automatically refresh UI when partner makes changes.
/*
function subscribeRealtime(onUpdate) {
  if (!SB_READY) return
  _sb.channel('pairly-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses'       }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets'        }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_contributions' }, onUpdate)
    .subscribe()
}
*/

// ── RECEIPT UPLOAD ─────────────────────────────────────────
async function sbUploadReceipt(userId, file) {
  if (!SB_READY) return null
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await _sb.storage.from('receipts').upload(path, file)
  if (error) { console.error('Receipt upload error:', error); return null }
  const { data } = _sb.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

function initPetals(){
  const canvas=document.getElementById('petalsCanvas')
  if(!canvas)return
  const isDark=document.documentElement.getAttribute('data-theme')==='dark'
  // Petal shapes — mix of flower petals, sakura, hearts, sparkles
  const shapes=['🌸','🌺','🍀','💮','🌷','✨','🌼','💕','🐾','⭐']
  const count=window.innerWidth<600?8:16
  canvas.innerHTML=''
  for(let i=0;i<count;i++){
    const el=document.createElement('div')
    el.className='petal'
    el.textContent=shapes[i%shapes.length]
    // Randomise position, size, speed, delay
    const left  = Math.random()*100
    const delay = Math.random()*18
    const dur   = 10+Math.random()*18
    const size  = 11+Math.random()*10
    el.style.cssText=`left:${left}%;font-size:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;opacity:0`
    canvas.appendChild(el)
  }
}
// Re-init petals when theme toggles (already called via toggleTheme → renderPage)
const _origToggleTheme=toggleTheme
// Note: toggleTheme is already defined above; petals reinit on re-render handled inline
