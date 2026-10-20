/* ============ Quran Offline — app ============ */
'use strict';
const Q = window.QURAN;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $('#view');

/* ---------- penyimpanan lokal ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* mode privat */ } },
};
const DEF = { trans: 'k', reciter: 'ar.alafasy', theme: 'auto', arSize: 2.05, next: true, arFont: 'amiri' };
const st = Object.assign({}, DEF, store.get('st', {}));
let marks = store.get('marks', []);   // [{s,n}]
let last = store.get('last', null);   // {s,n}

/* ---------- helper ---------- */
const RECITERS = { 'ar.alafasy': 'Mishary Alafasy', 'ar.husary': 'M. Khalil Al-Husary', 'ar.mahermuaiqly': 'Maher Al Muaiqly' };
const TRANSL = { n: 'Tanpa terjemahan', k: 'Kemenag RI', s: 'Tafsir Assaibiq', b: 'Keduanya' };
const FONTS = { amiri: 'Amiri Quran', sakkal: 'Sakkal Majalla' };
const $surah = n => Q.s[n - 1];
const $g = (n, v) => $surah(n).f + v - 1;                    // global nomor ayat
const $ref = g => {                                          // global → {s,v}
  let lo = 0, hi = Q.s.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; Q.s[m].f <= g ? lo = m : hi = m - 1; }
  return { s: Q.s[lo].n, v: g - Q.s[lo].f + 1 };
};
const revName = r => r ? 'Madaniyah' : 'Makkiyah';
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $text = g => Q.v[g - 1];                               // [ar, kemenag, assaibiq]
const trOf = (g, i = st.trans === 's' ? 2 : 1) => $text(g)[i];
function translations(g) {
  if (st.trans === 'n') return '';
  const [, k, s] = $text(g);
  if (st.trans === 'b') return `<div class="tr">${esc(k)}</div><div class="tr alt">${esc(s)}</div>`;
  return `<div class="tr">${esc(st.trans === 's' ? s : k)}</div>`;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove('show'), 2600);
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); }
  catch {
    const ta = document.createElement('textarea'); ta.value = txt;
    ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch { } ta.remove();
  }
}
const saveMarks = () => store.set('marks', marks);
const isMarked = (s, n) => marks.some(m => m.s === s && m.n === n);
function toggleMark(s, n) {
  isMarked(s, n) ? marks = marks.filter(m => !(m.s === s && m.n === n)) : marks.push({ s, n });
  marks.sort((a, b) => (a.s - b.s) || (a.n - b.n)); saveMarks(); paintBadge();
}
function paintBadge() {
  const b = $('#mark-badge'); b.textContent = marks.length; b.classList.toggle('hide', !marks.length);
}

/* ---------- tema & ukuran font ---------- */
const mqDark = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => st.theme === 'dark' || (st.theme === 'auto' && mqDark.matches);
function applyTheme() { document.documentElement.dataset.theme = isDark() ? 'd' : 'l'; }
function applyArSize() { document.documentElement.style.setProperty('--ar', st.arSize + 'rem'); }
function applyArFont() { document.documentElement.dataset.arfont = st.arFont === 'sakkal' ? 'sakkal' : 'amiri'; }
mqDark.addEventListener('change', () => st.theme === 'auto' && applyTheme());

/* ---------- ikon ---------- */
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  num: '<svg viewBox="0 0 40 40"><path d="M20 2.8l4.4 3.4 5.6-.7 1.5 5.4 4.6 3.3-2.5 5.1 2.5 5.1-4.6 3.3-1.5 5.4-5.6-.7-4.4 3.4-4.4-3.4-5.6.7-1.5-5.4L4.9 24l2.5-5.1-2.5-5.1 4.6-3.3 1.5-5.4 5.6.7z"/></svg>',
};

