// Post-processes a pandoc-generated .docx in place: rescales tables to the text
// area, bolds header rows, fixes heading sizes, strips anchor bookmarks, tunes
// code-block spacing, flattens named styles into direct formatting, and embeds
// the Cascadia Code font so code renders where the font is not installed. Pure
// Node — no external zip dependency — so it runs on any OS.
//
// Ported from the original fix_tables.py + embed_fonts.py. A .docx is a ZIP of
// XML parts; we read every entry, rewrite the parts we need, add the font
// binaries, and repackage.
//
// Usage (standalone):  node docx-postprocess.mjs <path-to-docx>
// Or import { fixPandocTables } and call it directly.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateRawSync, deflateRawSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// Padding after tables and code blocks (twips). 280 ≈ 19.5pt.
const SPACING_AFTER = 280;

const SPACER_AFTER =
  `<w:p><w:pPr><w:spacing w:before="0" w:after="${SPACING_AFTER}"/></w:pPr>` +
  `<w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:r></w:p>`;

// ---------------------------------------------------------------------------
// Minimal ZIP reader / writer (deflate only). docx parts are small, so we fully
// decompress every entry and re-deflate on write — simpler and robust against
// data descriptors since sizes are read from the central directory.
// ---------------------------------------------------------------------------

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (~crc) >>> 0;
}

function readZip(buf) {
  // Locate the End Of Central Directory record by scanning backwards.
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('not a zip file: no EOCD record found');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // offset of central directory

  const entries = [];
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory header');
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // Jump to the local header to find where the data actually starts.
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('bad local file header');
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = buf.subarray(dataStart, dataStart + compressedSize);
    const content = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);

    entries.push({ name, content });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function writeZip(entries) {
  const DOS_DATE = 0x0021; // 1980-01-01, a valid fixed date
  const localParts = [];
  const central = [];
  let offset = 0;

  for (const { name, content } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(content);
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(DOS_DATE, 12); // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    localParts.push(local, nameBuf, deflated);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(8, 10); // method
    cd.writeUInt16LE(0, 12); // mod time
    cd.writeUInt16LE(DOS_DATE, 14); // mod date
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(content.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk number
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(offset, 42); // local header offset
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + deflated.length;
  }

  const centralBuf = Buffer.concat(central);
  const localBuf = Buffer.concat(localParts);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with CD
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16); // CD offset = end of local data
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localBuf, centralBuf, eocd]);
}

// ---------------------------------------------------------------------------
// XML transforms (ported 1:1 from fix_tables.py). Python str.replace replaces
// ALL occurrences, so those become replaceAll here; Python re.sub becomes a
// global-flag .replace.
// ---------------------------------------------------------------------------

function computeTextWidth(doc) {
  const pageWidth = /<w:pgSz\b[^>]* w:w="(\d+)"/.exec(doc);
  const leftMargin = /<w:pgMar\b[^>]* w:left="(\d+)"/.exec(doc);
  const rightMargin = /<w:pgMar\b[^>]* w:right="(\d+)"/.exec(doc);
  if (!pageWidth || !leftMargin || !rightMargin) return null;
  return Number(pageWidth[1]) - Number(leftMargin[1]) - Number(rightMargin[1]);
}

function scaleTblGrid(gridXml, textWidth) {
  const columnWidths = [...gridXml.matchAll(/<w:gridCol w:w="(\d+)"/g)].map((m) => Number(m[1]));
  if (columnWidths.length === 0) return gridXml;
  const currentTotal = columnWidths.reduce((a, b) => a + b, 0);
  if (currentTotal === 0) return gridXml;
  const scaled = columnWidths.map((w) => Math.round((w * textWidth) / currentTotal));
  scaled[scaled.length - 1] += textWidth - scaled.reduce((a, b) => a + b, 0);
  let result = gridXml;
  for (let i = 0; i < columnWidths.length; i++) {
    result = result.replace(
      `<w:gridCol w:w="${columnWidths[i]}" />`,
      `<w:gridCol w:w="${scaled[i]}" />`,
    );
  }
  return result;
}

