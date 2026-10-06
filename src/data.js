// The public pages the checks rest on, and what each says, written in this project's own words. research/sources.md
// lists every page with a longer note on each, and test/data.test.js checks that every page here is listed there and
// that every rule names points that exist. The code in src/ uses these constants and never writes a reason of its own
// in a report.

const WCAG = 'https://www.w3.org/WAI/WCAG22/Understanding';
const TUTORIAL = 'https://www.w3.org/WAI/tutorials/forms';
const MDN = 'https://developer.mozilla.org/en-US/docs/Web';

export const SOURCES = [
  { id: 'wcagLabels', title: 'Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2)', url: `${WCAG}/labels-or-instructions.html` },
  { id: 'wcagPurpose', title: 'Understanding SC 1.3.5 Identify Input Purpose (W3C WAI, WCAG 2.2)', url: `${WCAG}/identify-input-purpose.html` },
  { id: 'wcagErrors', title: 'Understanding SC 3.3.1 Error Identification (W3C WAI, WCAG 2.2)', url: `${WCAG}/error-identification.html` },
  { id: 'wcagName', title: 'Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2)', url: `${WCAG}/name-role-value.html` },
  { id: 'wcagInfo', title: 'Understanding SC 1.3.1 Info and Relationships (W3C WAI, WCAG 2.2)', url: `${WCAG}/info-and-relationships.html` },
  { id: 'wcagFocus', title: 'Understanding SC 2.4.3 Focus Order (W3C WAI, WCAG 2.2)', url: `${WCAG}/focus-order.html` },
  { id: 'wcagOnInput', title: 'Understanding SC 3.2.2 On Input (W3C WAI, WCAG 2.2)', url: `${WCAG}/on-input.html` },
  { id: 'wcagAuth', title: 'Understanding SC 3.3.8 Accessible Authentication (Minimum) (W3C WAI, WCAG 2.2)', url: `${WCAG}/accessible-authentication-minimum.html` },
  { id: 'whatwgAutofill', title: 'HTML Standard, Autofill (WHATWG)', url: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill' },
  { id: 'whatwgLabel', title: 'HTML Standard, The label element (WHATWG)', url: 'https://html.spec.whatwg.org/multipage/forms.html#the-label-element' },
  { id: 'waiLabels', title: 'Labeling Controls (W3C WAI Forms Tutorial)', url: `${TUTORIAL}/labels/` },
  { id: 'waiGrouping', title: 'Grouping Controls (W3C WAI Forms Tutorial)', url: `${TUTORIAL}/grouping/` },
  { id: 'waiInstructions', title: 'Form Instructions (W3C WAI Forms Tutorial)', url: `${TUTORIAL}/instructions/` },
  { id: 'waiValidation', title: 'Validating Input (W3C WAI Forms Tutorial)', url: `${TUTORIAL}/validation/` },
  { id: 'waiNotifications', title: 'User Notifications (W3C WAI Forms Tutorial)', url: `${TUTORIAL}/notifications/` },
  { id: 'mdnAutocomplete', title: 'HTML attribute: autocomplete (MDN)', url: `${MDN}/HTML/Reference/Attributes/autocomplete` },
  { id: 'mdnInputmode', title: 'HTML inputmode global attribute (MDN)', url: `${MDN}/HTML/Reference/Global_attributes/inputmode` },
  { id: 'mdnInput', title: '<input>: The HTML Input element (MDN)', url: `${MDN}/HTML/Reference/Elements/input` },
  { id: 'mdnTabindex', title: 'HTML tabindex global attribute (MDN)', url: `${MDN}/HTML/Reference/Global_attributes/tabindex` },
  { id: 'mdnAutocompleteOff', title: 'How to turn off form autocompletion (MDN)', url: `${MDN}/Security/Practical_implementation_guides/Turning_off_form_autocompletion` },
  { id: 'mdnErrormessage', title: 'ARIA: aria-errormessage attribute (MDN)', url: `${MDN}/Accessibility/ARIA/Reference/Attributes/aria-errormessage` },
  { id: 'mdnDatalist', title: '<datalist>: The HTML Data List element (MDN)', url: `${MDN}/HTML/Reference/Elements/datalist` },
  { id: 'mdnId', title: 'HTML id global attribute (MDN)', url: `${MDN}/HTML/Reference/Global_attributes/id` },
  { id: 'rfc4180', title: 'RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files', url: 'https://www.rfc-editor.org/rfc/rfc4180' },
  { id: 'rfc8259', title: 'RFC 8259, The JSON Data Interchange Format', url: 'https://www.rfc-editor.org/rfc/rfc8259' },
  { id: 'owaspCsv', title: 'CSV Injection (OWASP)', url: 'https://community.owasp.org/attacks/CSV_Injection' },
  { id: 'githubCommands', title: 'Workflow commands for GitHub Actions (GitHub Docs)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// What a page says, in this project's own words. Each point names its page.
export const POINTS = {
  labelsNeeded: { source: 'wcagLabels', text: 'labels or instructions are given wherever content asks for input, so people know what to enter, and identifying required fields in them helps people finish a form' },
  requiredInLabel: { source: 'wcagLabels', text: 'among the sufficient techniques, a required control is shown as required in the text of its label or legend (H90)' },
  purposeProgrammatic: { source: 'wcagPurpose', text: 'the purpose of a field that collects information about the user can be determined by software, in HTML with the autocomplete tokens (H98), and an incorrect value is failure F107' },
  errorsInText: { source: 'wcagErrors', text: 'when an input error is detected, the field in error is identified and the error is described to the user in text' },
  nameProgrammatic: { source: 'wcagName', text: 'every user interface component has a name and a role that software can determine, and a form control with no programmatically determined name is failure F68' },
  groupsMarkedUp: { source: 'wcagInfo', text: 'relationships shown on screen are marked up: labels with label elements (H44), sets of radio buttons and check boxes with fieldset and legend (H71) or a grouping role (ARIA17), and title where no label can be used (H65)' },
  focusOrderMeaning: { source: 'wcagFocus', text: 'focusable components receive focus in an order that keeps meaning and operability, and a tab order set with tabindex that breaks it is failure F44' },
  submitButton: { source: 'wcagOnInput', text: 'changing a field does not change the context on its own; a submit button that starts the change is technique G80, and providing submit buttons in HTML is H32' },
  passwordManagers: { source: 'wcagAuth', text: 'a login step lets the browser and password managers fill in the fields, and lets people paste their credentials' },
  autofillGrammar: { source: 'whatwgAutofill', text: 'an autocomplete value is on, off, or in this order an optional section- token, an optional shipping or billing, an optional contact type before a contact field, one field name from a fixed list and an optional webauthn' },
  autofillOff: { source: 'whatwgAutofill', text: 'with off, the browser is asked not to store the value of the control and not to offer values entered before' },
  labelFor: { source: 'whatwgLabel', text: 'a label with a for attribute labels the first element in tree order with that id, if it is labelable; a label without one labels its first labelable descendant; a hidden input is not labelable' },
  labelMethods: { source: 'waiLabels', text: 'a label is tied to its control by for and id or by wrapping it, aria-label and aria-labelledby name it for screen readers, title is less reliable, and a button is named by its content or its value' },
  fieldsetLegend: { source: 'waiGrouping', text: 'related radio buttons and check boxes go in a fieldset whose legend names the group, or in a container with role group named with aria-labelledby' },
  placeholderNotLabel: { source: 'waiInstructions', text: 'placeholder text is not a replacement for a label: assistive technology may not read it, and it disappears as soon as someone types' },
  describedbyHints: { source: 'waiInstructions', text: 'aria-describedby ties extra instructions, such as the expected format, to a field, and they are read after its label' },
  requiredThreeWays: { source: 'waiValidation', text: 'a required field is marked with the required attribute, with aria-required for assistive technology, and with text such as (required) in its label for everyone' },
  errorsLinked: { source: 'waiNotifications', text: 'an error message sits at or near its field, is tied to it with aria-describedby, and aria-invalid marks the field in error' },
  autocompleteTokens: { source: 'mdnAutocomplete', text: 'autocomplete takes space-separated tokens on input, select, textarea and form, browsers may ignore off on login fields, and fitting tokens meet WCAG 1.3.5' },
  inputmodeValues: { source: 'mdnInputmode', text: 'inputmode takes none, text, decimal, numeric, tel, search, email or url; numeric is for digits such as PIN codes and card numbers, and the matching input type is used where the value must be checked' },
  typesKeyboard: { source: 'mdnInput', text: 'the email, tel, url and number types look like a text field but bring validation and a fitting on-screen keyboard on devices that have one' },
  patternTypes: { source: 'mdnInput', text: 'the pattern attribute applies to the text, search, url, tel, email and password types only' },
  placeholderMdn: { source: 'mdnInput', text: 'a placeholder is not a label and must never be needed to understand a form' },
  tabindexZero: { source: 'mdnTabindex', text: 'only 0 and -1 are advised as tabindex values; a value above 0 changes the focus order and makes the page hard to use with a keyboard' },
  loginOffIgnored: { source: 'mdnAutocompleteOff', text: 'browsers ignore autocomplete off on login forms and still offer to save and fill credentials, because password managers help security; new-password is the hint where a new password is set' },
  errormessageInvalid: { source: 'mdnErrormessage', text: 'aria-errormessage names the id of the element that holds the error message of a field marked with aria-invalid, and aria-describedby is the more widely supported way to tie the two' },
  datalistTyping: { source: 'mdnDatalist', text: 'a datalist gives a text field suggested values while the person can still type, an alternative to scrolling a long list, with accessibility limits of its own' },
  idUnique: { source: 'mdnId', text: 'an id must be unique in the whole document, and a label that points at a repeated id is no longer reliably tied to its control' },
  csvRecords: { source: 'rfc4180', text: 'each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice' },
  csvInjection: { source: 'owaspCsv', text: 'a spreadsheet may read a cell that starts with =, +, -, @, a tab, a carriage return or a line feed as a formula, and no one escape is safe in every program that opens the file' },
  jsonUtf8: { source: 'rfc8259', text: 'JSON text exchanged between systems must be UTF-8' },
  jsonRepeatedNames: { source: 'rfc8259', text: 'when an object repeats a name the behavior of the software that reads it cannot be predicted, so the JSON reader of this tool refuses a repeated name' },
  githubAnnotations: { source: 'githubCommands', text: 'a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run' }
};

// The page of a point.
export const pointPage = (key) => source(POINTS[key].source);

// The levels of a finding, from the lowest.
export const LEVELS = ['info', 'warning', 'error'];

// The sentence every report ends with, before the result.
export const NOTICE = 'This check reads the HTML files on disk as text and runs no browser, no script and no style sheet; the checks are a heuristic. A finding is a lead with a file and a line for a UX audit, and a clean result is not an accessibility audit and not a conformance claim (docs/limits.md).';
