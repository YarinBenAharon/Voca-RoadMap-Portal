/* =========================================================================
   The roadmap as a PDF, built in the browser.

   No library: a PDF of the standard Helvetica fonts is a few dozen plain
   text objects, written here uncompressed. A4 landscape, one table of
   capabilities grouped by release train.
   Every page carries a diagonal "CONFIDENTIAL" watermark and the export
   timestamp. Same fields as the Excel download: BR for everyone,
   requestor and pm never.

   The public page has its own variant (downloadPublicRoadmapPdf): the
   customer view grouped by section, an "AudioCodes" watermark and the
   export timestamp, and no confidentiality marking anywhere.

   Text is measured with a canvas in Helvetica/Arial, which share metrics,
   and written in WinAnsi encoding; characters outside it become "?".

   Not one of the byte-verified design assets, and not inlined into the
   published standalone file.
   ========================================================================= */

/* ── page and palette ─────────────────────────────────────────────────── */

const PDF_W = 842, PDF_H = 595, PDF_M = 36;               /* A4 landscape, points */
const PDF_INK = '0E1020', PDF_TEXT = '464C61', PDF_MUTED = '7C8397', PDF_LINE = 'E3E8F0';
const PDF_PHASE = {                                        /* accent, band fill: base.css phase colours */
  'p-now':   ['0E9E86', 'E1F4F0'],
  'p-next':  ['1E7FD4', 'E4EFFA'],
  'p-later': ['6C5CE0', 'EAE7FA'],
  'p-dir':   ['7C8397', 'EEF1F6']
};

/* ── text ─────────────────────────────────────────────────────────────── */

/* desc is HTML (<br>, <b>); the PDF wants plain text with line breaks */
function pdfPlain(html){
  const d = document.createElement('div');
  d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, '\n');
  return d.textContent;
}

/* Unicode code points WinAnsi puts in 0x80-0x9F */
const PDF_CP1252 = { 0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85, 0x2020:0x86,
  0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A, 0x2039:0x8B, 0x0152:0x8C, 0x017D:0x8E,
  0x2018:0x91, 0x2019:0x92, 0x201C:0x93, 0x201D:0x94, 0x2022:0x95, 0x2013:0x96, 0x2014:0x97,
  0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B, 0x0153:0x9C, 0x017E:0x9E, 0x0178:0x9F };

/* keep only what Helvetica can print; still Unicode, so it can be measured */
function pdfSafe(s){
  return Array.from(String(s == null ? '' : s).replace(/\r/g, '').replace(/\t/g, ' ')
    .replace(/[   ]/g, ' ').replace(/→/g, '->')).map(ch => {
      const c = ch.codePointAt(0);
      return c === 10 || (c >= 0x20 && c < 0x7F) || (c >= 0xA1 && c <= 0xFF) || PDF_CP1252[c] ? ch : '?';
    }).join('');
}

/* a PDF string literal, in WinAnsi bytes (one char per byte) */
function pdfStr(s){
  return '(' + Array.from(s).map(ch => {
    const c = ch.codePointAt(0);
    const b = c < 0x100 ? c : PDF_CP1252[c] || 0x3F;
    return b === 0x28 || b === 0x29 || b === 0x5C ? '\\' + ch : String.fromCharCode(b);
  }).join('') + ')';
}

const pdfMeasure = (() => {
  const ctx = document.createElement('canvas').getContext('2d');
  return (s, size, bold) => {
    ctx.font = (bold ? 'bold ' : '') + '100px Helvetica, Arial, "Liberation Sans", sans-serif';
    return ctx.measureText(s).width * size / 100;
  };
})();

