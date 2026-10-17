'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
  const base = new URL('.', location.href);
  let config, entries = [], selectedTag = '全部', renderId = 0, stackIndex = 0, stackIds = [], lastWheel = 0, swipeStart = null;
  const cache = new Map();
  let drafts = [];
  try { const old = JSON.parse(localStorage.getItem('hz-ideas-v1') || '[]'); if (Array.isArray(old)) drafts = old.filter(x => x && typeof x.id === 'string' && typeof x.title === 'string'); } catch {}
  const md = typeof window.markdownit === 'function' ? window.markdownit({html:false,linkify:false,typographer:false,breaks:false}) : null;
  if (md) {
    const defaultImage = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, self) => { tokens[idx].attrSet('loading','lazy'); return defaultImage(tokens,idx,options,env,self); };
  }
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
  async function load(path, json = false) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try { const response = await fetch(new URL(path,base), {cache:'no-cache',signal:controller.signal}); if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`); return json ? await response.json() : await response.text(); }
    finally { clearTimeout(timer); }
  }
  const sectionFor = id => config.sections.find(s => s.id === id);
  const listFor = id => entries.filter(e => e.section === id);
  const href = id => '#read/' + encodeURIComponent(id);
  const sectionHref = id => '#section/' + encodeURIComponent(id);
  function validate(raw, list) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sections) || !raw.sections.length) throw new Error('site.config.json 需要至少一个栏目。');
    const ids = new Set();
    raw.sections = raw.sections.filter(s => s.enabled !== false).map(s => { if (!safeId(s.id) || ['home','read','section','guide','main'].includes(s.id) || ids.has(s.id)) throw new Error('栏目 id 必须唯一，且使用英文小写、数字或连字符。'); ids.add(s.id); if (typeof s.label !== 'string' || !s.label.trim()) throw new Error('每个栏目都需要 label 名称。'); return {...s,layout:['cards','stack'].includes(s.layout) ? s.layout : 'list'}; });
    if (!raw.sections.length) throw new Error('请至少保留一个 enabled 不为 false 的栏目。');
    if (!Array.isArray(list)) throw new Error('content/index.json 必须是数组。');
    const used = new Set();
    const result = list.map((e,index) => { if (!safeId(e.id) || used.has(e.id)) throw new Error('内容 id 必须唯一，且使用英文小写、数字或连字符。'); used.add(e.id); if (typeof e.title !== 'string' || !e.title.trim()) throw new Error('每条内容都需要 title。'); if (typeof e.file !== 'string' || !/^content\/posts\/[a-z0-9][a-z0-9-]*\.md$/.test(e.file)) throw new Error('正文路径请使用 content/posts/英文文件名.md。'); return {...e,tags:Array.isArray(e.tags)?e.tags.filter(x=>typeof x==='string'):[],order:typeof e.order==='number'?e.order:index}; });
    return {config:raw,entries:result.filter(e => e.published !== false && ids.has(e.section)).sort((a,b) => a.order-b.order)};
  }
  const meta = e => `<div class="meta"><span>${escape(e.date || (e.sample ? '示例内容' : '未标日期'))}</span>${e.tags.length ? `<span>${e.tags.map(escape).join(' / ')}</span>` : ''}${e.sample ? '<span class="sample">示例</span>' : ''}${e.featured ? '<span>精选</span>' : ''}</div>`;
  const row = e => `<a class="entry-row" href="${href(e.id)}">${meta(e)}<h3>${escape(e.title)} <span aria-hidden="true">↗</span></h3><p>${escape(e.summary || '')}</p></a>`;
  function home() {
    const lines=Array.isArray(config.heroLines)&&config.heroLines.length?config.heroLines.slice(0,3):['保持好奇。','让想法发生。'];
    return `<section class="hero"><div class="hero-copy"><h1>${lines.map(escape).join('<br>')}</h1><p>${escape(config.description||'')}</p></div></section>`;
  }
  const sectionName = s => s.title || s.label;
  function external(e) { try { if(!e.url)return '';const u=new URL(e.url);return ['http:','https:'].includes(u.protocol)?u.href:''; } catch { return ''; } }
  const entryHref = e => external(e) || href(e.id);
  const externalAttrs = e => external(e) ? ' target="_blank" rel="noopener noreferrer"' : '';
  function glassCard(e,index,section) { return `<a class="project-card" href="${escape(entryHref(e))}"${externalAttrs(e)}><div class="card-top"><span class="card-kind">${escape(section.eyebrow||section.label)} / ${String(index+1).padStart(2,'0')}</span><span class="card-sign">Hz</span></div><div class="project-text">${meta(e)}<h3>${escape(e.title)}</h3><p>${escape(e.summary||'')}</p></div><div class="card-tags">${e.tags.map(t=>`<span>${escape(t)}</span>`).join('')}</div><div class="project-foot"><span>${external(e)?'打开链接':'阅读内容'} <b aria-hidden="true">→</b></span><span>${escape(e.status||'')}</span></div></a>`; }
  function stackView(section,list) {
    stackIds=list.map(e=>e.id);stackIndex=Math.max(0,Math.min(stackIndex,stackIds.length-1));
    return `<section class="ideas-shell"><div class="ideas-intro"><div class="eyebrow">${escape(section.eyebrow||section.label)}</div><h1>${escape(sectionName(section))}</h1><p>${escape(section.description||'')}</p><span class="stack-hint">滚轮切换 / ↑ ↓<br>点击当前卡片阅读</span></div><div class="ideas-view"><div class="stack-stage" aria-label="想法卡片堆栈">${list.map((e,i)=>`<button class="idea-card" data-stack-index="${i}" aria-label="${escape(e.title)}"><span class="idea-inner"><span class="idea-meta">${escape(e.date||(e.sample?'示例想法':'随记'))}<span>Hz</span></span><strong>${escape(e.title)}</strong><span class="idea-bottom">${e.sample?'示例内容':'打开阅读'} <span aria-hidden="true">↗</span></span></span></button>`).join('')}${list.length?'':'<p class="empty">这里还没有公开想法。</p>'}</div><div class="stack-controls"><button data-stack-step="-1" aria-label="上一条想法">↑</button><span id="stack-status" aria-live="polite"></span><button data-stack-step="1" aria-label="下一条想法">↓</button></div></div></section><div class="draft-access">${draftPanel()}</div>`;
  }
  function positionStack() {
    const mobile=innerWidth<650;document.querySelectorAll('.idea-card').forEach((card,i)=>{const d=i-stackIndex,a=Math.abs(d);card.classList.toggle('is-active',d===0);card.setAttribute('aria-current',d===0?'true':'false');card.style.setProperty('--offset-y',d*(mobile?110:152)+'px');card.style.setProperty('--offset-z',(d===0?55:-105*a)+'px');card.style.setProperty('--angle-x',(d===0?0:d*22)+'deg');card.style.setProperty('--card-scale',d===0?'1.035':String(Math.max(.68,1-a*.08)));card.style.opacity=String(a>2?0:Math.max(.14,1-a*.37));card.style.zIndex=String(50-a);card.style.visibility=a>2?'hidden':'visible';});
    const status=$('#stack-status');if(status)status.textContent=stackIds.length?String(stackIndex+1).padStart(2,'0')+' / '+String(stackIds.length).padStart(2,'0'):'00 / 00';
    document.querySelectorAll('[data-stack-step]').forEach(b=>b.disabled=!stackIds.length||(+b.dataset.stackStep<0?stackIndex===0:stackIndex===stackIds.length-1));
  }
  function stepStack(delta) { if(!$('.stack-stage')||!stackIds.length)return false;const next=Math.max(0,Math.min(stackIndex+delta,stackIds.length-1));if(next===stackIndex)return false;stackIndex=next;positionStack();return true; }
  function draftPanel() {
    return `<details class="local-panel"><summary>随手记一条 · 仅保存在本机</summary><p>这些草稿不会发布，也不会跨设备同步。公开想法请添加 Markdown 并更新索引。</p><form id="draft-form"><label class="sr-only" for="draft-text">新的想法</label><textarea id="draft-text" maxlength="3000" required placeholder="先把这个念头留下来…"></textarea><div class="local-actions"><button class="save-draft" type="submit">保存本机草稿</button><button type="button" id="export-drafts">导出草稿</button></div></form>${drafts.map(d=>`<article class="draft-card"><div class="meta">${escape(d.date || '本机记录')}</div><p>${escape(d.title)}</p><button data-delete="${escape(d.id)}">删除这条草稿</button></article>`).join('')}</details>`;
  }
  function collection(section) {
    const list=listFor(section.id);if(section.layout==='stack')return stackView(section,list);
    const tags=[...new Set(list.flatMap(e=>e.tags))].filter(t=>t!=='全部');if(!tags.includes(selectedTag))selectedTag='全部';const filtered=selectedTag==='全部'?list:list.filter(e=>e.tags.includes(selectedTag));
    return `<section class="page-intro"><div class="eyebrow">${escape(section.eyebrow||'COLLECTION')}</div><h1>${escape(sectionName(section))}</h1><p>${escape(section.description||'')}</p></section><div class="collection-bar"><div class="filters" aria-label="按标签筛选">${['全部',...tags].map(t=>`<button class="filter${selectedTag===t?' active':''}" data-tag="${escape(t)}" aria-pressed="${selectedTag===t}">${escape(t)}</button>`).join('')}</div><span class="collection-count">${filtered.length} 条内容</span></div><div class="${section.layout==='cards'?'cards':'content-list'}">${filtered.length?filtered.map((e,i)=>section.layout==='cards'?glassCard(e,i,section):row(e)).join(''):'<p class="empty">这个分类下还没有内容。</p>'}</div>`;
  }
  function renderMarkdown(text) { if (!md) throw new Error('Markdown 组件未加载，请刷新后重试。'); return md.render(text); }
  function readingShell(e, body) { return `<article class="reader"><a class="back-link" href="${sectionHref(e.section)}">← 返回${escape(sectionFor(e.section).label)}</a>${meta(e)}<h1>${escape(e.title)}</h1>${e.summary?`<p class="lead">${escape(e.summary)}</p>`:''}${e.sample?'<p class="reading-label">示例内容 · 用于演示页面，不代表站主的真实经历或成果。</p>':''}<div class="prose">${body}</div><div class="article-tools"><button id="copy-link">复制文章链接 ↗</button><a href="${sectionHref(e.section)}">返回${escape(sectionFor(e.section).label)} →</a></div></article>`; }
  function activeNavigation(sectionId) { document.querySelectorAll('#navigation a').forEach(a=>{if(a.dataset.section===sectionId)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}); }
  function errorPanel(error) { return `<section class="error-panel"><div class="eyebrow">SOMETHING TO CHECK</div><h1>这页暂时没能打开</h1><p>${escape(error.message || error)}</p><p>请检查文件路径和 JSON 格式，或稍后重试。</p><button data-retry>重新加载</button> <a href="#home">返回首页 ↗</a></section>`; }
  async function render() {
    if (!config) return; const current = ++renderId; let bits;
    try { bits=(location.hash.slice(1)||'home').split('/').map(decodeURIComponent); } catch { bits=['home']; }
    let [kind,id] = bits; if (sectionFor(kind)) { id=kind;kind='section'; }
    const main=$('#main'); let sectionId='home';
    try {
      if (kind==='home' || kind==='main') { main.innerHTML=home();document.title=`${config.name || 'Hz'} · ${config.intro || '个人空间'}`; }
      else if (kind==='section') { const s=sectionFor(id); if (!s) throw new Error('这个栏目不存在，可能已被改名或移除。'); sectionId=id;main.innerHTML=collection(s);document.title=`${s.label} · ${config.name || 'Hz'}`; }
      else if (kind==='read') {
        const e=entries.find(e=>e.id===id); if (!e) throw new Error('这篇内容不存在或尚未发布，请检查链接。'); sectionId=e.section;document.title=`${e.title} · ${config.name || 'Hz'}`;main.innerHTML=readingShell(e,'<p class="loading">正在读取正文…</p>');activeNavigation(sectionId);
        const body=cache.has(e.file)?cache.get(e.file):await load(e.file);cache.set(e.file,body);if(current!==renderId)return;main.innerHTML=readingShell(e,renderMarkdown(body));
      } else if (kind==='guide') { document.title=`使用说明 · ${config.name || 'Hz'}`; main.innerHTML='<article class="reader"><a class="back-link" href="#home">← 返回首页</a><div class="prose"><p>正在读取说明…</p></div></article>'; const text=await load('README.md');if(current!==renderId)return;main.innerHTML=`<article class="reader"><a class="back-link" href="#home">← 返回首页</a><div class="prose">${renderMarkdown(text)}</div></article>`; }
      else throw new Error('未找到这个页面。');
      activeNavigation(sectionId); document.body.dataset.page=kind; document.body.classList.toggle('is-home',kind==='home'||kind==='main'); document.body.classList.toggle('is-reading',kind==='read'||kind==='guide'); positionStack(); document.dispatchEvent(new Event('hz:scene'));
    } catch(error) { if(current!==renderId)return; main.innerHTML=errorPanel(error);activeNavigation(sectionId); }
  }
  function search() { if(!config)return;const q=$('#search-input').value.trim().toLowerCase();const found=entries.filter(e=>`${e.title} ${e.summary || ''} ${e.tags.join(' ')}`.toLowerCase().includes(q));$('#search-results').innerHTML=found.slice(0,50).map(e=>`<a class="search-result" href="${escape(entryHref(e))}"${externalAttrs(e)}><div class="meta">${escape(sectionFor(e.section).label)}${e.sample?' · 示例':''}</div><h3>${escape(e.title)} ↗</h3></a>`).join('')+`<p class="search-help">${found.length?'搜索标题、摘要和标签；正文按需加载。':'没有找到匹配内容，换个关键词试试。'}</p>`; }
  function openSearch() { if(!config){toast('内容尚未加载完成');return;}$('#search-dialog').showModal();$('#search-input').value='';search();$('#search-input').focus(); }
  $('.skip').addEventListener('click',e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});});
  $('#search-button').addEventListener('click',openSearch);$('#search-close').addEventListener('click',()=>$('#search-dialog').close());$('#search-input').addEventListener('input',search);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#search-dialog').open)openSearch();}});
  document.addEventListener('click',async e=>{
    if(e.target.closest('.search-result'))$('#search-dialog').close();
    const step=e.target.closest('[data-stack-step]');if(step)stepStack(+step.dataset.stackStep);
    const stack=e.target.closest('[data-stack-index]');if(stack){const n=+stack.dataset.stackIndex;if(n===stackIndex&&stackIds[n]){const item=entries.find(x=>x.id===stackIds[n]);if(external(item))window.open(external(item),'_blank','noopener,noreferrer');else location.hash=href(item.id);}else{stackIndex=n;positionStack();}}
    const tag=e.target.closest('[data-tag]');if(tag){selectedTag=tag.dataset.tag;render();}
    if(e.target.closest('[data-retry]')){if(config)render();else init();}
    if(e.target.closest('#copy-link')){try{await navigator.clipboard.writeText(location.href);toast('文章链接已复制');}catch{toast('请直接复制浏览器地址栏中的链接');}}
    const del=e.target.closest('[data-delete]');if(del){const next=drafts.filter(d=>d.id!==del.dataset.delete);try{localStorage.setItem('hz-ideas-v1',JSON.stringify(next));drafts=next;await render();$('.local-panel')?.setAttribute('open','');toast('已删除本机草稿');}catch{toast('浏览器未允许保存更改');}}
    if(e.target.closest('#export-drafts')){if(!drafts.length){toast('还没有本机草稿');return;}const text=drafts.map(d=>`## ${d.date || '本机草稿'}\n\n${d.title}`).join('\n\n---\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Hz-本机草稿.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  });
  document.addEventListener('submit',e=>{if(e.target.id!=='draft-form')return;e.preventDefault();const title=$('#draft-text').value.trim();if(!title)return;const next=[{id:'local-'+Date.now(),title,date:new Date().toLocaleDateString('zh-CN')},...drafts];try{localStorage.setItem('hz-ideas-v1',JSON.stringify(next));drafts=next;render().then(()=>$('.local-panel')?.setAttribute('open',''));toast('已保存到当前浏览器');}catch{toast('本机保存失败，请复制正文另存。');}});
  window.addEventListener('hashchange',()=>{selectedTag='全部';render();if(location.hash!=='#main')window.scrollTo({top:0,behavior:'instant'});});
  async function init(){
    $('#main').innerHTML='<p class="loading">正在打开 Hz…</p>';
    try{const [raw,list]=await Promise.all([load('site.config.json',true),load('content/index.json',true)]);({config,entries}=validate(raw,list));$('#navigation').innerHTML='<a href="#home" data-section="home">Home</a>'+config.sections.map(s=>`<a data-section="${s.id}" href="${sectionHref(s.id)}">${escape(s.label)}</a>`).join('');$('.brand-name').textContent=config.name || 'Hz';$('.brand').setAttribute('aria-label',`${config.name || 'Hz'} 首页`);$('#footer-text').textContent=config.footer || '';$('.footer-name').innerHTML=`${escape(config.name || 'Hz')}<span> / </span>${escape(config.intro || '记录与连接')}`;document.dispatchEvent(new CustomEvent('hz:config',{detail:config.background||{}}));await render();}
    catch(error){config=null;$('#main').innerHTML=errorPanel(error);}
  }
  init();

  document.addEventListener('wheel',e=>{if(!e.target.closest('.stack-stage')||Math.abs(e.deltaY)<2||$('#search-dialog').open)return;const direction=e.deltaY>0?1:-1;if(direction<0&&stackIndex===0||direction>0&&stackIndex>=stackIds.length-1)return;e.preventDefault();const now=performance.now();if(now-lastWheel<420)return;lastWheel=now;stepStack(direction);},{passive:false});
  document.addEventListener('keydown',e=>{if(!$('.stack-stage')||$('#search-dialog').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowUp'||e.key==='ArrowDown'){if(stepStack(e.key==='ArrowUp'?-1:1))e.preventDefault();}});
  document.addEventListener('pointerdown',e=>{const stage=e.target.closest('.stack-stage');if(stage&&e.pointerType==='touch')swipeStart={y:e.clientY,x:e.clientX,id:e.pointerId};});
  document.addEventListener('pointerup',e=>{if(!swipeStart||swipeStart.id!==e.pointerId)return;const dy=e.clientY-swipeStart.y,dx=e.clientX-swipeStart.x;swipeStart=null;if(Math.abs(dy)>45&&Math.abs(dy)>Math.abs(dx)){stepStack(dy<0?1:-1);suppressCardClick=performance.now()+450;}});
  document.addEventListener('pointercancel',()=>swipeStart=null);
  let suppressCardClick=0;document.addEventListener('click',e=>{if(performance.now()<suppressCardClick&&e.target.closest('.idea-card')){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('pointermove',e=>{const card=e.target.closest('.project-card');if(!card||document.documentElement.dataset.motion==='off')return;const r=card.getBoundingClientRect();card.style.setProperty('--rx',((e.clientY-r.top)/r.height-.5)*-4+'deg');card.style.setProperty('--ry',((e.clientX-r.left)/r.width-.5)*4+'deg');card.style.setProperty('--gx',(e.clientX-r.left)+'px');card.style.setProperty('--gy',(e.clientY-r.top)+'px');});
  document.addEventListener('pointerout',e=>{const card=e.target.closest('.project-card');if(card&&!card.contains(e.relatedTarget)){card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');}});
  window.addEventListener('resize',positionStack);
})();
