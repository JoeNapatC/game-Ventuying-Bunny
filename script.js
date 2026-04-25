/* ===== CARD DEFINITIONS ===== */
const CARDS = [
  { id: 'bunny1', name: 'กระต่ายเดิน', emoji: '🐰', nuggets: 1, type: 'bunny', scene: 'standing', label: 'เดิน ×1', weight: 11 },
  { id: 'bunny2', name: 'กระต่ายนั่ง', emoji: '🐰', nuggets: 2, type: 'bunny', scene: 'sitting', label: 'นั่ง ×2', weight: 3 },
  { id: 'bunny3', name: 'กระต่ายวิ่ง', emoji: '🐰', nuggets: 3, type: 'bunny', scene: 'running', label: 'วิ่ง ×3', weight: 3 },
  { id: 'carrot', name: 'แครอท!', emoji: '🥕', nuggets: 0, type: 'carrot', scene: 'carrot', label: 'CLICK!', weight: 4 },
];

/* Weighted random: total = 21 (11 + 3 + 3 + 4) */
function pickWeightedCard() {
  const total = CARDS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const card of CARDS) {
    r -= card.weight;
    if (r <= 0) return card;
  }
  return CARDS[0];
}

/* ===== STATE ===== */
const state = {
  players: [],
  currentPlayerIndex: 0,
  turnCount: 0,
  isSpinning: false,
  resultShowing: false,
  sessionId: Date.now().toString(36),
};

/* ===== DOM ===== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const el = {
  setupScreen: $('#setup-screen'),
  gameScreen: $('#game-screen'),
  countDisplay: $('#player-count-display'),
  btnDec: $('#btn-decrease'),
  btnInc: $('#btn-increase'),
  namesContainer: $('#player-names-container'),
  btnStart: $('#btn-start-game'),
  curPlayer: $('#current-player-name'),
  turnDots: $('#turn-dots'),
  card: $('#main-card'),
  cardFront: $('#card-front'),
  cardArt: $('#card-art'),
  cardName: $('#card-name'),
  cardNuggets: $('#card-nuggets'),
  shuffleOverlay: $('#shuffle-overlay'),
  shuffleCards: $('#shuffle-cards'),
  btnSpin: $('#btn-spin'),
  playersBar: $('#players-bar'),
  btnShowLog: $('#btn-show-log'),
  btnReset: $('#btn-reset-game'),
  logModal: $('#log-modal'),
  btnCloseLog: $('#btn-close-log'),
  logList: $('#log-list'),
  btnClearLog: $('#btn-clear-log'),
  btnExportLog: $('#btn-export-log'),
  resultPopup: $('#result-popup'),
  resultEmoji: $('#result-emoji'),
  resultText: $('#result-text'),
  resultPlayer: $('#result-player'),
  canvas: $('#particles-canvas'),
};

/* ===== PARTICLES ===== */
function initParticles() {
  const c = el.canvas, ctx = c.getContext('2d');
  const ps = [];
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const cols = ['#7c3aed','#a78bfa','#fbbf24','#f472b6','#34d399'];
  for (let i = 0; i < 45; i++) {
    ps.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*2.5+1, dx: (Math.random()-.5)*.4, dy: (Math.random()-.5)*.4, a: Math.random()*.35+.1, col: cols[~~(Math.random()*5)] });
  }
  (function loop() {
    ctx.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > c.width) p.dx *= -1;
      if (p.y < 0 || p.y > c.height) p.dy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.col; ctx.globalAlpha = p.a; ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();
}

/* ===== SETUP ===== */
let playerCount = 2;
const EMOJIS = ['🐰','🐻','🦊','🐱','🐶','🐸','🐧','🦁'];

function renderInputs() {
  el.namesContainer.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const row = document.createElement('div');
    row.className = 'player-input-row';
    row.innerHTML = `<span class="player-number">${EMOJIS[i]||'🎮'}</span><input type="text" id="pn-${i}" placeholder="ชื่อผู้เล่น ${i+1}" maxlength="20" autocomplete="off">`;
    el.namesContainer.appendChild(row);
  }
}

el.btnDec.onclick = () => { if (playerCount > 2) { playerCount--; el.countDisplay.textContent = playerCount; renderInputs(); }};
el.btnInc.onclick = () => { if (playerCount < 8) { playerCount++; el.countDisplay.textContent = playerCount; renderInputs(); }};

el.btnStart.onclick = () => {
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const name = $(`#pn-${i}`).value.trim() || `ผู้เล่น ${i+1}`;
    players.push({ name, score: 0, emoji: EMOJIS[i]||'🎮' });
  }
  state.players = players;
  state.currentPlayerIndex = 0;
  state.turnCount = 0;
  state.sessionId = Date.now().toString(36);
  logEvent('game_start', { players: players.map(p => p.name) });
  el.setupScreen.classList.remove('active');
  el.gameScreen.classList.add('active');
  renderBar(); updatePlayer(); resetCard();
};

