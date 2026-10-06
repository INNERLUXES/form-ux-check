// A small safe HTML reader of the tool's own. It reads the text once, left to right, with a list of open elements of its
// own and no recursion, and builds a light tree: every element in document order with its tag name, its attributes,
// its offset, its parent and the range of its descendants, and the text inside it. It follows the HTML Standard where
// the forms checks need it: tag and attribute names in any case, the first of two attributes of the same name kept,
// void elements, comments, a DOCTYPE and other markup declarations passed over, the contents of script, style and the
// other raw text elements passed over, textarea and title read as text, an end tag that closes the elements left open
// inside it, a few start tags that close the element before them (option, optgroup, li, dt, dd, tr, td, th, a p before a
// block), a select closed by a field that cannot sit in it, and a form inside a form left out, as a browser leaves it
// out. A tag cut off by the end of the file is dropped, as a browser drops it. Character references are decoded for
// the five that XML predefines, &nbsp; and numeric references; any other named reference is kept as it is written. The
// reader never fails on markup: HTML has no error that stops a browser. It stops only at its limits of depth, elements,
// attributes, names and values, with an HtmlError that names the place.

import { asciiLower } from './words.js';

export const HTML_LIMITS = { maxHtmlDepth: 512, maxHtmlElements: 200000, maxHtmlAttributes: 256, maxHtmlNameLength: 256, maxHtmlValueLength: 65536 };

export class HtmlError extends Error {
  constructor(reason, offset) {
    super(reason);
    this.reason = reason;
    this.offset = offset;
  }
}

export const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes']);
const RCDATA = new Set(['textarea', 'title']);
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl', 'dd', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
// The text inside these is not part of the text of a label or a button: the options of a list, the scripts.
const NO_TEXT = new Set(['select', 'datalist', 'option', 'optgroup']);
const CLOSES_SELECT = new Set(['input', 'textarea', 'select']);

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const REFERENCE = /&(?:#([0-9]{1,8})|#[xX]([0-9a-fA-F]{1,7})|([A-Za-z][A-Za-z0-9]{0,31}));?/y;

const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 12 || c === 13;
const isLetter = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);

// The text of an attribute value or of character data with its character references decoded.
export function decodeHtml(raw) {
  if (!raw.includes('&')) return raw;
  let out = '';
  let from = 0;
  for (let i = raw.indexOf('&'); i >= 0; i = raw.indexOf('&', from)) {
    out += raw.slice(from, i);
    REFERENCE.lastIndex = i;
    const m = REFERENCE.exec(raw);
    if (!m) {
      out += '&';
      from = i + 1;
      continue;
    }
    if (m[3] !== undefined) {
      if (Object.hasOwn(NAMED, m[3])) out += NAMED[m[3]];
      else out += m[0];
    } else {
      const code = m[1] !== undefined ? Number(m[1]) : parseInt(m[2], 16);
      out += code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? '\ufffd' : String.fromCodePoint(code);
    }
    from = i + m[0].length;
  }
  return out + raw.slice(from);
}

