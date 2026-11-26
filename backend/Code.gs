/**
 * Dreamers · Digos Cosplayers — Google Sheets backend (Google Apps Script)
 *
 * Every registration becomes a row in the "Dreamers" sheet of the spreadsheet
 * this script is attached to. Proof photos are saved to a Drive folder.
 * Rows start as "Pending"; change the Status cell to "Approved" to show a
 * member on the public website. Phone numbers are never returned publicly.
 */
const SHEET_NAME = 'Dreamers';
const FOLDER_NAME = 'Dreamers Cosplay Proofs';
const HEADERS = ['Timestamp', 'Cosplayer Name', 'Past Cosplay', 'Details', 'Facebook', 'Phone', 'Proof Photos', 'Photo IDs', 'Status'];
const COL = { STATUS: 9 };

// ---- Ranking ("Points" tab) ----
// Each column of the Points tab holds POINTS (not counts). Use the Dreamers > Points panel menu
// to add points with + / - buttons: each click adds the points that action is worth.
const POINTS_SHEET = 'Points';
const WEIGHTS = { chat: 1, shares: 2, activities: 10, polls: 1, reactions: 1 };
const POINT_KEYS = ['chat', 'shares', 'activities', 'polls', 'reactions'];
const POINT_HEADERS = ['Cosplayer Name', 'Daily chat (+1)', 'Shared public posts (+2)', 'Face-to-face activities (+10)', 'Poll answers (+1)', 'Reactions (+1)', 'Total points'];
// Dreamers listed by hand on the website (config.js). Used to pre-fill the Points tab.
const SEED_NAMES = ['Cheezy kei', 'Jett', 'Aerix Luxen', 'Yuichikaii', 'Redfyrr', 'Neko Hime', 'Alfie Pop', 'Salome Mayo', 'J.E.M.'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#2a1458').setFontColor('#ffffff');
    sh.getRange(2, COL.STATUS, 1000).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Approved', 'Rejected'], true).build());
  }
  return sh;
}

function pointsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(POINTS_SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(POINTS_SHEET);
  sh.appendRow(POINT_HEADERS);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, POINT_HEADERS.length).setFontWeight('bold').setBackground('#2a1458').setFontColor('#ffffff').setWrap(true);
  const names = SEED_NAMES.slice();
  try {
    const d = ss.getSheetByName(SHEET_NAME);
    if (d) d.getDataRange().getValues().slice(1).forEach(function (r) {
      if (String(r[COL.STATUS - 1]).toLowerCase() === 'approved' && r[1]) names.push(String(r[1]).trim());
    });
  } catch (e) {}
  const seen = {}, uniq = names.filter(function (n) { const k = n.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
  if (uniq.length) {
    sh.getRange(2, 1, uniq.length, 1).setValues(uniq.map(function (n) { return [n]; }));
    sh.getRange(2, 2, uniq.length, 5).setValue(0);
  }
  fixPointsLayout_(sh);
  sh.setColumnWidth(1, 180);
  sh.setColumnWidths(2, 6, 130);
  return sh;
}

function ranking_() {
  const num = function (v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
  return pointsSheet_().getDataRange().getValues().slice(1)
    .filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) {
      const p = POINT_KEYS.map(function (k, i) { return num(r[i + 1]); });
      // columns hold points; the website shows counts, so divide by what each action is worth
      const c = function (i) { return Math.round(p[i] / WEIGHTS[POINT_KEYS[i]]); };
      return { name: String(r[0]).trim(), chat: c(0), shares: c(1), activities: c(2), polls: c(3), reactions: c(4),
               total: p.reduce(function (a, b) { return a + b; }, 0) };
    });
}

// Make sure headers and the Total column are right (safe to run any time).
function fixPointsLayout_(sh) {
  sh.getRange(1, 1, 1, POINT_HEADERS.length).setValues([POINT_HEADERS]).setFontWeight('bold').setBackground('#2a1458').setFontColor('#ffffff').setWrap(true);
  sh.getRange('G2:G').clearContent();
  sh.getRange('G2').setFormula('=ARRAYFORMULA(IF(A2:A="","",B2:B+C2:C+D2:D+E2:E+F2:F))');
  sh.getRange('G2:G').setFontWeight('bold');
}

// ---- Points panel (menu: Dreamers > Points panel) ----
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Dreamers').addItem('Points panel', 'openPointsPanel').addToUi();
}

function openPointsPanel() {
  fixPointsLayout_(pointsSheet_());
  const html = HtmlService.createHtmlOutputFromFile('Points').setWidth(980).setHeight(640);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Dreamers points');
}

function getPanelData() {
  const rows = pointsSheet_().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const name = String(rows[i][0]).trim();
    if (!name) continue;
    const vals = POINT_KEYS.map(function (k, j) { return Number(rows[i][j + 1]) || 0; });
    out.push({ row: i + 1, name: name, vals: vals });
  }
  return { people: out, steps: POINT_KEYS.map(function (k) { return WEIGHTS[k]; }) };
}

// dir is +1 or -1. Each click moves the column by what that action is worth.
function adjustPoints(row, col, dir) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = pointsSheet_(), cell = sh.getRange(row, col + 2);
    const v = Math.max(0, (Number(cell.getValue()) || 0) + (dir > 0 ? 1 : -1) * WEIGHTS[POINT_KEYS[col]]);
    cell.setValue(v);
    const all = sh.getRange(row, 2, 1, 5).getValues()[0];
    return { value: v, total: all.reduce(function (a, b) { return a + (Number(b) || 0); }, 0) };
  } finally {
    lock.releaseLock();
  }
}

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Escape cells starting with = + - @ so sheet formulas can't be injected.
function safe_(v, max) {
  v = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    const name = safe_(d.name, 80), details = safe_(d.details, 600);
    const fb = String(d.facebook || '').trim().slice(0, 200);
    const phone = String(d.phone || '').trim().slice(0, 30);
    if (!name || !details) return json_({ ok: false, error: 'Name and details are required.' });
    if (!/^https?:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\//i.test(fb)) return json_({ ok: false, error: 'Invalid Facebook link.' });
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return json_({ ok: false, error: 'Invalid phone number.' });
    const photos = (d.photos || []).slice(0, 4);
    if (!photos.length) return json_({ ok: false, error: 'At least one photo is required.' });

    const folder = folder_(), urls = [], ids = [];
    photos.forEach(function (p, i) {
      const m = /^data:image\/jpeg;base64,(.+)$/.exec(p);
      if (!m) throw new Error('Photos must be images.');
      const blob = Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/jpeg', name.replace(/[^\w ]/g, '') + '_' + Date.now() + '_' + (i + 1) + '.jpg');
      const f = folder.createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      ids.push(f.getId());
      urls.push(f.getUrl());
    });

    sheet_().appendRow([new Date(), name, safe_(d.character, 400), details, fb, "'" + phone, urls.join('\n'), ids.join(','), 'Pending']);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Public list of APPROVED members only (no phone numbers), plus the points ranking.
function doGet(e) {
  try {
    const rows = sheet_().getDataRange().getValues().slice(1);
    const members = rows
      .filter(function (r) { return String(r[COL.STATUS - 1]).toLowerCase() === 'approved'; })
      .map(function (r) {
        return {
          name: r[1], character: r[2], details: r[3],
          photos: String(r[7]).split(',').filter(String).map(function (id) {
            return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800';
          })
        };
      })
      .reverse();
    let ranking = null;
    try { ranking = ranking_(); } catch (e) {}
    return json_({ ok: true, members: members, ranking: ranking });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}