/* split into lines no wider than w; honours \n, breaks over-long words */
function pdfWrap(text, size, bold, w){
  const out = [];
  pdfSafe(text).split('\n').forEach(para => {
    let line = '';
    para.split(/ +/).forEach(word => {
      const tryLine = line ? line + ' ' + word : word;
      if (pdfMeasure(tryLine, size, bold) <= w){ line = tryLine; return; }
      if (line) out.push(line);
      line = '';
      while (pdfMeasure(word, size, bold) > w){
        let n = word.length - 1;
        while (n > 1 && pdfMeasure(word.slice(0, n), size, bold) > w) n--;
        out.push(word.slice(0, n));
        word = word.slice(n);
      }
      line = word;
    });
    out.push(line);
  });
  return out;
}

/* ── drawing ──────────────────────────────────────────────────────────── */

function pdfRgb(hex){
  return [0, 2, 4].map(i => (parseInt(hex.substr(i, 2), 16) / 255).toFixed(3)).join(' ');
}
function pdfNum(n){ return (Math.round(n * 100) / 100).toString(); }

/* y runs top-down here, as on screen; converted to PDF's bottom-up on output */
function pdfCanvas(){
  const pages = [];
  let ops = null;
  return {
    pages,
    page(){ ops = []; pages.push(ops); },
    text(x, y, s, size, bold, color){
      ops.push(`BT /${bold ? 'F2' : 'F1'} ${pdfNum(size)} Tf ${pdfRgb(color || PDF_TEXT)} rg ` +
               `${pdfNum(x)} ${pdfNum(PDF_H - y)} Td ${pdfStr(s)} Tj ET`);
    },
    textRight(x, y, s, size, bold, color){
      this.text(x - pdfMeasure(s, size, bold), y, s, size, bold, color);
    },
    rect(x, y, w, h, color){
      ops.push(`${pdfRgb(color)} rg ${pdfNum(x)} ${pdfNum(PDF_H - y - h)} ${pdfNum(w)} ${pdfNum(h)} re f`);
    },
    hline(x1, x2, y, color){
      ops.push(`${pdfRgb(color)} RG 0.6 w ${pdfNum(x1)} ${pdfNum(PDF_H - y)} m ${pdfNum(x2)} ${pdfNum(PDF_H - y)} l S`);
    }
  };
}

/* diagonal across the page centre; drawn last and translucent, so it shows
   over the band fills without hiding the text under it */
function pdfWatermark(s, color){
  const size = 92, a = Math.PI / 6, cos = Math.cos(a), sin = Math.sin(a);
  const w = pdfMeasure(s, size, true), capH = size * 0.72;
  const x = PDF_W / 2 - (w / 2) * cos + (capH / 2) * sin;
  const y = PDF_H / 2 - (w / 2) * sin - (capH / 2) * cos;
  return `q /GS1 gs ${pdfRgb(color || 'C4553A')} rg BT /F2 ${size} Tf ` +
         `${[cos, sin, -sin, cos, x, y].map(pdfNum).join(' ')} Tm ${pdfStr(s)} Tj ET Q`;
}

/* ── document ─────────────────────────────────────────────────────────── */

