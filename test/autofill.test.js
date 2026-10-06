import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_FIELDS, CONTACT_TYPES, FIELD_NAMES, MODES, NAME_HINTS, NOISE_WORDS, NUMBER_HINTS, TOKEN_ALIASES, isNumberName, purposeOf, purposeOfName, readAutocomplete, tokensOf, typeForPurpose, wordsOf } from '../src/index.js';

// The autocomplete grammar of the HTML Standard, and the purpose of a field from its autocomplete, type, name and id.

const problem = (value) => {
  const r = readAutocomplete(value);
  assert.equal(r.kind, 'invalid', value);
  return r.problem;
};

test('autofill: the token lists of the HTML Standard', () => {
  assert.equal(FIELD_NAMES.length, 44);
  assert.equal(CONTACT_FIELDS.length, 10);
  assert.deepEqual(CONTACT_TYPES, ['home', 'work', 'mobile', 'fax', 'pager']);
  assert.deepEqual(MODES, ['shipping', 'billing']);
  for (const t of ['name', 'given-name', 'username', 'new-password', 'current-password', 'one-time-code', 'street-address', 'postal-code', 'country', 'cc-number', 'cc-csc', 'bday', 'url', 'photo']) assert.ok(FIELD_NAMES.includes(t), t);
  for (const t of ['tel', 'tel-national', 'email', 'impp']) assert.ok(CONTACT_FIELDS.includes(t), t);
  for (const v of Object.values(TOKEN_ALIASES)) assert.ok(v.split(/ or | /).every((t) => [...FIELD_NAMES, ...CONTACT_FIELDS, ...CONTACT_TYPES, 'off'].includes(t)), v);
});

test('autofill: valid values, in every part of the grammar, in any case and spacing', () => {
  assert.deepEqual(readAutocomplete('  '), { kind: 'empty', tokens: [] });
  assert.equal(readAutocomplete('ON').kind, 'on');
  assert.equal(readAutocomplete(' off\t').kind, 'off');
  assert.deepEqual(readAutocomplete('section-Trip1 Shipping WORK email webauthn'), { kind: 'field', field: 'email', contact: 'work', mode: 'shipping', section: 'section-trip1', webauthn: true, tokens: ['section-trip1', 'shipping', 'work', 'email', 'webauthn'] });
  assert.equal(readAutocomplete('billing postal-code').mode, 'billing');
  assert.equal(readAutocomplete('mobile tel').contact, 'mobile');
  assert.equal(readAutocomplete('username webauthn').field, 'username');
  assert.deepEqual(tokensOf(' a\nB\fc\r'), ['a', 'b', 'c']);
});

test('autofill: invalid values, each with what is wrong and a suggestion where one fits', () => {
  assert.equal(problem('on email'), 'on and off stand alone, with no other token');
  assert.equal(problem('off off'), 'on and off stand alone, with no other token');
  assert.match(problem('a b c d e f g'), /7 tokens/);
  assert.equal(problem('webauthn'), 'webauthn comes after a field name, such as username webauthn');
  assert.equal(problem('phone'), '"phone" is not an autofill token; did you mean "tel"?');
  assert.equal(problem('emial'), '"emial" is not an autofill token; did you mean "email"?');
  assert.equal(problem('zzzz'), '"zzzz" is not an autofill token');
  assert.match(problem('email home'), /ends with "home", which is not a field name/);
  assert.match(problem('section-a'), /ends with "section-a"/);
  assert.match(problem('home name'), /the contact type "home" goes only before a contact field/);
  assert.match(problem("home billing email"), /"home" is out of place or given twice/);
  assert.match(problem('email email'), /"email" is out of place or given twice/);
  assert.match(problem('section-a section-b email'), /"section-a" is out of place/);
  assert.match(problem('nope email'), /"nope" is not an autofill token; did you mean "off"\?/);
  assert.match(problem('frist email'), /"frist" is not an autofill token/);
});

test('hints: the words of a name or id, and the purpose they point to', () => {
  assert.deepEqual(wordsOf('billingZipCode'), ['billing', 'zip', 'code']);
  assert.deepEqual(wordsOf('billing_zip-code'), ['billing', 'zip', 'code']);
  assert.deepEqual(wordsOf('address2Line'), ['address2', 'line']);
  assert.deepEqual(wordsOf('E-Mail'), ['e', 'mail']);
  assert.deepEqual(wordsOf('ABC'), ['abc']);
  assert.deepEqual(wordsOf(''), []);
  assert.deepEqual(purposeOfName('E-Mail'), { purpose: 'email', mode: null });
  assert.deepEqual(purposeOfName('user_name'), { purpose: 'username', mode: null });
  assert.deepEqual(purposeOfName('user_email'), { purpose: 'email', mode: null });
  assert.deepEqual(purposeOfName('shipping_postcode'), { purpose: 'postal-code', mode: 'shipping' });
  assert.deepEqual(purposeOfName('deliveryCityInput'), { purpose: 'address-level2', mode: 'shipping' });
  assert.deepEqual(purposeOfName('billing-first-name'), { purpose: 'given-name', mode: 'billing' });
  assert.deepEqual(purposeOfName('contact[phone]'), { purpose: 'tel', mode: null });
  for (const near of ['hotel', 'telescope', 'mailbox', 'zipper', 'statement', 'codename', 'user', 'billing', '', 'name_of_pet', 'cityscape']) assert.equal(purposeOfName(near), null, near);
  assert.ok(isNumberName('number_of_guests') && isNumberName('qty') && !isNumberName('quantity_unit') && !isNumberName('cardNumber'));
  assert.ok(Object.values(NAME_HINTS).flat().every((w) => /^[a-z0-9]+$/.test(w)));
  assert.ok(NUMBER_HINTS.includes('quantity') && NOISE_WORDS.includes('billing'));
});

test('hints: the purpose of a field from its autocomplete, then its type, then its name, then its id', () => {
  const field = (attrs) => (name) => (Object.hasOwn(attrs, name) ? attrs[name] : null);
  assert.deepEqual(purposeOf(field({ autocomplete: 'billing email', name: 'phone' }), 'text'), { purpose: 'email', mode: 'billing', from: 'autocomplete' });
  assert.deepEqual(purposeOf(field({ autocomplete: 'phone', name: 'phone' }), 'text'), { purpose: 'tel', mode: null, from: 'name' }, 'an invalid value gives no purpose');
  assert.deepEqual(purposeOf(field({ autocomplete: 'on' }), 'email'), { purpose: 'email', mode: null, from: 'type' });
  assert.deepEqual(purposeOf(field({}), 'tel'), { purpose: 'tel', mode: null, from: 'type' });
  assert.deepEqual(purposeOf(field({ name: 'pin' }), 'password'), { purpose: 'password', mode: null, from: 'type' });
  assert.deepEqual(purposeOf(field({ name: 'confirm_password' }), 'password'), { purpose: 'new-password', mode: null, from: 'type' });
  assert.deepEqual(purposeOf(field({ id: 'oldPassword' }), 'password'), { purpose: 'current-password', mode: null, from: 'type' });
  assert.deepEqual(purposeOf(field({ name: 'q', id: 'surname' }), 'text'), { purpose: 'family-name', mode: null, from: 'id' });
  assert.equal(purposeOf(field({ name: 'q' }), 'text'), null);
  assert.equal(typeForPurpose('email'), 'email');
  assert.equal(typeForPurpose('url'), 'url');
  assert.equal(typeForPurpose('tel-national'), 'tel');
  assert.equal(typeForPurpose('given-name'), null);
});
