import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

const RM=matchMedia('(prefers-reduced-motion:reduce)').matches,$=s=>document.querySelector(s);
const rnd=s=>()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
const hash=t=>[...t].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
function sky(seed,rot=0,n=44){const r=rnd(seed),P=[];
 for(let i=0;i<n;i++){const a=r()*6.283,d=Math.sqrt(r())*84;P.push([100+Math.cos(a)*d,100+Math.sin(a)*d,r()*1.3+.4])}
 let L='M'+P.slice(0,6).map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L'),M='M'+P.slice(8,13).map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
 return `<svg viewBox="0 0 200 200" role="img" aria-label="Mapa celeste ilustrativo"><circle cx="100" cy="100" r="92" class="rg"/><circle cx="100" cy="100" r="86" class="rg"/><g class="map-sky" style="--map-rotation:${rot}deg"><path class="ln map-line" d="${L}"/><path class="ln map-line" d="${M}"/>${P.map((p,index)=>`<circle class="st map-star" style="--star-delay:${(index*.025).toFixed(3)}s" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p[2].toFixed(1)}"/>`).join('')}</g></svg>`}
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const card=(seed,d,p,rot,className='card')=>`<div class="${className}">${sky(seed,rot)}<p class="cap"><b>${escapeHTML(d)}</b><span>${escapeHTML(p)}</span></p></div>`;
const EX=[[11,'14 · 06 · 2019','Torres, RS'],[23,'03 · 12 · 2008','Porto Alegre'],[37,'21 · 03 · 2015','Florianópolis'],[41,'09 · 09 · 2020','Lisboa'],[58,'30 · 01 · 2012','Curitiba'],[64,'18 · 07 · 2017','Buenos Aires']];

/* hero */
const H=[['3%','15%',150,34,-7,0],['78%','10%',170,24,6,1],['10%','62%',130,48,5,2],['82%','58%',150,40,-5,3],['44%','80%',120,18,4,4],['60%','2%',100,14,-4,5]];
$('#hc').innerHTML=H.map((h,i)=>`<div class="fl" style="--l:${h[0]};--t:${h[1]};--w:${h[2]};--d:${h[3]};--r:${h[4]}">${card(EX[h[5]][0],EX[h[5]][1],EX[h[5]][2],i*20).replace('class="card"',`class="card" style="--du:${8+i}s;--dl:-${i*1.7}s"`)}</div>`).join('');
$('#poster').innerHTML=`<div class="poster">${card(11,'14 · 06 · 2019','Torres, RS')}</div>`;
$('#gal').innerHTML=EX.map((e,i)=>`<div class="gc" style="--x:${[-120,40,140,-160,90,-60][i]};--y:${[90,-40,60,-30,110,-70][i]};--r:${[-14,9,-6,12,-10,7][i]}">${card(e[0]+3,e[1],e[2],i*30)}</div>`).join('');

