# Rules and sources

Every rule rests on points of public pages, written in this project's own words; this document lists them, with the
choices that are the tool's own and what to change. The same points are in src/data.js and are shown by `--explain`;
research/sources.md has a longer note on each page. The tool reads the HTML files on disk as text and runs no
browser: a point says what a page says, and a finding says what a file holds. The result is an input to a UX audit,
not an accessibility audit and not a conformance claim.

## The rules

| Rule | Default level | Points |
| --- | --- | --- |
| `missing-label` | error | `nameProgrammatic`, `labelsNeeded`, `labelFor`, `labelMethods` |
| `placeholder-only-label` | warning | `placeholderNotLabel`, `placeholderMdn` |
| `input-type-mismatch` | warning | `typesKeyboard`, `inputmodeValues` |
| `autocomplete-invalid` | error | `autofillGrammar`, `purposeProgrammatic` |
| `autocomplete-missing` | warning | `purposeProgrammatic`, `autocompleteTokens` |
| `autocomplete-off-login` | warning | `passwordManagers`, `loginOffIgnored`, `autofillOff` |
| `required-not-programmatic` | warning | `requiredThreeWays`, `labelsNeeded` |
| `required-not-visible` | info | `requiredThreeWays`, `requiredInLabel` |
| `broken-reference` | error | `errorsLinked`, `errormessageInvalid`, `labelFor` |
| `unlinked-error` | warning | `errorsInText`, `errorsLinked` |
| `duplicate-id` | error | `idUnique`, `labelFor` |
| `group-without-name` | warning | `groupsMarkedUp`, `fieldsetLegend` |
| `button-without-name` | error | `nameProgrammatic`, `labelMethods` |
| `form-without-submit` | warning | `submitButton` |
| `positive-tabindex` | warning | `focusOrderMeaning`, `tabindexZero` |
| `inputmode-mismatch` | warning | `inputmodeValues`, `patternTypes`, `typesKeyboard` |
| `many-options` | info | `datalistTyping`, `describedbyHints` |
| `unreadable-file` | error, always | `jsonUtf8`, `jsonRepeatedNames` |
| `scan-limit` | error, always | `nameProgrammatic` |

### `missing-label`

A form field with no programmatic label.

- `nameProgrammatic` (Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2)): every user interface component has a name and a role that software can determine, and a form control with no programmatically determined name is failure F68.
- `labelsNeeded` (Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2)): labels or instructions are given wherever content asks for input, so people know what to enter, and identifying required fields in them helps people finish a form.
- `labelFor` (HTML Standard, The label element (WHATWG)): a label with a for attribute labels the first element in tree order with that id, if it is labelable; a label without one labels its first labelable descendant; a hidden input is not labelable.
- `labelMethods` (Labeling Controls (W3C WAI Forms Tutorial)): a label is tied to its control by for and id or by wrapping it, aria-label and aria-labelledby name it for screen readers, title is less reliable, and a button is named by its content or its value.

The tool's own choice: an input that is not hidden and not a button, a select or a textarea with no label element that labels it (by for and id, or by wrapping it) with text in it, no aria-labelledby that points at text, no aria-label, no title and no placeholder; a field with only a placeholder is left to placeholder-only-label.

What to change: add a visible <label for="id"> with the id of the field, or wrap the field and its text in a label; where no visible label fits the design, name the field with aria-labelledby pointing at visible text, or with aria-label.

### `placeholder-only-label`

A placeholder used as the only label.

- `placeholderNotLabel` (Form Instructions (W3C WAI Forms Tutorial)): placeholder text is not a replacement for a label: assistive technology may not read it, and it disappears as soon as someone types.
- `placeholderMdn` (<input>: The HTML Input element (MDN)): a placeholder is not a label and must never be needed to understand a form.

The tool's own choice: a field whose only name is its placeholder: no label with text, no aria-labelledby that points at text, no aria-label and no title; browsers do take the placeholder as a last resort for the name, so it is a warning and not missing-label.

What to change: add a visible label that stays on screen while the person types; keep the placeholder, if at all, for an example of the format.

### `input-type-mismatch`

An email, phone, web address or number field with type="text".

- `typesKeyboard` (<input>: The HTML Input element (MDN)): the email, tel, url and number types look like a text field but bring validation and a fitting on-screen keyboard on devices that have one.
- `inputmodeValues` (HTML inputmode global attribute (MDN)): inputmode takes none, text, decimal, numeric, tel, search, email or url; numeric is for digits such as PIN codes and card numbers, and the matching input type is used where the value must be checked.