/* ================= ROUTER ================= */
function route() {
  const seg = location.hash.replace(/^#\//, '').split('/');
  let r = { v: 'home' };
  if (seg[0] === 's' && seg[1]) r = { v: 'surah', n: +seg[1], a: +seg[2] || 0 };
  else if (seg[0] === 'q') r = { v: 'search', q: seg.slice(1).join('/') ? decodeURIComponent(seg.slice(1).join('/')) : '' };
  else if (seg[0] === 'b') r = { v: 'marks' };
  else if (seg[0] === 't') r = { v: 'settings' };
  render(r);
}
addEventListener('hashchange', route);

function render(r) {
  stopAudio();
  $$('.bottomnav a').forEach(a => a.classList.toggle('on', a.dataset.nav === r.v));
  if (r.v === 'home') view.innerHTML = tplHome();
  else if (r.v === 'surah') view.innerHTML = tplSurah(r.n, r.a);
  else if (r.v === 'search') { view.innerHTML = tplSearch(r.q); initSearch(r.q); }
  else if (r.v === 'marks') view.innerHTML = tplMarks();
  else { view.innerHTML = tplSettings(); storageInfo().then(t => { const el = $('#st-storage'); if (el) el.textContent = t; }); }
  if (r.v === 'surah' && r.a > 0) {
    const el = document.getElementById('a' + $g(r.n, r.a));
    if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'center' }); }
  } else window.scrollTo(0, 0);
}

/* ================= HOME ================= */
function tplHome() {
  let cont = '';
  if (last && $surah(last.s)) {
    const s = $surah(last.s);
    cont = `<a class="continue" href="#/s/${last.s}/${last.n}">
      <div><div class="big">Lanjutkan · ${esc(s.l)} ${last.n}</div>
      <div class="snip">${esc(trOf($g(last.s, last.n)))}</div></div>
      <div class="arrow">›</div></a>`;
  }
  const rows = Q.s.map(s => `<a class="srow" href="#/s/${s.n}">
      <span class="snum">${ICON.num}<b>${s.n}</b></span>
      <span class="sinfo"><span class="slat">${esc(s.l)}</span>
        <span class="smean">${esc(s.m)} · ${revName(s.r)} · ${s.c} ayat</span></span>
      <span class="sar">${esc(s.a)}</span></a>`).join('');
  return `
  ${cont}
  <form class="search" action="#/q/" id="f-home">
    ${ICON.search}<input name="q" placeholder="Cari ayat / kata kunci…" aria-label="Cari">
  </form>
  <h1 class="page">Daftar Surah <span class="sub">— 114 surah, 6.236 ayat</span></h1>
  ${rows}`;
}

/* ================= SURAH ================= */
function tplSurah(n) {
  const s = $surah(n);
  if (!s) return '<p class="empty">Surah tidak ditemukan.</p>';
  const basmala = (n !== 1 && n !== 9) ? `<div class="basmala">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>` : '';
  let arts = '';
  for (let v = 1; v <= s.c; v++) {
    const g = s.f + v - 1, mk = isMarked(n, v);
    arts += `<article class="ayah" id="a${g}" data-s="${n}" data-v="${v}">
      <div class="ahead"><span class="chip">${v}</span>
        <span class="acts">
          <button act="play" data-g="${g}" title="Putar ayat ${v}">${ICON.play}</button>
          <button act="copy" data-g="${g}" title="Salin ayat">${ICON.copy}</button>
          <button act="mark" data-s="${n}" data-v="${v}" title="Tandai" class="${mk ? 'mark-on' : ''}">${ICON.bookmark}</button>
        </span></div>
      <div class="ar">${esc($text(g)[0])}</div>${translations(g)}</article>`;
  }
  return `
  <div class="surah-head">
    <div class="row1">
      <div><div class="title">${s.n}. ${esc(s.l)}</div>
        <div class="meta">${esc(s.m)} · ${revName(s.r)} · ${s.c} ayat · mulai di halaman ${s.p}</div></div>
      <div class="arname">${esc(s.a)}</div>
    </div>
    <div class="surah-actions">
      <button class="btn" act="play-surah" data-n="${n}">${ICON.play} Putar Surah</button>
      <button class="btn alt" act="copy-surah" data-n="${n}">${ICON.copy} Salin Surah</button>
    </div>
  </div>${basmala}${arts}`;
}

