(()=>{
  const KEY='pokewords-save-v45';
  const saved=JSON.parse(localStorage.getItem(KEY)||'null')||{};
  let serverOnline=false, owner=false, battle=null, questionOpen=false;
  const el=id=>document.getElementById(id);
  const toast=t=>{if(typeof window.toast==='function')return window.toast(t);const x=el('toast');if(x){x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1600)}};
  const save=()=>localStorage.setItem(KEY,JSON.stringify({level:myPlayer.level||1,xp:myPlayer.xp||0,tokens:myPlayer.tokens||0,wins:myPlayer.wins||0,stats:myPlayer.stats||{hp:100,attack:50},pokemon:myPlayer.pokemon,name:myPlayer.name}));
  const refreshProgress=p=>{
    if(!p)return;
    myPlayer.level=p.level??myPlayer.level??1;myPlayer.xp=p.xp??myPlayer.xp??0;
    if(p.tokens!=null)myPlayer.tokens=p.tokens;if(p.wins!=null)myPlayer.wins=p.wins;
    if(p.stats)myPlayer.stats=p.stats;
    if(el('level'))el('level').textContent=myPlayer.level;
    if(el('hud-level'))el('hud-level').textContent=myPlayer.level;
    if(el('xp-now'))el('xp-now').textContent=myPlayer.xp;
    if(el('xp-max'))el('xp-max').textContent=myPlayer.level*100;
    if(el('xpbar'))el('xpbar').style.width=Math.min(100,(myPlayer.xp/(myPlayer.level*100))*100)+'%';
    if(el('tokens'))el('tokens').textContent=myPlayer.tokens||0;
    if(el('wins'))el('wins').textContent=myPlayer.wins||0;
    save();
  };
  function install(){
    if(typeof socket==='undefined')return setTimeout(install,50);
    const originalJoin=window.joinGame;
    window.joinGame=function(){
      const n=el('username')?.value.trim();if(!n)return toast('Escribe un nombre');
      myPlayer.name=n;myPlayer.pokemon=el('pokemon-select')?.value||'pikachu';
      myPlayer.level=Number(saved.level)||1;myPlayer.xp=Number(saved.xp)||0;myPlayer.tokens=Number(saved.tokens)||0;myPlayer.wins=Number(saved.wins)||0;
      myPlayer.stats=saved.stats||{hp:100,attack:50};
      if(n==='Diegox222013'){myPlayer.pokemon='rayquaza';myPlayer.speed=6.5;myPlayer.stats={...myPlayer.stats,hp:9999,attack:9999};if(el('start-room-btn'))el('start-room-btn').style.display='block'}
      el('login-panel').style.display='none';el('lobby-panel').style.display='flex';el('canvas-wrapper').style.display='block';el('console').style.display='block';
      el('lbl-name').textContent=n;el('lbl-pokemon').textContent=myPlayer.pokemon.toUpperCase();el('hud-name').textContent=n;el('hud-pokemon').textContent=myPlayer.pokemon.toUpperCase();
      refreshProgress(myPlayer);socket.emit('joinPlayer',{...myPlayer});toast('🌐 Conectando al servidor...');
    };
    window.startBattle=function(){if(!serverOnline||!gameStarted)return toast('⏳ Espera a que la sala comience');if(battle)return toast('⚔ Ya estás en combate');socket.emit('battleStart');toast('⚡ Buscando un Pokémon salvaje...')};
    window.battleMove=function(kind){if(!battle||questionOpen)return;if(kind==='quick')toast('💨 Quick Question');openQuestion()};
    window.runAway=function(){if(battle){socket.emit('battleRun');return}toast('No hay ningún combate activo.')};
    window.closeQuestion=function(){if(!questionOpen)return;questionOpen=false;el('question')?.classList.remove('show')};
    window.useSnack=function(){toast('🍎 PokéSnack estará conectado al servidor en el siguiente balance.')};
    window.toggleInventory=function(){el('inventory')?.classList.toggle('show');if(el('snacks'))el('snacks').textContent='3';if(el('tokens'))el('tokens').textContent=myPlayer.tokens||0;if(el('wins'))el('wins').textContent=myPlayer.wins||0};
    window.showStats=function(){const s=myPlayer.stats||{};if(el('statsText'))el('statsText').innerHTML=`⚡ <b>${myPlayer.pokemon?.toUpperCase()}</b><br>Lv. ${myPlayer.level}<br>❤️ HP: ${s.hp}<br>⚔️ ATK: ${s.attack}<br>⭐ Tokens: ${myPlayer.tokens||0}<br>🏆 Victorias: ${myPlayer.wins||0}`;el('stats')?.classList.add('show')};
    socket.on('serverReady',d=>{serverOnline=true;owner=!!d.owner;if(el('start-room-btn'))el('start-room-btn').style.display=owner?'block':'none';toast(owner?'👑 Eres el dueño de la sala':'🌐 Servidor conectado');});
    socket.on('serverError',d=>toast('⚠️ '+(d?.message||'Error del servidor')));
    socket.on('progressUpdate',refreshProgress);
    socket.on('levelUp',d=>{refreshProgress(d);toast(`🎉 ¡LEVEL UP! Ahora eres Lv. ${d.level}`)});
    socket.on('stateUpdate',state=>{const me=state?.[socket.id];if(me){myPlayer.x=me.x;myPlayer.y=me.y;myPlayer.level=me.level??myPlayer.level;myPlayer.xp=me.xp??myPlayer.xp;myPlayer.stats=me.stats??myPlayer.stats;refreshProgress(myPlayer)}});
    socket.on('roomStarted',d=>{gameStarted=true;serverOnline=true;if(typeof startTimer==='function')startTimer();toast(`🚀 ¡SALA INICIADA! Ronda ${d?.round||1}`)});
    socket.on('battleStarted',d=>{battle=d;questionOpen=false;openBattle();setQuestion(d.question)});
    socket.on('battleUpdate',d=>{if(!battle)return;battle.enemy.hp=d.enemyHp;battle.playerHp=d.playerHp;updateBattleBars();setQuestion(d.question);el('battleLog').textContent=d.correct?`⚡ ¡Golpe! ${d.damage} de daño. El rival responde con ${d.enemyDamage}.`:`❌ Incorrecto. El rival contraataca por ${d.enemyDamage}.`;toast(d.correct?'⚡ ¡CORRECTO!':'❌ ¡INCORRECTO!');});
    socket.on('battleWon',d=>{if(!battle)return;el('battleLog').textContent=`🏆 ¡VICTORIA! +${d.xp} EXP • +${d.tokens} ⭐`;refreshProgress({level:myPlayer.level,xp:myPlayer.xp,tokens:d.tokens!=null?(myPlayer.tokens||0)+d.tokens:myPlayer.tokens,wins:(myPlayer.wins||0)+1,stats:myPlayer.stats});setTimeout(()=>{closeBattle();battle=null},1100)});
    socket.on('battleLost',d=>{if(!battle)return;el('battleLog').textContent='💥 Tu Pokémon quedó fuera de combate.';if(d.respawnHp)myPlayer.stats.hp=d.respawnHp;refreshProgress(myPlayer);setTimeout(()=>{closeBattle();battle=null},1100)});
    socket.on('battleEnded',()=>{closeBattle();battle=null;toast('↗ Escapaste del combate')});
    function openBattle(){el('battle')?.classList.add('show');el('enemyName').textContent=battle.enemy.name;el('enemyLevel').textContent=battle.enemy.level;el('enemyOrb').textContent=battle.enemy.icon;el('allyOrb').textContent=icons[myPlayer.pokemon]||'⚡';el('allyName').textContent=myPlayer.pokemon.toUpperCase();el('allyLevel').textContent=myPlayer.level;updateBattleBars();el('battleLog').textContent=`¡${battle.enemy.name} apareció!`}
    function closeBattle(){questionOpen=false;el('question')?.classList.remove('show');el('battle')?.classList.remove('show')}
    function updateBattleBars(){if(!battle)return;const eh=Math.max(0,(battle.enemy.hp/battle.enemy.maxHp)*100);const ph=Math.max(0,((battle.playerHp??myPlayer.stats.hp)/(myPlayer.stats.hp||100))*100);if(el('enemyHp'))el('enemyHp').style.width=eh+'%';if(el('allyHp'))el('allyHp').style.width=Math.min(100,ph)+'%'}
    function setQuestion(q){if(!q)return;currentQuestion=q;el('qtext').textContent=q.q;el('qmeta').textContent=`⚔ ${battle.enemy.name} • Elige una respuesta`;const box=el('answers');if(!box)return;box.innerHTML='';q.a.forEach((a,i)=>{const b=document.createElement('button');b.className='answer';b.textContent=String.fromCharCode(65+i)+') '+a;b.onclick=()=>submitAnswer(i,b);box.appendChild(b)});el('qresult').style.display='none'}
    let currentQuestion=null;
    function openQuestion(){if(!battle||!currentQuestion)return;questionOpen=true;el('question')?.classList.add('show');setQuestion(currentQuestion)}
    function submitAnswer(i,button){if(!battle||!currentQuestion)return;[...el('answers').children].forEach(b=>b.disabled=true);socket.emit('battleAnswer',{answer:i});button.classList.add(i===currentQuestion.c?'correct':'wrong');setTimeout(()=>{if(questionOpen){questionOpen=false;el('question')?.classList.remove('show')}},550)}
    window.addEventListener('beforeunload',save);
  }
  install();
})();