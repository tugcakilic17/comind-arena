import { api, escapeHtml as esc } from './api.js';
import { getAuthState, refreshAuth } from './auth.js';
import { baseUrl, prepareImages } from './assets.js';
import { gameAssets, gameSurface, gameSymbol } from './game-ui.js';
import { icon } from './icons.js';
import { symbolPoses, parrots } from './match-rules.js';
import { getSymbolSet } from './symbol-sets.js';
import { gameWorlds, worldBackground } from './game-worlds.js';
import { playerPortraitUrl } from './player-avatar.js';
import { inviteQr } from './invite-qr.js';

let room=null, message='', pending=false, poll, clock, offset=0;
let renderCallback=()=>{}, alive=false, generation=0, lastResponse=0, accountId=null, friendsFetched=0;
let friends={friends:[],incoming:[],outgoing:[],invites:[]}, friendsLoaded=false, tab='create';
let draft={capacity:2,symbolCount:6,winTarget:10,theme:'kofen',roomCode:'',friendCode:''};
let poseKey='', poses=[];
let actionDone=Promise.resolve();
let answerCallback=()=>{};
export const getOnlineRoom=()=>room;
export const waitOnlineIdle=()=>actionDone;
function remember(code) {
  const url=new URL(location.href);
  if (code) url.searchParams.set('room',code); else url.searchParams.delete('room');
  history.replaceState(history.state,'',url);
}
export function clearOnlineInvite() { remember(null); }
export function setOnlineInput(key,value) { if (['roomCode','friendCode'].includes(key)) draft[key]=value; }
export function syncOnlineAuth() {
  if (!alive) return;
  const id=getAuthState().user?.id || null;
  if (id!==accountId) {
    generation++;clearTimeout(poll);accountId=id;room=null;pending=false;message='';
    friends={friends:[],incoming:[],outgoing:[],invites:[]};friendsLoaded=false;friendsFetched=0;
    poll=setTimeout(watch,50);
  }
  renderCallback();
}
export function parseRoomCode(value) {
  const text=String(value || '').trim();
  let result=text;
  if (/^https?:\/\//i.test(text)) {
    try { result=new URL(text).searchParams.get('room') || ''; } catch { result=''; }
  }
  result=result.toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(result)) throw new Error('Geçerli bir davet bağlantısı yapıştır.');
  return result;
}
function accept(data) {
  if (room?.id===data.id && (room.revision || 0)>data.revision) return;
  room=data;offset=data.serverTime-Date.now();lastResponse=Date.now();remember(data.code);
}
async function fetchFriends(version=generation) {
  const data=await api('arena/friends');
  if (version!==generation) return;
  friends=data;friendsLoaded=true;friendsFetched=Date.now();
}
async function watch() {
  if (!alive || !accountId) return;
  const version=generation;
  try {
    if (room && !['finished','cancelled'].includes(room.status)) {
      const data=await api(`arena/rooms/${room.code}`);
      if (version!==generation) return;
      accept(data);
    }
    if (Date.now()-friendsFetched>3000 && room?.status!=='playing') await fetchFriends(version);
    if (version!==generation) return;
    renderCallback();
  } catch (error) {
    if (version!==generation) return;
    if (error.status===401) await refreshAuth();
    else if (error.status===403 && room) { room=null;remember(null);message='Bu odadan ayrıldın.'; }
    else message=error.message;
    renderCallback();
  }
  if (alive && version===generation) poll=setTimeout(watch,room?.status==='playing'?450:1500);
}
export function enterOnline(onChange,onAnswer=()=>{}) {
  answerCallback=onAnswer;
  stopOnline();alive=true;renderCallback=onChange;room=null;message='';pending=false;tab='create';poseKey='';actionDone=Promise.resolve();
  accountId=getAuthState().user?.id || null;friendsLoaded=false;friendsFetched=0;
  friends={friends:[],incoming:[],outgoing:[],invites:[]};
  draft={capacity:2,symbolCount:6,winTarget:10,theme:'kofen',roomCode:new URL(location.href).searchParams.get('room') || '',friendCode:''};
  clock=setInterval(updateOnlineClock,100);poll=setTimeout(watch,100);
}
export function stopOnline() { generation++;alive=false;clearTimeout(poll);clearInterval(clock); }
function inviteUrl() { const url=new URL(baseUrl,location.origin);url.searchParams.set('room',room.code);return url.href; }
export async function onlineAction(action,value) {
  if (action==='tab') { tab=value;message='';renderCallback();return; }
  if (pending) return;
  if (action==='invite') {
    if (!room || ['finished','cancelled'].includes(room.status)) {
      tab='create';message='Davet göndermeden önce oda oluştur.';renderCallback();return;
    }
    if (room.status!=='waiting' || room.players.every(Boolean)) {
      message=room.status==='waiting'?'Odada boş yer kalmadı.':'Oyun başladı. Yeni davet gönderilemez.';renderCallback();return;
    }
  }
  if (action==='option') {
    const [key,raw]=String(value).split(':');
    if ({capacity:[2,3,4],symbolCount:[3,4,5,6,7,8],winTarget:[5,10,15,20]}[key]?.includes(Number(raw))) draft[key]=Number(raw);
    renderCallback();return;
  }
  if (action==='world' && !room && Object.hasOwn(gameWorlds,value)) {
    draft.theme=value;
    document.querySelector('.online-world-picker')?.removeAttribute('open');
    renderCallback();
    document.querySelector('.online-world-picker summary')?.focus({preventScroll:true});
    return;
  }
  if (['copy','copy-player'].includes(action)) {
    try { await navigator.clipboard.writeText(action==='copy-player'?getAuthState().user.publicCode:inviteUrl());message='Kopyalandı!'; }
      catch { message=action==='copy-player'?'Kopyalanamadı. Kullanıcı ID’sini seçip kopyalayabilirsin.':'Kopyalanamadı. Bağlantıyı seçip kopyalayabilirsin.'; }
    renderCallback();return;
  }
  let resolveDone;
  actionDone=new Promise(resolve=>{resolveDone=resolve;});
  generation++;pending=true;message='';clearTimeout(poll);renderCallback();
  const version=generation;
  try {
    let data;
    if (action==='create') {
      data=await api('arena/rooms',{method:'POST',body:{capacity:draft.capacity,symbolCount:draft.symbolCount,winTarget:draft.winTarget,theme:draft.theme}});
      if (version!==generation) return;
      accept(data);tab='lobby';
    }
    if (['join','resume','open','invite-join'].includes(action)) {
      const code=parseRoomCode(value || draft.roomCode);
      // Remember the invitation before sign-in, so Google returns to this room.
      if (!getAuthState().user) { remember(code);renderCallback();return; }
      if (action==='resume') data=await api(`arena/rooms/${code}`);
      else if (action==='open') {
        try { data=await api(`arena/rooms/${code}`); }
        catch (error) { if (error.status!==403) throw error;data=await api(`arena/rooms/${code}/join`,{method:'POST'}); }
      } else data=await api(`arena/rooms/${code}/join`,{method:'POST'});
      tab='lobby';
    }
    else if (action==='ready') {
      const theme=room.options.theme;
      const worldAssets=Object.hasOwn(gameWorlds,theme)
        ? [getSymbolSet(theme).file,worldBackground(theme),worldBackground(theme,true)].map(file=>`${baseUrl}assets/game-ui/${file}`) : [];
      await prepareImages([...gameAssets,...worldAssets]);
      data=await api(`arena/rooms/${room.code}/ready`,{method:'POST'});
    }
    else if (action==='answer') {
      const previousScore=room.scores[room.you];
      data=await api(`arena/rooms/${room.code}/answer`,{method:'POST',body:{round:room.round,symbol:Number(value)}});
      if (version===generation) {
        if (data.scores[data.you]>previousScore) answerCallback(true);
        else if (data.notice==='Tekrar dene!') answerCallback(false);
      }
    }
    else if (action==='leave') {
      if (room) await api(`arena/rooms/${room.code}/leave`,{method:'POST'});
      if (version!==generation) return;
      room=null;tab='create';remember(null);
    }
    else if (action==='new') { room=null;tab='create';remember(null); }
    else if (action==='friend-request') {
      const result=await api('arena/friends/request',{method:'POST',body:{code:draft.friendCode}});
      if (version!==generation) return;
      draft.friendCode='';message=result.message;await fetchFriends(version);
    }
    else if (['friend-accept','friend-reject','friend-remove'].includes(action)) {
      const result=await api(`arena/friends/${value}/${action.slice(7)}`,{method:'POST'});
      if (version!==generation) return;
      message=result.message;await fetchFriends(version);
    }
    else if (action==='invite') {
      if (version!==generation) return;
      const result=await api(`arena/friends/${value}/invite`,{method:'POST',body:{roomCode:room.code}});
      if (version!==generation) return;
      message=result.message;tab='friends';await fetchFriends(version);
    }
    else if (action==='invite-decline') {
      const result=await api(`arena/invites/${value}/decline`,{method:'POST'});
      if (version!==generation) return;
      message=result.message;await fetchFriends(version);
    }
    if (version!==generation) return;
    if (data) { accept(data);if (data.notice && action!=='answer') message=data.notice; }
  } catch (error) {
    if (version===generation) { message=error.message;if (error.status===401) await refreshAuth(); }
  } finally {
    if (version===generation) { pending=false;renderCallback();poll=setTimeout(watch,100); }
    resolveDone();
  }
}
const face=(player,cheer=false)=>`<span class="online-face" aria-hidden="true"><img src="${playerPortraitUrl(cheer?'cheer':'idle',player?.avatar)}" alt="" draggable="false" /></span>`;
function button(action,label,value='',className='',disabled=false) {
  const names={'copy':'Davet bağlantısını kopyala','copy-player':'Kullanıcı ID’sini kopyala','confirm-leave':'Maçtan ayrıl','home':'Ana ekran'};
  return `<button type="button" class="${className}" data-action="online-${action}" data-value="${esc(value)}" ${names[action]?`aria-label="${names[action]}"`:''} ${pending||disabled?'disabled':''}>${label}</button>`;
}
function choices(key,title,values,hint='') {
  return `<fieldset class="online-choice"><legend>${title}</legend><div class="online-choice-options">${values.map(n=>`<button type="button" data-action="online-option" data-value="${key}:${n}" aria-label="${title}: ${n}" aria-pressed="${draft[key]===n}">${n}</button>`).join('')}</div>${hint?`<small>${hint}</small>`:''}</fieldset>`;
}
function createView() {
  return `<div class="online-create-grid"><div class="online-box online-setup"><div class="online-world-heading"><span>Oyun dünyası</span>${worldPicker()}</div>${choices('capacity','Oyuncu sayısı',[2,3,4])}${choices('winTarget','Kazanmak için doğru sayısı',[5,10,15,20])}${choices('symbolCount','Altıgendeki simge sayısı',[3,4,5,6,7,8])}${button('create',`${icon('play')} Oda oluştur`,'','online-primary')}</div><aside class="online-box online-join-card"><h2>Davetin mi var?</h2>${joinForm()}</aside></div>`;
}
function worldPicker() {
  const selected=parrots[draft.theme];
  return `<details class="online-world-picker"><summary aria-label="Oyun dünyası: ${selected.name}"><img src="${baseUrl}assets/characters/${selected.image}" alt="" draggable="false" /><span>${selected.name}</span><svg class="online-world-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></summary><div class="online-world-menu" role="group" aria-label="Oyun dünyası seç"><strong>Oyun dünyası</strong><div>${Object.entries(gameWorlds).map(([key,world])=>`<button type="button" data-action="online-world" data-value="${key}" aria-label="${parrots[key].name} · ${world.name}" aria-pressed="${draft.theme===key}"><img src="${baseUrl}assets/characters/${parrots[key].image}" alt="" draggable="false" /><span>${parrots[key].name}<small>${world.name}</small></span></button>`).join('')}</div></div></details>`;
}
function joinForm() {
  return `<form data-online-form="join" class="online-join-form"><label for="room-code">Davet bağlantısı</label><input id="room-code" data-online-field="roomCode" value="${esc(draft.roomCode)}" maxlength="512" placeholder="Arkadaşının bağlantısını yapıştır" autocomplete="off" spellcheck="false" /><button type="submit" class="online-primary" ${pending?'disabled':''}>${icon('link')} Odaya katıl</button></form>`;
}
function lobbyView() {
  const url=inviteUrl(),count=room.players.filter(Boolean).length;
  const theme=room.options.theme;
  const worldBadge=Object.hasOwn(gameWorlds,theme)?`<span class="online-world-badge"><img src="${baseUrl}assets/characters/${parrots[theme].image}" alt="" />${parrots[theme].name} · ${gameWorlds[theme].name}</span>`:'';
  const share=`https://wa.me/?text=${encodeURIComponent(`6gen’de birlikte oynayalım!\n${url}`)}`;
  const qr=`<figure class="online-invite-qr">${inviteQr(url)}<figcaption>QR kodu okut</figcaption></figure>`;
  return `<div class="online-lobby-grid"><div class="online-box"><div class="online-room-title"><h2>Odan hazır!</h2><span>${count} / ${room.options.capacity} oyuncu</span></div><div class="online-room-rules"><span>İlk ${room.options.winTarget} doğru</span><span>${room.options.symbolCount} simge</span>${worldBadge}</div><div class="online-seats" style="--seats:${room.options.capacity}">${room.players.map((player,i)=>`<div class="online-seat ${player?'is-occupied':''}">${player?`${face(player,room.ready[i])}<strong>${esc(player.name)}${i===room.you?' (Sen)':''}</strong><small>${i===0?'Oda sahibi · ':''}${room.ready[i]?'Hazır!':'Hazırlanıyor'}</small>`:`<span class="online-empty-seat">${icon('user')}</span><strong>Arkadaşın için</strong><small>Yer ayrıldı</small>`}</div>`).join('')}</div><p class="online-lobby-help">${count<room.options.capacity?'Arkadaşların katılsın; herkes hazır olunca başlayacağız.':'Herkes “Hazırım” dediğinde oyun başlayacak.'}</p><div class="online-lobby-actions">${button('ready',room.ready[room.you]?`${icon('check')} Hazırsın!`:'Hazırım, başlayalım','','online-primary',room.ready[room.you])}${button('leave','Odadan ayrıl','','online-text')}</div></div><aside class="online-box online-share-box"><h2>Davetini paylaş</h2><div class="online-share-body">${qr}<div class="online-share-actions"><label for="invite-link">Davet bağlantın</label><div class="online-link-row"><input id="invite-link" value="${esc(url)}" readonly aria-label="Davet bağlantısı" />${button('copy',icon('copy'),'','online-icon-button')}</div><a class="online-whatsapp online-primary" href="${esc(share)}" target="_blank" rel="noopener noreferrer">${whatsappIcon()} WhatsApp ile paylaş</a>${button('tab',`${icon('user')} Arkadaş listemden davet et`,'friends','online-primary')}</div></div></aside></div>`;
}
const whatsappIcon=()=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3.5A11.7 11.7 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.5-1.7a12 12 0 0 0 5.6 1.4A11.8 11.8 0 0 0 24 11.8c0-3.1-1.2-6.1-3.5-8.3ZM12.1 21.7a10 10 0 0 1-5-1.4l-.4-.2-3.9 1 1-3.8-.2-.4A9.8 9.8 0 1 1 12 21.7Zm5.4-7.4c-.3-.1-1.8-.9-2.1-1s-.5-.1-.7.2l-1 1.2c-.1.2-.3.2-.6.1-1.8-.9-3-2.3-3.3-2.7-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6L9.7 7.4c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.8.4S6.6 8.5 6.6 10s1.1 3 1.3 3.2c.1.2 2.2 3.4 5.4 4.8 2 .8 2.7.9 3.7.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4l-1.1-1.2Z"/></svg>`;
function friendsView() {
  const user=getAuthState().user;
  const row=(player,actions,detail)=>`<li class="online-friend-row">${face(player)}<span><strong>${esc(player.name)}</strong><small>${esc(detail || player.publicCode)}</small></span><div class="online-friend-actions">${actions}</div></li>`;
  const invitations=friends.invites.filter(i=>!i.sent);
  const hasRoom=room && !['finished','cancelled'].includes(room.status);
  const canInvite=room?.status==='waiting' && room.players.some(player=>!player);
  return `<div class="online-friends-grid"><aside class="online-box online-add-friend"><h2>Arkadaş ekle</h2><form data-online-form="friend-request"><label for="friend-code">Arkadaşının kullanıcı ID’si</label><input id="friend-code" data-online-field="friendCode" value="${esc(draft.friendCode)}" maxlength="8" placeholder="ABCD1234" autocomplete="off" autocapitalize="characters" spellcheck="false" /><button class="online-primary" type="submit" ${pending?'disabled':''}>${icon('user')} İstek gönder</button></form><div class="online-own-code"><small>Senin kullanıcı ID’n</small><div><strong>${esc(user.publicCode)}</strong>${button('copy-player',icon('copy'),'','online-icon-button')}</div></div></aside><div class="online-box online-friend-list">${!friendsLoaded?'<p>Arkadaşların yükleniyor…</p>':''}${invitations.length?`<section><h2>Oyun davetleri <span>${invitations.length}</span></h2><ul>${invitations.map(i=>row(i.player,`${button('invite-join','Katıl',i.code,'online-small',Boolean(room&&['waiting','playing'].includes(room.status)&&room.code!==i.code))}${button('invite-decline','Kapat',i.id,'online-text')}`,`${i.options?.capacity || 2} kişi · İlk ${i.options?.winTarget || 10} doğru`)).join('')}</ul>${room&&['waiting','playing'].includes(room.status)?'<small>Başka bir davete katılmak için önce açık odandan ayrıl.</small>':''}</section>`:''}${friends.incoming.length?`<section><h2>Gelen istekler <span>${friends.incoming.length}</span></h2><ul>${friends.incoming.map(p=>row(p,`${button('friend-accept','Kabul et',p.id,'online-small')}${button('friend-reject','Reddet',p.id,'online-text')}`)).join('')}</ul></section>`:''}<section><h2>Arkadaşlarım <span>${friends.friends.length}</span></h2>${friends.friends.length?`<ul>${friends.friends.map(p=>{
    const inRoom=room?.players.some(player=>player?.id===p.id),sent=friends.invites.some(i=>i.sent&&i.player.id===p.id&&i.code===room?.code);
    const invite=hasRoom?button('invite',inRoom?'Odada':!canInvite?(room.status==='waiting'?'Oda dolu':'Oyun başladı'):sent?'Davet edildi':'Davet et',p.id,'online-small',!canInvite||inRoom||sent):'';
    return row(p,`${invite}${button('friend-remove','Kaldır',p.id,'online-text')}`);
  }).join('')}</ul>`:`<p class="online-empty">Henüz arkadaşın yok.<br />Bir kullanıcı ID’siyle ilk isteğini gönder!</p>`}</section>${friends.outgoing.length?`<section><h2>Gönderilen istekler</h2><ul>${friends.outgoing.map(p=>row(p,button('friend-reject','Geri çek',p.id,'online-text'),'Yanıt bekleniyor')).join('')}</ul></section>`:''}</div></div>`;
}
function card(ids,index) {
  const set=getSymbolSet(room.options.theme);
  return `<div class="player-card"><div class="hex-card ${index?'opponent-hex':'player-hex'}"><span class="card-owner">${index?'Eşini bul':'Buradan seç'}</span><div class="hex-turntable"><img class="hex-art" src="${baseUrl}assets/game-ui/${index?'card-mint-paired-v21':'card-lavender-leafy-v21'}.webp" alt="" /><div class="card-symbols">${ids.map((id,i)=>{
    const p=poses[index][i];return `<button type="button" class="symbol scattered-symbol" style="left:${p.x.toFixed(3)}%;top:${p.y.toFixed(3)}%;width:${p.width.toFixed(3)}%;height:${p.height.toFixed(3)}%;--tilt:${p.angle}deg;--size:${p.size.toFixed(3)}" data-action="online-answer" data-symbol="${id}" aria-label="${esc(set.names[id])}${index?'':' simgesini seç'}" ${index?'disabled':''}>${gameSymbol(id,true,set.key)}</button>`;
  }).join('')}</div></div></div></div>`;
}
function scoreList(final=false) {
  const players=room.players.map((player,i)=>({player,i})).filter(({player})=>player);
  if (final) players.sort((a,b)=>room.placements?room.placements[a.i]-room.placements[b.i]:room.scores[b.i]-room.scores[a.i]);
  return `<ol class="online-scores ${final?'is-final':''}" aria-label="${final?'Maç sonuçları':'Oyuncu skorları'}">${players.map(({player,i})=>`<li class="${i===room.you?'is-you':''} ${room.departed[i]?'has-left':''} ${room.winner===i?'is-winner':''}">${face(player,final&&room.winner===i)}<span><strong>${esc(player.name)}${i===room.you?' (Sen)':''}</strong><small>${room.departed[i]?'Ayrıldı':room.winner===i?'Kazanan':final?`${room.scores[i]} doğru eşleşme`:`${room.options.winTarget} doğruya ulaş`}</small>${final?`<small class="online-ranking-points" data-points="${room.points?.[i] || 0}">Liderlik puanı: ${(room.points?.[i] || 0)>0?'+':''}${room.points?.[i] || 0}</small>`:''}</span><b>${room.scores[i]}${final?'<small>skor</small>':''}</b></li>`).join('')}</ol>`;
}
export function onlineView() {
  const user=getAuthState().user;
  const note=`<p class="online-status" role="status" aria-live="polite">${esc(message)}</p>`;
  const home=button('home',`${icon('homeSolid')} <span>Ana ekran</span>`,'','online-text');
  if (!user) return `<section class="online-shell"><div class="online-panel online-login">${gameSurface('resultPanel')}<img class="online-welcome-bird" src="${playerPortraitUrl('cheer')}" alt="" /><h1>Arkadaşlarınla buluş!</h1><p>Oda oluşturmak, bir davete katılmak ve arkadaşlarını eklemek için hesabını aç.</p><button class="online-primary" data-action="google-signin">Google ile devam et</button>${note}${home}</div></section>`;
  if (room && ['finished','cancelled'].includes(room.status)) {
    const title=room.status==='cancelled'?'Oda kapandı':room.winner===null?'Dostluk kazandı!':room.winner===room.you?'Sen kazandın!':`${esc(room.players[room.winner]?.name || 'Arkadaşın')} kazandı!`;
    const celebrating=room.status==='finished';
    const winner=room.players[room.winner] || room.players[room.you];
    const confetti=celebrating?`<div class="online-confetti" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--x:${5+(i*37)%90}%;--delay:${(i%6)*.09}s;--drift:${((i*29)%100)-50}px;--turn:${i%2?360:-320}deg;--confetti-color:${['#efbd65','#a9ce75','#ac94d7','#79cbdc','#f0a191'][i%5]}"></i>`).join('')}</div>`:'';
    return `<section class="online-shell online-result-shell">${confetti}<div class="online-panel online-result ${celebrating?'is-celebrating':''}">${celebrating?`<div class="online-result-bird" aria-hidden="true"><img src="${playerPortraitUrl('cheer',winner?.avatar)}" alt="" draggable="false" /></div>`:''}${gameSurface('resultPanel')}<h1 tabindex="-1">${title}</h1>${room.status==='cancelled'?'<p>Yeni bir odada yeniden buluşabilirsiniz.</p>':''}${scoreList(true)}${button('new','Yeniden birlikte oynayalım','','online-primary')}${note}${home}</div></section>`;
  }
  if (room?.status==='playing') {
    const set=getSymbolSet(room.options.theme);
    const key=`${room.id}:${set.key}:${room.round}`;
    if (poseKey!==key) { poseKey=key;poses=room.pair.map(ids=>symbolPoses(ids.length,Math.random,ids.map(id=>[...set.rects[id],set.outlines[id]]))); }
    return `<section class="game-stage illustrated-game online-game" aria-label="Arkadaş maçı"><div class="online-game-toolbar">${button('confirm-leave',icon('homeSolid'),'','round-control')}${scoreList()}<span id="online-timer" aria-label="Geçen süre"></span></div><div class="play-panel"><h2 class="board-title"><span class="sr-only">Ortak simgeyi bul!</span><img src="${baseUrl}assets/game-ui/title-find-leafy-v17.webp" alt="" draggable="false" /></h2><div id="online-board" class="game-cards online-cards" data-round="${room.round}">${card(room.pair[0],0)}${card(room.pair[1],1)}</div><p class="online-countdown" role="status"></p>${note}<span class="online-progress">Eşleşme ${room.round} · ${room.options.symbolCount} simge</span></div></section>`;
  }
  const badge=friends.incoming.length+friends.invites.filter(i=>!i.sent).length;
  const active=room&&tab!=='friends'?'lobby':tab==='friends'?'friends':'create';
  return `<section class="online-shell"><div class="online-panel online-hub" aria-busy="${pending}">${gameSurface('resultPanel')}<img class="online-peeker" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" draggable="false" aria-hidden="true" /><header class="online-heading"><h1>Arkadaşını çağır</h1>${home}</header><nav class="online-tabs" aria-label="Arkadaş maçı">${(room?[['lobby','Odam'],['friends','Arkadaşlarım']]:[['create','Oda oluştur'],['friends','Arkadaşlarım']]).map(([key,label])=>`<button type="button" data-action="online-tab" data-value="${key}" aria-pressed="${active===key}">${label}${key==='friends'&&badge?`<span class="online-badge">${badge}</span>`:''}</button>`).join('')}</nav><div class="online-tab-content" data-tab="${active}">${active==='friends'?friendsView():room?lobbyView():createView()}</div>${note}</div></section>`;
}
export function updateOnlineClock() {
  if (!room || room.status!=='playing') return;
  const time=Date.now()+offset,wait=Math.max(0,Math.ceil((room.turnAt+180-time)/1000)),stale=Date.now()-lastResponse>5000;
  const timer=document.querySelector('#online-timer');
  if (timer) timer.textContent=`${Math.max(0,Math.floor((time-room.startsAt)/1000))} sn`;
  const board=document.querySelector('#online-board');
  if (board) board.inert=wait>0||pending||stale||room.departed[room.you];
  const caption=document.querySelector('.online-countdown');
  if (caption) caption.textContent=stale?'Bağlantı bekleniyor…':room.departed[room.you]?'Bu maçtan ayrıldın.':wait>0 && room.round===1?`Başlıyoruz · ${wait}`:'';
}
