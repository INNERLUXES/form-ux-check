import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INPUTMODES, INPUT_TYPES, PATTERN_TYPES, describe, isDigitsPattern, parseHtml, readInteger, typeOf } from '../src/index.js';
import { columnOf, configOf, findingsIn, form, lineOf, ofRule, page, rulesIn } from './helpers.js';

// Every rule with the form that is reported and the form next to it that is not, each worked out by hand.

const only = (html, rule, config) => ofRule(html, rule, config).map((f) => f.found);

test('missing-label: a field with no name of any kind; a label by for, by wrapping, aria-labelledby, aria-label and title are names', () => {
  const html = form(['<input type="text" name="a">', '<select name="b"><option>x</option></select>', '<textarea name="c"></textarea>', '<input type="hidden" name="d">']);
  const f = ofRule(html, 'missing-label');
  assert.deepEqual(f.map((x) => [x.line, x.column]), [[lineOf(html, 'name="a"'), 1], [lineOf(html, '<select'), 1], [lineOf(html, '<textarea'), 1]]);
  assert.equal(f[0].found, '<input type="text" name="a"> has no programmatic label: no label, aria-labelledby, aria-label, title or placeholder names it');
  const named = form([
    '<label for="a">A</label><input id="a">',
    '<label>B <input name="b"></label>',
    '<span id="c-label">C</span><input aria-labelledby="c-label">',
    '<input aria-label="D">',
    '<input title="E">',
    '<label for="f">F</label><select id="f"></select>',
    '<input type="checkbox" id="g"><label for="g">G</label>'
  ]);
  assert.deepEqual(rulesIn(named), []);
  assert.match(only(form(['<label for="a"> </label><input id="a">']), 'missing-label')[0], /its label holds no text/);
  assert.match(only(form(['<span id="e"></span><input aria-labelledby="e">']), 'missing-label')[0], /its aria-labelledby points at no text/);
  assert.match(only(form(['<input aria-label="  ">']), 'missing-label')[0], /no label, aria-labelledby/);
  // A label with for labels the element with that id, not the one it wraps; a label for a hidden input labels nothing.
  assert.equal(only(form(['<label for="x">X <input name="y"></label><input id="x">']), 'missing-label').length, 1);
  assert.equal(only(form(['<label for="h">H</label><input type="hidden" id="h"><input id="h2">']), 'missing-label').length, 1);
  assert.equal(only(form(['<label for="p">P</label><p id="p"></p>']), 'missing-label').length, 0);
  // A label that wraps a hidden input and a field labels the field.
  assert.deepEqual(rulesIn(form(['<label>W <input type="hidden" name="t"><input name="w"></label>'])), []);
});

test('placeholder-only-label: a placeholder alone is a warning, never also missing-label; a label next to it is fine', () => {
  const html = form(['<input type="text" name="city" placeholder="City">']);
  assert.deepEqual(rulesIn(html).filter((r) => r.includes('label')), ['placeholder-only-label']);
  assert.equal(only(html, 'placeholder-only-label')[0], '<input type="text" name="city"> is named only by its placeholder "City", which disappears when someone types and may not be read out');
  assert.deepEqual(only(form(['<label for="t">Town</label><input id="t" name="town" placeholder="e.g. Kestrel"> ']), 'placeholder-only-label'), []);
  assert.deepEqual(only(form(['<textarea placeholder="Notes"></textarea>']), 'placeholder-only-label').length, 1);
});