/* ===== GAME UI ===== */
function renderBar() {
  el.playersBar.innerHTML = '';
  state.players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'player-pill' + (i === state.currentPlayerIndex ? ' active-player' : '');
    d.innerHTML = `<span>${p.emoji}</span><span class="player-pill-name">${p.name}</span><span class="player-pill-score">${p.score}</span>`;
    el.playersBar.appendChild(d);
  });
}

function updatePlayer() {
  const p = state.players[state.currentPlayerIndex];
  el.curPlayer.textContent = `${p.emoji} ${p.name}`;
  el.turnDots.innerHTML = '';
  state.players.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'turn-dot' + (i === state.currentPlayerIndex ? ' active' : '');
    el.turnDots.appendChild(d);
  });
  $$('.player-pill').forEach((pill, i) => pill.classList.toggle('active-player', i === state.currentPlayerIndex));
}

function resetCard() {
  el.card.classList.remove('flipped', 'revealed');
  el.cardFront.classList.remove('carrot-card');
}

/* ===== BUILD CARD SCENE (CSS-only) ===== */
function buildScene(card) {
  let html = '<div class="scene">';
  if (card.type === 'carrot') {
    html += '<div class="scene-sky" style="bottom:0;background:linear-gradient(180deg,#fff9e6,#fff3cd)"></div>';
    html += `<div class="scene-char carrot-char">${card.emoji}</div>`;
  } else {
    html += '<div class="scene-sky"><div class="scene-cloud c1"></div><div class="scene-cloud c2"></div></div>';
    html += '<div class="scene-ground"></div>';
    if (card.scene === 'running') {
      html += '<div class="speed-line" style="top:40%;left:8%;width:28px"></div>';
      html += '<div class="speed-line" style="top:55%;left:12%;width:18px"></div>';
      html += '<div class="speed-line" style="top:68%;left:5%;width:24px"></div>';
    }
    html += `<div class="scene-char ${card.scene}">${card.emoji}</div>`;
  }
  html += '</div>';
  return html;
}

function setCardContent(card) {
  el.cardArt.innerHTML = buildScene(card);
  el.cardName.textContent = card.name;
  el.cardNuggets.innerHTML = '';
  if (card.type === 'carrot') {
    el.cardFront.classList.add('carrot-card');
    el.cardNuggets.innerHTML = '<span style="font-size:18px;color:#c2410c;font-weight:700">🥕 CLICK!</span>';
  } else {
    el.cardFront.classList.remove('carrot-card');
    for (let i = 0; i < card.nuggets; i++) {
      const n = document.createElement('div');
      n.className = 'nugget';
      el.cardNuggets.appendChild(n);
    }
  }
}

/* ===== SHUFFLE CARDS (generated) ===== */
function buildShuffleCards() {
  el.shuffleCards.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const d = document.createElement('div');
    d.className = `shuffle-card sc-${i}`;
    d.innerHTML = '<span class="sc-q">?</span>';
    el.shuffleCards.appendChild(d);
  }
}

/* ===== SPIN ===== */
el.btnSpin.onclick = handleSpinClick;

function handleSpinClick() {
  // If result is showing, dismiss it and advance turn
  if (state.resultShowing) {
    dismissResult();
    return;
  }
  startSpin();
}

function startSpin() {
  if (state.isSpinning) return;
  state.isSpinning = true;
  el.btnSpin.disabled = true;
  resetCard();

  // Phase 1: shuffle
  el.card.style.visibility = 'hidden';
  buildShuffleCards();
  el.shuffleOverlay.classList.remove('hidden');
  el.shuffleCards.classList.add('shuffling');
  el.shuffleCards.classList.remove('gathering');

  // Phase 2: gather
  setTimeout(() => {
    el.shuffleCards.classList.remove('shuffling');
    el.shuffleCards.classList.add('gathering');

    // Phase 3: flip
    setTimeout(() => {
      el.shuffleOverlay.classList.add('hidden');
      el.card.style.visibility = 'visible';
      const card = pickWeightedCard();
      setCardContent(card);
      el.card.classList.add('flipped');

      // Phase 4: result — stays on screen until user taps
      setTimeout(() => {
        el.card.classList.add('revealed');
        showResult(card);
        confetti();

        const cur = state.players[state.currentPlayerIndex];
        cur.score += card.nuggets;
        state.turnCount++;

        logEvent('spin', {
          player: cur.name,
          card: card.name,
          nuggets: card.nuggets,
          cardType: card.type,
          turn: state.turnCount,
        });

        renderBar();

        // Card stays visible — user clicks popup or button to advance
        state.isSpinning = false;
        state.resultShowing = true;
        el.btnSpin.disabled = false;
        el.btnSpin.querySelector('.spin-text').textContent = 'ถัดไป ▶';
      }, 900);
    }, 600);
  }, 1500);
}

