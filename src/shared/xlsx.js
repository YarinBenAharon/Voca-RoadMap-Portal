/* =========================================================================
   The roadmap as an Excel workbook, built in the browser.

   No library: an .xlsx file is a zip of a few XML parts, written here with
   inline strings and stored (uncompressed) zip entries. It exports the
   fields the board shows plus a BR column, for every viewer (/api/roadmap
   answers AudioCodes accounts only). requestor and pm are shown on screen
   but deliberately never exported: files travel, and requestor holds
   customer names. Each release train's rows get their own fill colour.

   Not one of the byte-verified design assets, and not inlined into the
   published standalone file.
   ========================================================================= */

/* ── content ──────────────────────────────────────────────────────────── */

/* desc is HTML (<br>, <b>); a cell wants plain text with line breaks */
function plainText(html){
  const d = document.createElement('div');
  d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, '\n');
  return d.textContent;
}

function roadmapSheets(data){
  const trains = data.trains || [];
  /* the API strips Internal R&D items for anyone not entitled to them, so the
     column appears only for editors and the R&D group, when there are any */
  const rnd = trains.some(t => (t.items || []).some(it => it.rnd === true));
  const head = ['Release train', 'Target quarter', 'Confidence', 'Capability', 'BR',
                'Description', 'Area', 'Used by','Customer facing'].concat(rnd ? ['Internal R&D'] : [], ['Delivered in build']);
  const rows = [head], bands = [null];
  trains.forEach((t, ti) => (t.items || []).forEach(it => {
    rows.push([t.ver, t.quarter, t.status, it.name, it.br || '',
               plainText(it.desc), catLabel(data, it.cat), it.audience || '', it.cf ? 'Yes' : 'No']
               .concat(rnd ? [it.rnd === true ? 'Yes' : 'No'] : [], [it.patch || '']));
    bands.push(ti % TRAIN_FILLS.length);
  }));
  return [
    { name: 'Roadmap', rows, bands,
      widths: [13, 20, 15, 42, 22, 90, 26, 30, 15].concat(rnd ? [14] : [], [17]),
      wrap: [head.indexOf('Description')] }
  ];
}

/* ── workbook parts ───────────────────────────────────────────────────── */

function xmlEsc(s){
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function colName(i){
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s;
  return s;
}

/* One light fill per release train, in train order; repeats after ten trains. */
const TRAIN_FILLS = ['DCEBFB', 'DDF3EE', 'ECE7FB', 'FCEBD5', 'E3F4DC',
                     'FBE0E6', 'DDF1F8', 'FFF4CC', 'EFE4F6', 'E6EBF2'];

/* styles.xml cellXfs: 0 plain, 1 header (bold on grey), 2 plain wrapped, all top-aligned;
   then per train fill k: 3 + 2k plain, 4 + 2k wrapped */
function sheetXML(sh){
  const last = colName(sh.rows[0].length - 1) + sh.rows.length;
  const cols = sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const body = sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
    const wrap = sh.wrap.indexOf(ci) !== -1;
    const band = sh.bands ? sh.bands[ri] : null;
    const s = ri === 0 ? 1 : band == null ? (wrap ? 2 : 0) : 3 + 2 * band + (wrap ? 1 : 0);
    return `<c r="${colName(ci)}${ri + 1}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  }).join('') + '</row>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
}

function workbookParts(sheets){
  const ns = 'http://schemas.openxmlformats.org';
  const parts = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Types xmlns="${ns}/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Relationships xmlns="${ns}/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      '</Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>` +
      sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Relationships xmlns="${ns}/package/2006/relationships">` +
      sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<styleSheet xmlns="${ns}/spreadsheetml/2006/main">` +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      `<fills count="${3 + TRAIN_FILLS.length}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
      ['E8ECF3'].concat(TRAIN_FILLS).map(rgb =>
        `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`).join('') +
      '</fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FFFFFFFF"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${3 + 2 * TRAIN_FILLS.length}">` +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      TRAIN_FILLS.map((_, k) => [false, true].map(wrap =>
        `<xf numFmtId="0" fontId="0" fillId="${3 + k}" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">` +
        `<alignment vertical="top"${wrap ? ' wrapText="1"' : ''}/></xf>`).join('')).join('') +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
  };
  sheets.forEach((s, i) => { parts['xl/worksheets/sheet' + (i + 1) + '.xml'] = sheetXML(s); });
  return parts;
}

/* ── zip (stored entries) ─────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zipStored(files){
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let offset = 0;
  Object.keys(files).forEach(name => {
    const nameB = enc.encode(name), data = enc.encode(files[name]), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034B50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, nameB.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014B50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
    cen.setUint16(28, nameB.length, true); cen.setUint32(42, offset, true);
    chunks.push(local, nameB, data);
    central.push(cen, nameB);
    offset += 30 + nameB.length + data.length;
  });
  const size = central.reduce((a, c) => a + c.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054B50, true);
  end.setUint16(8, central.length / 2, true); end.setUint16(10, central.length / 2, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob(chunks.concat(central, [end]),
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ── entry point ──────────────────────────────────────────────────────── */

function downloadRoadmapXlsx(data){
  const blob = zipStored(workbookParts(roadmapSheets(data)));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (data.meta.product + ' roadmap ' + new Date().toISOString().slice(0, 10))
    .replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, '_') + '.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
