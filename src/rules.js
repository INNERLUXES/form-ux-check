// The rules and the result. Each rule names the points of the public pages it rests on (src/data.js), says where it is
// the tool's own choice, and what to change. docs/method.md says exactly what each rule looks at and what it cannot
// see. The checks themselves are in src/forms.js, the reading of HTML in src/html.js, the autocomplete grammar in
// src/autofill.js and the purpose of a field in src/hints.js.

import { LEVELS } from './data.js';
import { grouped, plural } from './size.js';

export const RULES = [
  {
    id: 'missing-label',
    key: 'missingLabel',
    title: 'a form field with no programmatic label',
    basis: ['nameProgrammatic', 'labelsNeeded', 'labelFor', 'labelMethods'],
    own: 'an input that is not hidden and not a button, a select or a textarea with no label element that labels it (by for and id, or by wrapping it) with text in it, no aria-labelledby that points at text, no aria-label, no title and no placeholder; a field with only a placeholder is left to placeholder-only-label',
    rule: () => 'a field with no label, aria-labelledby, aria-label, title or placeholder',
    fix: 'add a visible <label for="id"> with the id of the field, or wrap the field and its text in a label; where no visible label fits the design, name the field with aria-labelledby pointing at visible text, or with aria-label'
  },
  {
    id: 'placeholder-only-label',
    key: 'placeholderOnly',
    title: 'a placeholder used as the only label',
    basis: ['placeholderNotLabel', 'placeholderMdn'],
    own: 'a field whose only name is its placeholder: no label with text, no aria-labelledby that points at text, no aria-label and no title; browsers do take the placeholder as a last resort for the name, so it is a warning and not missing-label',
    rule: () => 'a field named by its placeholder alone',
    fix: 'add a visible label that stays on screen while the person types; keep the placeholder, if at all, for an example of the format'
  },
  {
    id: 'input-type-mismatch',
    key: 'inputType',
    title: 'an email, phone, web address or number field with type="text"',
    basis: ['typesKeyboard', 'inputmodeValues'],
    own: 'an input with type="text", with no type or with a type the browser does not know, whose autocomplete field name, name or id points to an email address, a phone number, a web address or a counted number (docs/method.md lists the words); the purpose is a heuristic from the markup',
    rule: () => 'a text field whose autocomplete, name or id says email, tel, url or a counted number',
    fix: 'use the type the message names: type="email", type="tel" or type="url" bring the fitting on-screen keyboard and checks, and type="number" fits a counted number only (not a card number, a code or a postal code, which take inputmode="numeric")'
  },
  {
    id: 'autocomplete-invalid',
    key: 'autocompleteInvalid',
    title: 'an autocomplete value that is not valid',
    basis: ['autofillGrammar', 'purposeProgrammatic'],
    own: 'an autocomplete attribute on an input that is not hidden, a select, a textarea or a form whose value is not on, off or a list of autofill tokens in the order of the HTML Standard; on a form, only on and off are valid; an empty value is the default and is not reported',
    rule: () => 'an autocomplete value outside the grammar of the HTML Standard',
    fix: 'use on, off, or the tokens of the HTML Standard in their order, such as "shipping postal-code" or "work email"; the message suggests the token that was probably meant'
  },
  {
    id: 'autocomplete-missing',
    key: 'autocompleteMissing',
    title: 'a field for personal data with no autocomplete token',
    basis: ['purposeProgrammatic', 'autocompleteTokens'],
    own: 'a field whose type (email, tel, password), name or id points to a purpose of the autofill list, such as a name, an address, an email address, a phone number or card details, that has no autocomplete field name: no autocomplete attribute, or on, or off on a field that is not a login field; WCAG 1.3.5 covers fields about the user, and the tool cannot tell whose data a field asks for',
    rule: () => 'a field for personal data with no autocomplete field name',
    fix: 'add autocomplete with the token the message names, with shipping or billing in front where the form has both addresses; a field that does not ask for data about the person filling it in can be left out with the configuration'
  },
  {
    id: 'autocomplete-off-login',
    key: 'autocompleteOffLogin',
    title: 'autocomplete="off" on a login field',
    basis: ['passwordManagers', 'loginOffIgnored', 'autofillOff'],
    own: 'autocomplete="off" on a password field, on a username or email field in a form that holds a password field, or on a form that holds a password field with no token of its own',
    rule: () => 'autocomplete off on a password field, a username or email field next to one, or their form',
    fix: 'remove autocomplete="off" and name the fields: username, current-password on a login form, new-password where a password is set, so that password managers can fill them and people can paste'
  },
  {
    id: 'required-not-programmatic',
    key: 'requiredNotProgrammatic',
    title: 'a field shown as required in its label but not marked as required',
    basis: ['requiredThreeWays', 'labelsNeeded'],
    own: 'a field whose label text, or the text aria-labelledby points at, holds an asterisk or the word required (and not the word optional), with no required attribute and no aria-required="true"',
    rule: () => 'a label that says required on a field with no required or aria-required',
    fix: 'add the required attribute to the field (or aria-required="true" where the form checks the value itself), so that assistive technology says it is required too'
  },
  {
    id: 'required-not-visible',
    key: 'requiredNotVisible',
    title: 'a required field with no visible indication',
    basis: ['requiredThreeWays', 'requiredInLabel'],
    own: 'a field with the required attribute or aria-required="true" whose label text, aria-labelledby text, aria-describedby text and the legend of its fieldset hold no asterisk and no word required; a note, because a line such as "all fields are required" elsewhere on the page is not seen',
    rule: () => 'a required field whose label, description and legend do not say so',
    fix: 'say it in the label or the legend, as text such as (required) or an asterisk explained at the top of the form'
  },
  {
    id: 'broken-reference',
    key: 'brokenReference',
    title: 'a reference to an id that is not in the file',
    basis: ['errorsLinked', 'errormessageInvalid', 'labelFor'],
    own: 'an aria-describedby, aria-errormessage or aria-labelledby that names an id no element of the file has, a label whose for names no element, an input whose list names no element, and a field whose form attribute names no element; ids added by a script later are not seen',
    rule: () => 'aria-describedby, aria-errormessage, aria-labelledby, for, list or form naming a missing id',
    fix: 'point the attribute at the id of the element that holds the label, the hint or the error message, or give that element the id; an error message that is added later must get the id the field already names'
  },
  {
    id: 'unlinked-error',
    key: 'unlinkedError',
    title: 'an error message that no field points at',
    basis: ['errorsInText', 'errorsLinked'],
    own: 'an element inside a form whose class or id has the word error, that holds no field and no other such element, is not role="alert" or aria-live, and whose id no aria-describedby or aria-errormessage of the file names; the class name is a heuristic',
    rule: () => 'an element named like an error message, in a form, that no field references',
    fix: 'give the message an id and name it in aria-describedby (or aria-errormessage with aria-invalid="true") of its field, or announce it with role="alert"'
  },
  {
    id: 'duplicate-id',
    key: 'duplicateId',
    title: 'an id given twice, that a label or a reference names',
    basis: ['idUnique', 'labelFor'],
    own: 'an id that two or more elements of the file have, named by a label for, aria-labelledby, aria-describedby, aria-errormessage, list or form; the reference reaches the first element only, reported at the second',
    rule: () => 'an id held by two elements and named by a label or a reference',
    fix: 'give every element its own id, and point each label and reference at the one it means'
  },
  {
    id: 'group-without-name',
    key: 'groupName',
    title: 'a group of radio buttons or check boxes with no group name',
    basis: ['groupsMarkedUp', 'fieldsetLegend'],
    own: 'two or more radio buttons, or two or more check boxes, with the same name in the same form, where a member is not inside a fieldset whose legend has text, nor inside an element with role group or radiogroup named by aria-label or aria-labelledby',
    rule: () => 'radio buttons or check boxes sharing a name, outside a named fieldset or group',
    fix: 'put the group in a <fieldset> with a <legend> that asks the question, or in an element with role="group" (role="radiogroup" for radio buttons) and aria-labelledby pointing at the question'
  },
  {
    id: 'button-without-name',
    key: 'buttonName',
    title: 'a button with no accessible name',
    basis: ['nameProgrammatic', 'labelMethods'],
    own: 'a button element with no text, no image with alt text in it, no aria-labelledby that points at text, no aria-label and no title; an input of type button with no value or other name; an input of type image with no alt, aria-label, aria-labelledby or title; submit and reset inputs have a default name and are not reported',
    rule: () => 'a button with no text, alt text, aria-labelledby, aria-label, title or value',
    fix: 'put the words in the button, or alt text on its image; for an icon button, add aria-label with what it does'
  },
  {
    id: 'form-without-submit',
    key: 'formSubmit',
    title: 'a form with no submit button',
    basis: ['submitButton'],
    own: 'a form that holds a field that is not hidden but no button of type submit (a button with no type is one), no input of type submit or image, and no such button outside it that names it with its form attribute; a form sent by a script is reported too, because the script is not read',
    rule: () => 'a form with fields and no submit button',
    fix: 'add a <button type="submit"> with a clear name, so the form is sent by an explicit action that works with a keyboard and with Enter'
  },
  {
    id: 'positive-tabindex',
    key: 'positiveTabindex',
    title: 'a tabindex above 0',
    basis: ['focusOrderMeaning', 'tabindexZero'],
    own: 'any element whose tabindex, read as the HTML Standard reads a whole number, is above 0',
    rule: () => 'a tabindex value above 0',
    fix: 'remove the tabindex, or use 0, and put the fields in the source in the order they should be filled'
  },
  {
    id: 'inputmode-mismatch',
    key: 'inputmodeMismatch',
    title: 'an inputmode or pattern that does not fit the field',
    basis: ['inputmodeValues', 'patternTypes', 'typesKeyboard'],
    own: 'an inputmode value outside the eight of the list; an inputmode that differs from the keyboard of an email, tel, url, number or search type; an inputmode or a pattern on a type it does not apply to, or on a select or a textarea for pattern; a pattern of digits only, or a card number, card code or one-time code, on a text, search or password field with no numeric, decimal or tel inputmode; the pattern is read as text and never run',
    rule: () => 'an inputmode or pattern that is unknown, ignored or at odds with the type',
    fix: 'use the inputmode the message names, or remove the attribute that has no effect; digits that are not a counted number take type="text" with inputmode="numeric"'
  },
  {
    id: 'many-options',
    key: 'manyOptions',
    title: 'a select list with very many options',
    basis: ['datalistTyping', 'describedbyHints'],
    own: 'a select element with more options than optionLimit (40 by default) and no aria-describedby that points at text, which counts as a search hint whatever it says; a note for the UX audit, because a long list is slow to scan and a script may already make it searchable',
    rule: (config) => `a select with more than ${grouped(config.optionLimit)} options and no hint`,
    fix: 'consider a text field with a datalist or a search, grouping the options with optgroup, or a hint that typing the first letters jumps to an option'
  },
  {
    id: 'unreadable-file',
    key: null,
    title: 'a file that cannot be read',
    basis: ['jsonUtf8', 'jsonRepeatedNames'],
    own: 'a file over its size limit, a binary file, or a file that is not valid UTF-8, or UTF-16 with its byte order mark; nothing in it is checked; this rule cannot be set lower or off',
    rule: () => 'a file that the tool could not read',
    fix: 'save the file as UTF-8; a page larger than the limit can be checked with a larger limit in a run of its own'
  },
  {
    id: 'scan-limit',
    key: null,
    title: 'the input is larger than the limits of a run',
    basis: ['nameProgrammatic'],
    own: 'a folder with more files, folders or HTML files than the limits of docs/limits.md, folders nested deeper, or an HTML file past the limits of the reader (elements, depth, attributes, names, values); the rest is not read, so the run fails; this rule cannot be set lower or off',
    rule: () => 'a folder or a file past a limit of the run',
    fix: 'exclude the folders that are not pages of the site, or check the parts of the site in runs of their own'
  }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

// True when a level is at or above another.
export const atOrAbove = (level, min) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

// The result: the run fails when a finding is at or above the level failOn. { pass, failOn, failing, byLevel, text }.
export function decide(findings, failOn) {
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of findings) byLevel[f.level] += 1;
  const failing = findings.filter((f) => atOrAbove(f.level, failOn)).length;
  const counts = ['error', 'warning', 'info'].filter((l) => byLevel[l]).map((l) => `${grouped(byLevel[l])} ${l}`);
  const text = failing
    ? `FAIL - ${plural(failing, 'finding')} at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`
    : `PASS - no finding at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`;
  return { pass: failing === 0, failOn, failing, byLevel, text };
}