/* formulário de personalização e prévia */
const fmt=d=>d?d.split('-').reverse().join(' · '):'-- · -- · ----';
function previewRotation(time){const [hours,minutes]=(time||'0:0').split(':').map(Number);return (hours*15+minutes/4).toFixed(2)}
function animatePreview(){
 const previewCard=$('#pvc .preview-poster');
 if(!previewCard)return;
 previewCard.classList.remove('is-drawing');
 previewCard.querySelectorAll('.map-line').forEach(line=>{const length=line.getTotalLength();line.style.strokeDasharray=length;line.style.strokeDashoffset=length});
 requestAnimationFrame(()=>{
  previewCard.classList.add('is-drawing');
  previewCard.querySelectorAll('.map-line').forEach(line=>{line.style.strokeDashoffset=0});
  if(!RM){
   gsap.fromTo(previewCard.querySelector('.cap b'),{y:-5,opacity:.35},{y:0,opacity:1,duration:.28,ease:'power2.out',overwrite:true});
   gsap.fromTo(previewCard.querySelector('.cap span'),{opacity:.25},{opacity:1,duration:.3,ease:'power2.out',overwrite:true});
  }
 });
}
function upd(){const d=$('#d').value,h=$('#h').value,c=$('#c').value.trim(),seed=hash(d||'2000-01-01')||5;
 const markup=`<div class="preview-poster-shell">${card(seed,fmt(d)+(h?' · '+h:''),c||'Sua cidade',previewRotation(h),'card preview-poster')}</div>`;
 $('#pvc').innerHTML=markup;
 animatePreview();
 const dialogCard=$('#preview-dialog-card'),previewCard=$('#pvc').firstElementChild;
 if(dialogCard&&previewCard)dialogCard.replaceChildren(previewCard.cloneNode(true));
}
const mapForm=$('#map-form'),mapFields=[
 {input:$('#d'),error:$('#d-error'),empty:'Informe a data.',step:0},
 {input:$('#h'),error:$('#h-error'),empty:'Informe o horário.',step:1},
 {input:$('#c'),error:$('#c-error'),empty:'Informe uma cidade.',step:2}
];
let formSubmitted=false,previewTimer=0;
function fieldIsValid(field){const value=field.input.value.trim();return Boolean(value)&&(field.input.id!=='c'||value.length>=2)}
function updateFormState(){
 const complete=mapFields.map(fieldIsValid),allComplete=complete.every(Boolean),circles=document.querySelectorAll('.field-progress circle'),segments=document.querySelectorAll('.progress-segment');
 complete.forEach((isComplete,index)=>circles[index]?.classList.toggle('is-complete',isComplete));
 segments.forEach((segment,index)=>segment.classList.toggle('is-complete',complete[index]));
 $('.field-progress').classList.toggle('is-complete',allComplete);
 const button=$('#go');button.disabled=!allComplete;button.setAttribute('aria-disabled',String(!allComplete));
 $('#submit-hint').textContent=allComplete?'Seu céu está pronto para ser revelado.':'Preencha os três campos para acender o mapa.';
}
function validateField(field){
 const value=field.input.value.trim();
 let message='';
 if(!value)message=field.empty;
 else if(field.input.id==='c'&&value.length<2)message='Digite ao menos 2 caracteres para a cidade.';
 field.input.setAttribute('aria-invalid',String(Boolean(message)));
 field.error.textContent=message;
 return !message;
}
function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(upd,250)}
mapFields.forEach(field=>{
 field.input.addEventListener('input',()=>{
  if(formSubmitted||field.input.value)validateField(field);
  updateFormState();
  $('#msg').textContent='O céu se atualiza enquanto você escolhe.';$('#msg').dataset.state='';
  schedulePreview();
 });
 field.input.addEventListener('blur',()=>{if(formSubmitted||field.input.value)validateField(field);updateFormState()});
});
upd();
updateFormState();
mapForm.addEventListener('submit',event=>{
 event.preventDefault();formSubmitted=true;
 const invalid=mapFields.filter(field=>!validateField(field));
 if(invalid.length){
  $('#msg').textContent='Confira os campos destacados para continuar.';$('#msg').dataset.state='error';
  invalid[0].input.focus();return;
 }
 $('#msg').textContent='Prévia atualizada. Esta é uma página conceitual: a criação do mapa ainda não está disponível.';
 $('#msg').dataset.state='success';
});
if(!RM&&matchMedia('(pointer:fine)').matches){
 const tilt={x:0,y:0},setX=gsap.quickTo(tilt,'x',{duration:.45,ease:'power3.out',onUpdate:paintTilt}),setY=gsap.quickTo(tilt,'y',{duration:.45,ease:'power3.out',onUpdate:paintTilt});
 function paintTilt(){const previewCard=$('#pvc .preview-poster');if(!previewCard)return;previewCard.style.setProperty('--tilt-x',`${tilt.x.toFixed(2)}deg`);previewCard.style.setProperty('--tilt-y',`${tilt.y.toFixed(2)}deg`)}
 $('#pv').addEventListener('pointermove',event=>{const rect=$('#pv').getBoundingClientRect();setX((.5-(event.clientY-rect.top)/rect.height)*12);setY(((event.clientX-rect.left)/rect.width-.5)*12)});
 $('#pv').addEventListener('pointerleave',()=>{setX(0);setY(0)});
}
const previewDialog=$('#preview-dialog');
$('#preview-expand').addEventListener('click',()=>{
 upd();
 if(typeof previewDialog.showModal==='function')previewDialog.showModal();
 else previewDialog.setAttribute('open','');
});
$('#preview-close').addEventListener('click',()=>previewDialog.close());
previewDialog.addEventListener('click',event=>{if(event.target===previewDialog)previewDialog.close()});

/* mantém o último controle acionado em estado preenchido */
document.addEventListener('click',e=>{const control=e.target.closest('.btn:not(.map-submit),nav a');if(!control)return;
 document.querySelectorAll('.is-selected').forEach(el=>el.classList.remove('is-selected'));
 control.classList.add('is-selected')});

/* reflexo líquido acompanha o ponteiro nas superfícies de vidro */
document.querySelectorAll('nav,nav a,.brand,.hero .acts .btn,.final .btn').forEach(surface=>{
 surface.addEventListener('pointermove',e=>{const r=surface.getBoundingClientRect();if(!r.width||!r.height)return;
  surface.style.setProperty('--glass-x',`${((e.clientX-r.left)/r.width*100).toFixed(1)}%`);
  surface.style.setProperty('--glass-y',`${((e.clientY-r.top)/r.height*100).toFixed(1)}%`)});
});

/* constelações girando (fundo e abertura) */
function cons(n,seed,r0){const R=rnd(seed);let o='';for(let k=0;k<n;k++){const a=k/n*6.283+R()*.5;let x=Math.cos(a)*r0,y=Math.sin(a)*r0,P=[];for(let i=0,m=4+Math.floor(R()*4);i<m;i++){x+=(R()-.5)*120;y+=(R()-.5)*120;P.push([x.toFixed(0),y.toFixed(0)])}
 o+=`<polyline class="ln" points="${P.map(p=>p.join(',')).join(' ')}"/>`+P.map(p=>`<circle class="st" cx="${p[0]}" cy="${p[1]}" r="${(1.2+R()*2).toFixed(1)}"/>`).join('')}return o}
