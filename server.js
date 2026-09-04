const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000, maxHttpBufferSize: 10000 });
const PORT = Number(process.env.PORT) || 10000;

const WORLD = { w: 9600, h: 5400 };
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const saveFile = path.join(dataDir, 'players.json');
fs.mkdirSync(dataDir, { recursive: true });

let profiles = {};
try { profiles = JSON.parse(fs.readFileSync(saveFile, 'utf8')) || {}; } catch { profiles = {}; }
const save = () => { try { fs.writeFileSync(saveFile, JSON.stringify(profiles, null, 2)); } catch (e) { console.error('save:', e.message); } };

const regions = [
  { id:'lumen', name:'Pradera Lumen', x:0,y:0,w:3000,h:1800, color:'#65b96b' },
  { id:'emerald', name:'Bosque Esmeralda', x:0,y:1800,w:3200,h:3600, color:'#398d56' },
  { id:'aqua', name:'Lago Azul', x:3000,y:0,w:3000,h:2500, color:'#58aa69' },
  { id:'nova', name:'Región Nova', x:6000,y:0,w:3600,h:2200, color:'#79bd70' },
  { id:'red', name:'Montañas Rojas', x:6000,y:2200,w:3600,h:3200, color:'#77736f' },
  { id:'sky', name:'Costa Sky', x:3200,y:2500,w:2800,h:2900, color:'#5aa76b' }
];
const towns = [
  { id:'lumen', name:'Pueblo Lumen', x:850,y:700, region:'Pradera Lumen' },
  { id:'aqua', name:'Villa Aqua', x:3900,y:850, region:'Lago Azul' },
  { id:'nova', name:'Ciudad Nova', x:6900,y:1100, region:'Región Nova' },
  { id:'verde', name:'Aldea Verde', x:2150,y:3900, region:'Bosque Esmeralda' },
  { id:'cumbre', name:'Pueblo Cumbre', x:7700,y:3900, region:'Montañas Rojas' },
  { id:'sky', name:'Puerto Sky', x:5000,y:4550, region:'Costa Sky' }
];
const routes = [[850,700,3900,850],[3900,850,6900,1100],[6900,1100,7700,3900],[7700,3900,5000,4550],[5000,4550,2150,3900],[2150,3900,850,700],[3900,850,2150,3900],[5000,4550,6900,1100]];
const grass = [[1150,300,2750,650],[1500,900,2850,1550],[350,2250,1700,3450],[1800,2300,3050,3550],[3000,300,3700,650],[4800,300,5900,950],[5200,1150,5900,2200],[6200,300,7900,850],[8200,450,9300,1800],[6500,2500,7700,3450],[8050,2850,9300,3850],[2850,3900,4300,5200],[4600,3000,5750,4050]];
const water = [[3650,1050,5050,2050],[4200,2850,5150,3650]];
const mountains = [[7350,300,9300,1800],[6900,1900,8500,2750],[7350,2750,9300,3900]];
const questions = [
 ['She _____ to school yesterday.',['go','went','goes','going'],1,'Yesterday requires the past tense: went.'],
 ['English for “agua”.',['Fire','Water','Earth','Wind'],1,'Water means agua.'],
 ['Past tense of eat?',['eated','eats','ate','eating'],2,'Eat → ate.'],
 ['Happy means…',['Triste','Feliz','Rápido','Grande'],1,'Happy means feliz.'],
 ['They _____ playing football.',['is','am','are','be'],2,'They → are.'],
 ['I ___ a student.',['am','is','are','be'],0,'I → am.'],
 ['Fast means…',['Lento','Rápido','Pequeño','Frío'],1,'Fast means rápido.'],
 ['Choose the plural.',['childs','children','childes','child'],1,'Children is the irregular plural.'],
 ['Opposite of cold.',['hot','slow','dark','short'],0,'Hot is the opposite of cold.'],
 ['There _____ two books.',['is','are','am','be'],1,'Two books → are.'],
 ['My sister _____ a bike every day.',['ride','rides','riding','rode'],1,'Third-person singular → rides.'],
 ['Translate: “I like music.”',['Me gusta la música.','Odio la música.','Toco fútbol.','Escucho agua.'],0,'I like = me gusta.'],
 ['Which is a place?',['school','happy','quickly','blue'],0,'School is a place.'],
 ['Choose the correct article: ___ apple.',['a','an','thee','some'],1,'An apple.']
];
const mons = {
 pikachu:{icon:'⚡',type:'Electric',hp:110,atk:22}, squirtle:{icon:'💧',type:'Water',hp:125,atk:20}, charmander:{icon:'🔥',type:'Fire',hp:105,atk:25},
 bulbasaur:{icon:'🌿',type:'Grass',hp:120,atk:21}, pidgey:{icon:'🪽',type:'Flying',hp:100,atk:23}, raichu:{icon:'⚡',type:'Electric',hp:125,atk:27}
};
const wild = [['Flameling','🔥','Fire',80,17],['Aquafin','💧','Water',88,15],['Leafling','🌿','Grass',84,16],['Skybit','🪽','Flying',72,19],['Voltimp','⚡','Electric',76,20],['Moonkit','🌙','Dark',90,16],['Pebblit','🪨','Rock',105,13],['Frostel','❄️','Ice',86,18],['Buglet','🐛','Bug',70,15],['Drakid','🐲','Dragon',95,21]];
const players = new Map();
const battles = new Map();
const invites = new Map();
let owner = null;
let started = true;