The tool's own choice: an input with type="text", with no type or with a type the browser does not know, whose autocomplete field name, name or id points to an email address, a phone number, a web address or a counted number (docs/method.md lists the words); the purpose is a heuristic from the markup.

What to change: use the type the message names: type="email", type="tel" or type="url" bring the fitting on-screen keyboard and checks, and type="number" fits a counted number only (not a card number, a code or a postal code, which take inputmode="numeric").

### `autocomplete-invalid`

An autocomplete value that is not valid.

- `autofillGrammar` (HTML Standard, Autofill (WHATWG)): an autocomplete value is on, off, or in this order an optional section- token, an optional shipping or billing, an optional contact type before a contact field, one field name from a fixed list and an optional webauthn.
- `purposeProgrammatic` (Understanding SC 1.3.5 Identify Input Purpose (W3C WAI, WCAG 2.2)): the purpose of a field that collects information about the user can be determined by software, in HTML with the autocomplete tokens (H98), and an incorrect value is failure F107.

The tool's own choice: an autocomplete attribute on an input that is not hidden, a select, a textarea or a form whose value is not on, off or a list of autofill tokens in the order of the HTML Standard; on a form, only on and off are valid; an empty value is the default and is not reported.

What to change: use on, off, or the tokens of the HTML Standard in their order, such as "shipping postal-code" or "work email"; the message suggests the token that was probably meant.

### `autocomplete-missing`

A field for personal data with no autocomplete token.

- `purposeProgrammatic` (Understanding SC 1.3.5 Identify Input Purpose (W3C WAI, WCAG 2.2)): the purpose of a field that collects information about the user can be determined by software, in HTML with the autocomplete tokens (H98), and an incorrect value is failure F107.
- `autocompleteTokens` (HTML attribute: autocomplete (MDN)): autocomplete takes space-separated tokens on input, select, textarea and form, browsers may ignore off on login fields, and fitting tokens meet WCAG 1.3.5.

The tool's own choice: a field whose type (email, tel, password), name or id points to a purpose of the autofill list, such as a name, an address, an email address, a phone number or card details, that has no autocomplete field name: no autocomplete attribute, or on, or off on a field that is not a login field; WCAG 1.3.5 covers fields about the user, and the tool cannot tell whose data a field asks for.

What to change: add autocomplete with the token the message names, with shipping or billing in front where the form has both addresses; a field that does not ask for data about the person filling it in can be left out with the configuration.

### `autocomplete-off-login`

Autocomplete="off" on a login field.

- `passwordManagers` (Understanding SC 3.3.8 Accessible Authentication (Minimum) (W3C WAI, WCAG 2.2)): a login step lets the browser and password managers fill in the fields, and lets people paste their credentials.
- `loginOffIgnored` (How to turn off form autocompletion (MDN)): browsers ignore autocomplete off on login forms and still offer to save and fill credentials, because password managers help security; new-password is the hint where a new password is set.
- `autofillOff` (HTML Standard, Autofill (WHATWG)): with off, the browser is asked not to store the value of the control and not to offer values entered before.

The tool's own choice: autocomplete="off" on a password field, on a username or email field in a form that holds a password field, or on a form that holds a password field with no token of its own.

What to change: remove autocomplete="off" and name the fields: username, current-password on a login form, new-password where a password is set, so that password managers can fill them and people can paste.

### `required-not-programmatic`

A field shown as required in its label but not marked as required.

- `requiredThreeWays` (Validating Input (W3C WAI Forms Tutorial)): a required field is marked with the required attribute, with aria-required for assistive technology, and with text such as (required) in its label for everyone.
- `labelsNeeded` (Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2)): labels or instructions are given wherever content asks for input, so people know what to enter, and identifying required fields in them helps people finish a form.

The tool's own choice: a field whose label text, or the text aria-labelledby points at, holds an asterisk or the word required (and not the word optional), with no required attribute and no aria-required="true".

What to change: add the required attribute to the field (or aria-required="true" where the form checks the value itself), so that assistive technology says it is required too.

### `required-not-visible`

A required field with no visible indication.