const rings=(g,D)=>g.innerHTML=D.map(d=>`<g class="rot" style="--s:${d[4]}s;animation-direction:${d[3]?'reverse':'normal'}">${cons(d[1],d[2],d[0])}</g>`).join('');
rings($('#csw'),[[250,5,3,0,200],[430,7,9,1,300],[610,9,17,0,420]]);
/* modelos 3D do Sketchfab (sem capturar a rolagem) */
function sf(id,uid,spin,ok){if(typeof Sketchfab==='undefined')return false;
 new Sketchfab($(id)).init(uid,{preload:1,transparent:1,autospin:spin,dnt:1,ui_controls:0,ui_infos:0,ui_stop:0,ui_watermark:0,ui_watermark_link:0,ui_ar:0,ui_help:0,ui_settings:0,ui_vr:0,ui_fullscreen:0,ui_annotations:0,ui_hint:0,
  success:a=>{a.start();a.addEventListener('viewerready',ok)},error:()=>{}});return true}
  /* estrela jovem no final da página, carregada só quando chega perto */
  const gio=new IntersectionObserver(es=>{if(es[0].isIntersecting){gio.disconnect();sf('#gem','4c3421a983c0439da40508b637e89725',.2,()=>$('#gemw').classList.add('on'));setTimeout(()=>$('#gemw').classList.add('on'),5000)}},{rootMargin:'500px'});gio.observe($('.final'));

/* reveal + scroll */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll('.rv:not(.hero .rv)').forEach(e=>io.observe(e));
const gal=$('#gal'),root=document.documentElement;
/* as variáveis de scroll/mouse só são lidas por #hc e #csw; gravá-las nesses dois (e não no <html>) evita recalcular o estilo da página inteira a cada rolagem */
const fx=[$('#hc'),$('#csw')].filter(Boolean),setFx=(k,v)=>fx.forEach(el=>el.style.setProperty(k,v));

/* FLIP suaviza a reorganização do FAQ quando uma resposta abre ou fecha. */
const faqDetails=[...document.querySelectorAll('#faq details')];
faqDetails.forEach(detail=>{
 detail.addEventListener('click',event=>{
  if(!event.target.closest('summary'))return;
  const state=Flip.getState(faqDetails);
  requestAnimationFrame(()=>{
   faqDetails.forEach(item=>item.querySelector('summary').classList.toggle('is-selected',item.open));
   Flip.from(state,{duration:.55,ease:'power2.out',nested:true,absolute:false,scale:false});
  });
 });
});

/* reflexo de luz amplo e suave acompanha o mouse atrás do conteúdo */
if(!RM&&matchMedia('(pointer:fine)').matches){
 ['#como','#criar'].forEach(selector=>{
  const section=$(selector);if(!section)return;
  const point={x:0,y:0};
  const paint=()=>{section.style.setProperty('--pointer-x',`${point.x}px`);section.style.setProperty('--pointer-y',`${point.y}px`)};
  const moveX=gsap.quickTo(point,'x',{duration:.75,ease:'power3.out',onUpdate:paint});
  const moveY=gsap.quickTo(point,'y',{duration:.75,ease:'power3.out',onUpdate:paint});
  section.addEventListener('pointerenter',()=>section.classList.add('pointer-glow-active'));
  section.addEventListener('pointerleave',()=>section.classList.remove('pointer-glow-active'));
  section.addEventListener('pointermove',event=>{const rect=section.getBoundingClientRect();moveX(event.clientX-rect.left);moveY(event.clientY-rect.top)});
 });
}

let scrollFrame=0;
function onScroll(){
 if(scrollFrame)return;
 scrollFrame=requestAnimationFrame(()=>{
  scrollFrame=0;
  const vh=innerHeight;
  document.body.classList.toggle('has-scrolled',scrollY>72);
  setFx('--sy',Math.min(scrollY,vh));
  setFx('--sc',scrollY);
  if(RM){gal.style.setProperty('--k',0);return}
  const t=gal.getBoundingClientRect().top,p=Math.max(0,Math.min(1,(vh*.95-t)/(vh*.6)));
  gal.style.setProperty('--k',(1-(1-Math.pow(1-p,3))).toFixed(3));
 });
}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);onScroll();

/* cursor parallax */
if(!RM&&matchMedia('(pointer:fine)').matches){let tx=0,ty=0,cx=0,cy=0,on=false;
 addEventListener('mousemove',e=>{tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1;if(!on){on=true;requestAnimationFrame(tick)}});
 function tick(){cx+=(tx-cx)*.07;cy+=(ty-cy)*.07;setFx('--mx',cx.toFixed(3));setFx('--my',cy.toFixed(3));
  if(Math.abs(tx-cx)+Math.abs(ty-cy)>.002)requestAnimationFrame(tick);else on=false}}