function showResult(card) {
  el.resultEmoji.textContent = card.emoji;
  el.resultText.textContent = card.name;
  const p = state.players[state.currentPlayerIndex];
  el.resultPlayer.textContent = card.nuggets > 0
    ? `${p.name} ได้ ${card.nuggets} แต้ม!`
    : `${p.name} จับได้แครอท!`;
  el.resultPopup.classList.remove('hidden');
  // Click/tap popup to dismiss
  el.resultPopup.onclick = dismissResult;
}

function dismissResult() {
  el.resultPopup.classList.add('hidden');
  el.resultPopup.onclick = null;
  state.resultShowing = false;
  // Card stays flipped until next spin — don't resetCard() here
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  updatePlayer();
  el.btnSpin.querySelector('.spin-text').textContent = 'สุ่มการ์ด!';
}

/* ===== CONFETTI ===== */
function confetti() {
  const cols = ['#fbbf24','#f472b6','#7c3aed','#34d399','#fb923c','#ef4444','#3b82f6'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = Math.random()*100+'vw';
    p.style.top = '-10px';
    p.style.background = cols[~~(Math.random()*cols.length)];
    p.style.borderRadius = Math.random()>.5 ? '50%' : '2px';
    p.style.width = (Math.random()*8+6)+'px';
    p.style.height = (Math.random()*8+6)+'px';
    p.style.animationDuration = (Math.random()+1)+'s';
    p.style.animationDelay = (Math.random()*.5)+'s';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2500);
  }
}

/* ===== LOCAL STORAGE LOG ===== */
const LOG_KEY = 'ventuying_bunny_log';

function logEvent(type, data) {
  const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  logs.push({ timestamp: new Date().toISOString(), sessionId: state.sessionId, type, ...data });
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

function getLogs() { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }

function renderLogs() {
  const logs = getLogs().filter(l => l.type === 'spin').reverse();
  if (!logs.length) { el.logList.innerHTML = '<div class="log-empty">📭 ยังไม่มีประวัติ</div>'; return; }
  el.logList.innerHTML = logs.map(l => {
    const t = new Date(l.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
    const e = l.cardType === 'carrot' ? '🥕' : '🐰';
    return `<div class="log-item"><span class="log-turn">#${l.turn}</span><span class="log-player">${l.player}</span><span class="log-card">${e} ${l.card}${l.nuggets>0?' (+'+l.nuggets+')':''}</span><span class="log-time">${t}</span></div>`;
  }).join('');
}

/* ===== EVENT LISTENERS ===== */
el.btnShowLog.onclick = () => { renderLogs(); el.logModal.classList.remove('hidden'); };
el.btnCloseLog.onclick = () => el.logModal.classList.add('hidden');
el.logModal.onclick = (e) => { if (e.target === el.logModal) el.logModal.classList.add('hidden'); };
el.btnClearLog.onclick = () => { if (confirm('ล้างประวัติทั้งหมด?')) { localStorage.removeItem(LOG_KEY); renderLogs(); }};
el.btnExportLog.onclick = () => {
  const blob = new Blob([JSON.stringify(getLogs(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ventuying_log_${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
};
/* ===== CONFIRM MODAL ===== */
const confirmModal = $('#confirm-modal');
const btnConfirmYes = $('#btn-confirm-yes');
const btnConfirmNo = $('#btn-confirm-no');

el.btnReset.onclick = () => {
  confirmModal.classList.remove('hidden');
};

btnConfirmNo.onclick = () => {
  confirmModal.classList.add('hidden');
};

confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) confirmModal.classList.add('hidden');
});

btnConfirmYes.onclick = () => {
  confirmModal.classList.add('hidden');
  // Hide any active overlays
  el.resultPopup.classList.add('hidden');
  el.resultPopup.onclick = null;
  el.logModal.classList.add('hidden');
  el.shuffleOverlay.classList.add('hidden');
  // Reset all state
  state.isSpinning = false;
  state.resultShowing = false;
  state.turnCount = 0;
  state.currentPlayerIndex = 0;
  el.btnSpin.disabled = false;
  el.btnSpin.querySelector('.spin-text').textContent = 'สุ่มการ์ด!';
  el.card.style.visibility = 'visible';
  el.card.classList.remove('flipped', 'revealed');
  el.cardFront.classList.remove('carrot-card');
  // Switch to setup screen
  el.gameScreen.classList.remove('active');
  el.setupScreen.classList.add('active');
};

/* ===== INIT ===== */
renderInputs();
initParticles();
