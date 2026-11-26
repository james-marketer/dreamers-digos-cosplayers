/* ---------- Moving starry night ---------- */
(() => {
  const c = document.getElementById('sky'), ctx = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, stars = [], shoots = [];
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
    const dt = Math.min(t - last, 50); last = t;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      if (!reduce) {            // slow drift to the left, slightly down (like a rotating sky)
        s.x -= s.speed * dt * 0.012; s.y += s.speed * dt * 0.003;
        if (s.x < -2) s.x = w + 2; if (s.y > h + 2) s.y = -2;
      }
      const a = .45 + .55 * Math.abs(Math.sin(t / 1000 * s.tw + s.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = `hsl(${s.hue} 90% 88%)`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      if (s.r > 1.6) { ctx.globalAlpha = a * .25; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, 6.283); ctx.fill(); }
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
async function loadMembers() {
  const grid = $('#grid'), msg = $('#gridMsg');
  if (!URL_) { msg.textContent = 'Demo mode: connect the Google Sheet backend (see README) to show approved members here.'; return; }
  msg.textContent = 'Loading dreamers…';
  try {
    const r = await fetch(URL_ + '?action=members');
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Failed');
    if (!data.members.length) { msg.textContent = 'No approved members yet. Be the first Dreamer!'; return; }
    msg.textContent = '';
    grid.innerHTML = data.members.map(m => `
      <article class="card">
        <div class="ph" style="background-image:url('${esc(m.photos[0] || '')}')">
          ${m.photos.length > 1 ? `<span class="count">+${m.photos.length - 1}</span>` : ''}
        </div>
        <div class="body">
          <h3>${esc(m.name)}</h3>
          ${m.character ? `<div class="chr">${esc(m.character)}</div>` : ''}
          <p>${esc(m.details)}</p>
          ${/^https?:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\//i.test(m.facebook) ? `<a href="${esc(m.facebook)}" target="_blank" rel="noopener noreferrer">Facebook ↗</a>` : ''}
        </div>
      </article>`).join('');
  } catch (e) { msg.textContent = 'Could not load members right now.'; }
}
loadMembers();

/* Photo handling: resize in the browser so uploads stay small */
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
    img.onerror = () => rej(new Error('Could not read ' + file.name));
    img.src = u;
  });
}
photosIn.addEventListener('change', async () => {
  const files = [...photosIn.files].slice(0, 4);
  previews.innerHTML = ''; photoData = [];
  try {
    for (const f of files) { const d = await shrink(f); photoData.push(d); previews.insertAdjacentHTML('beforeend', `<img src="${d}" alt="Preview">`); }
    if (photosIn.files.length > 4) setMsg('Only the first 4 photos will be used.', '');
  } catch (e) { setMsg(e.message, 'err'); }
});

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