/* simpan posisi baca terakhir (debounce) */
let scrollT;
addEventListener('scroll', () => {
  clearTimeout(scrollT);
  scrollT = setTimeout(() => {
    if (!location.hash.startsWith('#/s/')) return;
    for (const el of $$('.ayah')) if (el.getBoundingClientRect().top > 60) {
      last = { s: +el.dataset.s, n: +el.dataset.v }; store.set('last', last); break;
    }
  }, 600);
}, { passive: true });

/* ================= PENCARIAN ================= */
const AR_STRIP = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const norm = x => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
function searchAll(qraw) {
  const q = norm(qraw); if (q.length < 2) return { sur: [], ay: [] };
  const words = q.split(' ');
  const sur = [];
  for (const s of Q.s) {
    const hay = norm(`${s.l} ${s.m} ${s.a}`);
    if (words.every(w => hay.includes(w))) sur.push(s);
  }
  const ay = [];
  for (let g = 1; g <= Q.v.length && ay.length < 150; g++) {
    const [ar, k, si] = Q.v[g - 1];
    const hK = norm(k), hS = norm(si), hA = norm(ar.replace(AR_STRIP, ''));
    if (words.every(w => hK.includes(w) || hS.includes(w) || hA.includes(w))) ay.push(g);
  }
  return { sur, ay };
}
function hl(text, qraw) {
  const q = norm(qraw); if (!q) return esc(text);
  const re = new RegExp('(' + q.split(' ').filter(Boolean)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  return esc(text).split(re).map((p, i) => i % 2 ? `<mark>${p}</mark>` : p).join('');
}
function tplSearch(q) {
  return `
  <form class="search" action="#/q/" id="f-q">${ICON.search}
    <input name="q" placeholder="Cari ayat / kata kunci…" value="${esc(q)}" autocomplete="off"></form>
  <div id="res"></div>`;
}
function initSearch(q) {
  const inp = $('#f-q input');
  const draw = val => {
    const w0 = norm(val).split(' ')[0];
    const { sur, ay } = searchAll(val);
    let html;
    if (!val || val.length < 2) html = `<p class="empty">Ketik minimal 2 huruf untuk mencari ayat, nama surah, atau artinya.</p>`;
    else if (!sur.length && !ay.length) html = `<p class="empty">Tidak ada hasil untuk “${esc(val)}”.</p>`;
    else {
      html = '';
      if (sur.length) html += `<h1 class="page">Surah</h1>` + sur.slice(0, 12).map(s => `
        <a class="res" href="#/s/${s.n}"><span class="rmeta">${s.n}</span>
        <b>${esc(s.l)}</b> <span class="sub">${esc(s.m)}</span></a>`).join('');
      if (ay.length) {
        html += `<h1 class="page">Ayat <span class="sub">— ${ay.length}${ay.length >= 150 ? '+' : ''} hasil</span></h1>`;
        html += ay.map(g => {
          const { s, v } = $ref(g), su = $surah(s), [ar, k, si] = Q.v[g - 1];
          const field = w0 && norm(k).includes(w0) ? k : w0 && norm(si).includes(w0) ? si : k;
          return `<a class="res" href="#/s/${s}/${v}">
            <span class="rmeta">${esc(su.l)} : ${v}</span>
            <div class="tr" style="margin:0">${hl(field, val)}</div>
            <div class="rar">${esc(ar)}</div></a>`;
        }).join('');
      }
    }
    $('#res').innerHTML = html;
  };
  let t;
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => draw(inp.value.trim()), 200); });
  $('#f-q').addEventListener('submit', e => { e.preventDefault(); location.hash = '#/q/' + encodeURIComponent(inp.value.trim()); });
  draw(q.trim());
  if (!q) inp.focus();
}
document.addEventListener('submit', e => {
  if (e.target.id === 'f-home') {
    e.preventDefault();
    location.hash = '#/q/' + encodeURIComponent(e.target.q.value.trim());
  }
});

