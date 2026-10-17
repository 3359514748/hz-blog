'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
  const base = new URL('.', location.href);
  let config, entries = [], selectedTag = '全部', renderId = 0;
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
    raw.sections = raw.sections.filter(s => s.enabled !== false).map(s => { if (!safeId(s.id) || ['home','read','section','guide','main'].includes(s.id) || ids.has(s.id)) throw new Error('栏目 id 必须唯一，且使用英文小写、数字或连字符。'); ids.add(s.id); if (typeof s.label !== 'string' || !s.label.trim()) throw new Error('每个栏目都需要 label 名称。'); return {...s,layout:s.layout === 'cards' ? 'cards' : 'list'}; });
    if (!raw.sections.length) throw new Error('请至少保留一个 enabled 不为 false 的栏目。');
    if (!Array.isArray(list)) throw new Error('content/index.json 必须是数组。');
    const used = new Set();
    const result = list.map((e,index) => { if (!safeId(e.id) || used.has(e.id)) throw new Error('内容 id 必须唯一，且使用英文小写、数字或连字符。'); used.add(e.id); if (typeof e.title !== 'string' || !e.title.trim()) throw new Error('每条内容都需要 title。'); if (typeof e.file !== 'string' || !/^content\/posts\/[a-z0-9][a-z0-9-]*\.md$/.test(e.file)) throw new Error('正文路径请使用 content/posts/英文文件名.md。'); return {...e,tags:Array.isArray(e.tags)?e.tags.filter(x=>typeof x==='string'):[],order:typeof e.order==='number'?e.order:index}; });
    return {config:raw,entries:result.filter(e => e.published !== false && ids.has(e.section)).sort((a,b) => a.order-b.order)};
  }
  const meta = e => `<div class="meta"><span>${escape(e.date || (e.sample ? '示例内容' : '未标日期'))}</span>${e.tags.length ? `<span>${e.tags.map(escape).join(' / ')}</span>` : ''}${e.sample ? '<span class="sample">示例</span>' : ''}${e.featured ? '<span>精选</span>' : ''}</div>`;
  const row = e => `<a class="entry-row" href="${href(e.id)}">${meta(e)}<h3>${escape(e.title)} <span aria-hidden="true">↗</span></h3><p>${escape(e.summary || '')}</p></a>`;
  function sectionHeading(section, english) { return `<div class="section-heading"><h2>${escape(section.label)}<span>${escape(english || section.eyebrow || '')}</span></h2><a href="${sectionHref(section.id)}">全部 ↗</a></div>`; }
  const projectArt = `<svg viewBox="0 0 180 120" aria-hidden="true"><path d="m90 10 65 37v36l-65 27-65-37V37Z"/><path d="m25 37 65 37 65-27M90 74v36M90 10v64"/><path d="m45 28 65 37v36M68 18l65 37v37M25 52l65 37 65-27M25 65l65 37 65-27" opacity=".3"/></svg>`;
  function home() {
    const first = config.sections[0];
    const projectSection = config.sections.find(s => s.layout === 'cards');
    const otherSection = projectSection || config.sections.find(s => s.id !== first.id) || first;
    const recent = listFor(first.id).slice(0,3);
    const other = listFor(otherSection.id).slice(0,2);
    const lines = Array.isArray(config.heroLines) && config.heroLines.length ? config.heroLines.slice(0,3) : ['保持好奇，','让想法发生。'];
    return `<section class="hero"><div class="hero-copy"><div class="eyebrow">${escape(config.name || 'Hz')} / ${escape(config.tagline || 'PERSONAL SPACE')}</div><h1>${lines.map((line,i)=>`${i?'<br>':''}${i===lines.length-1?'<em>':''}${escape(line)}${i===lines.length-1?'</em>':''}`).join('')}</h1><p>${escape(config.description || '')}</p><div class="hero-actions"><a class="primary" href="${sectionHref(first.id)}">探索${escape(first.label)} <span>↗</span></a><a class="quiet-link" href="${sectionHref(otherSection.id)}">${escape(otherSection.label)} <span>→</span></a></div></div><div class="hero-coordinate" aria-hidden="true"><span>IDEAS IN ORBIT</span><span>ALWAYS EVOLVING / Hz</span></div></section><section class="home-lower"><div class="overview"><p>${escape(config.intro || '记录思考，连接每一种可能。')}</p><div class="overview-links">${config.sections.map(s=>`<a href="${sectionHref(s.id)}">${escape(s.label)}<b>${String(listFor(s.id).length).padStart(2,'0')}</b></a>`).join('')}</div></div><div class="home-columns"><section>${sectionHeading(first,'RECENT')}${recent.length?recent.map(row).join(''):'<p class="empty">这里还没有公开内容。</p>'}</section><section>${sectionHeading(otherSection)}${other.length?other.map(e=>`<a class="text-entry" href="${href(e.id)}">${meta(e)}<h3>${escape(e.title)} ↗</h3><p>${escape(e.summary || '')}</p></a>`).join(''):'<p class="empty">下一个想法，从这里开始。</p>'}<div class="thought"><div class="eyebrow">A SPACE FOR THE UNFINISHED</div><p>有些想法还没完成，<br>但已经值得被记下来。</p><a class="quiet-link" href="#guide">如何更新这里 <span>↗</span></a></div></section></div></section>`;
  }
  function draftPanel() {
    return `<details class="local-panel"><summary>随手记一条 · 仅保存在本机</summary><p>这些草稿不会发布，也不会跨设备同步。公开想法请添加 Markdown 并更新索引。</p><form id="draft-form"><label class="sr-only" for="draft-text">新的想法</label><textarea id="draft-text" maxlength="3000" required placeholder="先把这个念头留下来…"></textarea><div class="local-actions"><button class="save-draft" type="submit">保存本机草稿</button><button type="button" id="export-drafts">导出草稿</button></div></form>${drafts.map(d=>`<article class="draft-card"><div class="meta">${escape(d.date || '本机记录')}</div><p>${escape(d.title)}</p><button data-delete="${escape(d.id)}">删除这条草稿</button></article>`).join('')}</details>`;
  }
  function collection(section) {
    const list = listFor(section.id); const tags = [...new Set(list.flatMap(e=>e.tags))]; if (!tags.includes(selectedTag)) selectedTag = '全部';
    const filtered = selectedTag === '全部' ? list : list.filter(e=>e.tags.includes(selectedTag));
    return `<section class="page-intro"><div class="eyebrow">${escape(section.eyebrow || 'COLLECTION')}</div><h1>${escape(section.label)}</h1><p>${escape(section.description || '')}</p></section>${section.id==='ideas'?draftPanel():''}<div class="collection-bar"><div class="filters" aria-label="按标签筛选">${['全部',...tags].map(t=>`<button class="filter${selectedTag===t?' active':''}" data-tag="${escape(t)}" aria-pressed="${selectedTag===t}">${escape(t)}</button>`).join('')}</div><span class="collection-count">${filtered.length} 条内容</span></div><div class="${section.layout==='cards'?'cards':'content-list'}">${filtered.length ? filtered.map(e=> section.layout==='cards' ? `<a class="project-card" href="${href(e.id)}"><div class="project-art">${projectArt}</div><div class="project-text">${meta(e)}<h3>${escape(e.title)}</h3><p>${escape(e.summary || '')}</p><div class="project-foot"><span>${escape(e.status || '查看项目')}</span><span>↗</span></div></div></a>` : row(e)).join('') : '<p class="empty">这个分类下还没有内容。</p>'}</div>`;
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
      activeNavigation(sectionId); document.body.dataset.page=kind;
    } catch(error) { if(current!==renderId)return; main.innerHTML=errorPanel(error);activeNavigation(sectionId); }
  }
  function search() { if(!config)return;const q=$('#search-input').value.trim().toLowerCase();const found=entries.filter(e=>`${e.title} ${e.summary || ''} ${e.tags.join(' ')}`.toLowerCase().includes(q));$('#search-results').innerHTML=found.slice(0,50).map(e=>`<a class="search-result" href="${href(e.id)}"><div class="meta">${escape(sectionFor(e.section).label)}${e.sample?' · 示例':''}</div><h3>${escape(e.title)} ↗</h3></a>`).join('')+`<p class="search-help">${found.length?'搜索标题、摘要和标签；正文按需加载。':'没有找到匹配内容，换个关键词试试。'}</p>`; }
  function openSearch() { if(!config){toast('内容尚未加载完成');return;}$('#search-dialog').showModal();$('#search-input').value='';search();$('#search-input').focus(); }
  $('.skip').addEventListener('click',e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});});
  $('#search-button').addEventListener('click',openSearch);$('#search-close').addEventListener('click',()=>$('#search-dialog').close());$('#search-input').addEventListener('input',search);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#search-dialog').open)openSearch();}});
  document.addEventListener('click',async e=>{
    if(e.target.closest('.search-result'))$('#search-dialog').close();
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
    try{const [raw,list]=await Promise.all([load('site.config.json',true),load('content/index.json',true)]);({config,entries}=validate(raw,list));$('#navigation').innerHTML='<a href="#home" data-section="home">首页</a>'+config.sections.map(s=>`<a data-section="${s.id}" href="${sectionHref(s.id)}">${escape(s.label)}</a>`).join('');$('.brand-name').textContent=config.name || 'Hz';$('.brand').setAttribute('aria-label',`${config.name || 'Hz'} 首页`);$('#footer-text').textContent=config.footer || '';$('.footer-name').innerHTML=`${escape(config.name || 'Hz')}<span> / </span>${escape(config.intro || '记录与连接')}`;await render();}
    catch(error){config=null;$('#main').innerHTML=errorPanel(error);}
  }
  init();

  // Ambient orbit: mouse orientation changes smoothly; no continuous work when paused or hidden.
  const canvas=$('#ambient'),ctx=canvas.getContext('2d');if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let preference=null;
  try{preference=localStorage.getItem('hz-motion');}catch{}
  let paused=preference==='off'||(preference!=='on'&&reduced.matches),frame=0,w=0,h=0,time=0,last=0,mx=.5,my=.5,tx=.5,ty=.5;
  const motion=$('#motion-button');
  function motionLabel(){motion.setAttribute('aria-label',paused?'开启背景动效':'暂停背景动效');motion.title=paused?'开启背景动效':'暂停背景动效';motion.setAttribute('aria-pressed',String(!paused));motion.innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';}
  function draw(){ctx.clearRect(0,0,w,h);const homePage=!document.body.dataset.page||document.body.dataset.page==='home';const mobile=w<650;const cx=w*(mobile?.86:.76)+(mx-.5)*28,cy=mobile?Math.min(h*.43,390):Math.min(h*.44,400);const radius=Math.min(w*(mobile?.42:.20),265);const yaw=(mx-.5)*.65+time*.035,pitch=(my-.5)*.6+.5;
    for(let i=0;i<34;i++){ctx.beginPath();const twist=i/34*Math.PI;for(let j=0;j<=96;j++){const a=j/96*Math.PI*2;let x=Math.cos(a)*radius*(.72+.15*Math.sin(twist+time*.22)),y=Math.sin(a)*radius*.29,z=Math.sin(a)*radius*.60;const xx=x*Math.cos(twist)-y*Math.sin(twist),yy=x*Math.sin(twist)+y*Math.cos(twist);x=xx*Math.cos(yaw)+z*Math.sin(yaw);z=-xx*Math.sin(yaw)+z*Math.cos(yaw);y=yy*Math.cos(pitch)-z*Math.sin(pitch);const depth=1+z/(radius*7);const px=cx+x*depth,py=cy+y*depth;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.strokeStyle=`rgba(${i%3?'133,183,173':'122,150,188'},${(homePage?.16:.047)*(mobile?.65:1)})`;ctx.lineWidth=.6;ctx.stroke();}
    if(homePage){ctx.beginPath();ctx.arc(cx,cy,2.2,0,Math.PI*2);ctx.fillStyle='#b8d2c3';ctx.fill();ctx.strokeStyle='#8caaa429';ctx.setLineDash([1,8]);ctx.beginPath();ctx.arc(cx,cy,radius*1.13,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    for(let i=0;i<16;i++){ctx.beginPath();for(let j=0;j<=70;j++){const x=w*j/70,y=h*.67+Math.sin(x/w*5+time*.16+i*.08)*45+i*9+(my-.5)*18;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=`rgba(129,170,166,${homePage?.029:.015})`;ctx.lineWidth=.6;ctx.stroke();}}
  function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();}
  function loop(now){frame=0;if(paused||document.hidden)return;if(now-last>33){const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;mx+=(tx-mx)*.07;my+=(ty-my)*.07;draw();}frame=requestAnimationFrame(loop);}
  function start(){if(!paused&&!frame&&!document.hidden)frame=requestAnimationFrame(loop);}
  function apply(){motionLabel();if(paused){cancelAnimationFrame(frame);frame=0;draw();}else start();}
  motion.addEventListener('click',()=>{paused=!paused;preference=paused?'off':'on';try{localStorage.setItem('hz-motion',preference);}catch{}apply();});
  reduced.addEventListener('change',e=>{if(preference===null){paused=e.matches;apply();}});window.addEventListener('pointermove',e=>{tx=e.clientX/w;ty=e.clientY/h;},{passive:true});window.addEventListener('pointerleave',()=>{tx=.5;ty=.5;});window.addEventListener('resize',resize);window.addEventListener('hashchange',()=>{if(paused)setTimeout(draw,0);});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});resize();apply();
})();
