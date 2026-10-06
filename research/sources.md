# Sources

The public pages the checks of this tool are based on, each with a short note in this project's own words on what the
page says and which parts of the tool lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. src/data.js holds the pages and the points the reports show, and test/data.test.js checks that every page in
src/data.js is listed here.
Each page was fetched and read before it was listed.

The tool reads the HTML files of a site on disk as text and runs no browser; its result is an input to a UX audit, not
an accessibility audit and not a conformance claim. These notes say what the pages say so a reader can follow a
finding back to its source; they are not advice on any one site. The pages were chosen with web addresses that hold no
number that reads like a year: the W3C Understanding documents by the version of the guidelines (WCAG 2.2), the HTML
Standard and MDN by their living pages.

## W3C Understanding documents (WCAG 2.2)

### Understanding SC 3.3.2 Labels or Instructions (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html

When content asks for input, labels or instructions tell people what to enter, without so much text that the page
gets harder to use. The criterion covers every field, and identifying required fields in the labels or instructions
helps people finish a form. Among the sufficient techniques are label elements (H44), fieldset and legend (H71),
required controls shown in the label or legend (H90) and text that identifies required fields (G83).
`missing-label`, `required-not-programmatic` and `required-not-visible` lean on it.

### Understanding SC 1.3.5 Identify Input Purpose (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html

The purpose of each field that collects information about the user can be determined by software, where the purpose
is one of the input purposes of the guidelines, which follow the autofill tokens of HTML. In HTML this is done with
the autocomplete attribute (technique H98), and an incorrect value is failure F107. The criterion does not cover fields
that ask for other information. `autocomplete-invalid` and `autocomplete-missing` lean on it.

### Understanding SC 3.3.1 Error Identification (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html

When an input error is detected automatically, the field in error is identified and the error is described to the
user in text, ideally with how to fix it. The ARIA techniques mark the field with aria-invalid (ARIA21) and announce
errors with alerts and live regions (ARIA19). `unlinked-error` leans on it.

### Understanding SC 4.1.2 Name, Role, Value (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html

Every user interface component has a name and a role that software can determine, and its states and values can be
set and are announced. Standard HTML controls meet it when they are used correctly; a control with no programmatically
determined name is failure F68. `missing-label`, `button-without-name` and the `scan-limit` rule, which keeps a run
from passing on a page that was not read, lean on it.

### Understanding SC 1.3.1 Info and Relationships (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html

Structure and relationships shown on screen are available to software. For forms, the techniques tie labels to
controls (H44), group radio buttons and check boxes with fieldset and legend (H71) or a grouping role (ARIA17), and use
title where a label cannot be used (H65). `group-without-name` leans on it.

### Understanding SC 2.4.3 Focus Order (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html

Focusable components receive focus in an order that keeps meaning and operability. A tab order set with tabindex that
breaks it is failure F44, with the example of a form whose focus jumps between unrelated fields.
`positive-tabindex` leans on it.

### Understanding SC 3.2.2 On Input (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/on-input.html

Changing a field does not change the context on its own unless people were told before. A submit button that starts
the change is technique G80, and providing submit buttons in HTML forms is H32. `form-without-submit` leans on it.

### Understanding SC 3.3.8 Accessible Authentication (Minimum) (W3C WAI, WCAG 2.2)

https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html

A login step must not rest on a cognitive function test, such as remembering a password, alone; letting the browser and password managers fill in the fields,
and letting people paste their credentials, are ways to meet it, and blocking paste fails it.
`autocomplete-off-login` leans on it.

## The HTML Standard (WHATWG)

### HTML Standard, Autofill (WHATWG)

https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill

The grammar of the autocomplete attribute: on or off alone, or an optional section- token, an optional shipping or
billing, an optional contact type (home, work, mobile, fax or pager) before a contact field, one field name and an
optional webauthn. It lists the field names (from name, given-name and family-name to cc-number, bday, url and photo)
and the contact fields (the tel fields, email and impp). With off, the browser is asked not to store the value and not
to offer values entered before. src/autofill.js holds the lists token for token, and `autocomplete-invalid` and
`autocomplete-off-login` lean on it.

### HTML Standard, The label element (WHATWG)

https://html.spec.whatwg.org/multipage/forms.html#the-label-element

A label with a for attribute labels the first element in tree order whose id matches, when that element is labelable;
a label without one labels its first labelable descendant. The labelable elements are button, input other than hidden,
meter, output, progress, select and textarea. A form does not hold another form. The naming of fields in
src/forms.js, `missing-label`, `broken-reference` and `duplicate-id` lean on it.

## The W3C WAI forms tutorial

### Labeling Controls (W3C WAI Forms Tutorial)

https://www.w3.org/WAI/tutorials/forms/labels/