// Reads an HTML document. Returns { elements, chunks, nestedForms } where elements is every element in document order:
// { name, attrs, offset, parent, depth, end, textStart, textEnd }. attrs maps a lowercase attribute name to
// { value, offset }; parent is the index of the parent element or -1; the descendants of element k are the elements
// k + 1 to end - 1; and the text inside it is chunks[textStart] to chunks[textEnd - 1]. Throws HtmlError at a limit.
export function parseHtml(text, limits = HTML_LIMITS) {
  const lim = { ...HTML_LIMITS, ...limits };
  const n = text.length;
  const elements = [];
  const chunks = [];
  const open = [];
  let noText = 0;
  let foreign = 0;
  let nestedForms = 0;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const fail = (reason, at) => {
    throw new HtmlError(reason, at);
  };
  const top = () => (open.length ? elements[open.at(-1)].name : null);
  const openIndex = (name) => {
    for (let k = open.length - 1; k >= 0; k -= 1) if (elements[open[k]].name === name) return k;
    return -1;
  };
  // Closes the open elements from position k of the list of open elements to its end.
  const closeFrom = (k) => {
    for (let j = open.length - 1; j >= k; j -= 1) {
      const el = elements[open[j]];
      el.end = elements.length;
      el.textEnd = chunks.length;
      if (NO_TEXT.has(el.name)) noText -= 1;
      if (el.name === 'svg' || el.name === 'math') foreign -= 1;
    }
    open.length = k;
  };
  const closeTop = (...names) => {
    if (open.length && names.includes(top())) closeFrom(open.length - 1);
  };

  const startTag = (name, attrs, selfClosing, at) => {
    if (name === 'form' && openIndex('form') >= 0) {
      nestedForms += 1;
      return null;
    }
    const inSelect = openIndex('select');
    if (inSelect >= 0 && CLOSES_SELECT.has(name)) {
      closeFrom(inSelect);
      if (name === 'select') return null;
    }
    if (name === 'option') closeTop('option');
    else if (name === 'optgroup') {
      closeTop('option');
      closeTop('optgroup');
    } else if (name === 'li') closeTop('li');
    else if (name === 'dt' || name === 'dd') closeTop('dt', 'dd');
    else if (name === 'td' || name === 'th') closeTop('td', 'th');
    else if (name === 'tr') {
      closeTop('td', 'th');
      closeTop('tr');
    } else if (name === 'button') {
      const b = openIndex('button');
      if (b >= 0) closeFrom(b);
    }
    if (CLOSES_P.has(name)) closeTop('p');
    if (elements.length >= lim.maxHtmlElements) fail(`more than ${lim.maxHtmlElements.toLocaleString('en-US')} elements`, at);
    const index = elements.length;
    const el = { name, attrs, offset: at, parent: open.length ? open.at(-1) : -1, depth: open.length, end: index + 1, textStart: chunks.length, textEnd: chunks.length };
    elements.push(el);
    if (name === 'img' && attrs.has('alt') && noText === 0) chunks.push(` ${attrs.get('alt').value} `);
    if (VOID_ELEMENTS.has(name) || (selfClosing && (foreign > 0 || name === 'svg' || name === 'math'))) return el;
    if (open.length >= lim.maxHtmlDepth) fail(`elements nested more than ${lim.maxHtmlDepth} deep`, at);
    open.push(index);
    if (NO_TEXT.has(name)) noText += 1;
    if (name === 'svg' || name === 'math') foreign += 1;
    return el;
  };

  // Reads the attributes of a start tag from offset j. Returns { attrs, selfClosing, next } or null at the end of the
  // text.
  const readAttributes = (j) => {
    const attrs = new Map();
    let count = 0;
    for (;;) {
      while (j < n && isSpace(text.charCodeAt(j))) j += 1;
      if (j >= n) return null;
      const c = text[j];
      if (c === '>') return { attrs, selfClosing: false, next: j + 1 };
      if (c === '/') {
        if (text[j + 1] === '>') return { attrs, selfClosing: true, next: j + 2 };
        j += 1;
        continue;
      }
      const start = j;
      j += 1;
      while (j < n) {
        const d = text.charCodeAt(j);
        if (isSpace(d) || d === 47 || d === 62 || d === 61) break;
        j += 1;
      }
      if (j - start > lim.maxHtmlNameLength) fail(`an attribute name longer than ${lim.maxHtmlNameLength} characters`, start);
      const name = asciiLower(text.slice(start, j));
      while (j < n && isSpace(text.charCodeAt(j))) j += 1;
      let value = '';
      if (text[j] === '=') {
        j += 1;
        while (j < n && isSpace(text.charCodeAt(j))) j += 1;
        const q = text[j];
        let raw;
        if (q === '"' || q === "'") {
          const end = text.indexOf(q, j + 1);
          if (end < 0) return null;
          raw = text.slice(j + 1, end);
          j = end + 1;
        } else {
          const from = j;
          while (j < n && !isSpace(text.charCodeAt(j)) && text[j] !== '>') j += 1;
          raw = text.slice(from, j);
        }
        if (raw.length > lim.maxHtmlValueLength) fail(`an attribute value longer than ${lim.maxHtmlValueLength.toLocaleString('en-US')} characters`, start);
        value = decodeHtml(raw);
      }
      count += 1;
      if (count > lim.maxHtmlAttributes) fail(`an element with more than ${lim.maxHtmlAttributes} attributes`, start);
      if (!attrs.has(name)) attrs.set(name, { value, offset: start });
    }
  };

  // The offset of the end tag of a raw text or RCDATA element named name, from offset j, or the end of the text.
  const endOfRaw = (name, j) => {
    for (let k = text.indexOf('</', j); k >= 0; k = text.indexOf('</', k + 2)) {
      const after = text.charCodeAt(k + 2 + name.length);
      if (asciiLower(text.slice(k + 2, k + 2 + name.length)) === name && (Number.isNaN(after) || isSpace(after) || after === 47 || after === 62)) return k;
    }
    return n;
  };

  while (i < n) {
    if (text.charCodeAt(i) !== 60) {
      const next = text.indexOf('<', i + 1);
      const end = next < 0 ? n : next;
      if (noText === 0) chunks.push(decodeHtml(text.slice(i, end)));
      i = end;
      continue;
    }
    const at = i;
    if (text.startsWith('<!--', i)) {
      if (text.startsWith('<!-->', i)) i += 5;
      else if (text.startsWith('<!--->', i)) i += 6;
      else {
        const end = text.indexOf('-->', i + 4);
        i = end < 0 ? n : end + 3;
      }
      continue;
    }
    if (text[i + 1] === '!' || text[i + 1] === '?') {
      const end = text.indexOf('>', i + 2);
      i = end < 0 ? n : end + 1;
      continue;
    }
    if (text[i + 1] === '/') {
      if (!isLetter(text.charCodeAt(i + 2))) {
        const end = text.indexOf('>', i + 2);
        i = end < 0 ? n : end + 1;
        continue;
      }
      let j = i + 2;
      while (j < n && !isSpace(text.charCodeAt(j)) && text[j] !== '/' && text[j] !== '>') j += 1;
      if (j - i - 2 > lim.maxHtmlNameLength) fail(`a tag name longer than ${lim.maxHtmlNameLength} characters`, at);
      const name = asciiLower(text.slice(i + 2, j));
      const end = text.indexOf('>', j);
      if (end < 0) break;
      i = end + 1;
      const k = openIndex(name);
      if (k >= 0) closeFrom(k);
      continue;
    }
    if (!isLetter(text.charCodeAt(i + 1))) {
      if (noText === 0) chunks.push('<');
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < n && !isSpace(text.charCodeAt(j)) && text[j] !== '/' && text[j] !== '>') j += 1;
    if (j - i - 1 > lim.maxHtmlNameLength) fail(`a tag name longer than ${lim.maxHtmlNameLength} characters`, at);
    const name = asciiLower(text.slice(i + 1, j));
    const tag = readAttributes(j);
    if (tag === null) break;
    i = tag.next;
    const el = startTag(name, tag.attrs, tag.selfClosing, at);
    if (el && (RAW_TEXT.has(name) || RCDATA.has(name)) && !tag.selfClosing) {
      const end = endOfRaw(name, i);
      i = end;
      const k = openIndex(name);
      if (k >= 0) closeFrom(k);
    }
  }
  closeFrom(0);
  return { elements, chunks, nestedForms };
}

// The value of an attribute of an element, or null.
export const attrOf = (el, name) => (el.attrs.has(name) ? el.attrs.get(name).value : null);
