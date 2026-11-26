const fs=require('fs');
let h=fs.readFileSync('index.html','utf8');
h=h.replace('    <p id="gridMsg" class="muted"></p>\n  </section>','    <p id="gridMsg" class="muted"></p>\n    <p class="allwrap"><button type="button" id="allBtn" class="btn ghost" hidden>View all Dreamers</button></p>\n  </section>');
h=h.replace('<div id="yume" class="modal"',`<div id="roster" class="modal" role="dialog" aria-modal="true" aria-labelledby="rosterTitle" hidden>
  <div class="modal-box narrow">
    <button type="button" class="modal-x" data-close aria-label="Close">×</button>
    <header class="modal-head"><h2 id="rosterTitle">All Dreamers</h2><p class="sub" id="rosterSub"></p></header>
    <ol id="rosterList" class="rlist"></ol>
  </div>
</div>

<div id="yume" class="modal"`);
if(!h.includes('id="roster"')||!h.includes('id="allBtn"')) throw new Error('html');
fs.writeFileSync('index.html',h);

let a=fs.readFileSync('app.js','utf8');
a=a.replace("let boardRows = null, totalAll = 0, boardDemo = false;","let boardRows = null, totalAll = 0, boardDemo = false, allList = [];");
a=a.replace("    members = applyRanking(all, d && d.ranking);","    allList = all;\n    members = applyRanking(all, d && d.ranking);\n    const ab = $('#allBtn'); ab.hidden = !all.length; ab.textContent = 'View all Dreamers (' + all.length + ')';");
a=a.replace("/* Yume Sanctuary popup */",`/* Full roster popup: every Dreamer, A to Z */
(() => {
  const m = $('#roster'); let opener = null;
  const close = () => { m.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); };
  $('#allBtn').addEventListener('click', e => {
    opener = e.currentTarget;
    const list = allList.slice().sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base', numeric: true }));
    $('#rosterSub').textContent = list.length + ' Dreamers in Digos City, A to Z';
    $('#rosterList').innerHTML = list.map(p => '<li><span class="av" style="background-image:url(\'' + esc(p.photos[0] || '') + '\')"></span><span class="nm">' + esc(p.name) + '</span></li>').join('');
    m.hidden = false; document.body.style.overflow = 'hidden'; m.scrollTop = 0; m.querySelector('.modal-box').scrollTop = 0; m.querySelector('[data-close]').focus();
  });
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) close(); });
})();

/* Yume Sanctuary popup */`);
fs.writeFileSync('app.js',a);new Function(a);
fs.appendFileSync('style.css',`
.allwrap{text-align:center; margin:14px 0 0}
.modal-box.narrow{max-width:560px}
.rlist{list-style:none; margin:0; padding:0; display:grid; gap:8px}
.rlist li{display:flex; align-items:center; gap:12px; padding:8px 12px; border:1px solid var(--line); border-radius:12px; background:rgba(255,255,255,.05)}
.rlist .av{width:38px; height:38px; border-radius:50%; background:#2a1458 center 22%/cover; border:1px solid var(--line); flex:none}
.rlist .nm{font-weight:600}
`);