function boldFirstRow(doc) {
  function makeRowBold(firstRow) {
    let bolded = firstRow.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, (rpr) => {
      if (!rpr.includes('<w:b ') && !rpr.includes('<w:b/>')) {
        return rpr.replaceAll('</w:rPr>', '<w:b/><w:bCs/></w:rPr>');
      }
      return rpr;
    });
    bolded = bolded.replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, (run) => {
      if (!run.includes('<w:rPr>')) {
        const openingEnd = run.indexOf('>') + 1;
        return run.slice(0, openingEnd) + '<w:rPr><w:b/><w:bCs/></w:rPr>' + run.slice(openingEnd);
      }
      return run;
    });
    return bolded;
  }

  return doc.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tblXml) => {
    const tr = /<w:tr\b[\s\S]*?<\/w:tr>/.exec(tblXml);
    if (!tr) return tblXml;
    const start = tr.index;
    const end = tr.index + tr[0].length;
    return tblXml.slice(0, start) + makeRowBold(tr[0]) + tblXml.slice(end);
  });
}

function alignH6Right(styles) {
  const h6 = /<w:style\b[^>]*w:styleId="Heading6"[\s\S]*?<\/w:style>/.exec(styles);
  if (!h6) return styles;
  const updated = h6[0].replace(/<w:pPr>[\s\S]*?<\/w:pPr>/g, (ppr) =>
    ppr.includes('w:jc') ? ppr : ppr.replaceAll('</w:pPr>', '<w:jc w:val="right"/></w:pPr>'),
  );
  return styles.slice(0, h6.index) + updated + styles.slice(h6.index + h6[0].length);
}

// ---------------------------------------------------------------------------
// Flatten named-style formatting into DIRECT formatting. Word and LibreOffice
// honour named paragraph/table styles, but Google Docs (and some converters)
// discard the custom style *definitions* on import and render close to
// unstyled. Baking the key properties directly onto runs and cells makes the
// styling survive every viewer. Values are parsed from the embedded styles.xml
// so this stays agnostic to whichever reference doc was used.
// ---------------------------------------------------------------------------

function styleBlock(styles, id) {
  const m = new RegExp(`<w:style\\b[^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`).exec(styles);
  return m ? m[0] : '';
}

function innerRpr(block) {
  const m = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(block);
  return m ? m[1] : '';
}

function propElements(inner) {
  return inner.match(/<w:[A-Za-z]+\b[^>]*\/>/g) || [];
}

// Return the property elements from `inner` whose tag is not already present in
// `existing` — so merging never produces duplicate rPr children.
function missingProps(existing, inner) {
  return propElements(inner)
    .filter((el) => {
      const tag = /<(w:[A-Za-z]+)/.exec(el)[1];
      return !new RegExp(`<${tag}[\\s/>]`).test(existing);
    })
    .join('');
}

function applyRunProps(run, inner) {
  if (/<w:rPr>/.test(run)) {
    return run.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (m, ex) => `<w:rPr>${ex}${missingProps(ex, inner)}</w:rPr>`);
  }
  const i = run.indexOf('>') + 1;
  return run.slice(0, i) + `<w:rPr>${inner}</w:rPr>` + run.slice(i);
}

function ensureCellShd(rowXml, shd) {
  if (!shd) return rowXml;
  let x = rowXml.replaceAll('<w:tcPr />', `<w:tcPr>${shd}</w:tcPr>`);
  x = x.replace(/<w:tcPr>(?!<w:shd)/g, `<w:tcPr>${shd}`);
  return x;
}

function ensureRunColor(rowXml, colorEl) {
  if (!colorEl) return rowXml;
  return rowXml.replace(/<w:rPr>((?:(?!<\/w:rPr>)[\s\S])*?)<\/w:rPr>/g, (m, inr) =>
    /<w:color\b/.test(inr) ? m : `<w:rPr>${inr}${colorEl}</w:rPr>`,
  );
}