const cleanName = s => String(s || 'Trainer').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,18) || 'Trainer';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const regionAt = (x,y) => regions.find(r => x>=r.x && x<r.x+r.w && y>=r.y && y<r.y+r.h) || regions[0];
const question = () => questions[Math.floor(Math.random()*questions.length)];
const publicPlayer = p => ({ id:p.id,name:p.name,pokemon:p.pokemon,x:p.x,y:p.y,level:p.level,xp:p.xp,tokens:p.tokens,wins:p.wins,streak:p.streak,region:regionAt(p.x,p.y).name });
const broadcast = () => io.emit('stateUpdate', Object.fromEntries([...players].map(([id,p])=>[id,publicPlayer(p)])));
const progress = (s,p) => s.emit('progressUpdate',{level:p.level,xp:p.xp,maxXp:p.level*120,tokens:p.tokens,wins:p.wins,streak:p.streak,inventory:p.inventory,stats:p.stats});
function award(s,p,xp,tokens){ p.xp += xp; p.tokens += tokens; while(p.xp >= p.level*120){ p.xp -= p.level*120; p.level++; p.stats.hpMax += 10; p.stats.attack += 3; s.emit('levelUp',{level:p.level}); } saveProfile(p); progress(s,p); }
function saveProfile(p){ profiles[p.name.toLowerCase()]={name:p.name,level:p.level,xp:p.xp,tokens:p.tokens,wins:p.wins,pokemon:p.pokemon,inventory:p.inventory,stats:p.stats,quests:p.quests}; save(); }
function nearestTown(p){ return towns.map(t=>({...t,d:Math.hypot(p.x-t.x,p.y-t.y)})).sort((a,b)=>a.d-b.d)[0]; }
function inGrass(x,y){ return grass.some(g=>x>=g[0]&&x<=g[2]&&y>=g[1]&&y<=g[3]); }
function wildBattle(s,p){ if(battles.has(s.id)) return; const w=wild[Math.floor(Math.random()*wild.length)]; const lv=clamp(p.level+Math.floor(Math.random()*5)-2,1,100); const hp=w[3]+lv*7; const q=question(); battles.set(s.id,{kind:'wild',enemy:{name:w[0],icon:w[1],type:w[2],level:lv,maxHp:hp,hp,atk:w[4]+Math.floor(lv/3)},q,started:Date.now()}); p.questionAt=Date.now(); s.emit('battleStarted',{kind:'wild',enemy:battles.get(s.id).enemy,question:{q:q[0],a:q[1],c:q[2],hint:q[3]}}); }
function finishWild(s,p,win){ battles.delete(s.id); if(win){p.wins++;p.streak++;p.quests.bestStreak=Math.max(p.quests.bestStreak,p.streak);award(s,p,35+p.streak*5,5);s.emit('battleWon',{xp:35+p.streak*5,tokens:5,streak:p.streak});}else{p.streak=0;p.stats.hp=p.stats.hpMax;saveProfile(p);progress(s,p);s.emit('battleLost',{hp:p.stats.hpMax});} }

app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');next();});
app.get('/health',(req,res)=>res.json({ok:true,version:'SUPREME-FIXED',world:WORLD,players:players.size,started:true}));
app.get('/',(req,res)=>res.sendFile(path.join(publicDir,'game-v9.html')));
app.use(express.static(publicDir));

