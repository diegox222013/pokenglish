(()=>{
'use strict';
const socket=io();
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
let world={w:9600,h:5400},regions=[],towns=[],routes=[],grass=[],water=[],mountains=[];
let me={id:null,name:'Trainer',pokemon:'pikachu',x:850,y:700,level:1,xp:0,tokens:0,wins:0,streak:0,stats:{hp:110,hpMax:110,attack:22},inventory:{}};
let players={}, camera={x:850,y:700}, keys={}, mode='login', battle=null, encounterCooldown=0, lastSent=0, chat=[];
const POKEMON={pikachu:['⚡','Electric'],squirtle:['💧','Water'],charmander:['🔥','Fire'],bulbasaur:['🌿','Grass'],pidgey:['🪽','Flying'],raichu:['⚡','Electric']};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function resize(){canvas.width=innerWidth;canvas.height=innerHeight} addEventListener('resize',resize);resize();
function toast(t){const n=document.getElementById('notice');n.textContent=t;n.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>n.style.display='none',2400)}
function regionAt(x,y){return regions.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)||{name:'Territorio Salvaje',color:'#5eaa68'}}
function rectHit(x,y,r){return x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3]}
function inGrass(){return grass.some(g=>rectHit(me.x,me.y,g))}
function setHud(){document.getElementById('name').textContent=me.name;document.getElementById('level').textContent=me.level;document.getElementById('mon').textContent=me.pokemon.toUpperCase();document.getElementById('xp').textContent=me.xp;document.getElementById('maxxp').textContent=me.level*120;document.getElementById('tokens').textContent=me.tokens;document.getElementById('hp').style.width=Math.max(0,Math.min(100,me.stats.hp/me.stats.hpMax*100))+'%';document.getElementById('region').textContent=regionAt(me.x,me.y).name;document.getElementById('online').textContent='● '+Object.keys(players).length+' online'}
function drawWorld(){
 ctx.clearRect(0,0,canvas.width,canvas.height);const sx=canvas.width/world.w,sy=canvas.height/world.h;const viewW=canvas.width/sx,viewH=canvas.height/sy;
 camera.x+=(me.x-camera.x)*.12;camera.y+=(me.y-camera.y)*.12;const left=camera.x-viewW/2,top=camera.y-viewH/2;
 ctx.save();ctx.scale(sx,sy);ctx.translate(-left,-top);
 for(const r of regions){ctx.fillStyle=r.color;ctx.fillRect(r.x,r.y,r.w,r.h)}
 ctx.globalAlpha=.32;for(const [x1,y1,x2,y2] of routes){ctx.strokeStyle='#ead39a';ctx.lineWidth=110;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='#b99564';ctx.lineWidth=7;ctx.stroke()};ctx.globalAlpha=1;
 for(const w of water){ctx.fillStyle='#4ca8d4';ctx.beginPath();ctx.ellipse((w[0]+w[2])/2,(w[1]+w[3])/2,(w[2]-w[0])/2,(w[3]-w[1])/2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8bd6ef';ctx.lineWidth=10;ctx.stroke()}
 for(const m of mountains){ctx.fillStyle='#756f6a';ctx.beginPath();ctx.moveTo(m[0],m[3]);ctx.lineTo((m[0]+m[2])/2,m[1]);ctx.lineTo(m[2],m[3]);ctx.closePath();ctx.fill()}
 for(const g of grass){ctx.fillStyle='#4a9f4f';ctx.fillRect(g[0],g[1],g[2]-g[0],g[3]-g[1]);ctx.fillStyle='#78c967';for(let x=g[0]+20;x<g[2];x+=35){for(let y=g[1]+18;y<g[3];y+=35){ctx.fillRect(x,y,4,13);ctx.fillRect(x+6,y+5,3,9)}}}
 for(let x=200;x<world.w;x+=260)for(let y=150;y<world.h;y+=310){if(inTownArea(x,y)||inRouteArea(x,y))continue;ctx.fillStyle='#1f7142';ctx.beginPath();ctx.arc(x,y,28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#654a35';ctx.fillRect(x-5,y+20,10,24)}
 for(const t of towns){ctx.fillStyle='#d8a84d';ctx.fillRect(t.x-120,t.y-90,240,180);ctx.fillStyle='#9e4e45';ctx.beginPath();ctx.moveTo(t.x-140,t.y-90);ctx.lineTo(t.x,t.y-190);ctx.lineTo(t.x+140,t.y-90);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 46px system-ui';ctx.textAlign='center';ctx.fillText(t.name,t.x,t.y+155)}
 for(const [id,p] of Object.entries(players)){if(id===me.id)continue;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4265d6';ctx.fillRect(p.x-18,p.y-7,36,27);ctx.fillStyle='#fff';ctx.font='bold 24px system-ui';ctx.textAlign='center';ctx.fillText(p.name,p.x,p.y-34)}
 const myIcon=POKEMON[me.pokemon]?.[0]||'⚡';ctx.font='54px system-ui';ctx.textAlign='center';ctx.fillText(myIcon,me.x,me.y);ctx.font='bold 22px system-ui';ctx.fillStyle='#fff';ctx.fillText(me.name,me.x,me.y-42);
 ctx.restore();
}
function inTownArea(x,y){return towns.some(t=>Math.abs(x-t.x)<180&&Math.abs(y-t.y)<140)}function inRouteArea(x,y){return false}
function frame(){drawWorld();requestAnimationFrame(frame)}requestAnimationFrame(frame);
function showLogin(){document.getElementById('ui').style.display='block';const p=document.getElementById('panel');p.style.display='block';p.innerHTML='<h3>⚡ Entrar a PokéWords <button class="row" style="float:right" onclick="closePanel()">×</button></h3><div class="body"><p>Explora un mundo gigante de 9600×5400, aprende inglés y enfréntate a otros entrenadores.</p><input id="trainerName" maxlength="18" value="Diego" placeholder="Nombre" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #bccbd8;border-radius:9px"><select id="trainerMon" style="width:100%;margin-top:8px;padding:11px;border:1px solid #bccbd8;border-radius:9px"><option value="pikachu">⚡ Pikachu</option><option value="squirtle">💧 Squirtle</option><option value="charmander">🔥 Charmander</option><option value="bulbasaur">🌿 Bulbasaur</option><option value="pidgey">🪽 Pidgey</option><option value="raichu">⚡ Raichu</option></select><button onclick="enterWorld()" style="width:100%;margin-top:10px;padding:13px;border:0;border-radius:10px;background:#5d70ff;color:#fff;font-weight:900">ENTRAR AL MUNDO →</button></div>'}
window.enterWorld=()=>{me.name=document.getElementById('trainerName').value.trim()||'Trainer';me.pokemon=document.getElementById('trainerMon').value;socket.emit('joinPlayer',{name:me.name,pokemon:me.pokemon});mode='game';closePanel();toast('🌎 Explora la hierba: los encuentros son aleatorios.')};
window.closePanel=()=>{document.getElementById('panel').style.display='none'};
window.openPanel=kind=>{const p=document.getElementById('panel');p.style.display='block';let h='';if(kind==='quests'){socket.emit('getQuests');return}if(kind==='shop'){socket.emit('getShop');return}if(kind==='rank'){socket.emit('leaderboard');return}if(kind==='dex'){h='<h3>📖 Pokédex</h3><div class="body">'+Object.entries(POKEMON).map(([k,v])=>`<div class="row">${v[0]} <b>${k.toUpperCase()}</b> <small>${v[1]}</small></div>`).join('')+'</div>'}if(kind==='players'){h='<h3>👥 Entrenadores <button class="row" style="float:right" onclick="closePanel()">×</button></h3><div class="body">'+Object.values(players).filter(x=>x.id!==me.id).map(x=>`<div class="row"><b>${esc(x.name)}</b> Lv.${x.level}<button onclick="challenge('${x.id}')">⚔️ DESAFIAR</button></div>`).join('')||'<p>No hay otros jugadores conectados.</p>'+'</div>'}p.innerHTML=h};
window.challenge=id=>socket.emit('challenge',id);
window.openMap=()=>{const p=document.getElementById('panel');p.style.display='block';p.innerHTML='<h3>🗺️ ZHORXAT FAWND <button class="row" style="float:right" onclick="closePanel()">×</button></h3><div class="body">'+towns.map(t=>`<div class="row"><b>🚂 ${esc(t.name)}</b><small>${esc(t.region)}</small><button onclick="travel('${t.id}')">VIAJAR</button></div>`).join('')+'<p>Viaje rápido disponible cuando estás cerca de una estación.</p></div>'};window.travel=id=>{socket.emit('fastTravel',id);closePanel()};
function toggleChat(){const c=document.getElementById('chat');c.style.display=c.style.display==='block'?'none':'block';if(c.style.display==='block')document.getElementById('chatin').focus()}window.toggleChat=toggleChat;
document.getElementById('send').onclick=()=>{const i=document.getElementById('chatin');const t=i.value.trim();if(t){socket.emit('chatSend',t);i.value=''}};document.getElementById('chatin').onkeydown=e=>{if(e.key==='Enter')document.getElementById('send').click()};
function battleView(){const b=document.getElementById('battle');if(!battle){b.style.display='none';return}b.style.display='grid';document.getElementById('enemyName').textContent=b.enemy.name;document.getElementById('enemyMeta').textContent=`Lv.${b.enemy.level} • ${b.enemy.type}`;document.getElementById('enemySprite').textContent=b.enemy.icon;document.getElementById('enemyHp').style.width=(b.enemy.hp/b.enemy.maxHp*100)+'%';document.getElementById('battleQ').textContent=b.question.q;const a=document.getElementById('answers');a.innerHTML=b.question.a.map((x,i)=>`<button onclick="answer(${i})">${esc(x)}</button>`).join('');document.getElementById('battleInfo').textContent=`Tu HP: ${me.stats.hp}/${me.stats.hpMax}`}
window.answer=i=>{if(battle)socket.emit('battleAnswer',{answer:i})};window.runBattle=()=>socket.emit('battleRun');
function updateBattle(data){battle={enemy:data.enemy,question:data.question};battleView()}
socket.on('connect',()=>toast('🌐 Conectado al servidor'));
socket.on('serverReady',d=>{me.id=d.id;world=d.world||world;regions=d.regions||[];towns=d.towns||[];routes=d.routes||[];grass=d.grass||[];water=d.water||[];mountains=d.mountains||[];document.getElementById('boot').style.display='none';setHud();showLogin()});
socket.on('progressUpdate',d=>{me.level=d.level??me.level;me.xp=d.xp??me.xp;me.tokens=d.tokens??me.tokens;me.wins=d.wins??me.wins;me.streak=d.streak??me.streak;if(d.stats)me.stats=d.stats;if(d.inventory)me.inventory=d.inventory;setHud()});
socket.on('stateUpdate',d=>{players=d;setHud()});
socket.on('levelUp',d=>toast('⭐ ¡Subiste a nivel '+d.level+'!'));
socket.on('chatMessage',m=>{chat.push(m);if(chat.length>80)chat.shift();const l=document.getElementById('chatlog');l.innerHTML=chat.map(x=>`<div class="msg"><b>${esc(x.name)}</b>: <span>${esc(x.text)}</span></div>`).join('');l.scrollTop=l.scrollHeight});
socket.on('serverError',e=>toast('⚠️ '+e.message));
socket.on('battleStarted',updateBattle);
socket.on('battleUpdate',d=>{if(!battle)return;me.stats.hp=d.playerHp;battle.enemy.hp=d.enemyHp;battle.question=d.question;battleView();toast(d.correct?'✅ ¡Correcto!':'❌ Incorrecto')});
socket.on('battleWon',d=>{battle=null;battleView();toast('🏆 ¡Victoria! +'+d.xp+' EXP')});
socket.on('battleLost',()=>{battle=null;battleView();toast('💥 Has perdido el combate.')});
socket.on('battleEnded',()=>{battle=null;battleView();toast('🏃 Escapaste.')});
socket.on('questData',q=>{const p=document.getElementById('panel');p.style.display='block';p.innerHTML='<h3>📜 Misiones</h3><div class="body">'+q.map(x=>`<div class="row">${x.done?'✅':'⬜'} <b>${esc(x.title)}</b><br><small>${esc(x.desc)}</small></div>`).join('')+'</div>'});
socket.on('shopData',items=>{const p=document.getElementById('panel');p.style.display='block';p.innerHTML='<h3>🛒 Tienda</h3><div class="body">'+items.map(x=>`<div class="row"><b>${x.icon} ${esc(x.name)}</b> — 🪙${x.price}<br><small>${esc(x.desc)}</small><button onclick="buy('${x.id}')">COMPRAR</button></div>`).join('')+'</div>'});
window.buy=id=>socket.emit('buyItem',{id});socket.on('itemBought',()=>{toast('🛒 Compra realizada');socket.emit('getShop')});socket.on('itemUsed',()=>{setHud();toast('✨ Objeto usado')});
socket.on('leaderboardData',r=>{const p=document.getElementById('panel');p.style.display='block';p.innerHTML='<h3>🏆 Ranking</h3><div class="body"><table style="width:100%">'+r.map((x,i)=>`<tr><td>#${i+1}</td><td>${esc(x.name)}</td><td>Lv.${x.level}</td><td>🏆${x.wins}</td></tr>`).join('')+'</table></div>'});
socket.on('challengeInvite',x=>{if(confirm(`⚔️ ${x.name} te desafía a un combate Pokémon. ¿Aceptar?`))socket.emit('challengeResponse',{accept:true});else socket.emit('challengeResponse',{accept:false})});
socket.on('challengeResult',x=>toast(x.accepted?'⚔️ ¡Desafío aceptado!':'❌ Desafío rechazado'));
socket.on('pvpStarted',d=>toast('⚔️ ¡COMBATE PvP!'));socket.on('pvpFinished',d=>toast(d.win?'🏆 ¡Ganaste el PvP!':'💥 Perdiste el PvP'));
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='c')toggleChat();if(e.key.toLowerCase()==='m')window.openMap()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const dir={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};document.querySelectorAll('[data-dir]').forEach(b=>{const d=dir[b.dataset.dir];b.onpointerdown=()=>{keys['__'+b.dataset.dir]=true};b.onpointerup=b.onpointercancel=()=>{keys['__'+b.dataset.dir]=false}});
setInterval(()=>{if(mode!=='game'||battle)return;let dx=(keys.d||keys.arrowright||keys.__right?1:0)-(keys.a||keys.arrowleft||keys.__left?1:0);let dy=(keys.s||keys.arrowdown||keys.__down?1:0)-(keys.w||keys.arrowup||keys.__up?1:0);if(dx||dy){const l=Math.hypot(dx,dy);me.x=Math.max(25,Math.min(world.w-25,me.x+dx/l*115));me.y=Math.max(25,Math.min(world.h-25,me.y+dy/l*115));if(Date.now()-lastSent>70){socket.emit('playerMove',{x:me.x,y:me.y});lastSent=Date.now()}if(Date.now()>encounterCooldown&&inGrass()&&Math.random()<0.065){encounterCooldown=Date.now()+4500;socket.emit('wildEncounter')}}},1000/30);
})();