- `requiredThreeWays` (Validating Input (W3C WAI Forms Tutorial)): a required field is marked with the required attribute, with aria-required for assistive technology, and with text such as (required) in its label for everyone.
- `requiredInLabel` (Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2)): among the sufficient techniques, a required control is shown as required in the text of its label or legend (H90).

The tool's own choice: a field with the required attribute or aria-required="true" whose label text, aria-labelledby text, aria-describedby text and the legend of its fieldset hold no asterisk and no word required; a note, because a line such as "all fields are required" elsewhere on the page is not seen.

What to change: say it in the label or the legend, as text such as (required) or an asterisk explained at the top of the form.

### `broken-reference`

A reference to an id that is not in the file.

- `errorsLinked` (User Notifications (W3C WAI Forms Tutorial)): an error message sits at or near its field, is tied to it with aria-describedby, and aria-invalid marks the field in error.
- `errormessageInvalid` (ARIA: aria-errormessage attribute (MDN)): aria-errormessage names the id of the element that holds the error message of a field marked with aria-invalid, and aria-describedby is the more widely supported way to tie the two.
- `labelFor` (HTML Standard, The label element (WHATWG)): a label with a for attribute labels the first element in tree order with that id, if it is labelable; a label without one labels its first labelable descendant; a hidden input is not labelable.

The tool's own choice: an aria-describedby, aria-errormessage or aria-labelledby that names an id no element of the file has, a label whose for names no element, an input whose list names no element, and a field whose form attribute names no element; ids added by a script later are not seen.

What to change: point the attribute at the id of the element that holds the label, the hint or the error message, or give that element the id; an error message that is added later must get the id the field already names.

### `unlinked-error`

An error message that no field points at.

- `errorsInText` (Understanding SC 3.3.1 Error Identification (W3C WAI, WCAG 2.2)): when an input error is detected, the field in error is identified and the error is described to the user in text.
- `errorsLinked` (User Notifications (W3C WAI Forms Tutorial)): an error message sits at or near its field, is tied to it with aria-describedby, and aria-invalid marks the field in error.

The tool's own choice: an element inside a form whose class or id has the word error, that holds no field and no other such element, is not role="alert" or aria-live, and whose id no aria-describedby or aria-errormessage of the file names; the class name is a heuristic.

What to change: give the message an id and name it in aria-describedby (or aria-errormessage with aria-invalid="true") of its field, or announce it with role="alert".

### `duplicate-id`

An id given twice, that a label or a reference names.

- `idUnique` (HTML id global attribute (MDN)): an id must be unique in the whole document, and a label that points at a repeated id is no longer reliably tied to its control.
- `labelFor` (HTML Standard, The label element (WHATWG)): a label with a for attribute labels the first element in tree order with that id, if it is labelable; a label without one labels its first labelable descendant; a hidden input is not labelable.

The tool's own choice: an id that two or more elements of the file have, named by a label for, aria-labelledby, aria-describedby, aria-errormessage, list or form; the reference reaches the first element only, reported at the second.

What to change: give every element its own id, and point each label and reference at the one it means.

### `group-without-name`

A group of radio buttons or check boxes with no group name.

- `groupsMarkedUp` (Understanding SC 1.3.1 Info and Relationships (W3C WAI, WCAG 2.2)): relationships shown on screen are marked up: labels with label elements (H44), sets of radio buttons and check boxes with fieldset and legend (H71) or a grouping role (ARIA17), and title where no label can be used (H65).
- `fieldsetLegend` (Grouping Controls (W3C WAI Forms Tutorial)): related radio buttons and check boxes go in a fieldset whose legend names the group, or in a container with role group named with aria-labelledby.

The tool's own choice: two or more radio buttons, or two or more check boxes, with the same name in the same form, where a member is not inside a fieldset whose legend has text, nor inside an element with role group or radiogroup named by aria-label or aria-labelledby.

What to change: put the group in a <fieldset> with a <legend> that asks the question, or in an element with role="group" (role="radiogroup" for radio buttons) and aria-labelledby pointing at the question.

### `button-without-name`

A button with no accessible name.

- `nameProgrammatic` (Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2)): every user interface component has a name and a role that software can determine, and a form control with no programmatically determined name is failure F68.
- `labelMethods` (Labeling Controls (W3C WAI Forms Tutorial)): a label is tied to its control by for and id or by wrapping it, aria-label and aria-labelledby name it for screen readers, title is less reliable, and a button is named by its content or its value.