test('input-type-mismatch: a text field for email, tel, url or a counted number; the typed field and other words are not', () => {
  const html = form(['<label>a <input name="email"></label>', '<label>b <input type="TEXT" id="mobilePhone"></label>', '<label>c <input type="texts" autocomplete="url"></label>', '<label>d <input name="number_of_guests"></label>', '<label>e <input name="hotel"></label>', '<label>f <input type="email" name="email"></label>', '<label>g <input name="postcode"></label>', '<label>h <input type="search" name="email"></label>']);
  assert.deepEqual(only(html, 'input-type-mismatch'), [
    '<input name="email"> is a plain text field, but name="email": use type="email"',
    '<input type="TEXT" id="mobilePhone"> is a plain text field, but id="mobilePhone": use type="tel"',
    '<input type="texts"> is a plain text field, but autocomplete="url": use type="url"',
    '<input name="number_of_guests"> is a plain text field, but its name asks for a counted number: use type="number"'
  ]);
  assert.equal(only(form(['<label>n <input id="qty"></label>']), 'input-type-mismatch').length, 1);
});

test('autocomplete-invalid: on fields and forms, with the place of the attribute; on, off and empty values are fine', () => {
  const html = form(['<label>a <input name="a" autocomplete="phone"></label>', '<label>b <input name="b" autocomplete="home name"></label>', '<label>c <input name="c" autocomplete=""></label>', '<label>d <input name="d" autocomplete="off"></label>', '<label>e <input type="hidden" name="e" autocomplete="bogus"></label>'], 'autocomplete="never"');
  const f = ofRule(html, 'autocomplete-invalid');
  assert.deepEqual(f.map((x) => x.found), [
    '<form>: autocomplete="never" on a form must be on or off',
    '<input name="a">: autocomplete="phone": "phone" is not an autofill token; did you mean "tel"?',
    '<input name="b">: autocomplete="home name": the contact type "home" goes only before a contact field such as tel or email, not before "name"'
  ]);
  assert.equal(f[1].column, columnOf(html, 'autocomplete="phone"'));
  assert.deepEqual(rulesIn(form(['<label>a <input name="a" autocomplete="ON"></label>'], 'autocomplete="OFF"')), []);
});

test('autocomplete-missing: a personal-data field with no field name gets the token to use; other fields and the right token do not', () => {
  const html = form(['<label>a <input name="billing_first_name"></label>', '<label>b <input type="email" name="x" autocomplete="on"></label>', '<label>c <select name="country"><option>x</option></select></label>', '<label>d <input name="zip" autocomplete="off"></label>', '<label>e <input type="checkbox" name="email"></label>', '<label>f <input name="favourite_colour"></label>', '<label>g <input name="cardNumber" autocomplete="cc-number" inputmode="numeric"></label>', '<label>h <input name="bday" type="date"></label>']);
  assert.deepEqual(only(html, 'autocomplete-missing'), [
    '<input name="billing_first_name"> asks for "billing_first_name" and it has no autocomplete: use autocomplete="billing given-name"',
    '<input type="email" name="x"> asks for a email value and autocomplete="on" names no purpose: use autocomplete="email"',
    '<select name="country"> asks for "country" and it has no autocomplete: use autocomplete="country"',
    '<input name="zip"> asks for "zip" and autocomplete="off" names no purpose: use autocomplete="postal-code"',
    '<input type="date" name="bday"> asks for "bday" and it has no autocomplete: use autocomplete="bday"'
  ]);
  const pw = form(['<label>p <input type="password" name="pw"></label>', '<label>q <input type="password" name="pw2"></label>']);
  assert.match(only(pw, 'autocomplete-missing')[0], /use autocomplete="new-password"/);
  assert.match(only(form(['<label>p <input type="password" name="pw"></label>']), 'autocomplete-missing')[0], /use autocomplete="current-password"/);
  assert.match(only(form(['<label>t <input name="town" autocomplete="shiping address-level2"></label>']), 'autocomplete-invalid')[0], /"shiping" is not an autofill token; did you mean "shipping"\?/);
  assert.deepEqual(only(form(['<label>t <input name="town" autocomplete="shiping address-level2"></label>']), 'autocomplete-missing'), [], 'an invalid value is reported once, by autocomplete-invalid');
});