/* ================= TANDA ================= */
function tplMarks() {
  if (!marks.length) return `<h1 class="page">Ayat Bertanda</h1>
    <p class="empty">Belum ada ayat yang ditandai.<br><span class="sub">Tekan ikon bookmark pada ayat untuk menandainya.</span></p>`;
  let html = `<h1 class="page">Ayat Bertanda <span class="sub">— ${marks.length}</span></h1>
    <button class="btn alt" act="clear-marks">Hapus semua</button><div style="height:10px"></div>`;
  for (const m of marks) {
    const s = $surah(m.s);
    html += `<a class="res" href="#/s/${m.s}/${m.n}"><span class="rmeta">${esc(s.l)} : ${m.n}</span>
      <div class="tr" style="margin:0">${esc(trOf($g(m.s, m.n)))}</div></a>`;
  }
  return html;
}

/* ================= SETELAN ================= */
async function storageInfo() {
  try {
    const e = await navigator.storage.estimate();
    const mb = x => (x / 1048576).toFixed(1) + ' MB';
    return `Pemakaian penyimpanan ± ${mb(e.usage || 0)} (kuota ${mb(e.quota || 0)}).`;
  } catch { return ''; }
}
function tplSettings() {
  const seg = (name, opts, cur) => `<div class="seg">${opts.map(([v, l]) =>
    `<button data-set="${name}" data-val="${v}" class="${String(cur) === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const standalone = matchMedia('(display-mode: standalone)').matches;
  return `
  <h1 class="page">Setelan</h1>
  <div class="sect"><h3>Terjemahan</h3>${seg('trans', Object.entries(TRANSL), st.trans)}</div>
  <div class="sect"><h3>Pembaca audio (qari)</h3>${seg('reciter', Object.entries(RECITERS), st.reciter)}
    <p class="hint">Audio diunduh saat pertama diputar, lalu otomatis tersimpan untuk didengar offline.</p></div>
  <div class="sect"><h3>Font Arab</h3>${seg('arFont', Object.entries(FONTS), st.arFont)}
    <p class="hint">Amiri Quran: gaya mushaf · Sakkal Majalla: Naskah klasik.</p></div>
  <div class="sect"><h3>Ukuran font Arab</h3>
    <label class="range"><span>A</span><input type="range" data-range="arSize" min="1.5" max="3" step="0.1" value="${st.arSize}"><span style="font-size:1.3rem">A</span></label></div>
  <div class="sect"><h3>Tema</h3>${seg('theme', [['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']], st.theme)}</div>
  <div class="sect"><h3>Lanjut ayat berikutnya otomatis</h3>
    <div class="seg"><button data-set="next" data-val="1" class="${st.next ? 'on' : ''}">Aktif</button>
    <button data-set="next" data-val="0" class="${!st.next ? 'on' : ''}">Nonaktif</button></div></div>
  <div class="sect"><h3>Aplikasi &amp; Data</h3>
    <div id="install-slot">${deferredPrompt ? '<button class="btn" act="do-install">Pasang aplikasi</button>' :
      standalone ? '<p class="hint">Aplikasi berjalan dalam mode terpasang ✔</p>' :
        '<p class="hint">Untuk mode aplikasi: buka menu browser → “Tambah ke Layar Utama”. Setelah terpasang, semuanya berjalan tanpa internet.</p>'}</div>
    ${location.protocol === 'file:' ? '<p class="hint">⚠ Dibuka lewat file:// — service worker tidak aktif. Jalankan `serve.sh` untuk mode offline penuh.</p>' : ''}
    <p class="hint" id="st-storage"></p>
    <button class="btn alt" act="clear-audio" style="margin-top:8px">Bersihkan cache audio</button>
    <p class="hint" style="margin-top:10px">Sumber teks: ${esc(Q.src.ar)}. Terjemahan: ${esc(Q.src.k)} &amp; ${esc(Q.src.s)}. Build ${Q.b}. Audio: islamic.network (Mishary Alafasy, Al-Husary, Maher Al Muaiqly).</p></div>`;
}