The tool's own choice: a button element with no text, no image with alt text in it, no aria-labelledby that points at text, no aria-label and no title; an input of type button with no value or other name; an input of type image with no alt, aria-label, aria-labelledby or title; submit and reset inputs have a default name and are not reported.

What to change: put the words in the button, or alt text on its image; for an icon button, add aria-label with what it does.

### `form-without-submit`

A form with no submit button.

- `submitButton` (Understanding SC 3.2.2 On Input (W3C WAI, WCAG 2.2)): changing a field does not change the context on its own; a submit button that starts the change is technique G80, and providing submit buttons in HTML is H32.

The tool's own choice: a form that holds a field that is not hidden but no button of type submit (a button with no type is one), no input of type submit or image, and no such button outside it that names it with its form attribute; a form sent by a script is reported too, because the script is not read.

What to change: add a <button type="submit"> with a clear name, so the form is sent by an explicit action that works with a keyboard and with Enter.

### `positive-tabindex`

A tabindex above 0.

- `focusOrderMeaning` (Understanding SC 2.4.3 Focus Order (W3C WAI, WCAG 2.2)): focusable components receive focus in an order that keeps meaning and operability, and a tab order set with tabindex that breaks it is failure F44.
- `tabindexZero` (HTML tabindex global attribute (MDN)): only 0 and -1 are advised as tabindex values; a value above 0 changes the focus order and makes the page hard to use with a keyboard.

The tool's own choice: any element whose tabindex, read as the HTML Standard reads a whole number, is above 0.

What to change: remove the tabindex, or use 0, and put the fields in the source in the order they should be filled.

### `inputmode-mismatch`

An inputmode or pattern that does not fit the field.

- `inputmodeValues` (HTML inputmode global attribute (MDN)): inputmode takes none, text, decimal, numeric, tel, search, email or url; numeric is for digits such as PIN codes and card numbers, and the matching input type is used where the value must be checked.
- `patternTypes` (<input>: The HTML Input element (MDN)): the pattern attribute applies to the text, search, url, tel, email and password types only.
- `typesKeyboard` (<input>: The HTML Input element (MDN)): the email, tel, url and number types look like a text field but bring validation and a fitting on-screen keyboard on devices that have one.

The tool's own choice: an inputmode value outside the eight of the list; an inputmode that differs from the keyboard of an email, tel, url, number or search type; an inputmode or a pattern on a type it does not apply to, or on a select or a textarea for pattern; a pattern of digits only, or a card number, card code or one-time code, on a text, search or password field with no numeric, decimal or tel inputmode; the pattern is read as text and never run.

What to change: use the inputmode the message names, or remove the attribute that has no effect; digits that are not a counted number take type="text" with inputmode="numeric".

### `many-options`

A select list with very many options.

- `datalistTyping` (<datalist>: The HTML Data List element (MDN)): a datalist gives a text field suggested values while the person can still type, an alternative to scrolling a long list, with accessibility limits of its own.
- `describedbyHints` (Form Instructions (W3C WAI Forms Tutorial)): aria-describedby ties extra instructions, such as the expected format, to a field, and they are read after its label.

The tool's own choice: a select element with more options than optionLimit (40 by default) and no aria-describedby that points at text, which counts as a search hint whatever it says; a note for the UX audit, because a long list is slow to scan and a script may already make it searchable.

What to change: consider a text field with a datalist or a search, grouping the options with optgroup, or a hint that typing the first letters jumps to an option.

### `unreadable-file`

A file that cannot be read.

- `jsonUtf8` (RFC 8259, The JSON Data Interchange Format): JSON text exchanged between systems must be UTF-8.
- `jsonRepeatedNames` (RFC 8259, The JSON Data Interchange Format): when an object repeats a name the behavior of the software that reads it cannot be predicted, so the JSON reader of this tool refuses a repeated name.

The tool's own choice: a file over its size limit, a binary file, or a file that is not valid UTF-8, or UTF-16 with its byte order mark; nothing in it is checked; this rule cannot be set lower or off.

What to change: save the file as UTF-8; a page larger than the limit can be checked with a larger limit in a run of its own.

### `scan-limit`

The input is larger than the limits of a run.

- `nameProgrammatic` (Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2)): every user interface component has a name and a role that software can determine, and a form control with no programmatically determined name is failure F68.