test('autocomplete-off-login: off on a password field, on an email next to one, and on their form; the same on a search form is fine', () => {
  const html = form(['<label>e <input type="email" name="email" autocomplete="off"></label>', '<label>u <input name="username" autocomplete="off"></label>', '<label>p <input type="password" name="pw" autocomplete="off"></label>', '<label>q <input type="password" name="pin"></label>'], 'autocomplete="off"');
  const f = ofRule(html, 'autocomplete-off-login');
  assert.deepEqual(f.map((x) => x.found.split(':')[0]), ['<form>', '<input type="email" name="email">', '<input name="username">', '<input type="password" name="pw">']);
  assert.match(f[0].found, new RegExp(`password field \\(line ${lineOf(html, 'name="pin"')}\\) that has no token`));
  assert.match(f[1].found, /on a login field next to a password field/);
  assert.match(f[3].found, /on a password field keeps password managers from filling it/);
  assert.deepEqual(only(form(['<label>e <input type="email" name="email" autocomplete="off"></label>'], 'autocomplete="off"'), 'autocomplete-off-login'), []);
  assert.deepEqual(only(form(['<label>p <input type="password" name="pw" autocomplete="current-password"></label>'], 'autocomplete="off"'), 'autocomplete-off-login'), [], 'a field with its own token is not filled from the form');
  const outside = page('<form id="f" action="/x"><button>Go</button></form><label>p <input type="password" form="f" name="pw"></label>');
  assert.deepEqual(ofRule(outside, 'autocomplete-off-login'), []);
});

test('required-not-programmatic and required-not-visible: the label and the attribute must agree', () => {
  const html = form(['<label for="a">Name *</label><input id="a" name="nickname_x">', '<label for="b">Town (required)</label><input id="b" name="b">', '<label for="c">Phone (optional, not required)</label><input id="c" name="c">', '<label for="d">Name *</label><input id="d" name="d" required>', '<label for="e">Name</label><input id="e" name="e" aria-required="TRUE">', '<label for="f">Name</label><input id="f" name="f" required aria-describedby="f-hint"><p id="f-hint">Required.</p>', '<fieldset><legend>Size (required)</legend><label>S <input type="radio" name="s" required></label><label>M <input type="radio" name="s" required></label></fieldset>', '<label>A <input type="radio" name="t" required></label><label>B <input type="radio" name="t" required></label>']);
  assert.deepEqual(ofRule(html, 'required-not-programmatic').map((f) => f.line), [lineOf(html, 'id="a"'), lineOf(html, 'id="b"')]);
  assert.match(only(html, 'required-not-programmatic')[0], /its label "Name \*" says it is required, but it has no required attribute/);
  assert.deepEqual(ofRule(html, 'required-not-visible').map((f) => f.line), [lineOf(html, 'id="e"'), lineOf(html, 'name="t"')], 'one finding for a group of required radio buttons');
});

test('broken-reference: aria-describedby, aria-errormessage, aria-labelledby, for, list and form naming a missing id', () => {
  const html = form(['<label for="nowhere">A</label><input id="a" aria-describedby="hint gone1 gone2">', '<p id="hint">h</p>', '<label>B <input name="b" aria-errormessage="b-error" list="cities" form="other"></label>', '<span id="c">C</span><input aria-labelledby="c missing">']);
  assert.deepEqual(only(html, 'broken-reference'), [
    '<label for="nowhere">: for="nowhere" names an id that no element of the file has, so the label labels nothing',
    '<input id="a">: aria-describedby names the ids "gone1", "gone2", which no element of the file has',
    '<input name="b">: aria-errormessage names the id "b-error", which no element of the file has',
    '<input name="b">: list="cities" names an id that no element of the file has',
    '<input name="b">: form="other" names an id that no element of the file has',
    '<input>: aria-labelledby names the id "missing", which no element of the file has'
  ]);
  assert.deepEqual(only(form(['<input id="q" aria-label="Q" aria-describedby="q-hint" list="l"><datalist id="l"></datalist>', '<p id="q-hint">x</p>']), 'broken-reference'), []);
});