io.on('connection', socket => {
 socket.on('joinPlayer',(data={})=>{
  if(players.has(socket.id)) return;
  const name=cleanName(data.name), old=profiles[name.toLowerCase()]||{}, mon=old.pokemon||data.pokemon||'pikachu', base=mons[mon]||mons.pikachu;
  const spawn=towns[0]; if(!owner) owner=socket.id;
  const p={id:socket.id,name,pokemon:mon,x:spawn.x,y:spawn.y,level:clamp(Number(old.level)||1,1,100),xp:Number(old.xp)||0,tokens:Number(old.tokens)||0,wins:Number(old.wins)||0,streak:0,stats:old.stats||{hp:base.hp,hpMax:base.hp,attack:base.atk},inventory:old.inventory||{snack:3,boost:0,badge:0},quests:old.quests||{visited:['lumen'],bestStreak:0},lastMove:Date.now(),questionAt:0};
  p.stats.hp=Math.min(p.stats.hp,p.stats.hpMax); players.set(socket.id,p);
  socket.emit('serverReady',{id:socket.id,owner:socket.id===owner,world:WORLD,towns,regions,routes,grass,water,mountains}); progress(socket,p); socket.emit('roomStarted'); broadcast();
  io.emit('chatMessage',{name:'SYSTEM',text:p.name+' se unió a la aventura.'});
 });
 socket.on('playerMove',(d={})=>{ const p=players.get(socket.id); if(!p)return; const nx=Number(d.x),ny=Number(d.y); if(!Number.isFinite(nx)||!Number.isFinite(ny))return; const now=Date.now(); const dt=Math.min(.35,Math.max(.016,(now-p.lastMove)/1000)); if(Math.hypot(nx-p.x,ny-p.y)>150*dt+15)return; p.x=clamp(nx,24,WORLD.w-24);p.y=clamp(ny,24,WORLD.h-24);p.lastMove=now; const t=nearestTown(p); if(t.d<280&&!p.quests.visited.includes(t.id)){p.quests.visited.push(t.id);saveProfile(p);} broadcast(); });
 socket.on('wildEncounter',()=>{const p=players.get(socket.id);if(p&&inGrass(p.x,p.y))wildBattle(socket,p);});
 socket.on('battleAnswer',(d={})=>{const p=players.get(socket.id),b=battles.get(socket.id);if(!p||!b||b.kind!=='wild'||Date.now()-p.questionAt<200)return;const ok=Number(d.answer)===b.q[2];let damage=0;if(ok){damage=Math.max(1,p.stats.attack+p.level*2);b.enemy.hp=Math.max(0,b.enemy.hp-damage);}const enemyDamage=ok?Math.max(1,b.enemy.atk-4):b.enemy.atk;p.stats.hp=Math.max(0,p.stats.hp-enemyDamage);if(b.enemy.hp<=0)return finishWild(socket,p,true);if(p.stats.hp<=0)return finishWild(socket,p,false);b.q=question();p.questionAt=Date.now();socket.emit('battleUpdate',{correct:ok,damage,enemyDamage,enemyHp:b.enemy.hp,playerHp:p.stats.hp,explanation:ok?'¡Correcto!':'Respuesta incorrecta.',question:{q:b.q[0],a:b.q[1],c:b.q[2],hint:b.q[3]}});progress(socket,p);});
 socket.on('battleRun',()=>{if(battles.get(socket.id)?.kind==='wild'){battles.delete(socket.id);socket.emit('battleEnded',{result:'run'});}});
 socket.on('chatSend',text=>{const p=players.get(socket.id);if(!p)return;const msg=String(text||'').replace(/[<>]/g,'').trim().slice(0,120);if(msg)io.emit('chatMessage',{name:p.name,text:msg});});
 socket.on('fastTravel',id=>{const p=players.get(socket.id),t=towns.find(x=>x.id===id);if(!p||!t)return;if(Math.hypot(p.x-t.x,p.y-t.y)>5000)return socket.emit('serverError',{message:'Acércate a una estación para viajar.'});p.x=t.x;p.y=t.y;p.quests.visited.includes(t.id)||p.quests.visited.push(t.id);saveProfile(p);socket.emit('travelArrived',t);broadcast();});
 socket.on('getQuests',()=>{const p=players.get(socket.id);if(!p)return;socket.emit('questData',[{title:'Primer paso',desc:'Gana 1 combate',done:p.wins>=1},{title:'Explorador',desc:'Visita 3 pueblos',done:p.quests.visited.length>=3},{title:'Académico',desc:'Alcanza nivel 5',done:p.level>=5},{title:'Campeón',desc:'Gana 10 combates',done:p.wins>=10},{title:'Racha maestra',desc:'Consigue una racha de 5',done:p.quests.bestStreak>=5}]);});
 socket.on('getShop',()=>socket.emit('shopData',[{id:'snack',name:'PokéSnack',icon:'🍎',price:10,desc:'Recupera HP durante un combate.'},{id:'boost',name:'EXP Boost',icon:'✨',price:30,desc:'Aumenta la EXP de tu próxima victoria.'},{id:'badge',name:'Trainer Badge',icon:'🏅',price:75,desc:'Una insignia de entrenador.'}]));
 socket.on('buyItem',({id}={})=>{const p=players.get(socket.id),prices={snack:10,boost:30,badge:75};if(!p||!prices[id]||p.tokens<prices[id])return socket.emit('serverError',{message:'No tienes suficientes Tokens.'});p.tokens-=prices[id];p.inventory[id]=(p.inventory[id]||0)+1;saveProfile(p);progress(socket,p);socket.emit('itemBought',{id});});
 socket.on('useItem',id=>{const p=players.get(socket.id);if(!p||!p.inventory[id])return;if(id==='snack'){p.inventory.snack--;p.stats.hp=p.stats.hpMax;}else if(id==='boost'){p.inventory.boost--;p.tokens+=2;}else return;saveProfile(p);progress(socket,p);socket.emit('itemUsed',{id});});
 socket.on('leaderboard',()=>socket.emit('leaderboardData',Object.values(profiles).sort((a,b)=>(b.wins||0)-(a.wins||0)||(b.level||1)-(a.level||1)).slice(0,25).map(x=>({name:x.name,level:x.level||1,wins:x.wins||0,tokens:x.tokens||0}))));
 socket.on('challenge',targetId=>{const a=players.get(socket.id),b=players.get(targetId);if(!a||!b||a.id===b.id)return;invites.set(b.id,{from:a.id,expires:Date.now()+15000});io.to(b.id).emit('challengeInvite',{from:a.id,name:a.name,pokemon:a.pokemon,level:a.level});});
 socket.on('challengeResponse',({accept}={})=>{const inv=invites.get(socket.id);if(!inv||inv.expires<Date.now()){invites.delete(socket.id);return;}const a=players.get(inv.from),b=players.get(socket.id);invites.delete(socket.id);if(!accept||!a||!b)return io.to(inv.from).emit('challengeResult',{accepted:false});if(battles.has(a.id)||battles.has(b.id))return;const ma=mons[a.pokemon]||mons.pikachu,mb=mons[b.pokemon]||mons.pikachu;const room={a:a.id,b:b.id,turn:a.id,hpA:ma.hp+a.level*6,hpB:mb.hp+b.level*6,maxA:ma.hp+a.level*6,maxB:mb.hp+b.level*6,qa:question(),qb:question()};battles.set(a.id,{kind:'pvp',room});battles.set(b.id,{kind:'pvp',room});io.to(a.id).emit('pvpStarted',{turn:a.id,yourHp:room.hpA,opponentHp:room.hpB,opponent:{name:b.name,pokemon:b.pokemon,level:b.level},question:{q:room.qa[0],a:room.qa[1],c:room.qa[2],hint:room.qa[3]}});io.to(b.id).emit('pvpStarted',{turn:a.id,yourHp:room.hpB,opponentHp:room.hpA,opponent:{name:a.name,pokemon:a.pokemon,level:a.level},question:{q:room.qb[0],a:room.qb[1],c:room.qb[2],hint:room.qb[3]}});});
 socket.on('pvpAnswer',(d={})=>{const b=battles.get(socket.id);if(!b||b.kind!=='pvp')return;const r=b.room;if(r.turn!==socket.id)return;const p=players.get(socket.id);const q=socket.id===r.a?r.qa:r.qb;const ok=Number(d.answer)===q[2];const damage=ok?Math.max(5,p.level*2+8):0;if(socket.id===r.a)r.hpB=Math.max(0,r.hpB-damage);else r.hpA=Math.max(0,r.hpA-damage);const other=r.a===socket.id?r.b:r.a;if((socket.id===r.a?r.hpB:r.hpA)<=0){p.wins++;award(socket,p,60,10);io.to(socket.id).emit('pvpFinished',{win:true});io.to(other).emit('pvpFinished',{win:false});battles.delete(r.a);battles.delete(r.b);broadcast();return;}r.turn=other;const oq=other===r.a?r.qa:r.qb;io.to(socket.id).emit('pvpUpdate',{correct:ok,damage,turn:r.turn,yourHp:socket.id===r.a?r.hpA:r.hpB,opponentHp:socket.id===r.a?r.hpB:r.hpA,question:null});io.to(other).emit('pvpUpdate',{correct:null,damage:0,turn:r.turn,yourHp:other===r.a?r.hpA:r.hpB,opponentHp:other===r.a?r.hpB:r.hpA,question:{q:oq[0],a:oq[1],c:oq[2],hint:oq[3]}});});
 socket.on('disconnect',()=>{const p=players.get(socket.id);if(p)io.emit('chatMessage',{name:'SYSTEM',text:p.name+' salió.'});players.delete(socket.id);battles.delete(socket.id);invites.delete(socket.id);if(owner===socket.id)owner=players.keys().next().value||null;broadcast();});
});

server.listen(PORT,'0.0.0.0',()=>console.log(`PokéWords SUPREME FIXED listening on ${PORT}`));
