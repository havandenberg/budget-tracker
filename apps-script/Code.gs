// Morcego Budget — Google Apps Script backend
//
// Sheet tabs (auto-created on first run):
//   categories   — expense & income projected amounts  ← edit "projected", "label", "due"
//   debt         — debt balances                       ← edit "label", "amount"
//   yearly       — yearly expense amounts              ← edit "label", "amount"
//   links        — quick links                         ← edit "label", "url"
//   transactions — every transaction logged            ← edit "name", "amount", "date", "notes"
//   notes        — monthly notes                       ← edit "text"
//
// DO NOT edit the "id", "catId", "type", "year", "month" columns — those are internal keys.
// Month numbers are 1–12 (January = 1).

// ── Sheet helpers ─────────────────────────────────────────────────────────────

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const hdr = sh.getRange(1, 1, 1, headers.length);
    hdr.setValues([headers]);
    hdr.setFontWeight("bold");
    hdr.setBackground("#f3e8ff");
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows(sh) {
  const vals = sh.getDataRange().getValues();
  if (vals.length <= 1) return [];
  const headers = vals[0].map(String);
  return vals.slice(1)
    .filter(row => row.some(cell => cell !== "" && cell !== null))
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

function writeRows(sh, headers, rows) {
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  if (rows.length === 0) return;
  sh.getRange(2, 1, rows.length, headers.length)
    .setValues(rows.map(row => headers.map(h => {
      const v = row[h];
      return (v === null || v === undefined) ? "" : v;
    })));
}

// ── doGet: read sheets → return JSON the app expects ─────────────────────────

function doGet() {
  try {
    const result = {};

    // ── Categories (exp + inc defs) ──
    const catSh = getOrCreateSheet("categories", ["type","id","label","projected","due"]);
    const cats  = readRows(catSh);
    result["mb:exp"] = JSON.stringify(
      cats.filter(r => String(r.type) === "exp").map(r => ({
        id:        String(r.id),
        label:     String(r.label),
        projected: Number(r.projected) || 0,
        ...(r.due !== "" && r.due !== null ? { due: Number(r.due) } : {}),
      }))
    );
    result["mb:inc"] = JSON.stringify(
      cats.filter(r => String(r.type) === "inc").map(r => ({
        id:        String(r.id),
        label:     String(r.label),
        projected: Number(r.projected) || 0,
      }))
    );

    // ── Debt ──
    const debtSh = getOrCreateSheet("debt", ["id","label","amount"]);
    result["mb:debt"] = JSON.stringify(
      readRows(debtSh).map(r => ({
        id: String(r.id), label: String(r.label), amount: Number(r.amount) || 0,
      }))
    );

    // ── Yearly expenses ──
    const yrSh = getOrCreateSheet("yearly", ["id","label","amount"]);
    result["mb:yearly"] = JSON.stringify(
      readRows(yrSh).map(r => ({
        id: String(r.id), label: String(r.label), amount: Number(r.amount) || 0,
      }))
    );

    // ── Links ──
    const linkSh = getOrCreateSheet("links", ["id","label","url"]);
    result["mb:links"] = JSON.stringify(
      readRows(linkSh).map(r => ({
        id: String(r.id), label: String(r.label), url: String(r.url),
      }))
    );

    // ── Transactions and notes — group by year ──
    const txnSh = getOrCreateSheet("transactions", ["year","month","id","catId","type","name","amount","date","notes"]);
    const ntsSh = getOrCreateSheet("notes",        ["year","month","text"]);

    const txns = readRows(txnSh);
    const nts  = readRows(ntsSh);

    // Collect all years present
    const years = new Set([
      ...txns.map(r => Number(r.year)),
      ...nts.map(r => Number(r.year)),
    ]);
    years.delete(0); years.delete(NaN);

    years.forEach(year => {
      const data = {};

      // Transactions — sheet month is 1-indexed, app month key is 0-indexed
      txns.filter(r => Number(r.year) === year).forEach(r => {
        const m = Number(r.month) - 1;
        if (!data[m]) data[m] = { transactions: [] };
        data[m].transactions.push({
          id:     String(r.id),
          catId:  String(r.catId),
          type:   String(r.type),
          name:   String(r.name   || ""),
          amount: Number(r.amount) || 0,
          date:   String(r.date   || ""),
          notes:  String(r.notes  || ""),
        });
      });

      result[`mb:${year}:data`] = JSON.stringify(data);

      // Notes
      const yearNotes = {};
      nts.filter(r => Number(r.year) === year).forEach(r => {
        const m = Number(r.month) - 1;
        const text = String(r.text || "").trim();
        if (text) yearNotes[m] = text;
      });
      result[`mb:${year}:notes`] = JSON.stringify(yearNotes);
    });

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doPost: receive app JSON → write to sheets ────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // ── Categories ──
    const expDefs = payload["mb:exp"]    ? JSON.parse(payload["mb:exp"])    : null;
    const incDefs = payload["mb:inc"]    ? JSON.parse(payload["mb:inc"])    : null;
    if (expDefs !== null || incDefs !== null) {
      const catSh = getOrCreateSheet("categories", ["type","id","label","projected","due"]);
      const rows = [
        ...(expDefs || []).map(d => ({ type:"exp", id:d.id, label:d.label, projected:d.projected, due:d.due||"" })),
        ...(incDefs || []).map(d => ({ type:"inc", id:d.id, label:d.label, projected:d.projected, due:"" })),
      ];
      writeRows(catSh, ["type","id","label","projected","due"], rows);
    }

    // ── Debt ──
    if (payload["mb:debt"]) {
      const debtSh = getOrCreateSheet("debt", ["id","label","amount"]);
      writeRows(debtSh, ["id","label","amount"], JSON.parse(payload["mb:debt"]));
    }

    // ── Yearly ──
    if (payload["mb:yearly"]) {
      const yrSh = getOrCreateSheet("yearly", ["id","label","amount"]);
      writeRows(yrSh, ["id","label","amount"], JSON.parse(payload["mb:yearly"]));
    }

    // ── Links ──
    if (payload["mb:links"]) {
      const linkSh = getOrCreateSheet("links", ["id","label","url"]);
      writeRows(linkSh, ["id","label","url"], JSON.parse(payload["mb:links"]));
    }

    // ── Transactions and notes ──
    const txnSh = getOrCreateSheet("transactions", ["year","month","id","catId","type","name","amount","date","notes"]);
    const ntsSh = getOrCreateSheet("notes",        ["year","month","text"]);

    const allTxns  = [];
    const allNotes = [];

    Object.keys(payload).forEach(k => {
      // mb:{year}:data
      const dm = k.match(/^mb:(\d{4}):data$/);
      if (dm) {
        const year = Number(dm[1]);
        const data = JSON.parse(payload[k]);
        Object.entries(data).forEach(([monthKey, md]) => {
          const month = Number(monthKey) + 1; // convert to 1-indexed for sheet
          (md.transactions || []).forEach(tx => {
            allTxns.push({
              year, month,
              id:     tx.id,
              catId:  tx.catId,
              type:   tx.type,
              name:   tx.name   || "",
              amount: tx.amount || 0,
              date:   tx.date   || "",
              notes:  tx.notes  || "",
            });
          });
        });
        return;
      }

      // mb:{year}:notes
      const nm = k.match(/^mb:(\d{4}):notes$/);
      if (nm) {
        const year = Number(nm[1]);
        const notes = JSON.parse(payload[k]);
        Object.entries(notes).forEach(([monthKey, text]) => {
          if (text && String(text).trim()) {
            allNotes.push({ year, month: Number(monthKey) + 1, text });
          }
        });
      }
    });

    writeRows(txnSh, ["year","month","id","catId","type","name","amount","date","notes"], allTxns);
    writeRows(ntsSh, ["year","month","text"],                                              allNotes);

    return ContentService
      .createTextOutput('{"ok":true}')
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