function inlineDirectFormatting(doc, styles) {
  // Headings — bake the heading style's run properties onto each heading run.
  const headingRpr = {};
  for (const id of ['Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6']) {
    const inner = innerRpr(styleBlock(styles, id));
    if (inner) headingRpr[id] = inner;
  }
  doc = doc.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (para) => {
    const ps = /<w:pStyle w:val="(Heading[1-6])"\s*\/>/.exec(para);
    if (!ps || !headingRpr[ps[1]]) return para;
    return para.replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, (run) => applyRunProps(run, headingRpr[ps[1]]));
  });

  // Tables — bake borders and header-row fill + text colour from the default
  // table style onto the table and its cells. Body rows are left plain (no row
  // banding), and only the first (header) row is styled.
  const tbl = styleBlock(styles, 'Table');
  const borders = (/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/.exec(tbl) || [''])[0];
  const firstRow = (/<w:tblStylePr w:type="firstRow">[\s\S]*?<\/w:tblStylePr>/.exec(tbl) || [''])[0];
  const headShd = (/<w:shd\b[^>]*\/>/.exec(firstRow) || [''])[0];
  const headColor = (/<w:color\b[^>]*\/>/.exec(firstRow) || [''])[0];

  doc = doc.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (table) => {
    if (borders && !table.includes('<w:tblBorders>')) {
      table = table.replace('<w:tblLook', `${borders}<w:tblLook`);
    }
    let rowIndex = 0;
    return table.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (tr) => {
      const isHeader = rowIndex === 0;
      rowIndex++;
      return isHeader ? ensureRunColor(ensureCellShd(tr, headShd), headColor) : tr;
    });
  });

  return doc;
}

// ---------------------------------------------------------------------------
// Embed the Cascadia Code font into the package so code blocks render correctly
// on machines where the font is not installed. Pandoc rebuilds the output from
// its own template and discards any font binaries baked into the reference doc,
// so the font must be injected into the FINAL document here.
//
// Ported from embed_fonts.py. Cascadia Code is SIL OFL (embedding permitted);
// the bundled .ttf files are a Latin subset (full ASCII coverage) — what code
// styles need. Raw fonts live in scripts/fonts/ and are obfuscated per the
// OOXML spec (XOR the first 32 bytes with the reversed 16-byte GUID) at runtime.
// ---------------------------------------------------------------------------

const FONT_FAMILY = 'Cascadia Code';
const FONTS_DIR = join(SCRIPT_DIR, 'fonts');
const FONT_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font';
// slot (fontTable embed element) → base filename (no extension)
const FONT_SLOTS = {
  embedRegular: 'CascadiaCode-Regular',
  embedBold: 'CascadiaCode-Bold',
  embedItalic: 'CascadiaCode-Italic',
  embedBoldItalic: 'CascadiaCode-BoldItalic',
};

function obfuscateFont(data, guidHex) {
  const key = Buffer.from(guidHex, 'hex'); // 16 bytes
  const d = Buffer.from(data); // copy — never mutate the cached read
  for (let i = 0; i < 32; i++) d[i] ^= key[15 - (i % 16)];
  return d;
}

function getEntry(entries, name) {
  return entries.find((e) => e.name === name);
}

