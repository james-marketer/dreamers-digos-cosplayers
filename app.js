/* ---------- Moving starry night ---------- */
(() => {
  const c = document.getElementById('sky'), ctx = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, stars = [], shoots = [], mx = 0, my = 0, ox = 0, oy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  const LAYERS = [ {n:.00010, s:.25, r:.7}, {n:.00006, s:.5, r:1.1}, {n:.00003, s:.9, r:1.7} ];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    LAYERS.forEach(L => {
      const count = Math.round(w * h * L.n);
      for (let i = 0; i < count; i++) stars.push({
        x: Math.random() * w, y: Math.random() * h, speed: L.s, r: L.r * (0.6 + Math.random() * .7),
        ph: Math.random() * 6.28, tw: .5 + Math.random() * 1.5,
        hue: [210, 260, 45, 320][Math.floor(Math.random() * 4)]
      });
    });
  }

  function shoot() {
    shoots.push({ x: Math.random() * w * .8 + w * .2, y: Math.random() * h * .4, vx: -7 - Math.random() * 4, vy: 3 + Math.random() * 2, life: 1 });
  }

  let last = 0, next = 3000;
  function frame(t) {
    if (document.hidden) { last = t; requestAnimationFrame(frame); return; }
    const dt = Math.min(t - last, 50); last = t;
    ctx.clearRect(0, 0, w, h);
    ox += (mx - ox) * .04; oy += (my - oy) * .04;
    for (const s of stars) {
      if (!reduce) {            // slow drift to the left, slightly down (like a rotating sky)
        s.x -= s.speed * dt * 0.012; s.y += s.speed * dt * 0.003;
        if (s.x < -2) s.x = w + 2; if (s.y > h + 2) s.y = -2;
      }
      const a = .45 + .55 * Math.abs(Math.sin(t / 1000 * s.tw + s.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = `hsl(${s.hue} 90% 88%)`;
      const px = s.x - ox * s.speed * 40, py = s.y - oy * s.speed * 40;
      ctx.beginPath(); ctx.arc(px, py, s.r, 0, 6.283); ctx.fill();
      if (s.r > 1.6) { ctx.globalAlpha = a * .25; ctx.beginPath(); ctx.arc(px, py, s.r * 3, 0, 6.283); ctx.fill(); }
    }
    if (!reduce) {
      next -= dt; if (next < 0) { shoot(); next = 4000 + Math.random() * 6000; }
      shoots = shoots.filter(m => m.life > 0);
      for (const m of shoots) {
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9);
        g.addColorStop(0, `rgba(255,255,255,${m.life})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 9, m.y - m.vy * 9); ctx.stroke();
        m.x += m.vx; m.y += m.vy; m.life -= .014;
      }
    }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();

/* ---------- Site logic ---------- */
const URL_ = (window.DREAMERS_CONFIG || {}).SCRIPT_URL || '';
const $ = s => document.querySelector(s);
document.getElementById('yr').textContent = new Date().getFullYear();
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* Members gallery */
let members = [];
const cardHtml = m => `
    <article class="card">
      <div class="ph" data-i="${members.indexOf(m)}" style="background-image:url('${esc(m.photos[0] || '')}')" role="button" tabindex="0" aria-label="View photos of ${esc(m.name)}">
        ${m.photos.length > 1 ? `<span class="count">+${m.photos.length - 1}</span>` : ''}
      </div>
      <div class="body">
        <h3>${esc(m.name)}</h3>
      </div>
    </article>`;

/* Cover-flow carousel: 3 cards visible, drifts on its own when idle */
let car = null, suppressClick = false;
function stopCar() { if (car) { cancelAnimationFrame(car.raf); car.off(); car = null; } }
function render(list) {
  const grid = $('#grid'); stopCar();
  $('#gridMsg').textContent = list.length ? '' : 'No dreamers match your search.';
  $('#carCtl').hidden = list.length < 2;
  grid.className = 'carousel';
  grid.innerHTML = '<div class="ring">' + list.map(cardHtml).join('') + '</div>';
  const ring = grid.firstChild, cards = [...ring.children], n = cards.length;
  if (!n) { grid.style.height = ''; return; }
  const W = grid.clientWidth || 320;
  const cw = Math.round(Math.min(210, W * 0.42)), step = cw * 0.85;
  grid.style.setProperty('--cw', cw + 'px');
  grid.style.height = (cards[0].offsetHeight + 44) + 'px';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, half = n / 2;
  const s = car = { pos: 0, target: null, drag: false, hover: false, idle: 3000, ds: [], raf: 0, last: performance.now(), off: () => {} };

  const paint = () => {
    cards.forEach((c, i) => {
      let d = (((i - s.pos) % n) + n) % n; if (n > 1 && d >= half) d -= n;
      s.ds[i] = d;
      const ad = Math.abs(d);
      if (ad >= 1.6) { c.style.visibility = 'hidden'; c.style.pointerEvents = 'none'; return; }
      c.style.visibility = 'visible';
      const k = Math.max(-1, Math.min(1, d));
      c.style.transform = 'translateX(' + (d * step) + 'px) translateZ(' + (-ad * cw * 0.55) + 'px) rotateY(' + (-k * 38) + 'deg)';
      c.style.opacity = (ad <= 1 ? 1 - ad * 0.3 : Math.max(0, 0.7 - (ad - 1) * 1.15)).toFixed(2);
      c.style.zIndex = Math.round(100 - ad * 20);
      c.style.pointerEvents = ad < 1.3 ? 'auto' : 'none';
    });
  };
  const tick = t => {
    const dt = Math.min(t - s.last, 50); s.last = t;
    if (s.target !== null) {
      s.pos += (s.target - s.pos) * 0.12;
      if (Math.abs(s.target - s.pos) < 0.002) { s.pos = s.target; s.target = null; }
      s.idle = 0;
    } else if (s.drag) s.idle = 0;
    else {
      s.idle += dt;
      if (s.idle > 1000 && !reduce && n > 1 && !document.hidden) s.pos += dt * 0.00035 * (s.hover ? 0.25 : 1);
    }
    paint(); s.raf = requestAnimationFrame(tick);
  };

  let sx = 0, sp = 0, moved = false;
  const down = e => { if (e.button > 0 || n < 2) return; s.drag = true; sx = e.clientX; sp = s.pos; moved = false; s.target = null; };
  const move = e => { if (!s.drag) return; const dx = e.clientX - sx; if (Math.abs(dx) > 6) moved = true; s.pos = sp - dx / step; };
  const up = () => { if (!s.drag) return; s.drag = false; if (moved) { suppressClick = true; setTimeout(() => suppressClick = false, 0); s.target = Math.round(s.pos); } };
  const enter = e => { if (e.pointerType === 'mouse') s.hover = true; }, leave = () => { s.hover = false; };
  grid.addEventListener('pointerdown', down); grid.addEventListener('pointerenter', enter); grid.addEventListener('pointerleave', leave);
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  s.off = () => { grid.removeEventListener('pointerdown', down); grid.removeEventListener('pointerenter', enter); grid.removeEventListener('pointerleave', leave);
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
  paint(); s.raf = requestAnimationFrame(tick);
}
$('#grid').addEventListener('click', e => {
  if (suppressClick) { e.stopPropagation(); e.preventDefault(); return; }
  const c = e.target.closest('.card');
  if (c && car) {
    const d = car.ds[[...c.parentNode.children].indexOf(c)];
    if (Math.abs(d) > 0.35) { e.stopPropagation(); e.preventDefault(); car.target = car.pos + d; }   // side card: bring to front
  }
}, true);
const spin = dir => { if (car) car.target = Math.round(car.pos) + dir; };
$('#carPrev').addEventListener('click', () => spin(-1));
$('#carNext').addEventListener('click', () => spin(1));
function manualMembers() {
  return ((window.DREAMERS_CONFIG || {}).MEMBERS || []).filter(m => m && m.name).map(m => ({
    name: m.name, character: m.character || '', details: m.details || '', facebook: m.facebook || '',
    photos: [m.photo].concat(m.photos || []).filter(Boolean)
  }));
}
function showRoster() {
  const msg = $('#gridMsg');
  if (!members.length) { msg.textContent = URL_ ? 'No approved members yet. Be the first Dreamer!' : 'Demo mode: connect the Google Sheet backend (see README) to show approved members here.'; return; }
  msg.textContent = '';
  $('#count').textContent = '· ' + members.length;
  $('#search').hidden = false;
  render(members);
}
async function loadMembers() {
  const msg = $('#gridMsg');
  const manual = manualMembers();
  const KEY = 'dreamers_sheet_v1';
  const merge = extra => {
    const have = new Set(manual.map(m => m.name.trim().toLowerCase()));
    return manual.concat((extra || []).filter(m => m && m.name && !have.has(String(m.name).trim().toLowerCase())));
  };
  if (!URL_) { members = manual; showRoster(); return; }
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  let shown = '';
  if (cached && cached.length) { members = merge(cached); shown = JSON.stringify(members); showRoster(); }
  else msg.textContent = 'Loading dreamers…';
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(URL_ + '?action=members', { signal: ctl.signal });
    clearTimeout(t);
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Failed');
    try { localStorage.setItem(KEY, JSON.stringify(data.members)); } catch (e) {}
    members = merge(data.members);
    if (JSON.stringify(members) !== shown) showRoster();
  } catch (e) {
    if (!shown) { members = manual; showRoster(); }
  }
}
loadMembers();
$('#search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  render(members.filter(m => (m.name + ' ' + m.character).toLowerCase().includes(q)));
});

/* Photo lightbox */
const lb = $('#lb'), lbImg = lb.querySelector('img'); let lbSet = [], lbI = 0;
function lbShow() { lbImg.src = lbSet[lbI]; lb.querySelectorAll('.lbn').forEach(b => b.hidden = lbSet.length < 2); }
function lbOpen(i) { lbSet = members[i].photos.map(u => u.replace('sz=w800', 'sz=w1600')); lbI = 0; lb.hidden = false; lbShow(); }
function lbClose() { lb.hidden = true; lbImg.src = ''; }
$('#grid').addEventListener('click', e => { const p = e.target.closest('.ph'); if (p) lbOpen(+p.dataset.i); });
$('#grid').addEventListener('keydown', e => { if (e.key === 'Enter') { const p = e.target.closest('.ph'); if (p) lbOpen(+p.dataset.i); } });
lb.querySelector('.lbx').onclick = lbClose;
lb.querySelector('.prev').onclick = () => { lbI = (lbI + lbSet.length - 1) % lbSet.length; lbShow(); };
lb.querySelector('.next').onclick = () => { lbI = (lbI + 1) % lbSet.length; lbShow(); };
lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') lbClose();
  if (e.key === 'ArrowLeft') lb.querySelector('.prev').click();
  if (e.key === 'ArrowRight') lb.querySelector('.next').click();
});

/* Photo handling: resize in the browser so uploads stay small; add up to 4, removable */
const photosIn = $('#photos'), previews = $('#previews');
let photoData = [];
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1100, k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(u); res(cv.toDataURL('image/jpeg', .8));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Could not read ' + file.name)); };
    img.src = u;
  });
}
function drawPreviews() {
  previews.innerHTML = photoData.map((d, i) => `<span class="pv"><img src="${d}" alt="Photo ${i + 1}"><button type="button" data-i="${i}" aria-label="Remove photo ${i + 1}">×</button></span>`).join('');
}
previews.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { photoData.splice(+b.dataset.i, 1); drawPreviews(); } });
photosIn.addEventListener('change', async () => {
  const files = [...photosIn.files]; photosIn.value = '';
  try {
    for (const f of files) {
      if (photoData.length >= 4) { setMsg('Maximum of 4 photos.', ''); break; }
      if (!f.type.startsWith('image/')) continue;
      photoData.push(await shrink(f));
    }
    drawPreviews();
  } catch (e) { setMsg(e.message, 'err'); }
});

/* Small niceties */
const ta = document.querySelector('textarea[name=details]'), cnt = $('#cnt');
ta.addEventListener('input', () => cnt.textContent = ta.value.length + ' / 600');
const ph = document.querySelector('input[name=phone]');
ph.addEventListener('input', () => {
  const d = ph.value.replace(/\D/g, '');
  if (/^0\d{0,10}$/.test(d)) ph.value = d.replace(/^(\d{4})(\d{0,3})(\d{0,4}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
});
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }) : null;
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
const links = [...document.querySelectorAll('.nav nav a[href^="#"]:not(.btn)')];
const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
links.forEach(a => { const t = document.querySelector(a.getAttribute('href')); if (t) so.observe(t); });


const form = $('#form'), msgEl = $('#formMsg'), btn = $('#submit');
function setMsg(t, cls) { msgEl.textContent = t; msgEl.className = 'formmsg ' + (cls || ''); }

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = new FormData(form);
  if (f.get('website')) return;                                // honeypot
  if (!form.checkValidity()) { form.reportValidity(); return; }
  if (!photoData.length) return setMsg('Please add at least one photo as proof of a past cosplay.', 'err');
  if (!/^https?:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\//i.test(f.get('facebook'))) return setMsg('Please enter a valid Facebook link (facebook.com/…).', 'err');
  const digits = String(f.get('phone')).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return setMsg('Please enter a valid phone number.', 'err');
  if (!URL_) return setMsg('Demo mode: backend not connected yet, nothing was saved. See README.md.', 'err');

  btn.disabled = true; setMsg('Sending your dream…', '');
  const payload = {
    name: f.get('name').trim(), character: f.get('character').trim(), details: f.get('details').trim(),
    facebook: f.get('facebook').trim(), phone: String(f.get('phone')).trim(), photos: photoData
  };
  try {
    // text/plain avoids a CORS preflight, which Apps Script can't answer
    const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Something went wrong');
    form.reset(); previews.innerHTML = ''; photoData = [];
    setMsg('Welcome, Dreamer! ✦ Your registration was received and is waiting for approval.', 'ok');
  } catch (e) { setMsg('Could not send: ' + e.message, 'err'); }
  btn.disabled = false;
});

/* Reach chart (from the pitch deck, public Facebook data as of Oct 19, 2026) */
(() => {
  const data = [['Announcement (Sep 10)', 159, 179], ['Day 1 recap (Oct 5)', 340, 130], ['Event preview (Oct 7)', 78, 28], ['Week wrap (Oct 11)', 160, 58]];
  const max = Math.max(...data.flatMap(d => [d[1], d[2]]));
  $('#reach').innerHTML = '<div class="lg"><i class="r"></i>Reactions <i class="s"></i>Shares</div>' + data.map(d => `
    <div class="row"><span>${d[0]}</span>
      <div class="bars"><div class="bar r" style="--w:${d[1] / max * 100}%"><em>${d[1]}</em></div>
      <div class="bar s" style="--w:${d[2] / max * 100}%"><em>${d[2]}</em></div></div></div>`).join('');
})();

/* Partner / Volunteer contact links (set in config.js) */
(() => {
  const C = window.DREAMERS_CONFIG || {};
  const href = what => C.EMAIL ? 'mailto:' + C.EMAIL + '?subject=' + encodeURIComponent(what + ' — Yume Sanctuary') : (C.FACEBOOK_URL || '#join');
  const ext = C.FACEBOOK_URL && !C.EMAIL;
  [['#btnPartner', 'Partner'], ['#btnVolunteer', 'Volunteer']].forEach(([id, w]) => {
    const a = $(id); a.href = href(w); if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });
  const line = $('#contactLine'), bits = [];
  if (C.FACEBOOK_URL) bits.push('<a href="' + esc(C.FACEBOOK_URL) + '" target="_blank" rel="noopener noreferrer">Facebook</a>');
  if (C.EMAIL) bits.push('<a href="mailto:' + esc(C.EMAIL) + '">' + esc(C.EMAIL) + '</a>');
  if (bits.length) { line.innerHTML = 'Reach us: ' + bits.join(' · '); line.hidden = false; }
})();

/* Mobile menu */
(() => {
  const m = $('#menu'), n = $('#nav');
  const set = o => { n.classList.toggle('open', o); m.setAttribute('aria-expanded', o); };
  m.addEventListener('click', () => set(!n.classList.contains('open')));
  n.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
})();

/* Back to top */
(() => {
  const b = $('#toTop');
  addEventListener('scroll', () => { b.hidden = scrollY < 900; }, { passive: true });
  b.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* Count-up numbers */
(() => {
  const els = document.querySelectorAll('.stats b[data-n]');
  const plus = el => el.textContent.includes('+') ? '+' : '';
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io2.unobserve(e.target);
    const el = e.target, end = +el.dataset.n, sfx = plus(el), t0 = performance.now();
    const tick = t => { const p = Math.min((t - t0) / 1200, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + (p === 1 ? sfx : ''); if (p < 1) requestAnimationFrame(tick); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; requestAnimationFrame(tick);
  }), { threshold: .6 });
  els.forEach(el => io2.observe(el));
})();

/* Celebration burst after a successful registration */
function burst() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = form.getBoundingClientRect(), cx = r.left + r.width / 2, cy = Math.min(Math.max(r.bottom - 80, 80), innerHeight - 80);
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span'); s.className = 'spark'; s.textContent = ['✦', '✧', '★', '☾'][i % 4];
    const ang = Math.random() * 6.283, d = 80 + Math.random() * 170;
    s.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;--x:' + Math.cos(ang) * d + 'px;--y:' + Math.sin(ang) * d + 'px;color:' + ['#ffe9a8', '#f7b8ff', '#8ec5ff'][i % 3];
    document.body.appendChild(s); setTimeout(() => s.remove(), 1400);
  }
}
const _ok = $('#formMsg');
new MutationObserver(() => { if (_ok.classList.contains('ok')) burst(); }).observe(_ok, { attributes: true, attributeFilter: ['class'] });

/* Yume Sanctuary popup */
(() => {
  const m = $('#yume'); let opener = null;
  const open = el => { opener = el; m.hidden = false; document.body.style.overflow = 'hidden'; m.scrollTop = 0; m.querySelector('.modal-box').scrollTop = 0; m.querySelector('[data-close]').focus(); };
  const close = () => { m.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); };
  document.querySelectorAll('[data-open="yume"]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(b); const n = $('#nav'); n.classList.remove('open'); $('#menu').setAttribute('aria-expanded', false); }));
  m.addEventListener('click', e => {
    if (e.target === m || e.target.closest('[data-close]')) return close();
    const l = e.target.closest('a[href^="#"]');
    if (l) { e.preventDefault(); close(); const t = document.querySelector(l.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth' }); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) close(); });
  if (location.hash === '#about') open(null);
})();
