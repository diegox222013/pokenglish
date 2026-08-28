(()=>{
const S=window.socket||io();window.socket=S;const $=id=>document.getElementById(id);let worldW=3000,worldH=2000,camX=0,camY=0,encounterCooldown=0,started=false;
const rand=(a,b)=>Math.random()*(b-a)+a;const wildIcons=['🔥','💧','🌿','🪽','⚡'];
function zoneAt(x,y){if(x>180&&x<900&&y>150&&y<650)return '🌲 VERB FOREST';if(x>2050&&x<2800&&y>120&&y<700)return '💧 BLUE LAKE';if(x>1900&&x<2800&&y>1250&&y<1800)return '🏘️ VOCAB TOWN';return '🌱 MEADOWS'}
function teleportSpawn(){if(window.myPlayer){window.myPlayer.x=1500;window.myPlayer.y=1000}}
function updateBig(){if(!window.myPlayer?.name)return;started=window.gameStarted!==false;let p=window.myPlayer;if(!started&&p.name!=='Diegox222013')return;let dx=0,dy=0;if(keys.w||keys.W||keys.ArrowUp)dy--;if(keys.s||keys.S||keys.ArrowDown)dy++;if(keys.a||keys.A||keys.ArrowLeft)dx--;if(keys.d||keys.D||keys.ArrowRight)dx++;if(dx||dy){let l=Math.hypot(dx,dy);p.x=Math.max(35,Math.min(worldW-35,p.x+dx/l*p.speed));p.y=Math.max(35,Math.min(worldH-35,p.y+dy/l*p.speed));S.emit('playerMove',{x:p.x,y:p.y})}camX=Math.max(0,Math.min(worldW-960,p.x-480));camY=Math.max(0,Math.min(worldH-540,p.y-270));encounterCooldown=Math.max(0,encounterCooldown-1);if(started&&encounterCooldown===0&&zoneAt(p.x,p.y)==='🌱 MEADOWS'&&Math.random()<0.012){encounterCooldown=900;startBattle();if(window.toast)toast('🌿 ¡Un Pokémon salvaje apareció!')}}
function ellipse(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2)}
function tree(x,y,s=1){ctx.fillStyle='#6a472e';ctx.fillRect(x-7*s,y,14*s,42*s);ctx.fillStyle='#1d663e';ellipse(x,y-5*s,34*s,29*s);ctx.fill();ctx.fillStyle='#319454';ellipse(x-25*s,y+4*s,25*s,22*s);ctx.fill();ellipse(x+25*s,y+4*s,25*s,22*s);ctx.fill()}
function house(x,y,c){ctx.fillStyle='#e7c88f';ctx.fillRect(x,y,125,95);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-15,y+5);ctx.lineTo(x+62,y-52);ctx.lineTo(x+140,y+5);ctx.fill();ctx.fillStyle='#6a4736';ctx.fillRect(x+52,y+50,22,45);ctx.fillStyle='#79c9e5';ctx.fillRect(x+12,y+30,30,24);ctx.fillRect(x+84,y+30,30,24)}
function drawBig(){if(!window.myPlayer?.name)return;tick++;ctx.clearRect(0,0,960,540);ctx.save();ctx.translate(-camX,-camY);let g=ctx.createLinearGradient(0,0,0,worldH);g.addColorStop(0,'#9bd37d');g.addColorStop(1,'#4f9f61');ctx.fillStyle=g;ctx.fillRect(0,0,worldW,worldH);
// roads
ctx.fillStyle='#e4c581';ctx.fillRect(0,925,worldW,150);ctx.fillRect(1425,0,150,worldH);ctx.fillStyle='#f2dda0';ctx.fillRect(0,970,worldW,60);ctx.fillRect(1470,0,60,worldH);
// lake
ctx.fillStyle='#479fc8';ellipse(2420,420,390,290);ctx.fill();for(let i=0;i<80;i++){ctx.fillStyle='#ffffff22';ctx.fillRect((i*173)%worldW,(i*97)%worldH,3,3)}
// forest
ctx.fillStyle='#39834f';ctx.beginPath();ctx.roundRect(160,130,760,560,55);ctx.fill();
// town
ctx.fillStyle='#c89d5b';ctx.beginPath();ctx.roundRect(1850,1200,980,650,45);ctx.fill();
for(let i=0;i<115;i++){let x=(i*263)%worldW+35,y=(i*149)%worldH+35;if((x>1850&&x<2830&&y>1200&&y<1850)||(x>160&&x<920&&y>130&&y<690))continue;tree(x,y,.65+(i%3)*.12)}
for(let i=0;i<7;i++)house(1960+(i%4)*210,1320+Math.floor(i/4)*210,i%2?'#687dc7':'#c75b58');
ctx.font='900 32px system-ui';ctx.fillStyle='#ffffffdd';ctx.fillText('🌲 VERB FOREST',260,205);ctx.fillText('💧 BLUE LAKE',2300,145);ctx.fillText('🏘️ VOCAB TOWN',2100,1260);
// collectibles / signs
for(let i=0;i<18;i++){let x=260+(i*431)%2500,y=760+(i*271)%1000;ctx.fillStyle='#ffd957';ellipse(x,y,7,7);ctx.fill();}
for(const id in window.otherPlayers||{}){let p=otherPlayers[id];drawPlayerBig(p)}drawPlayerBig(window.myPlayer);ctx.restore();
// world minimap
ctx.fillStyle='#071322cc';ctx.fillRect(790,430,155,95);ctx.fillStyle='#55b8ff';ctx.fillRect(790+camX/worldW*155,430+camY/worldH*95,Math.max(8,960/worldW*155),Math.max(7,540/worldH*95));ctx.strokeStyle='#ffffff55';ctx.strokeRect(790,430,155,95);ctx.fillStyle='#fff';ctx.font='800 10px system-ui';ctx.fillText('WORLD MAP',800,444);ctx.fillStyle='#ffd957';ctx.fillRect(790+(window.myPlayer.x/worldW)*155-2,430+(window.myPlayer.y/worldH)*95-2,5,5)}
function drawPlayerBig(p){if(!p)return;let bob=Math.sin(tick*.12+(p.x||0)) * 2,c=colors[p.pokemon]||'#ff6b6b',s=p.pokemon==='rayquaza'?42:30;ctx.save();ctx.translate(p.x,p.y+bob);ctx.fillStyle='#0005';ellipse(0,18,s*.6,7);ctx.fill();ctx.fillStyle=c;ellipse(0,-2,s/2,s/2);ctx.fill();ctx.strokeStyle='#142236';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff';ellipse(-s*.17,-s*.1,5,5);ctx.fill();ellipse(s*.17,-s*.1,5,5);ctx.fill();ctx.fillStyle='#142236';ellipse(-s*.17,-s*.1,2,2);ctx.fill();ellipse(s*.17,-s*.1,2,2);ctx.fill();ctx.fillStyle='#071322dd';ctx.beginPath();ctx.roundRect(-48,-52,96,18,9);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText(p.name||'Trainer',0,-39);ctx.restore()}
const oldStart=window.startBattle;window.startBattle=function(){if(!window.gameStarted&&window.myPlayer?.name!=='Diegox222013'){if(window.toast)toast('La aventura aún no comenzó.');return}S.emit('battleStart')};S.on('roomStarted',()=>{window.gameStarted=true;started=true});S.on('battleStarted',d=>{if(window.currentBattle){} window.currentBattle=d; if($('battle'))$('battle').classList.add('show');if($('enemyName'))$('enemyName').textContent=d.enemy.icon+' '+d.enemy.name;if($('enemyLevel'))$('enemyLevel').textContent=d.enemy.level;if($('enemyOrb'))$('enemyOrb').textContent=d.enemy.icon;if($('challenge'))$('challenge').textContent='⚔️ ¡Encuentro salvaje! Responde para atacar.';if(window.toast)toast('⚔️ ¡'+d.enemy.name+' apareció!')});
window.update=updateBig;window.draw=drawBig;window.worldSize={w:worldW,h:worldH};
})();