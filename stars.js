/* Independent Canvas starfield: layered white points, cool dust and pointer parallax. */
(() => {
  const canvas=document.getElementById('ambient'),ctx=canvas?.getContext('2d');if(!ctx)return;
  const motion=document.getElementById('motion-button'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let pref=null;try{pref=localStorage.getItem('hz-motion');}catch{}
  let paused=pref==='off'||(pref!=='on'&&reduced.matches),frame=0,w=0,h=0,last=0,time=0,mx=0,my=0,tx=0,ty=0,lastTrail=0;
  let settings={whiteStars:1500,blueStars:1000,brightness:1,speed:.35},stars=[],trail=[];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function seed(){let value=64821;const rand=()=>((value=(value*1664525+1013904223)>>>0)/4294967296);stars=[];const area=clamp(w*h/(1280*900),.65,1.35),scale=w<650?.45:1;for(const blue of [false,true]){const count=Math.round((blue?settings.blueStars:settings.whiteStars)*area*scale);for(let i=0;i<count;i++)stars.push({x:rand(),y:rand(),depth:.2+.8*rand(),size:(blue?.45:.55)+Math.pow(rand(),6)*(blue?1.15:3.8),opacity:(blue?.15:.3)+rand()*(blue?.4:.65),phase:rand()*Math.PI*2,blue});}canvas.dataset.starCount=stars.length;}
  function draw(){ctx.clearRect(0,0,w,h);const quiet=document.body.classList.contains('is-reading'),strength=quiet?.28:1;const glow=ctx.createRadialGradient(w*.8,h*.65,0,w*.8,h*.65,w*.65);glow.addColorStop(0,'#0c101c22');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.globalAlpha=1;ctx.fillRect(0,0,w,h);
    for(const s of stars){const drift=time*settings.speed*(s.blue?.9:1.6)*s.depth;const x=((s.x*w+mx*s.depth*70+drift*.35)%(w+20)+w+20)%(w+20)-10,y=((s.y*h+my*s.depth*45-drift)%(h+20)+h+20)%(h+20)-10;ctx.globalAlpha=clamp(s.opacity*(.88+.12*Math.sin(time*.6+s.phase))*strength*settings.brightness,0,1);ctx.fillStyle=s.blue?'#8bc9f2':'#ffffff';ctx.fillRect(x,y,s.size,s.size);}
    if(!quiet){trail=trail.filter(p=>time-p.born<1.5);ctx.fillStyle='#fff';for(const p of trail){const age=time-p.born;ctx.globalAlpha=(1-age/1.5)*.65;ctx.beginPath();ctx.arc(p.x,p.y-age*18,Math.max(.25,p.size*(1-age/1.5)),0,Math.PI*2);ctx.fill();}}ctx.globalAlpha=1;}
  function resize(){w=innerWidth;h=innerHeight;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);seed();draw();}
  function tick(now){frame=0;if(paused||document.hidden)return;if(!last)last=now;if(now-last>=1000/30){const dt=Math.min((now-last)/1000,.06);time+=dt;last=now;mx+=(tx-mx)*.065;my+=(ty-my)*.065;draw();}frame=requestAnimationFrame(tick);}
  function label(){document.documentElement.dataset.motion=paused?'off':'on';motion.setAttribute('aria-label',paused?'播放背景动效':'暂停背景动效');motion.title=paused?'播放背景动效':'暂停背景动效';motion.setAttribute('aria-pressed',String(paused));motion.innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';}
  function apply(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;label();if(paused){trail=[];draw();}else if(!document.hidden)frame=requestAnimationFrame(tick);}
  document.addEventListener('hz:scene',draw);
  document.addEventListener('hz:config',e=>{const raw=e.detail||{};for(const [key,min,max]of [['whiteStars',100,4000],['blueStars',0,4000],['brightness',.2,1.5],['speed',0,2]])if(Number.isFinite(raw[key]))settings[key]=clamp(raw[key],min,max);seed();draw();});
  document.addEventListener('pointermove',e=>{if(paused||e.pointerType==='touch')return;tx=e.clientX/w-.5;ty=e.clientY/h-.5;const now=performance.now();if(now-lastTrail>28&&!document.body.classList.contains('is-reading')){lastTrail=now;trail.push({x:e.clientX,y:e.clientY,born:time,size:1+Math.random()*1.7});if(trail.length>40)trail.shift();}},{passive:true});
  document.addEventListener('pointerleave',()=>{tx=ty=0;});motion.addEventListener('click',()=>{paused=!paused;pref=paused?'off':'on';try{localStorage.setItem('hz-motion',pref);}catch{}apply();});
  reduced.addEventListener('change',()=>{if(pref===null){paused=reduced.matches;apply();}});window.addEventListener('resize',resize);window.addEventListener('hashchange',()=>{if(paused)setTimeout(draw,0);});document.addEventListener('visibilitychange',apply);resize();apply();
})();