function embedFonts(entries) {
  const fontTable = getEntry(entries, 'word/fontTable.xml');
  if (!fontTable) return; // nothing to attach fonts to

  // Only embed when the document actually references the family (the reference
  // doc's code style names it), so non-code docs are not bloated by ~300KB.
  const stylesXml = getEntry(entries, 'word/styles.xml')?.content.toString('utf8') ?? '';
  let ftXml = fontTable.content.toString('utf8');
  if (!stylesXml.includes(FONT_FAMILY) && !ftXml.includes(FONT_FAMILY)) return;

  // 1. Obfuscate each weight with a fresh per-file GUID and add the binary part.
  const embeds = [];
  let i = 0;
  for (const slot of Object.keys(FONT_SLOTS)) {
    const base = FONT_SLOTS[slot];
    const ttfPath = join(FONTS_DIR, `${base}.ttf`);
    if (!existsSync(ttfPath)) return; // fonts missing → skip rather than corrupt
    const g = randomBytes(16).toString('hex').toUpperCase();
    entries.push({ name: `word/fonts/${base}.odttf`, content: obfuscateFont(readFileSync(ttfPath), g) });
    const guid = `{${g.slice(0, 8)}-${g.slice(8, 12)}-${g.slice(12, 16)}-${g.slice(16, 20)}-${g.slice(20, 32)}}`;
    embeds.push({ slot, file: `${base}.odttf`, guid, relId: `rId${9100 + i}` });
    i++;
  }

  // 2. fontTable.xml — replace any existing Cascadia entry, add one with embeds.
  ftXml = ftXml.replace(new RegExp(`<w:font w:name="${FONT_FAMILY}">[\\s\\S]*?</w:font>`), '');
  const embedXml = embeds.map((e) => `<w:${e.slot} r:id="${e.relId}" w:fontKey="${e.guid}"/>`).join('');
  const fontXml =
    `<w:font w:name="${FONT_FAMILY}"><w:charset w:val="00"/><w:family w:val="modern"/>` +
    `<w:pitch w:val="fixed"/><w:sig w:usb0="00000003" w:usb1="00000000" w:usb2="00000000" ` +
    `w:usb3="00000000" w:csb0="00000001" w:csb1="00000000"/>${embedXml}</w:font>`;
  if (!ftXml.includes('</w:fonts>')) return; // malformed fontTable
  fontTable.content = Buffer.from(ftXml.replace('</w:fonts>', `${fontXml}</w:fonts>`), 'utf8');

  // 3. word/_rels/fontTable.xml.rels — merge or create.
  const relName = 'word/_rels/fontTable.xml.rels';
  const relXml = embeds
    .map((e) => `<Relationship Id="${e.relId}" Type="${FONT_REL_TYPE}" Target="fonts/${e.file}"/>`)
    .join('');
  const relEntry = getEntry(entries, relName);
  if (relEntry) {
    relEntry.content = Buffer.from(
      relEntry.content.toString('utf8').replace('</Relationships>', `${relXml}</Relationships>`),
      'utf8',
    );
  } else {
    entries.push({
      name: relName,
      content: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relXml}</Relationships>`,
        'utf8',
      ),
    });
  }

  // 4. [Content_Types].xml — register the .odttf extension.
  const ct = getEntry(entries, '[Content_Types].xml');
  if (ct) {
    let ctx = ct.content.toString('utf8');
    if (!ctx.includes('Extension="odttf"')) {
      ctx = ctx.replace(
        '</Types>',
        '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/></Types>',
      );
      ct.content = Buffer.from(ctx, 'utf8');
    }
  }

  // 5. settings.xml — flag embedded fonts (before embedSystemFonts in schema order).
  const settings = getEntry(entries, 'word/settings.xml');
  if (settings) {
    let st = settings.content.toString('utf8');
    if (!st.includes('embedTrueTypeFonts')) {
      st = st.includes('<w:embedSystemFonts')
        ? st.replace(/(<w:embedSystemFonts\s*\/>)/, '<w:embedTrueTypeFonts/>$1')
        : st.replace(/(<w:settings\b[^>]*>)/, '$1<w:embedTrueTypeFonts/>');
      settings.content = Buffer.from(st, 'utf8');
    }
  }
}

export function fixPandocTables(docxPath) {
  const entries = readZip(readFileSync(docxPath));
  const docEntry = entries.find((e) => e.name === 'word/document.xml');
  const stylesEntry = entries.find((e) => e.name === 'word/styles.xml');
  if (!docEntry || !stylesEntry) throw new Error('docx missing document.xml or styles.xml');

  let doc = docEntry.content.toString('utf8');
  let styles = stylesEntry.content.toString('utf8');

  // --- table width: set to exact text area width in twips ---
  // The outer left border renders half its stroke outside the table's logical left
  // edge. Shrink the table by that amount and shift it right via tblInd so the
  // border's outer face aligns flush with the text-area left margin.
  const BORDER_HALF = 80; // twips — dial down if the table shifts too far right
  const textWidth = computeTextWidth(doc);
  if (textWidth) {
    const tableWidth = textWidth - BORDER_HALF;
    const dxaTag = `<w:tblW w:type="dxa" w:w="${tableWidth}" />`;
    doc = doc.replace(/<w:tblW w:type="(?:auto|pct|dxa)" w:w="\d+" \/>/g, dxaTag);
    doc = doc.replace(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/g, (m) => scaleTblGrid(m, tableWidth));
  }

  // --- table indent + alignment: insert tblInd and jc AFTER tblW (schema order) ---
  doc = doc.replace(
    /(<w:tblW\b[^/]*\/>)/g,
    `$1<w:jc w:val="left" /><w:tblInd w:type="dxa" w:w="${BORDER_HALF}" />`,
  );

  // --- table look: keep header (firstRow) styling, disable all row/col banding ---
  // (firstRow 0x20 | noHBand 0x200 | noVBand 0x400 = 0x620). Body rows stay plain.
  doc = doc.replaceAll(
    'w:noHBand="0" w:noVBand="0" w:val="0020"',
    'w:noHBand="1" w:noVBand="1" w:val="0620"',
  );

  // --- table header: force bold directly on first-row runs ---
  doc = boldFirstRow(doc);

  // --- table spacing: only after (no before) ---
  doc = doc.replaceAll('</w:tbl>', '</w:tbl>' + SPACER_AFTER);

  // --- bookmarks: strip all pandoc-generated anchor bookmarks ---
  doc = doc.replace(/<w:bookmarkStart\b[^/]*\/>/g, '');
  doc = doc.replace(/<w:bookmarkEnd\b[^/]*\/>/g, '');

  // --- headings: remap Heading4 and Heading5 to use Heading3 style ---
  doc = doc.replaceAll('w:val="Heading4"', 'w:val="Heading3"');
  doc = doc.replaceAll('w:val="Heading5"', 'w:val="Heading3"');

  // --- Heading6: right-align in styles ---
  styles = alignH6Right(styles);

  // --- Heading3 (also covers remapped H4/H5): match H2 font size ---
  const h3 = /<w:style\b[^>]*w:styleId="Heading3"[\s\S]*?<\/w:style>/.exec(styles);
  if (h3) {
    const updated = h3[0]
      .replaceAll('<w:sz w:val="24" />', '<w:sz w:val="28" />')
      .replaceAll('<w:szCs w:val="24" />', '<w:szCs w:val="28" />');
    styles = styles.slice(0, h3.index) + updated + styles.slice(h3.index + h3[0].length);
  }

  // --- SourceCode spacing: remove before, increase after ---
  styles = styles.replaceAll(
    '<w:spacing w:after="200" w:before="200" w:line="320" w:lineRule="auto" />',
    `<w:spacing w:after="${SPACING_AFTER}" w:before="0" w:line="320" w:lineRule="auto" />`,
  );

  // --- portability: flatten named-style formatting into direct formatting ---
  // Runs last, reading the final styles, so inlined values match the styles.
  doc = inlineDirectFormatting(doc, styles);

  docEntry.content = Buffer.from(doc, 'utf8');
  stylesEntry.content = Buffer.from(styles, 'utf8');

  // --- fonts: embed Cascadia Code so code blocks render without it installed ---
  embedFonts(entries);

  writeFileSync(docxPath, writeZip(entries));
}

// Standalone entry point.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('docx-postprocess.mjs')) {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write('Usage: node docx-postprocess.mjs <path-to-docx>\n');
    process.exit(1);
  }
  fixPandocTables(path);
  process.stdout.write(`Fixed: ${path}\n`);
}