/* ================= AUDIO ================= */
const A = new Audio(); A.preload = 'none';
let cur = null;                       // {type:'v',g,s} | {type:'s',n}
const pEl = $('#player');
const audioURL = g => `https://cdn.islamic.network/quran/audio/128/${st.reciter}/${g}.mp3`;
const surahURL = n => `https://cdn.islamic.network/quran/audio-surah/128/${st.reciter}/${n}.mp3`;

function playVerse(g) {
  if (cur && cur.type === 'v' && cur.g === g) { stopAudio(); return; }
  const { s, v } = $ref(g);
  cur = { type: 'v', g, s };
  startAudio(audioURL(g), `${$surah(s).l} · ayat ${v}`);
}
function playSurah(n) {
  if (cur && cur.type === 's' && cur.n === n) { stopAudio(); return; }
  cur = { type: 's', n };
  startAudio(surahURL(n), `${$surah(n).l} — surah utuh`);
}
function startAudio(url, label) {
  A.src = url;
  A.play().catch(() => { toast('Audio gagal dimuat — perlu internet untuk pemutaran pertama.'); stopAudio(); });
  $('#p-label').textContent = label; pEl.classList.remove('hide');
  markPlaying(); mediaSession(label);
}
function mediaSession(label) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: label, artist: RECITERS[st.reciter], album: 'Quran Offline' });
    navigator.mediaSession.setActionHandler('play', () => A.play());
    navigator.mediaSession.setActionHandler('pause', () => A.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => nav(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => nav(1));
  } catch { }
}
function markPlaying() {
  $$('.ayah button[act=play]').forEach(b => {
    const on = cur && cur.type === 'v' && cur.g === +b.dataset.g;
    b.classList.toggle('playing', !!on);
    b.innerHTML = on ? ICON.stop : ICON.play;
  });
}
function stopAudio() {
  A.pause(); A.removeAttribute('src'); A.load(); cur = null;
  pEl.classList.add('hide'); markPlaying();
}
function nav(dir) {
  if (!cur || cur.type !== 'v') return;
  const s = $surah(cur.s), ref = $ref(cur.g), nv = ref.v + dir;
  if (nv < 1 || nv > s.c) return;
  playVerse($g(cur.s, nv));
}
A.addEventListener('play', () => $('#p-play').classList.toggle('paused', false));
A.addEventListener('pause', () => $('#p-play').classList.toggle('paused', true));
A.addEventListener('timeupdate', () => {
  if (!A.duration) return;
  $('#p-bar').value = (A.currentTime / A.duration) * 1000;
  const f = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  $('#p-cur').textContent = f(A.currentTime); $('#p-dur').textContent = f(A.duration);
});
A.addEventListener('ended', () => {
  if (cur && cur.type === 'v' && st.next) {
    const s = $surah(cur.s), ref = $ref(cur.g);
    if (ref.v < s.c) { playVerse($g(cur.s, ref.v + 1)); return; }
  }
  stopAudio();
});
$('#p-play').addEventListener('click', () => A.paused ? A.play().catch(() => { }) : A.pause());
$('#p-prev').addEventListener('click', () => nav(-1));
$('#p-next').addEventListener('click', () => nav(1));
$('#p-stop').addEventListener('click', stopAudio);
$('#p-bar').addEventListener('input', e => { if (A.duration) A.currentTime = (e.target.value / 1000) * A.duration; });