function pdfStamp(d){
  const p = n => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-', ao = Math.abs(off);
  return {
    human: `${fmtDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`)}, ` +
           `${p(d.getHours())}:${p(d.getMinutes())} UTC${sign}${Math.floor(ao / 60)}${ao % 60 ? ':' + p(ao % 60) : ''}`,
    pdf: `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}` +
         `${p(d.getSeconds())}${sign}${p(Math.floor(ao / 60))}'${p(ao % 60)}'`
  };
}

function roadmapPdfPages(data, stamp){
  const m = data.meta, trains = data.trains || [];
  const title = m.product + ' Release Roadmap';
  const FS = 8, LH = 10, PAD = 4, X0 = PDF_M, X1 = PDF_W - PDF_M, BOTTOM = PDF_H - PDF_M - 18;

  /* column widths sum to the 770pt content width */
  const cols = [['Capability', 150, 'name'], ['BR', 64, 'br'], ['Description', 316, 'desc'],
                ['Area', 86, 'area'], ['Used by', 104,'audience'], ['Customer facing', 50, 'cf']];

  const c = pdfCanvas();
  let y = 0;

  function newPage(first){
    c.page();
    if (first){
      c.text(X0, PDF_M + 18, title, 20, true, PDF_INK);
      y = PDF_M + 34;
      pdfWrap(INTERNAL_NOTICE, 8.5, true, X1 - X0).forEach(l => { c.text(X0, y, l, 8.5, true, PDF_INK); y += 11; });
      y += 3;
      pdfWrap(DISCLAIMER, 8.5, false, X1 - X0).forEach(l => { c.text(X0, y, l, 8.5, false, PDF_MUTED); y += 11; });
      y += 6;
      c.text(X0, y, `Current release ${m.currentRelease || '-'}   |   Next release ${m.nextTrain || '-'}   |   ` +
                    `Updated ${m.updated || '-'}   |   Exported ${stamp.human}`, 8.5, true, PDF_TEXT);
      y += 16;
    } else {
      c.text(X0, PDF_M + 6, title, 9, true, PDF_INK);
      c.textRight(X1, PDF_M + 6, 'Confidential', 9, true, 'C4553A');
      y = PDF_M + 18;
    }
  }

  function headerRow(){
    const labels = cols.map(([label, w]) => pdfWrap(label, FS, true, w - 2 * PAD));
    const h = Math.max(...labels.map(l => l.length)) * LH + 2 * PAD;
    c.rect(X0, y, X1 - X0, h, 'E8ECF3');
    let x = X0;
    labels.forEach((ls, ci) => {
      ls.forEach((l, li) => c.text(x + PAD, y + PAD + FS - 1 + li * LH, l, FS, true, PDF_INK));
      x += cols[ci][1];
    });
    y += h;
  }

  function band(t, more){
    const [accent, fill] = PDF_PHASE[phaseClass(t.phase, t.status)] || PDF_PHASE['p-later'];
    const h = LH + 2 * PAD + 2;
    c.rect(X0, y, X1 - X0, h, fill);
    c.rect(X0, y, 3, h, accent);
    const n = (t.items || []).length;
    const label = pdfSafe(`${t.ver}   ${t.quarter || ''}   ${t.status || ''}` + (t.head ? `   ${t.head}` : '') +
                          (more ? '   (continued)' : `   (${n} ${n === 1 ? 'capability' : 'capabilities'})`));
    c.text(X0 + 10, y + PAD + FS, label, FS + 1, true, PDF_INK);
    y += h;
  }

  function cellLines(it){
    return cols.map(([, w, key]) => {
      const v = key === 'name' ? it.name : key === 'br' ? it.br : key === 'desc' ? pdfPlain(it.desc)
              : key === 'area' ? catLabel(data, it.cat) : key === 'audience' ? it.audience
              : (it.cf ? 'Yes' : 'No');
      return pdfWrap(v || '', FS, key === 'name', w - 2 * PAD);
    });
  }

  newPage(true);
  headerRow();
  trains.forEach(t => {
    const items = t.items || [];
    const rows = items.map(cellLines);
    const first = rows.length ? Math.max(...rows[0].map(l => l.length)) * LH + 2 * PAD : 0;
    if (y + 2 * LH + first > BOTTOM){ newPage(false); headerRow(); }
    band(t, false);
    if (!items.length){
      c.text(X0 + PAD, y + PAD + FS, 'No capabilities listed yet.', FS, false, PDF_MUTED);
      y += LH + 2 * PAD;
    }
    rows.forEach(lines => {
      const h = Math.max(...lines.map(l => l.length)) * LH + 2 * PAD;
      if (y + h > BOTTOM){ newPage(false); headerRow(); band(t, true); }
      let x = X0;
      lines.forEach((ls, ci) => {
        ls.forEach((l, li) => c.text(x + PAD, y + PAD + FS + li * LH, l, FS, ci === 0, ci === 0 ? PDF_INK : PDF_TEXT));
        x += cols[ci][1];
      });
      y += h;
      c.hline(X0, X1, y, PDF_LINE);
    });
    y += 8;
  });

  /* footer and watermark, now that the page count is known */
  c.pages.forEach((ops, i) => {
    const fy = PDF_H - PDF_M + 4;
    ops.push(`${pdfRgb(PDF_LINE)} RG 0.6 w ${X0} ${PDF_H - fy + 12} m ${X1} ${PDF_H - fy + 12} l S`);
    ops.push(`BT /F1 7.5 Tf ${pdfRgb(PDF_MUTED)} rg ${X0} ${PDF_H - fy} Td ` +
             `${pdfStr(pdfSafe(`Confidential  |  ${m.vendor || ''} ${title}  |  Exported ${stamp.human}`))} Tj ET`);
    const pg = `Page ${i + 1} of ${c.pages.length}`;
    ops.push(`BT /F1 7.5 Tf ${pdfRgb(PDF_MUTED)} rg ${pdfNum(X1 - pdfMeasure(pg, 7.5))} ${PDF_H - fy} Td ${pdfStr(pg)} Tj ET`);
    ops.push(pdfWatermark('CONFIDENTIAL'));
  });
  return c.pages;
}

/* ── file ─────────────────────────────────────────────────────────────── */

function pdfFile(pages, info){
  const objs = [];                                          /* objs[i] is object i + 1 */
  const add = body => { objs.push(body); return objs.length; };
  const catalog = add(null), tree = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const gs = add('<< /Type /ExtGState /ca 0.09 >>');
  const kids = pages.map(ops => {
    const stream = ops.join('\n');
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] ` +
               `/Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << /GS1 ${gs} 0 R >> >> ` +
               `/Contents ${content} 0 R >>`);
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
  objs[tree - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const meta = add(`<< /Title ${pdfStr(pdfSafe(info.title))} /Subject ${pdfStr(info.subject || 'Confidential')} ` +
                   `/Producer ${pdfStr('Voca CIC roadmap portal')} /CreationDate ${pdfStr(info.date)} >>`);

  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = objs.map((body, i) => { const at = out.length; out += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
         offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
         `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${meta} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);                /* every char is already one byte */
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

/* ── entry point ──────────────────────────────────────────────────────── */

function downloadRoadmapPdf(data){
  const now = new Date(), stamp = pdfStamp(now);
  const blob = pdfFile(roadmapPdfPages(data, stamp),
                       { title: data.meta.product + ' Release Roadmap', date: stamp.pdf });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (data.meta.product + ' roadmap ' + now.toISOString().slice(0, 10))
    .replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, '_') + '.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ── public variant ───────────────────────────────────────────────────── */

const PDF_SECTION = {                                      /* accent, band fill */
  released: PDF_PHASE['p-now'], progress: PDF_PHASE['p-next'],
  upcoming: PDF_PHASE['p-later'], planned: PDF_PHASE['p-dir']
};

/* "2027-03" -> "March 2027" */
function monthLabel(ym){
  const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
  return m ? M[Number(m[2]) - 1] + ' ' + m[1] : '';
}

/* view: the /api/public-roadmap body, its sections already filtered by the page */
function publicRoadmapPdfPages(view, stamp){
  const title = view.product + ' Roadmap';
  const FS = 8, LH = 10, PAD = 4, X0 = PDF_M, X1 = PDF_W - PDF_M, BOTTOM = PDF_H - PDF_M - 18;
  const cols = [['Capability', 170], ['Description', 340], ['Area', 100], ['Month', 64], ['Requires', 96]];
  const cat = id => { const c = (view.categories || []).find(c => c.id === id); return c ? c.label : id; };

  const c = pdfCanvas();
  let y = 0;

  function newPage(first){
    c.page();
    if (first){
      c.text(X0, PDF_M + 18, title, 20, true, PDF_INK);
      y = PDF_M + 34;
      pdfWrap(DISCLAIMER, 8.5, false, X1 - X0).forEach(l => { c.text(X0, y, l, 8.5, false, PDF_MUTED); y += 11; });
      y += 6;
      c.text(X0, y, (view.updated ? `Updated ${view.updated}   |   ` : '') + `Exported ${stamp.human}`, 8.5, true, PDF_TEXT);
      y += 16;
    } else {
      c.text(X0, PDF_M + 6, title, 9, true, PDF_INK);
      y = PDF_M + 18;
    }
  }

  function headerRow(){
    const h = LH + 2 * PAD;
    c.rect(X0, y, X1 - X0, h, 'E8ECF3');
    let x = X0;
    cols.forEach(([label, w]) => { c.text(x + PAD, y + PAD + FS - 1, label, FS, true, PDF_INK); x += w; });
    y += h;
  }

  function band(s, more){
    const [accent, fill] = PDF_SECTION[s.id] || PDF_PHASE['p-later'];
    const h = LH + 2 * PAD + 2, n = s.items.length;
    c.rect(X0, y, X1 - X0, h, fill);
    c.rect(X0, y, 3, h, accent);
    c.text(X0 + 10, y + PAD + FS, pdfSafe(s.label + (more ? '   (continued)'
      : `   (${n} ${n === 1 ? 'capability' : 'capabilities'})`)), FS + 1, true, PDF_INK);
    y += h;
  }

  const cellLines = it => [it.name, pdfPlain(it.desc), cat(it.cat), monthLabel(it.month), it.requires]
    .map((v, i) => pdfWrap(v || '', FS, i === 0, cols[i][1] - 2 * PAD));

  newPage(true);
  headerRow();
  view.sections.filter(s => s.items.length).forEach(s => {
    const rows = s.items.map(cellLines);
    const first = Math.max(...rows[0].map(l => l.length)) * LH + 2 * PAD;
    if (y + 2 * LH + first > BOTTOM){ newPage(false); headerRow(); }
    band(s, false);
    rows.forEach(lines => {
      const h = Math.max(...lines.map(l => l.length)) * LH + 2 * PAD;
      if (y + h > BOTTOM){ newPage(false); headerRow(); band(s, true); }
      let x = X0;
      lines.forEach((ls, ci) => {
        ls.forEach((l, li) => c.text(x + PAD, y + PAD + FS + li * LH, l, FS, ci === 0, ci === 0 ? PDF_INK : PDF_TEXT));
        x += cols[ci][1];
      });
      y += h;
      c.hline(X0, X1, y, PDF_LINE);
    });
    y += 8;
  });

  c.pages.forEach((ops, i) => {
    const fy = PDF_H - PDF_M + 4;
    ops.push(`${pdfRgb(PDF_LINE)} RG 0.6 w ${X0} ${PDF_H - fy + 12} m ${X1} ${PDF_H - fy + 12} l S`);
    ops.push(`BT /F1 7.5 Tf ${pdfRgb(PDF_MUTED)} rg ${X0} ${PDF_H - fy} Td ` +
             `${pdfStr(pdfSafe(`AudioCodes  |  ${title}  |  Exported ${stamp.human}`))} Tj ET`);
    const pg = `Page ${i + 1} of ${c.pages.length}`;
    ops.push(`BT /F1 7.5 Tf ${pdfRgb(PDF_MUTED)} rg ${pdfNum(X1 - pdfMeasure(pg, 7.5))} ${PDF_H - fy} Td ${pdfStr(pg)} Tj ET`);
    ops.push(pdfWatermark('AudioCodes', '7C8397'));
  });
  return c.pages;
}

function downloadPublicRoadmapPdf(view){
  const now = new Date(), stamp = pdfStamp(now);
  const blob = pdfFile(publicRoadmapPdfPages(view, stamp),
                       { title: view.product + ' Roadmap', subject: 'Product roadmap', date: stamp.pdf });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (view.product + ' roadmap ' + now.toISOString().slice(0, 10))
    .replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, '_') + '.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