The tool's own choice: a folder with more files, folders or HTML files than the limits of docs/limits.md, folders nested deeper, or an HTML file past the limits of the reader (elements, depth, attributes, names, values); the rest is not read, so the run fails; this rule cannot be set lower or off.

What to change: exclude the folders that are not pages of the site, or check the parts of the site in runs of their own.

## The points

| Point | Page | What it says |
| --- | --- | --- |
| `labelsNeeded` | Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2) | labels or instructions are given wherever content asks for input, so people know what to enter, and identifying required fields in them helps people finish a form |
| `requiredInLabel` | Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2) | among the sufficient techniques, a required control is shown as required in the text of its label or legend (H90) |
| `purposeProgrammatic` | Understanding SC 1.3.5 Identify Input Purpose (W3C WAI, WCAG 2.2) | the purpose of a field that collects information about the user can be determined by software, in HTML with the autocomplete tokens (H98), and an incorrect value is failure F107 |
| `errorsInText` | Understanding SC 3.3.1 Error Identification (W3C WAI, WCAG 2.2) | when an input error is detected, the field in error is identified and the error is described to the user in text |
| `nameProgrammatic` | Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2) | every user interface component has a name and a role that software can determine, and a form control with no programmatically determined name is failure F68 |
| `groupsMarkedUp` | Understanding SC 1.3.1 Info and Relationships (W3C WAI, WCAG 2.2) | relationships shown on screen are marked up: labels with label elements (H44), sets of radio buttons and check boxes with fieldset and legend (H71) or a grouping role (ARIA17), and title where no label can be used (H65) |
| `focusOrderMeaning` | Understanding SC 2.4.3 Focus Order (W3C WAI, WCAG 2.2) | focusable components receive focus in an order that keeps meaning and operability, and a tab order set with tabindex that breaks it is failure F44 |
| `submitButton` | Understanding SC 3.2.2 On Input (W3C WAI, WCAG 2.2) | changing a field does not change the context on its own; a submit button that starts the change is technique G80, and providing submit buttons in HTML is H32 |
| `passwordManagers` | Understanding SC 3.3.8 Accessible Authentication (Minimum) (W3C WAI, WCAG 2.2) | a login step lets the browser and password managers fill in the fields, and lets people paste their credentials |
| `autofillGrammar` | HTML Standard, Autofill (WHATWG) | an autocomplete value is on, off, or in this order an optional section- token, an optional shipping or billing, an optional contact type before a contact field, one field name from a fixed list and an optional webauthn |
| `autofillOff` | HTML Standard, Autofill (WHATWG) | with off, the browser is asked not to store the value of the control and not to offer values entered before |
| `labelFor` | HTML Standard, The label element (WHATWG) | a label with a for attribute labels the first element in tree order with that id, if it is labelable; a label without one labels its first labelable descendant; a hidden input is not labelable |
| `labelMethods` | Labeling Controls (W3C WAI Forms Tutorial) | a label is tied to its control by for and id or by wrapping it, aria-label and aria-labelledby name it for screen readers, title is less reliable, and a button is named by its content or its value |
| `fieldsetLegend` | Grouping Controls (W3C WAI Forms Tutorial) | related radio buttons and check boxes go in a fieldset whose legend names the group, or in a container with role group named with aria-labelledby |
| `placeholderNotLabel` | Form Instructions (W3C WAI Forms Tutorial) | placeholder text is not a replacement for a label: assistive technology may not read it, and it disappears as soon as someone types |
| `describedbyHints` | Form Instructions (W3C WAI Forms Tutorial) | aria-describedby ties extra instructions, such as the expected format, to a field, and they are read after its label |
| `requiredThreeWays` | Validating Input (W3C WAI Forms Tutorial) | a required field is marked with the required attribute, with aria-required for assistive technology, and with text such as (required) in its label for everyone |
| `errorsLinked` | User Notifications (W3C WAI Forms Tutorial) | an error message sits at or near its field, is tied to it with aria-describedby, and aria-invalid marks the field in error |
| `autocompleteTokens` | HTML attribute: autocomplete (MDN) | autocomplete takes space-separated tokens on input, select, textarea and form, browsers may ignore off on login fields, and fitting tokens meet WCAG 1.3.5 |
| `inputmodeValues` | HTML inputmode global attribute (MDN) | inputmode takes none, text, decimal, numeric, tel, search, email or url; numeric is for digits such as PIN codes and card numbers, and the matching input type is used where the value must be checked |
| `typesKeyboard` | <input>: The HTML Input element (MDN) | the email, tel, url and number types look like a text field but bring validation and a fitting on-screen keyboard on devices that have one |
| `patternTypes` | <input>: The HTML Input element (MDN) | the pattern attribute applies to the text, search, url, tel, email and password types only |
| `placeholderMdn` | <input>: The HTML Input element (MDN) | a placeholder is not a label and must never be needed to understand a form |
| `tabindexZero` | HTML tabindex global attribute (MDN) | only 0 and -1 are advised as tabindex values; a value above 0 changes the focus order and makes the page hard to use with a keyboard |
| `loginOffIgnored` | How to turn off form autocompletion (MDN) | browsers ignore autocomplete off on login forms and still offer to save and fill credentials, because password managers help security; new-password is the hint where a new password is set |
| `errormessageInvalid` | ARIA: aria-errormessage attribute (MDN) | aria-errormessage names the id of the element that holds the error message of a field marked with aria-invalid, and aria-describedby is the more widely supported way to tie the two |
| `datalistTyping` | <datalist>: The HTML Data List element (MDN) | a datalist gives a text field suggested values while the person can still type, an alternative to scrolling a long list, with accessibility limits of its own |
| `idUnique` | HTML id global attribute (MDN) | an id must be unique in the whole document, and a label that points at a repeated id is no longer reliably tied to its control |
| `csvRecords` | RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files | each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice |
| `csvInjection` | CSV Injection (OWASP) | a spreadsheet may read a cell that starts with =, +, -, @, a tab, a carriage return or a line feed as a formula, and no one escape is safe in every program that opens the file |
| `jsonUtf8` | RFC 8259, The JSON Data Interchange Format | JSON text exchanged between systems must be UTF-8 |
| `jsonRepeatedNames` | RFC 8259, The JSON Data Interchange Format | when an object repeats a name the behavior of the software that reads it cannot be predicted, so the JSON reader of this tool refuses a repeated name |
| `githubAnnotations` | Workflow commands for GitHub Actions (GitHub Docs) | a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run |