test('unlinked-error: an element named like an error, in a form, that nothing references', () => {
  const html = form(['<label>a <input name="a" aria-describedby="a-error"></label>', '<p id="a-error" class="error">Linked</p>', '<p class="field-error">Not linked</p>', '<div class="has-errors"><label>b <input name="b"></label></div>', '<p id="errorMessage"></p>', '<p class="error" role="alert">Announced</p>', '<div aria-live="polite"><p class="error">In a live region</p></div>', '<div class="errors"><p class="error">Inner</p></div>', '<p class="terror">x</p>']);
  assert.deepEqual(only(html, 'unlinked-error'), [
    '<p> reads like an error message ("Not linked"), but no aria-describedby or aria-errormessage of a field names it, and it has no id',
    '<p id="errorMessage"> reads like an error message, empty in the file, but no aria-describedby or aria-errormessage of a field names its id',
    '<p> reads like an error message ("Inner"), but no aria-describedby or aria-errormessage of a field names it, and it has no id'
  ]);
  assert.deepEqual(only(page('<p class="error">Outside a form</p>'), 'unlinked-error'), []);
  assert.deepEqual(only(form(['<label>a <input name="a" aria-live="off"></label>', '<p class="error" aria-live="off">x</p>']), 'unlinked-error').length, 1);
});

test('duplicate-id: an id held twice and named by a reference, at the second; an id held twice and named by nothing is not reported', () => {
  const html = form(['<label for="dup">A</label>', '<input id="dup" name="a">', '<input id="dup" name="b" aria-label="B">', '<p id="twice">x</p><p id="twice">y</p>']);
  const f = ofRule(html, 'duplicate-id');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(html, 'name="b"'));
  assert.equal(f[0].found, `the id "dup" is given to 2 elements, <input name="a" id="dup"> at line ${lineOf(html, 'name="a"')} first; the for attribute of <label for="dup"> at line ${lineOf(html, 'for="dup"')} reaches the first one only`);
});

test('group-without-name: radio buttons and check boxes that share a name, outside a named fieldset or group', () => {
  const html = form([
    '<label><input type="radio" name="size" value="s"> S</label><label><input type="radio" name="size" value="m"> M</label>',
    '<fieldset><legend>Colour</legend><label><input type="radio" name="colour"> Red</label><label><input type="radio" name="colour"> Blue</label></fieldset>',
    '<fieldset><legend> </legend><label><input type="checkbox" name="extras"> Lock</label><label><input type="checkbox" name="extras"> Lamp</label></fieldset>',
    '<div role="radiogroup" aria-labelledby="speed-q"><p id="speed-q">Speed</p><label><input type="radio" name="speed"> 3</label><label><input type="radio" name="speed"> 7</label></div>',
    '<div role="group" aria-label="Days"><label><input type="checkbox" name="days"> Mon</label><label><input type="checkbox" name="days"> Tue</label></div>',
    '<div role="group"><label><input type="checkbox" name="news"> A</label><label><input type="checkbox" name="news"> B</label></div>',
    '<label><input type="checkbox" name="terms"> Terms</label>',
    '<label><input type="radio" name=""> X</label><label><input type="radio" name=""> Y</label>'
  ]);
  assert.deepEqual(only(html, 'group-without-name'), [
    '2 radio buttons named "size" are not in a fieldset with a legend or a named group, so the question they answer is not announced',
    '2 check boxes named "extras" are not in a fieldset with a legend or a named group, so the question they answer is not announced',
    '2 check boxes named "news" are not in a fieldset with a legend or a named group, so the question they answer is not announced'
  ]);
});

