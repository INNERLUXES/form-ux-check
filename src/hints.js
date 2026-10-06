// What a field is for, worked out from its markup alone: from a valid autocomplete field name first, then from its
// type (email, tel and password), then from the words of its name attribute, then from the words of its id. The words
// of a name or an id are split at every character that is not a letter or a digit and between a lowercase letter or a
// digit and an uppercase letter, lowered, and joined again; the joined word is looked up in the fixed table below as a
// whole, so "hotel" or "telescope" never reads as tel. When the whole is not in the table, the leading and trailing
// words of NOISE_WORDS are dropped and the rest is looked up once more; billing, shipping and delivery are kept as the
// mode of a suggested token. The table is the tool's own; docs/method.md lists it, and no part of it comes from the
// input or the configuration.

import { readAutocomplete } from './autofill.js';
import { asciiLower } from './words.js';

// The joined words of a name or id, and the autocomplete field name they point to.
export const NAME_HINTS = {
  name: ['name', 'fullname', 'yourname'],
  'given-name': ['firstname', 'fname', 'givenname', 'forename'],
  'additional-name': ['middlename'],
  'family-name': ['lastname', 'lname', 'surname', 'familyname'],
  username: ['username', 'login', 'loginname', 'uname'],
  email: ['email', 'emailaddress', 'useremail'],
  tel: ['phone', 'phonenumber', 'phoneno', 'telephone', 'tel', 'mobile', 'mobilenumber', 'mobilephone', 'cell', 'cellphone'],
  organization: ['company', 'companyname', 'organization', 'organisation', 'businessname'],
  'organization-title': ['jobtitle'],
  'street-address': ['address', 'streetaddress', 'street'],
  'address-line1': ['address1', 'addressline1', 'street1'],
  'address-line2': ['address2', 'addressline2', 'street2'],
  'address-level2': ['city', 'town'],
  'address-level1': ['state', 'province', 'region', 'county'],
  'postal-code': ['zip', 'zipcode', 'postcode', 'postalcode'],
  'country-name': ['country', 'countryname'],
  bday: ['bday', 'birthday', 'birthdate', 'dob', 'dateofbirth'],
  'cc-name': ['ccname', 'cardname', 'nameoncard', 'cardholder', 'cardholdername'],
  'cc-number': ['ccnumber', 'cardnumber', 'creditcard', 'creditcardnumber', 'ccnum'],
  'cc-exp': ['ccexp', 'expiry', 'cardexpiry', 'expirationdate', 'expdate'],
  'cc-exp-month': ['ccexpmonth', 'expmonth', 'expirymonth'],
  'cc-exp-year': ['ccexpyear', 'expyear', 'expiryyear'],
  'cc-csc': ['cvc', 'cvv', 'csc', 'securitycode', 'cardcode'],
  'one-time-code': ['otp', 'onetimecode', 'otpcode', 'verificationcode'],
  url: ['website', 'homepage', 'websiteurl'],
  'new-password': ['newpassword', 'confirmpassword', 'passwordconfirm', 'passwordconfirmation', 'repeatpassword', 'password2'],
  'current-password': ['currentpassword', 'oldpassword'],
  password: ['password', 'passwd', 'pwd', 'pass']
};

// Joined words of a name or id that ask for a number counted by the user, for which the number type fits.
export const NUMBER_HINTS = ['quantity', 'qty', 'guests', 'numberofguests', 'adults', 'children', 'age', 'numberofpeople'];

// Words dropped at the start or the end of a name or id before the second look-up.
export const NOISE_WORDS = ['billing', 'shipping', 'delivery', 'contact', 'customer', 'user', 'your', 'the', 'input', 'field', 'txt', 'form', 'new', 'primary'];

const WORD_TO_PURPOSE = new Map(Object.entries(NAME_HINTS).flatMap(([purpose, words]) => words.map((w) => [w, purpose])));

// The words of a name or an id: "billingZipCode" and "billing_zip-code" are both billing, zip, code.
export function wordsOf(text) {
  const out = [];
  let word = '';
  let prev = '';
  for (const c of String(text).slice(0, 200)) {
    const lower = c >= 'a' && c <= 'z';
    const upper = c >= 'A' && c <= 'Z';
    const digit = c >= '0' && c <= '9';
    if (!lower && !upper && !digit) {
      if (word) out.push(word);
      word = '';
    } else {
      if (upper && word && ((prev >= 'a' && prev <= 'z') || (prev >= '0' && prev <= '9'))) {
        out.push(word);
        word = '';
      }
      word += asciiLower(c);
    }
    prev = c;
  }
  if (word) out.push(word);
  return out;
}

// The purpose a name or id points to: { purpose, mode } or null.
export function purposeOfName(text) {
  const words = wordsOf(text);
  if (words.length === 0) return null;
  const whole = words.join('');
  if (WORD_TO_PURPOSE.has(whole)) return { purpose: WORD_TO_PURPOSE.get(whole), mode: null };
  let mode = null;
  let from = 0;
  let to = words.length;
  while (from < to && NOISE_WORDS.includes(words[from])) {
    if (words[from] === 'billing') mode = 'billing';
    else if (words[from] === 'shipping' || words[from] === 'delivery') mode = 'shipping';
    from += 1;
  }
  while (to > from && NOISE_WORDS.includes(words[to - 1])) to -= 1;
  const rest = words.slice(from, to).join('');
  if (rest && rest !== whole && WORD_TO_PURPOSE.has(rest)) return { purpose: WORD_TO_PURPOSE.get(rest), mode };
  return null;
}

// True when a name or id asks for a counted number.
export function isNumberName(text) {
  return NUMBER_HINTS.includes(wordsOf(text).join(''));
}

// The purpose of a control: { purpose, mode, from } where from is 'autocomplete', 'type', 'name' or 'id', or null.
// attr(name) gives the value of an attribute or null; type is the type of an input, lowered, or the tag name.
export function purposeOf(attr, type) {
  const auto = attr('autocomplete');
  if (auto !== null) {
    const a = readAutocomplete(auto);
    if (a.kind === 'field') return { purpose: a.field, mode: a.mode, from: 'autocomplete' };
  }
  if (type === 'email') return { purpose: 'email', mode: null, from: 'type' };
  if (type === 'tel') return { purpose: 'tel', mode: null, from: 'type' };
  if (type === 'password') {
    const named = purposeOfName(attr('name') ?? '') ?? purposeOfName(attr('id') ?? '');
    const purpose = named && (named.purpose === 'new-password' || named.purpose === 'current-password') ? named.purpose : 'password';
    return { purpose, mode: null, from: 'type' };
  }
  for (const key of ['name', 'id']) {
    const value = attr(key);
    if (value === null) continue;
    const p = purposeOfName(value);
    if (p) return { ...p, from: key };
  }
  return null;
}

// The input type that fits a purpose, or null: email, tel or url.
export function typeForPurpose(purpose) {
  if (purpose === 'email') return 'email';
  if (purpose === 'url') return 'url';
  if (purpose.startsWith('tel')) return 'tel';
  return null;
}
