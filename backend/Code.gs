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

// Public list of APPROVED members only (no phone numbers).
function doGet(e) {
  try {
    const rows = sheet_().getDataRange().getValues().slice(1);
    const members = rows
      .filter(function (r) { return String(r[COL.STATUS - 1]).toLowerCase() === 'approved'; })
      .map(function (r) {
        return {
          name: r[1], character: r[2], details: r[3], facebook: r[4],
          photos: String(r[7]).split(',').filter(String).map(function (id) {
            return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800';
          })
        };
      })
      .reverse();
    return json_({ ok: true, members: members });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}
