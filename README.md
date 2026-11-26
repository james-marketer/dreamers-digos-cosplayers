# Dreamers · Digos Cosplayers (Yume Sanctuary)

Static website + Google Sheets backend. No server needed.

```
dreamers/
  index.html  style.css  app.js  logo.svg   ← the website
  config.js                                  ← paste your backend URL here
  backend/Code.gs                            ← Google Apps Script (the "back end")
```

## 1. Set up the Google Sheet backend (about 5 minutes)

1. Go to <https://sheets.new> and name the spreadsheet **Dreamers Registry**.
2. Menu **Extensions → Apps Script**. Delete the sample code and paste all of `backend/Code.gs`. Save.
3. Click **Deploy → New deployment → ⚙ Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the permissions (it needs Sheets + Drive), and copy the **Web app URL**.
5. Open `config.js` and paste the URL into `SCRIPT_URL`.

The first registration creates a **Dreamers** sheet tab with these columns:
Timestamp · Cosplayer Name · Past Cosplay · Details · Facebook · Phone · Proof Photos · Photo IDs · Status.
Photos are saved to a Drive folder called **Dreamers Cosplay Proofs**.

> If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the same URL keeps working.

## 2. Approving members

New rows are **Pending**. Set the **Status** cell to **Approved** (dropdown) and the member appears on the website's roster. Phone numbers are never sent to the website. Only you see them in the sheet.

## 3. Put the site online (free)

Upload the folder to any static host, e.g. **Netlify Drop** (drag the `dreamers` folder onto app.netlify.com/drop), **GitHub Pages**, or **Cloudflare Pages**. To test locally, just open `index.html`.

## Notes

- Until `config.js` has a URL, the form runs in demo mode and saves nothing.
- Photos are shrunk in the browser (max 1100px) before upload, up to 4 per member.
- Prefer Airtable? The same form payload (`name, character, details, facebook, phone, photos[]`) can be sent to an Airtable-backed endpoint instead. Ask and I'll swap the backend.