## The pages

| Page | Address |
| --- | --- |
| Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html |
| Understanding SC 1.3.5 Identify Input Purpose (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html |
| Understanding SC 3.3.1 Error Identification (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html |
| Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html |
| Understanding SC 1.3.1 Info and Relationships (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html |
| Understanding SC 2.4.3 Focus Order (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html |
| Understanding SC 3.2.2 On Input (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/on-input.html |
| Understanding SC 3.3.8 Accessible Authentication (Minimum) (W3C WAI, WCAG 2.2) | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html |
| HTML Standard, Autofill (WHATWG) | https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill |
| HTML Standard, The label element (WHATWG) | https://html.spec.whatwg.org/multipage/forms.html#the-label-element |
| Labeling Controls (W3C WAI Forms Tutorial) | https://www.w3.org/WAI/tutorials/forms/labels/ |
| Grouping Controls (W3C WAI Forms Tutorial) | https://www.w3.org/WAI/tutorials/forms/grouping/ |
| Form Instructions (W3C WAI Forms Tutorial) | https://www.w3.org/WAI/tutorials/forms/instructions/ |
| Validating Input (W3C WAI Forms Tutorial) | https://www.w3.org/WAI/tutorials/forms/validation/ |
| User Notifications (W3C WAI Forms Tutorial) | https://www.w3.org/WAI/tutorials/forms/notifications/ |
| HTML attribute: autocomplete (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete |
| HTML inputmode global attribute (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode |
| <input>: The HTML Input element (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input |
| HTML tabindex global attribute (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex |
| How to turn off form autocompletion (MDN) | https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Turning_off_form_autocompletion |
| ARIA: aria-errormessage attribute (MDN) | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-errormessage |
| <datalist>: The HTML Data List element (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist |
| HTML id global attribute (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id |
| RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files | https://www.rfc-editor.org/rfc/rfc4180 |
| RFC 8259, The JSON Data Interchange Format | https://www.rfc-editor.org/rfc/rfc8259 |
| CSV Injection (OWASP) | https://community.owasp.org/attacks/CSV_Injection |
| Workflow commands for GitHub Actions (GitHub Docs) | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |
