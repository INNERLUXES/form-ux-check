// The checks of one HTML file: labels, placeholders, input types, autocomplete, required fields, references to ids,
// error messages, groups, buttons, forms, tabindex, inputmode and pattern, and long select lists, over the light tree of
// src/html.js. Every check reads the markup as written: no script runs, no style sheet is applied, and nothing is
// fetched, so what a script adds or a style hides is not seen. docs/method.md says what each check looks at. Every
// pass over the elements is a loop over the list in document order or in reverse order, with no recursion.

import { readAutocomplete } from './autofill.js';
import { isNumberName, purposeOf, typeForPurpose, wordsOf } from './hints.js';
import { attrOf } from './html.js';
import { flat, safeText } from './text.js';
import { asciiLower } from './words.js';

// The types of an input that the HTML Standard knows; any other value is the text state.
export const INPUT_TYPES = ['hidden', 'text', 'search', 'tel', 'url', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number', 'range', 'color', 'checkbox', 'radio', 'file', 'submit', 'image', 'reset', 'button'];
const BUTTON_TYPES = ['submit', 'reset', 'button', 'image'];
// The types the pattern attribute applies to.
export const PATTERN_TYPES = ['text', 'search', 'url', 'tel', 'email', 'password'];
// The types that bring up a keyboard, so that inputmode can change it.
const KEYBOARD_TYPES = ['text', 'search', 'url', 'tel', 'email', 'password', 'number'];
export const INPUTMODES = ['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'];
// The inputmode each typed field brings with it.
const TYPE_MODES = { email: ['email'], tel: ['tel'], url: ['url'], number: ['numeric', 'decimal'], search: ['search'] };
// The types an autocomplete field name is suggested for.
const AUTOFILL_TYPES = ['text', 'search', 'url', 'tel', 'email', 'password', 'number', 'date', 'month'];
const LABELABLE = ['button', 'meter', 'output', 'progress', 'select', 'textarea'];
const FORM_ASSOCIATED = ['button', 'fieldset', 'input', 'object', 'output', 'select', 'textarea'];
const NUMERIC_PURPOSES = ['cc-number', 'cc-csc', 'one-time-code'];
const ID_LISTS = ['aria-labelledby', 'aria-describedby', 'aria-errormessage'];

// The type of a field: the type of an input, lowered and known, else text; the tag name of any other element.
export function typeOf(el) {
  if (el.name !== 'input') return el.name;
  const t = asciiLower(attrOf(el, 'type') ?? '').trim();
  return INPUT_TYPES.includes(t) ? t : 'text';
}

// A whole number as the HTML Standard reads one: white space, an optional sign, then digits up to the first character
// that is not one. null when there is no digit.
export function readInteger(value) {
  let i = 0;
  const s = String(value);
  while (i < s.length && ' \t\n\r\f'.includes(s[i])) i += 1;
  let sign = 1;
  if (s[i] === '-' || s[i] === '+') {
    if (s[i] === '-') sign = -1;
    i += 1;
  }
  const start = i;
  while (i < s.length && s[i] >= '0' && s[i] <= '9' && i - start < 12) i += 1;
  return i === start ? null : sign * Number(s.slice(start, i));
}

// True when a pattern asks for digits only: anchors, digit classes ([0-9], \d, [\d]), literal digits, groups and
// quantifiers, and at least one digit. The pattern is read as text; it is never compiled or run.
export function isDigitsPattern(pattern) {
  const p = String(pattern);
  if (p.length === 0 || p.length > 200) return false;
  let i = 0;
  let digits = 0;
  while (i < p.length) {
    if (p.startsWith('[0-9]', i)) {
      digits += 1;
      i += 5;
    } else if (p.startsWith('\\d', i)) {
      digits += 1;
      i += 2;
    } else if (p.startsWith('[\\d]', i)) {
      digits += 1;
      i += 4;
    } else if (p[i] >= '0' && p[i] <= '9') {
      digits += 1;
      i += 1;
    } else if (p[i] === '{') {
      const end = p.indexOf('}', i);
      if (end < 0 || !/^\{[0-9]{1,4}(?:,[0-9]{0,4})?\}$/.test(p.slice(i, end + 1))) return false;
      i = end + 1;
    } else if (p.startsWith('?:', i)) i += 2;
    else if ('^$*+?()'.includes(p[i])) i += 1;
    else return false;
  }
  return digits > 0;
}

const says = (text, word) => wordsOf(text).includes(word);
const saysRequired = (text) => text.includes('*') || says(text, 'required');

// A short description of an element for a message: <input type="text" name="email">.
export function describe(el) {
  const parts = [el.name];
  for (const a of el.name === 'input' ? ['type', 'name', 'id'] : el.name === 'label' ? ['for'] : ['name', 'id']) {
    const v = attrOf(el, a);
    if (v !== null) parts.push(`${a}="${safeText(v, 40)}"`);
  }
  return `<${parts.join(' ')}>`;
}

// Runs every check on one parsed file. place(offset) gives { line, column }; config holds optionLimit. Returns
// { findings: [{ rule, offset, found }], stats }.
export function analyzeDocument(doc, place, config) {
  const { elements, chunks } = doc;
  const n = elements.length;
  const findings = [];
  const add = (rule, offset, found) => findings.push({ rule, offset, found });
  const attr = (k, name) => attrOf(elements[k], name);
  const filled = (k, name) => {
    const v = attr(k, name);
    return v !== null && v.trim() !== '' ? v.trim() : null;
  };
  const lineOf = (offset) => place(offset).line;
  const attrOffset = (k, name) => elements[k].attrs.get(name).offset;

  const texts = new Map();
  const textOf = (k) => {
    if (texts.has(k)) return texts.get(k);
    const el = elements[k];
    let s = '';
    for (let c = el.textStart; c < el.textEnd && c - el.textStart < 5000 && s.length < 1500; c += 1) s += chunks[c];
    const t = flat(s).slice(0, 300);
    texts.set(k, t);
    return t;
  };

  // Ids, and the first element with each.
  const ids = new Map();
  for (let k = 0; k < n; k += 1) {
    const id = attr(k, 'id');
    if (id === null || id === '') continue;
    if (!ids.has(id)) ids.set(id, []);
    ids.get(id).push(k);
  }
  const first = (id) => (ids.has(id) ? ids.get(id)[0] : -1);
  // The text of the elements an id list points at, and the ids that are missing.
  const pointed = (k, name) => {
    const v = attr(k, name);
    if (v === null) return { text: '', missing: [], any: false };
    const list = String(v).split(/[\t\n\f\r ]+/).filter(Boolean);
    const found = list.filter((id) => ids.has(id));
    return { text: flat(found.map((id) => textOf(first(id))).join(' ')), missing: list.filter((id) => !ids.has(id)), any: list.length > 0 };
  };

  // Forward passes: the nearest form and fieldset above each element, and whether an element or one above it is a
  // live region or a named group.
  const formAbove = new Int32Array(n).fill(-1);
  const fieldsetAbove = new Int32Array(n).fill(-1);
  const live = new Uint8Array(n);
  const named = new Uint8Array(n);
  const legends = new Map();
  const legendOf = (f) => {
    if (legends.has(f)) return legends.get(f);
    let text = '';
    // The children of the fieldset, each subtree passed over in one step.
    for (let c = f + 1; c < elements[f].end; c = elements[c].end) {
      if (elements[c].name === 'legend') {
        text = textOf(c);
        break;
      }
    }
    legends.set(f, text);
    return text;
  };
  for (let k = 0; k < n; k += 1) {
    const el = elements[k];
    const p = el.parent;
    formAbove[k] = p < 0 ? -1 : elements[p].name === 'form' ? p : formAbove[p];
    fieldsetAbove[k] = p < 0 ? -1 : elements[p].name === 'fieldset' ? p : fieldsetAbove[p];
    const role = asciiLower(attr(k, 'role') ?? '').trim();
    const ariaLive = asciiLower(attr(k, 'aria-live') ?? '').trim();
    live[k] = role === 'alert' || role === 'status' || (ariaLive !== '' && ariaLive !== 'off') || (p >= 0 && live[p]) ? 1 : 0;
    let own = 0;
    if (el.name === 'fieldset' && legendOf(k) !== '') own = 1;
    if ((role === 'group' || role === 'radiogroup') && (filled(k, 'aria-label') || pointed(k, 'aria-labelledby').text)) own = 1;
    named[k] = own || (p >= 0 && named[p]) ? 1 : 0;
  }

  // References to ids: broken ones, and the ids that are named.
  const referenced = new Map();
  const errorTargets = new Set();
  const refer = (k, name, list) => {
    for (const id of list) if (!referenced.has(id)) referenced.set(id, { k, name });
  };
  for (let k = 0; k < n; k += 1) {
    const el = elements[k];
    for (const name of ID_LISTS) {
      const v = attr(k, name);
      if (v === null) continue;
      const list = String(v).split(/[\t\n\f\r ]+/).filter(Boolean);
      refer(k, name, list);
      if (name !== 'aria-labelledby') for (const id of list) errorTargets.add(id);
      const missing = list.filter((id) => !ids.has(id));
      if (missing.length) add('broken-reference', attrOffset(k, name), `${describe(el)}: ${name} names ${missing.length === 1 ? 'the id' : 'the ids'} ${missing.slice(0, 5).map((m) => `"${safeText(m, 40)}"`).join(', ')}, which no element of the file has`);
    }
    const single = [];
    if (el.name === 'label' && attr(k, 'for') !== null) single.push('for');
    if (el.name === 'input' && attr(k, 'list') !== null) single.push('list');
    if (FORM_ASSOCIATED.includes(el.name) && attr(k, 'form') !== null) single.push('form');
    for (const name of single) {
      const id = attr(k, name);
      refer(k, name, [id]);
      if (!ids.has(id)) add('broken-reference', attrOffset(k, name), `${describe(el)}: ${name}="${safeText(id, 40)}" names an id that no element of the file has${name === 'for' ? ', so the label labels nothing' : ''}`);
    }
  }
  for (const [id, ref] of referenced) {
    const holders = ids.get(id);
    if (!holders || holders.length < 2) continue;
    add('duplicate-id', attrOffset(holders[1], 'id'), `the id "${safeText(id, 40)}" is given to ${holders.length} elements, ${describe(elements[holders[0]])} at line ${lineOf(elements[holders[0]].offset)} first; the ${ref.name} attribute of ${describe(elements[ref.k])} at line ${lineOf(elements[ref.k].offset)} reaches the first one only`);
  }

  // The labels of every labelable element.
  const isLabelable = (k) => {
    const el = elements[k];
    return LABELABLE.includes(el.name) || (el.name === 'input' && typeOf(el) !== 'hidden');
  };
  const labels = new Map();
  for (let k = 0; k < n; k += 1) {
    if (elements[k].name !== 'label') continue;
    let target = -1;
    const forId = attr(k, 'for');
    if (forId !== null) {
      const t = first(forId);
      if (t >= 0 && isLabelable(t)) target = t;
    } else {
      for (let c = k + 1; c < elements[k].end; c += 1) {
        if (isLabelable(c)) {
          target = c;
          break;
        }
      }
    }
    if (target < 0) continue;
    if (!labels.has(target)) labels.set(target, []);
    labels.get(target).push(k);
  }
  const labelText = (k) => flat((labels.get(k) ?? []).map(textOf).join(' '));

  // The form a form-associated element belongs to: the form its form attribute names, else the nearest form above it.
  const ownerOf = (k) => {
    const f = attr(k, 'form');
    if (f !== null) {
      const t = first(f);
      return t >= 0 && elements[t].name === 'form' ? t : -1;
    }
    return formAbove[k];
  };
  const passwords = new Map();
  for (let k = 0; k < n; k += 1) {
    if (elements[k].name === 'input' && typeOf(elements[k]) === 'password') {
      const f = ownerOf(k);
      passwords.set(f, (passwords.get(f) ?? 0) + 1);
    }
  }

  const stats = { forms: 0, fields: 0, named: 0, buttons: 0, required: 0, autocomplete: 0, selects: 0 };
  const groups = new Map();
  const requiredGroups = new Set();

  for (let k = 0; k < n; k += 1) {
    const el = elements[k];
    if (el.name !== 'input' && el.name !== 'select' && el.name !== 'textarea' && el.name !== 'button') continue;
    const t = typeOf(el);
    if (t === 'hidden') continue;
    const by = pointed(k, 'aria-labelledby');
    const ariaLabel = filled(k, 'aria-label');
    const label = labelText(k);
    const title = filled(k, 'title');

    // Buttons.
    if (el.name === 'button' || BUTTON_TYPES.includes(t)) {
      stats.buttons += 1;
      if (t === 'submit' || t === 'reset') continue;
      let name;
      if (el.name === 'button') name = by.text || ariaLabel || textOf(k) || title || label;
      else if (t === 'image') name = filled(k, 'alt') || ariaLabel || by.text || title || label;
      else name = filled(k, 'value') || ariaLabel || by.text || title || label;
      if (!name) {
        const what = el.name === 'button' ? 'has no text, no image with alt text, no aria-label, no aria-labelledby that points at text and no title' : t === 'image' ? 'has no alt, no aria-label, no aria-labelledby that points at text and no title' : 'has no value, no aria-label, no aria-labelledby that points at text and no title';
        add('button-without-name', el.offset, `${describe(el)} ${what}: a screen reader announces it as a button with no name`);
      }
      continue;
    }

    stats.fields += 1;
    if (el.name === 'select') stats.selects += 1;
    const placeholder = filled(k, 'placeholder');
    const hasName = Boolean(by.text || ariaLabel || label || title);
    if (hasName) stats.named += 1;
    else if (placeholder) add('placeholder-only-label', el.offset, `${describe(el)} is named only by its placeholder "${safeText(placeholder, 60)}", which disappears when someone types and may not be read out`);
    else {
      const why = labels.has(k) ? 'its label holds no text' : by.any ? 'its aria-labelledby points at no text' : 'no label, aria-labelledby, aria-label, title or placeholder names it';
      add('missing-label', el.offset, `${describe(el)} has no programmatic label: ${why}`);
    }

    // Required fields.
    const required = attr(k, 'required') !== null || asciiLower(attr(k, 'aria-required') ?? '').trim() === 'true';
    const visible = flat(`${label} ${by.text}`);
    if (required) stats.required += 1;
    if (!required && saysRequired(visible) && !says(visible, 'optional')) add('required-not-programmatic', el.offset, `${describe(el)}: its label "${safeText(visible, 60)}" says it is required, but it has no required attribute and no aria-required="true"`);
    if (required) {
      const groupKey = t === 'radio' || t === 'checkbox' ? `${ownerOf(k)}|${t}|${attr(k, 'name') ?? k}` : null;
      const hint = flat(`${visible} ${pointed(k, 'aria-describedby').text} ${fieldsetAbove[k] >= 0 ? legendOf(fieldsetAbove[k]) : ''}`);
      if (!saysRequired(hint) && !(groupKey && requiredGroups.has(groupKey))) add('required-not-visible', el.offset, `${describe(el)} is required, but its label, description and legend show no asterisk and no word required`);
      if (groupKey) requiredGroups.add(groupKey);
    }

    // Autocomplete.
    const auto = attr(k, 'autocomplete');
    const read = auto === null ? null : readAutocomplete(auto);
    if (read && read.kind === 'invalid') add('autocomplete-invalid', attrOffset(k, 'autocomplete'), `${describe(el)}: autocomplete="${safeText(auto, 60)}": ${read.problem}`);
    if (read && read.kind === 'field') stats.autocomplete += 1;
    const purpose = purposeOf((name) => attr(k, name), t);
    const owner = ownerOf(k);
    const nextToPassword = (passwords.get(owner) ?? 0) > 0 && owner >= 0;
    const login = t === 'password' || (purpose !== null && (purpose.purpose === 'username' || purpose.purpose === 'email') && nextToPassword);
    const off = read !== null && read.kind === 'off';
    if (off && login) add('autocomplete-off-login', attrOffset(k, 'autocomplete'), `${describe(el)}: autocomplete="off" on a ${t === 'password' ? 'password field' : 'login field next to a password field'} keeps password managers from filling it, and browsers ignore it there`);
    const types = el.name === 'input' ? AUTOFILL_TYPES.includes(t) : true;
    if (purpose && purpose.from !== 'autocomplete' && types && !(read && read.kind === 'invalid') && !(off && login)) {
      let token = purpose.purpose;
      if (token === 'password') token = (passwords.get(owner) ?? 0) >= 2 ? 'new-password' : 'current-password';
      if (token === 'country-name' && el.name === 'select') token = 'country';
      if (purpose.mode) token = `${purpose.mode} ${token}`;
      const now = read === null || read.kind === 'empty' ? 'it has no autocomplete' : `autocomplete="${read.kind}" names no purpose`;
      add('autocomplete-missing', el.offset, `${describe(el)} asks for ${purpose.from === 'type' ? `a ${t} value` : `"${safeText(attr(k, purpose.from), 40)}"`} and ${now}: use autocomplete="${token}"`);
    }

    // Type.
    if (el.name === 'input' && t === 'text') {
      let want = purpose ? typeForPurpose(purpose.purpose) : null;
      if (!want && (isNumberName(attr(k, 'name') ?? '') || isNumberName(attr(k, 'id') ?? ''))) want = 'number';
      if (want) {
        const why = purpose && typeForPurpose(purpose.purpose) ? (purpose.from === 'autocomplete' ? `autocomplete="${safeText(auto, 40)}"` : `${purpose.from}="${safeText(attr(k, purpose.from), 40)}"`) : 'its name asks for a counted number';
        add('input-type-mismatch', el.offset, `${describe(el)} is a plain text field, but ${why}: use type="${want}"`);
      }
    }

    // inputmode and pattern.
    const im = attr(k, 'inputmode');
    const mode = im === null ? null : asciiLower(im).trim();
    if (im !== null) {
      if (!INPUTMODES.includes(mode)) add('inputmode-mismatch', attrOffset(k, 'inputmode'), `${describe(el)}: inputmode="${safeText(im, 40)}" is not one of ${INPUTMODES.join(', ')}`);
      else if (el.name === 'input' && Object.hasOwn(TYPE_MODES, t) && !TYPE_MODES[t].includes(mode)) add('inputmode-mismatch', attrOffset(k, 'inputmode'), `${describe(el)}: inputmode="${mode}" overrides the ${TYPE_MODES[t].join(' or ')} keyboard that type="${t}" brings`);
      else if (el.name === 'select' || (el.name === 'input' && !KEYBOARD_TYPES.includes(t))) add('inputmode-mismatch', attrOffset(k, 'inputmode'), `${describe(el)}: inputmode has no effect on a field with no keyboard`);
    }
    const pattern = attr(k, 'pattern');
    const numericMode = mode === 'numeric' || mode === 'decimal' || mode === 'tel';
    if (pattern !== null && !(el.name === 'input' && PATTERN_TYPES.includes(t))) add('inputmode-mismatch', attrOffset(k, 'pattern'), `${describe(el)}: pattern applies to the text, search, url, tel, email and password types only; the browser ignores it here`);
    else if (pattern !== null && ['text', 'search', 'password'].includes(t) && isDigitsPattern(pattern) && !numericMode) add('inputmode-mismatch', attrOffset(k, 'pattern'), `${describe(el)}: pattern="${safeText(pattern, 40)}" asks for digits, but the field brings a full keyboard: add inputmode="numeric"`);
    else if (purpose && NUMERIC_PURPOSES.includes(purpose.purpose) && el.name === 'input' && (t === 'text' || t === 'password') && !numericMode) add('inputmode-mismatch', el.offset, `${describe(el)} asks for a ${purpose.purpose === 'cc-number' ? 'card number' : purpose.purpose === 'cc-csc' ? 'card security code' : 'one-time code'}, which is digits, with a full keyboard: add inputmode="numeric"`);

    // Groups of radio buttons and check boxes.
    const groupName = attr(k, 'name');
    if ((t === 'radio' || t === 'checkbox') && groupName !== null && groupName !== '') {
      const key = `${owner}|${t}|${groupName}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(k);
    }

    // Long select lists.
    if (el.name === 'select') {
      let options = 0;
      for (let c = k + 1; c < el.end; c += 1) if (elements[c].name === 'option') options += 1;
      if (options > config.optionLimit && !pointed(k, 'aria-describedby').text) add('many-options', el.offset, `${describe(el)} holds ${options} options, more than ${config.optionLimit}, with no hint linked by aria-describedby`);
    }
  }

  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const loose = members.find((m) => !named[m]);
    if (loose === undefined) continue;
    const kind = key.split('|')[1] === 'radio' ? 'radio buttons' : 'check boxes';
    add('group-without-name', elements[loose].offset, `${members.length} ${kind} named "${safeText(attr(loose, 'name'), 40)}" are not in a fieldset with a legend or a named group, so the question they answer is not announced`);
  }

  // Forms: the autocomplete of the form, and a submit button. The owner of every form-associated element is worked
  // out once, and its fields and submit buttons are counted for its form.
  const fieldsOf = new Map();
  const submitsOf = new Map();
  const barePasswords = new Map();
  for (let c = 0; c < n; c += 1) {
    const e = elements[c];
    if (!FORM_ASSOCIATED.includes(e.name)) continue;
    const f = ownerOf(c);
    if (f < 0) continue;
    const t = typeOf(e);
    if (e.name === 'button') {
      const bt = asciiLower(attr(c, 'type') ?? '').trim();
      if (bt !== 'reset' && bt !== 'button') submitsOf.set(f, (submitsOf.get(f) ?? 0) + 1);
    } else if (e.name === 'input' && (t === 'submit' || t === 'image')) submitsOf.set(f, (submitsOf.get(f) ?? 0) + 1);
    else if ((e.name === 'input' && t !== 'hidden' && !BUTTON_TYPES.includes(t)) || e.name === 'select' || e.name === 'textarea') fieldsOf.set(f, (fieldsOf.get(f) ?? 0) + 1);
    if (e.name === 'input' && t === 'password' && attr(c, 'autocomplete') === null && !barePasswords.has(f)) barePasswords.set(f, c);
  }
  for (let k = 0; k < n; k += 1) {
    const el = elements[k];
    if (el.name !== 'form') continue;
    stats.forms += 1;
    const auto = attr(k, 'autocomplete');
    if (auto !== null) {
      const v = asciiLower(auto).trim();
      if (v !== '' && v !== 'on' && v !== 'off') add('autocomplete-invalid', attrOffset(k, 'autocomplete'), `${describe(el)}: autocomplete="${safeText(auto, 60)}" on a form must be on or off`);
      if (v === 'off' && barePasswords.has(k)) add('autocomplete-off-login', attrOffset(k, 'autocomplete'), `${describe(el)}: autocomplete="off" on a form with a password field (line ${lineOf(elements[barePasswords.get(k)].offset)}) that has no token of its own keeps password managers from filling it`);
    }
    const fields = fieldsOf.get(k) ?? 0;
    if (fields > 0 && !submitsOf.has(k)) add('form-without-submit', el.offset, `${describe(el)} holds ${fields === 1 ? '1 field' : `${fields} fields`} and no submit button`);
  }

  // Error messages that no field points at.
  const errorLike = new Uint8Array(n);
  const control = new Uint8Array(n);
  const below = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    const words = [...wordsOf(attr(k, 'id') ?? ''), ...String(attr(k, 'class') ?? '').split(/[\t\n\f\r ]+/).flatMap(wordsOf)];
    errorLike[k] = words.includes('error') || words.includes('errors') ? 1 : 0;
  }
  for (let k = n - 1; k >= 0; k -= 1) {
    const name = elements[k].name;
    const isControl = name === 'input' || name === 'select' || name === 'textarea' || name === 'button' || name === 'label';
    const p = elements[k].parent;
    if (p >= 0) {
      if (isControl || control[k]) control[p] = 1;
      if (errorLike[k] || below[k]) below[p] = 1;
    }
    if (isControl) control[k] = 1;
  }
  for (let k = 0; k < n; k += 1) {
    if (!errorLike[k] || control[k] || below[k] || live[k] || formAbove[k] < 0) continue;
    const id = attr(k, 'id');
    if (id !== null && errorTargets.has(id)) continue;
    const text = textOf(k);
    add('unlinked-error', elements[k].offset, `${describe(elements[k])} reads like an error message${text ? ` ("${safeText(text, 60)}")` : ', empty in the file'}, but no aria-describedby or aria-errormessage of a field names ${id === null ? 'it, and it has no id' : 'its id'}`);
  }

  // tabindex.
  for (let k = 0; k < n; k += 1) {
    const v = attr(k, 'tabindex');
    if (v === null) continue;
    const value = readInteger(v);
    if (value !== null && value > 0) add('positive-tabindex', attrOffset(k, 'tabindex'), `${describe(elements[k])}: tabindex="${safeText(v, 20)}" puts it ahead of the order of the page`);
  }

  findings.sort((a, b) => a.offset - b.offset);
  return { findings, stats };
}
