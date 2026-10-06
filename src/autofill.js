// The autocomplete attribute as the autofill section of the HTML Standard writes it: on, off, or a list of tokens in a
// fixed order, an optional section-* token, an optional shipping or billing, an optional contact type (home, work,
// mobile, fax or pager) before a contact field, exactly one field name from the lists below, and an optional webauthn.
// Tokens are compared without regard to case. The lists are copied from the standard, in its order; they hold no
// token that is not in it. A value is read token by token, from the end, with no regular expression built from it.

import { suggestion } from './config.js';
import { asciiLower } from './words.js';

// The field names that take no contact type.
export const FIELD_NAMES = ['name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'organization-title', 'username', 'new-password', 'current-password', 'one-time-code', 'organization', 'street-address', 'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'url', 'photo'];

// The field names that may follow a contact type.
export const CONTACT_FIELDS = ['tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp'];

export const CONTACT_TYPES = ['home', 'work', 'mobile', 'fax', 'pager'];

export const MODES = ['shipping', 'billing'];

// Words that people write in place of a token, with the token they mean. A suggestion only; the value is still wrong.
export const TOKEN_ALIASES = {
  phone: 'tel',
  telephone: 'tel',
  mobile: 'mobile tel',
  cell: 'mobile tel',
  zip: 'postal-code',
  zipcode: 'postal-code',
  postcode: 'postal-code',
  firstname: 'given-name',
  'first-name': 'given-name',
  lastname: 'family-name',
  'last-name': 'family-name',
  surname: 'family-name',
  password: 'current-password or new-password',
  address: 'street-address',
  city: 'address-level2',
  state: 'address-level1',
  birthday: 'bday',
  dob: 'bday',
  company: 'organization',
  'e-mail': 'email',
  login: 'username',
  'credit-card': 'cc-number',
  otp: 'one-time-code',
  nope: 'off'
};

const ALL = [...FIELD_NAMES, ...CONTACT_FIELDS];
const KNOWN = [...ALL, ...CONTACT_TYPES, ...MODES, 'webauthn', 'on', 'off'];

// What to say of a token that is not in the lists.
function unknown(token) {
  const shown = token.slice(0, 40);
  if (Object.hasOwn(TOKEN_ALIASES, token)) return `"${shown}" is not an autofill token; did you mean "${TOKEN_ALIASES[token]}"?`;
  return `"${shown}" is not an autofill token${suggestion(token, KNOWN)}`;
}

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';

// The tokens of a value: split at ASCII white space, lowered.
export function tokensOf(value) {
  const out = [];
  let word = '';
  for (const c of String(value)) {
    if (isSpace(c)) {
      if (word) out.push(asciiLower(word));
      word = '';
    } else word += c;
  }
  if (word) out.push(asciiLower(word));
  return out;
}

// Reads a value: { kind: 'empty' | 'on' | 'off' | 'field', field, contact, mode, section, webauthn } or
// { kind: 'invalid', problem }.
export function readAutocomplete(value) {
  const tokens = tokensOf(value);
  const bad = (problem) => ({ kind: 'invalid', problem, tokens });
  if (tokens.length === 0) return { kind: 'empty', tokens };
  if (tokens.length === 1 && (tokens[0] === 'on' || tokens[0] === 'off')) return { kind: tokens[0], tokens };
  if (tokens.includes('on') || tokens.includes('off')) return bad('on and off stand alone, with no other token');
  if (tokens.length > 6) return bad(`${tokens.length} tokens; a value holds at most a section, a mode, a contact type, a field name and webauthn`);
  let i = tokens.length - 1;
  const webauthn = tokens[i] === 'webauthn';
  if (webauthn) i -= 1;
  if (i < 0) return bad('webauthn comes after a field name, such as username webauthn');
  const field = tokens[i];
  if (!ALL.includes(field)) {
    if (KNOWN.includes(field) || field.startsWith('section-')) return bad(`the value ends with "${field.slice(0, 40)}", which is not a field name; the field name comes last, before an optional webauthn`);
    return bad(unknown(field));
  }
  i -= 1;
  let contact = null;
  if (i >= 0 && CONTACT_TYPES.includes(tokens[i])) {
    if (!CONTACT_FIELDS.includes(field)) return bad(`the contact type "${tokens[i]}" goes only before a contact field such as tel or email, not before "${field}"`);
    contact = tokens[i];
    i -= 1;
  }
  let mode = null;
  if (i >= 0 && MODES.includes(tokens[i])) {
    mode = tokens[i];
    i -= 1;
  }
  let section = null;
  if (i >= 0 && tokens[i].startsWith('section-')) {
    section = tokens[i];
    i -= 1;
  }
  if (i >= 0) {
    const t = tokens[i];
    if (KNOWN.includes(t) || t.startsWith('section-')) return bad(`"${t.slice(0, 40)}" is out of place or given twice; the order is section-*, shipping or billing, a contact type, the field name, webauthn`);
    return bad(unknown(t));
  }
  return { kind: 'field', field, contact, mode, section, webauthn, tokens };
}