A label is tied to its control by for and id, or by wrapping the control; aria-label and aria-labelledby give a name to
screen readers, title is less reliable, a label can be hidden visually and stay available, and a button is named by its
content or its value. `missing-label` and `button-without-name` lean on it.

### Grouping Controls (W3C WAI Forms Tutorial)

https://www.w3.org/WAI/tutorials/forms/grouping/

Related radio buttons and check boxes go in a fieldset whose legend names the group; a container with role group named
with aria-labelledby does the same with more freedom of style. `group-without-name` leans on it.

### Form Instructions (W3C WAI Forms Tutorial)

https://www.w3.org/WAI/tutorials/forms/instructions/

Instructions for the whole form come before it, and instructions for a field are tied to it with aria-describedby, read
after its label. Placeholder text is not a replacement for a label: assistive technology may not read it and it
disappears as soon as someone types. `placeholder-only-label` and `many-options` lean on it.

### Validating Input (W3C WAI Forms Tutorial)

https://www.w3.org/WAI/tutorials/forms/validation/

A required field is marked with the required attribute, with aria-required for assistive technology, and with text such
as (required) in its label for everyone. `required-not-programmatic` and `required-not-visible` lean on it.

### User Notifications (W3C WAI Forms Tutorial)

https://www.w3.org/WAI/tutorials/forms/notifications/

Feedback sits at or near the fields, error messages are tied to their fields with aria-describedby, aria-invalid marks
the fields in error, and a list of errors at the top links to each field. `broken-reference` and `unlinked-error` lean
on it.

## MDN Web Docs

### HTML attribute: autocomplete (MDN)

https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete

The autocomplete attribute takes space-separated tokens on input, select, textarea and form; browsers may ignore off on
login fields; fitting tokens meet WCAG 1.3.5, and autocomplete should not be turned off without need. `autocomplete-missing`
leans on it.

### HTML inputmode global attribute (MDN)

https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode

The values of inputmode: none, text, decimal, numeric, tel, search, email and url. Numeric is for digits such as PIN
codes, postal codes and card numbers. Where the value must be checked, the matching input type is used instead of
inputmode. `inputmode-mismatch` and `input-type-mismatch` lean on it.

### <input>: The HTML Input element (MDN)

https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input

The email, tel, url and number types look like a text field but bring validation and a fitting on-screen keyboard. The
pattern attribute applies to the text, search, url, tel, email and password types only. A placeholder is not a label,
must never be needed to understand a form, is not read by every screen reader and disappears once a value is typed.
`input-type-mismatch`, `inputmode-mismatch` and `placeholder-only-label` lean on it.

### HTML tabindex global attribute (MDN)

https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex

Only 0 and -1 are advised as tabindex values; a value above 0 changes the focus order and makes a page hard to use for
people who rely on a keyboard or assistive technology. `positive-tabindex` leans on it.

### How to turn off form autocompletion (MDN)

https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Turning_off_form_autocompletion

Browsers ignore autocomplete off on login forms and still offer to save and fill credentials, because password managers
help people choose stronger passwords; new-password is the hint for a field where a new password is set.
`autocomplete-off-login` leans on it.

### ARIA: aria-errormessage attribute (MDN)

https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-errormessage

aria-errormessage names the id of the element that holds the error message of a field marked aria-invalid, and the
message is shown while the field is invalid; aria-describedby is the more widely supported way to tie a message to its
field. `broken-reference` leans on it.

### <datalist>: The HTML Data List element (MDN)

https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist

A datalist gives a text field suggested values while people can still type their own, an alternative to a long list,
with accessibility limits of its own in some browsers and screen readers. `many-options` leans on it, as the tool's own
choice of what to suggest.

### HTML id global attribute (MDN)

https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id

An id must be unique in the whole document; a repeated id breaks fragment links, scripts that look it up, and the tie
between a label and its control. `duplicate-id` leans on it.

## Formats

### RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files

https://www.rfc-editor.org/rfc/rfc4180

Each record is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double
quote or a line break is put in double quotes, with a double quote inside it written twice. The CSV report follows it.

### RFC 8259, The JSON Data Interchange Format

https://www.rfc-editor.org/rfc/rfc8259

The JSON format. JSON exchanged between systems must be UTF-8. When the names of an object are not unique, the
behavior of the software that reads it is unpredictable, so the JSON reader of the configuration refuses a name given
twice.

### CSV Injection (OWASP)

https://community.owasp.org/attacks/CSV_Injection

A spreadsheet may read a cell that starts with =, +, -, @, a tab, a carriage return or a line feed as a formula, and no
one escape is safe in every program that opens the file. The CSV report puts a single quote in front of such a field,
and the threat model says to open a report built from files you do not trust with formulas turned off.

### Workflow commands for GitHub Actions (GitHub Docs)

https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

The error, warning and notice commands with file, line, col and title parameters create annotations on a file and a
line of the repository. The GitHub format writes one command per finding and escapes what a command gives a meaning
to.