/* ================= AKSI (delegasi klik) ================= */
document.addEventListener('click', e => {
  const btn = e.target.closest('[act], [data-set]');
  if (!btn) return;
  if (btn.hasAttribute('data-set')) return handleSetting(btn);
  const act = btn.getAttribute('act');
  if (act === 'play' && btn.dataset.g) playVerse(+btn.dataset.g);
  else if (act === 'play-surah') playSurah(+btn.dataset.n);
  else if (act === 'copy' && btn.dataset.g) {
    const g = +btn.dataset.g, { s, v } = $ref(g), t = $text(g);
    copyText(st.trans === 'n' ? `${t[0]}\n— QS. ${$surah(s).l} [${s}]: ${v}` : `${t[0]}\n\n${st.trans === 's' ? t[2] : t[1]}\n— QS. ${$surah(s).l} [${s}]: ${v}`);
    toast('Ayat disalin');
  }
  else if (act === 'copy-surah') {
    const n = +btn.dataset.n, s = $surah(n);
    let txt = `${s.n}. ${s.l} — ${s.m}\n\n`;
    for (let v = 1; v <= s.c; v++) { const t = $text($g(n, v)); txt += `﴿${v}﴾ ${t[0]}${st.trans === 'n' ? '' : `\n${st.trans === 's' ? t[2] : t[1]}`}\n\n`; }
    copyText(txt); toast('Surah disalin');
  }
  else if (act === 'mark') {
    const s = +btn.dataset.s, v = +btn.dataset.v;
    toggleMark(s, v); btn.classList.toggle('mark-on');
    toast(isMarked(s, v) ? 'Ayat ditandai' : 'Tanda dihapus');
  }
  else if (act === 'clear-marks') { marks = []; saveMarks(); paintBadge(); render({ v: 'marks' }); }
  else if (act === 'clear-audio') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('clear-audio'); toast('Cache audio dibersihkan.');
    } else toast('Cache audio hanya tersedia saat dijalankan lewat server lokal (SW aktif).');
  }
  else if (act === 'do-install') { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } }
});

document.addEventListener('input', e => {
  if (e.target.dataset.range === 'arSize') { st.arSize = +e.target.value; store.set('st', st); applyArSize(); }
});

function handleSetting(btn) {
  const name = btn.dataset.set; if (!name) return;
  const val = btn.dataset.val;
  if (name === 'arSize') st.arSize = +val;
  else if (name === 'next') st.next = val === '1';
  else st[name] = val;
  store.set('st', st); applyTheme(); applyArSize(); applyArFont();
  if (name === 'reciter') stopAudio();
  const h = location.hash.replace(/^#\//, '').split('/');
  if (h[0] === 't' && name !== 'arSize') render({ v: 'settings' });
  else if (h[0] === 's' && (name === 'trans' || name === 'theme')) render({ v: 'surah', n: +h[1], a: 0 });
}

/* ================= TOMBOL TEMA ================= */
$('#btn-theme').addEventListener('click', () => {
  st.theme = isDark() ? 'light' : 'dark';
  store.set('st', st); applyTheme();
  if (location.hash.replace(/^#\//, '').startsWith('t')) render({ v: 'settings' });
});

/* ================= SERVICE WORKER / INSTALL ================= */
let deferredPrompt = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('#btn-install').classList.remove('hide');
  if (location.hash.replace(/^#\//, '').startsWith('t')) render({ v: 'settings' });
});
$('#btn-install').addEventListener('click', () => { if (deferredPrompt) deferredPrompt.prompt(); });
addEventListener('appinstalled', () => { $('#btn-install').classList.add('hide'); toast('Aplikasi terpasang ✔'); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}

/* ================= BOOT ================= */
applyTheme(); applyArSize(); applyArFont(); paintBadge(); route();