test('button-without-name: buttons and input buttons with no name; text, alt text, labels, values and default names are names', () => {
  const html = page(['<button></button>', '<button><img src="x.png"></button>', '<input type="button">', '<input type="image" src="go.png">', '<input type="submit">', '<input type="reset">', '<button>Go</button>', '<button><img src="i.png" alt="Search"></button>', '<button aria-label="Close"></button>', '<span id="b-name">Next</span><button aria-labelledby="b-name"></button>', '<button title="More"></button>', '<input type="button" value="Add">', '<input type="image" alt="Pay">', '<label>Upload <button></button></label>'].join('\n'));
  assert.deepEqual(ofRule(html, 'button-without-name').map((f) => f.line), [lineOf(html, '<button></button>'), lineOf(html, '<button><img src="x.png">'), lineOf(html, '<input type="button">'), lineOf(html, '<input type="image" src')]);
  assert.match(only(html, 'button-without-name')[2], /has no value, no aria-label/);
  assert.match(only(html, 'button-without-name')[3], /has no alt, no aria-label/);
});

test('form-without-submit: a form with fields and no submit button; a button with no type, an image input and a button outside the form submit', () => {
  const html = page(['<form id="a"><label>A <input name="a"></label><button type="button">Check</button><input type="reset"></form>', '<form><label>B <input name="b"></label><button>Send</button></form>', '<form><label>C <input name="c"></label><button type="SUBMIT ">Send</button></form>', '<form><label>D <input name="d"></label><input type="image" alt="Go"></form>', '<form id="e"><label>E <input name="e"></label></form><button form="e">Send</button>', '<form><input type="hidden" name="token"><button type="button">Like</button></form>', '<form><label>F <input name="f"></label><button type="menu">x</button></form>'].join('\n'));
  assert.deepEqual(only(html, 'form-without-submit'), ['<form id="a"> holds 1 field and no submit button']);
  assert.match(only(page('<form><label>A <input name="a"></label><label>B <select name="b"></select></label></form>'), 'form-without-submit')[0], /holds 2 fields/);
  assert.deepEqual(only(page('<form id="f"></form><label>A <input name="a" form="f"></label>'), 'form-without-submit'), ['<form id="f"> holds 1 field and no submit button']);
  assert.deepEqual(only(page('<p id="f"></p><label>A <input name="a" form="f"></label>'), 'form-without-submit'), [], 'a form attribute that names no form gives no owner');
});

test('positive-tabindex: a tabindex above 0, read as the HTML Standard reads a whole number', () => {
  const html = page(['<a href="/" tabindex="1">a</a>', '<div tabindex=" +7x">b</div>', '<input tabindex="0" aria-label="c">', '<input tabindex="-1" aria-label="d">', '<span tabindex="x">e</span>', '<span tabindex="">f</span>'].join('\n'));
  assert.deepEqual(only(html, 'positive-tabindex'), ['<a>: tabindex="1" puts it ahead of the order of the page', '<div>: tabindex=" +7x" puts it ahead of the order of the page']);
  assert.equal(readInteger(' -12a'), -12);
  assert.equal(readInteger('+'), null);
  assert.equal(readInteger('9'.repeat(30)), 999999999999);
});

test('inputmode-mismatch: unknown values, values at odds with the type, attributes with no effect, and digits with a full keyboard', () => {
  const html = form([
    '<label>a <input name="a" inputmode="digits"></label>',
    '<label>b <input type="email" name="b" inputmode="numeric"></label>',
    '<label>c <input type="number" name="c" inputmode="DECIMAL"></label>',
    '<label>d <input type="checkbox" name="d" inputmode="text"></label>',
    '<label>e <select name="e" inputmode="text"></select></label>',
    '<label>f <input type="number" name="f" pattern="[0-9]+"></label>',
    '<label>g <textarea name="g" pattern="x"></textarea></label>',
    '<label>h <input name="h" pattern="\\d{4}"></label>',
    '<label>i <input name="i" pattern="[0-9]{4}" inputmode="numeric"></label>',
    '<label>j <input name="j" pattern="[A-Z]{2}[0-9]{4}"></label>',
    '<label>k <input name="cvc"></label>',
    '<label>l <input name="otp" inputmode="numeric"></label>',
    '<label>m <input type="tel" name="m" inputmode="tel"></label>',
    '<label>n <input type="password" name="pin" pattern="^[0-9]{4,6}$"></label>'
  ]);
  assert.deepEqual(only(html, 'inputmode-mismatch'), [
    '<input name="a">: inputmode="digits" is not one of none, text, decimal, numeric, tel, search, email, url',
    '<input type="email" name="b">: inputmode="numeric" overrides the email keyboard that type="email" brings',
    '<input type="checkbox" name="d">: inputmode has no effect on a field with no keyboard',
    '<select name="e">: inputmode has no effect on a field with no keyboard',
    '<input type="number" name="f">: pattern applies to the text, search, url, tel, email and password types only; the browser ignores it here',
    '<textarea name="g">: pattern applies to the text, search, url, tel, email and password types only; the browser ignores it here',
    '<input name="h">: pattern="\\d{4}" asks for digits, but the field brings a full keyboard: add inputmode="numeric"',
    '<input name="cvc"> asks for a card security code, which is digits, with a full keyboard: add inputmode="numeric"',
    '<input type="password" name="pin">: pattern="^[0-9]{4,6}$" asks for digits, but the field brings a full keyboard: add inputmode="numeric"'
  ]);
  assert.match(only(form(['<label>o <input name="one_time_code"></label>']), 'inputmode-mismatch')[0], /asks for a one-time code/);
  assert.match(only(form(['<label>o <input name="cc-number"></label>']), 'inputmode-mismatch')[0], /asks for a card number/);
  for (const p of ['[0-9]{5}', '\\d+', '[\\d]{3,}', '^(?:[0-9]{2})?[0-9]{4}$', '1234']) assert.ok(isDigitsPattern(p), p);
  for (const p of ['', '[A-Z]', '\\w+', '[0-9]{x}', '[0-9]{5', '.*', '^$', 'x'.repeat(201)]) assert.ok(!isDigitsPattern(p), p);
});

test('many-options: a select with more options than the limit and no hint; the limit comes from the configuration', () => {
  const options = (n) => Array.from({ length: n }, (_, i) => `<option>o${i}</option>`).join('');
  const html = form([`<label>a <select name="a">${options(41)}</select></label>`, `<label>b <select name="b">${options(40)}</select></label>`, `<label>c <select name="c" aria-describedby="c-hint">${options(60)}</select></label>`, '<p id="c-hint">Type the first letters to jump.</p>', `<label>d <select name="d"><optgroup label="x">${options(45)}</optgroup></select></label>`]);
  assert.deepEqual(only(html, 'many-options'), ['<select name="a"> holds 41 options, more than 40, with no hint linked by aria-describedby', '<select name="d"> holds 45 options, more than 40, with no hint linked by aria-describedby']);
  assert.equal(only(html, 'many-options', configOf({ optionLimit: 50 })).length, 0);
  assert.equal(only(html, 'many-options', configOf({ optionLimit: 2 })).length, 3);
});

test('forms: the types, the descriptions of elements and the counts of a file', () => {
  const { elements } = parseHtml('<input type=" EMAIL "><input type="bogus"><select></select><label for="x"></label><p id="i" name="n">');
  assert.deepEqual(elements.map(typeOf), ['email', 'text', 'select', 'label', 'p']);
  assert.deepEqual(elements.map(describe), ['<input type=" EMAIL ">', '<input type="bogus">', '<select>', '<label for="x">', '<p name="n" id="i">']);
  assert.equal(INPUT_TYPES.length, 22);
  assert.deepEqual(PATTERN_TYPES, ['text', 'search', 'url', 'tel', 'email', 'password']);
  assert.equal(INPUTMODES.length, 8);
  const html = form(['<label>a (required) <input name="a" required autocomplete="name"></label>', '<input type="hidden" name="t">', '<label>b <select name="b"></select></label>', '<input type="submit" value="Go">']);
  assert.deepEqual(findingsIn(html), []);
});
