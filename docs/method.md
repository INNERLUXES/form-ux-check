# Method

This document says exactly what the tool reads, how it reads an HTML file, how it works out the name, the form and the
purpose of a field, what each rule looks at and cannot see, and how the report is built. The names used here are the
defaults; docs/inputs.md says how the configuration changes them. The tool reads the HTML files of a site on disk as
text and runs no browser; its checks are a heuristic. Its result is an input to a UX audit, not an accessibility audit
and not a conformance claim: a finding points at a line where the markup of a form needs a look, and a clean run says
only that the folder holds none of the forms below.

## What is read

The input is one folder. It is listed with a list of folders of the tool's own, with no recursion (src/walk.js), in
the order of the names. Every file whose path, relative to the folder, matches an include pattern (`**/*.html` and
`**/*.htm` by default) and no exclude pattern is read; paths and patterns are compared in lowercase, so `Index.HTML` is
read too. The folders .git and node_modules are counted and passed over, in any case of letters, because they hold
history and installed packages, not the pages of the site. A symbolic link (or a junction on Windows) is counted and
never followed.

Each file is read once (src/files.js), decoded by its byte order mark: UTF-16 little or big endian with one, UTF-8 with
or without one. A file that holds a null byte, bytes that are not valid UTF-8, or more than 4 MB is an
`unreadable-file` finding and nothing in it is checked. Lines end at LF, CRLF or CR, and every finding has the line
and column of the element or the attribute it is about.

## The safe HTML reader

src/html.js is a safe HTML reader of the tool's own. It reads the text once, left to right, with a list of open
elements of its own and no recursion, and builds a light tree: every element in document order, with its tag name in
lowercase, its attributes (names in lowercase, the first of two attributes of the same name kept, as the HTML Standard
keeps it), its offset, its parent, the range of its descendants and the text inside it. It follows the HTML Standard
where the checks need it:

- void elements (`input`, `img`, `br` and the others) have no end tag; a self-closing tag on another element is
  ignored, as a browser ignores it, except inside `svg` and `math`;
- comments, a DOCTYPE, processing instructions and other markup declarations are passed over, so a form in a comment
  is not read;
- the contents of `script`, `style`, `iframe`, `xmp`, `noembed` and `noframes` are passed over, and `textarea` and
  `title` are read to their end tag, so a form written in a script is not read;
- an end tag closes the elements left open inside it, and an end tag with no open element is ignored;
- a few start tags close the element before them: `option`, `optgroup`, `li`, `dt`, `dd`, `tr`, `td`, `th`, a
  `button` inside a `button`, and a block element such as `div`, `form` or `fieldset` after an open `p`;
- an `input`, `textarea` or `select` inside a `select` closes the select;
- a `form` inside an open `form` is left out, as a browser leaves it out, and a note counts it;
- a tag cut off by the end of the file is dropped, as a browser drops it;
- character references are decoded for `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;` and numeric references;
  any other named reference is kept as written.

The text of an element is the text inside it and the alt text of the images inside it; the text of options, of a
`select` and of a `datalist` is left out of the text of a label or a button. The reader never fails on markup, because
HTML has no error that stops a browser; it stops only at its limits of depth, elements, attributes, names and values
(docs/limits.md), with a `scan-limit` finding at the place.

## How a field is named

The fields are the `input` elements that are not of type hidden and not buttons (submit, reset, button, image), and
every `select` and `textarea`. Their name comes from, in this order:

1. `aria-labelledby`: the text of the elements its ids name, in the file;
2. `aria-label`, when it is not empty;
3. the `label` elements that label the field: a label with `for` labels the first element in tree order with that id,
   when it is labelable; a label without `for` labels its first labelable descendant; a hidden input is not labelable;
4. `title`;
5. `placeholder`, which browsers take as a last resort.

A field with a name from 1 to 4 is named. A field with only a placeholder is reported by `placeholder-only-label`; a
field with none of them by `missing-label`. A button is named by its text and the alt text of its images, by
`aria-labelledby`, `aria-label`, `title` or a label; an input button by its `value`, an image input by its `alt`. This
follows the common sources of the accessible name; it is not the whole computation of a browser, which also looks at
CSS and at hidden content.

## How the form of a field is found

The form of a field (and of a button, a fieldset or any other form-associated element) is the form its `form`
attribute names, when it names a form; else the nearest `form` above it. A `form` attribute that names no form gives
no form.

## How the purpose of a field is worked out

src/hints.js works out what a field asks for, from the markup alone, in this order:

1. a valid autocomplete field name, such as `email` or `shipping postal-code`;
2. the type: `email`, `tel`, and `password` (with `new-password` or `current-password` when the name or the id says so);
3. the words of the `name` attribute, then of the `id`.

The words of a name or an id are split at every character that is not a letter or a digit and between a lowercase
letter or a digit and an uppercase letter, lowered and joined again: `billingZipCode` and `billing_zip-code` are both
`billingzipcode`. The joined word is looked up as a whole in the table `NAME_HINTS` of src/hints.js, so `hotel` never
reads as `tel` and `zipper` never as `zip`. When the whole is not in the table, the leading and trailing words of
`NOISE_WORDS` (billing, shipping, delivery, contact, customer, user, your, the, input, field, txt, form, new, primary)
are dropped and the rest is looked up once more; billing, shipping and delivery are kept as the mode of the suggested
token. The table:

| Purpose | Joined words of a name or id |
| --- | --- |
| `name` | name, fullname, yourname |
| `given-name` | firstname, fname, givenname, forename |
| `additional-name` | middlename |
| `family-name` | lastname, lname, surname, familyname |
| `username` | username, login, loginname, uname |
| `email` | email, emailaddress, useremail |
| `tel` | phone, phonenumber, phoneno, telephone, tel, mobile, mobilenumber, mobilephone, cell, cellphone |
| `organization` | company, companyname, organization, organisation, businessname |
| `organization-title` | jobtitle |
| `street-address` | address, streetaddress, street |
| `address-line1`, `address-line2` | address1, addressline1, street1; address2, addressline2, street2 |
| `address-level2`, `address-level1` | city, town; state, province, region, county |
| `postal-code` | zip, zipcode, postcode, postalcode |
| `country-name` (`country` on a select) | country, countryname |
| `bday` | bday, birthday, birthdate, dob, dateofbirth |
| `cc-name`, `cc-number` | ccname, cardname, nameoncard, cardholder, cardholdername; ccnumber, cardnumber, creditcard, creditcardnumber, ccnum |
| `cc-exp`, `cc-exp-month`, `cc-exp-year` | ccexp, expiry, cardexpiry, expirationdate, expdate; ccexpmonth, expmonth, expirymonth; ccexpyear, expyear, expiryyear |
| `cc-csc` | cvc, cvv, csc, securitycode, cardcode |
| `one-time-code` | otp, onetimecode, otpcode, verificationcode |
| `url` | website, homepage, websiteurl |
| `new-password`, `current-password` | newpassword, confirmpassword, passwordconfirm, passwordconfirmation, repeatpassword, password2; currentpassword, oldpassword |
| a password | password, passwd, pwd, pass |

The words of a counted number, for `input-type-mismatch`, are in `NUMBER_HINTS`: quantity, qty, guests,
numberofguests, adults, children, age, numberofpeople. The table is the tool's own choice, kept short so that a match
is likely right; a field outside it is simply not given a purpose.

## How autocomplete is read

src/autofill.js reads a value as the autofill section of the HTML Standard writes it. The value is split at ASCII white
space and lowered. One token `on` or `off` is valid alone; with other tokens it is not. Otherwise the value is read from
its end: an optional `webauthn`; one field name, from the list of field names or the list of contact fields; an
optional contact type (`home`, `work`, `mobile`, `fax`, `pager`) that is allowed only before a contact field (the
`tel` fields, `email` and `impp`); an optional `shipping` or `billing`; an optional token that starts with `section-`.
A token left over, a token out of its place or a token that is in no list makes the value invalid; the message
suggests the token that was probably meant, from a short table of words people write instead (phone for tel, zip for
postal-code, firstname for given-name) or from the closest token by edit distance. An empty value is the default and
is valid. On a form, only `on` and `off` are valid. The lists are the lists of the standard, token for token.

## The rules

### `missing-label`

Reports a field with no name at all: no label with text, no `aria-labelledby` that points at text, no `aria-label`, no
`title` and no `placeholder`, at the field. The message says why: no source of a name, a label that holds no text, or
an `aria-labelledby` that points at no text.

### `placeholder-only-label`

Reports a field whose only name is its placeholder, at the field. Browsers do take the placeholder as the name when
nothing else gives one, so this is a warning, and such a field is never also reported by `missing-label`.

### `input-type-mismatch`

Reports an `input` of type text (written as `text`, missing, or a type the browser does not know, which it treats as
text) whose purpose is an email address, a phone number or a web address, or whose name or id is a counted number,
with the type to use. A card number, a security code, a one-time code and a postal code are digits but not numbers to
count, so they are left to `inputmode-mismatch`.

### `autocomplete-invalid`

Reports an `autocomplete` value outside the grammar of the HTML Standard, on a field that is not a hidden input, and an
`autocomplete` on a form that is not `on` or `off`, at the attribute.

### `autocomplete-missing`

Reports a field whose purpose comes from its type, its name or its id, of a type that takes a field name (text,
search, url, tel, email, password, number, date and month, and every select and textarea), with no autocomplete field
name: no attribute, an empty one, `on`, or `off` on a field that is not a login field. The message names the token to
use, with the mode in front where the name says billing, shipping or delivery, `new-password` when the form holds two
password fields, and `country` on a select. A value that is not valid is left to `autocomplete-invalid`.

### `autocomplete-off-login`

Reports `autocomplete="off"` on a password field; on a field for a username or an email address in a form that holds a
password field; and on a form that holds a password field with no autocomplete of its own, at the attribute.

### `required-not-programmatic`

Reports a field whose label text, or the text its `aria-labelledby` points at, holds an asterisk or the word required
(and not the word optional), with no `required` attribute and no `aria-required="true"`.

### `required-not-visible`

Reports a field with `required` or `aria-required="true"` whose label text, `aria-labelledby` text, `aria-describedby`
text and the legend of its nearest fieldset hold no asterisk and no word required. A group of required radio buttons
or check boxes with the same name is reported once. It is a note: a line such as "all fields are required" elsewhere
on the page is not tied to the field and is not seen.

### `broken-reference`

Reports an `aria-describedby`, `aria-errormessage` or `aria-labelledby` that names an id no element of the file has
(one finding per attribute, with the missing ids), a label whose `for` names no element, an input whose `list` names
no element, and a form-associated element whose `form` names no element, at the attribute.

### `unlinked-error`

Reports an element inside a form whose class or id has the word error or errors (split as names are split, so
`field-error` and `errorMessage` count and `terror` does not), that holds no field, button or label and no other such
element, that is not inside an element with `role="alert"`, `role="status"` or an `aria-live` other than off, and whose
id no `aria-describedby` or `aria-errormessage` of the file names. An empty one is reported too, because a script may
fill it later.

### `duplicate-id`

Reports an id that two or more elements have, when a label `for`, `aria-labelledby`, `aria-describedby`,
`aria-errormessage`, `list` or `form` names it, at the second element, with the first element and the reference. The
reference reaches the first element in tree order only.

### `group-without-name`

Groups the radio buttons, and the check boxes, by their form and their name; a group of two or more where a member is
not inside a fieldset whose legend has text, nor inside an element with `role="group"` or `role="radiogroup"` named by
`aria-label` or `aria-labelledby`, is reported once, at the first such member. A single check box, such as one to
accept terms, is not a group.

### `button-without-name`

Reports a `button` with no name, an `input` of type button with no name, and an `input` of type image with no name,
in the order of the sources of a name above. Submit and reset inputs have a default name and are not reported.

### `form-without-submit`

Reports a form that owns a field but no submit button: a `button` with no type, type submit or a type the browser
does not know, or an `input` of type submit or image, inside the form or naming it with its `form` attribute.

### `positive-tabindex`

Reports any element whose `tabindex`, read as the HTML Standard reads a whole number (white space, a sign, then digits
up to the first character that is not one), is above 0, at the attribute.

### `inputmode-mismatch`

Reports, on a field:

- an `inputmode` that is not one of none, text, decimal, numeric, tel, search, email and url;
- an `inputmode` on an email, tel, url, number or search input that differs from the keyboard the type brings
  (numeric or decimal for number);
- an `inputmode` on a select or on an input type that brings no keyboard (check box, radio button, date, file and the
  others);
- a `pattern` on an input type it does not apply to, or on a select or textarea, which the browser ignores;
- a `pattern` of digits only on a text, search or password input with no numeric, decimal or tel `inputmode`;
- a field for a card number, a card security code or a one-time code, by its autocomplete, name or id, on a text or
  password input with no such `inputmode`.

A pattern of digits only is read as text, never compiled or run: it holds only digit classes (`[0-9]`, `\d`, `[\d]`),
literal digits, the anchors `^` and `$`, groups and quantifiers, and at least one digit.

### `many-options`

Reports a `select` with more `option` elements than `optionLimit` (40 by default) and no `aria-describedby` that
points at text, which counts as a search hint whatever it says. A note for the audit: a long list is slow to scan,
and a script may already make it searchable.

### `unreadable-file`

Reports a file that cannot be read: over 4 MB, binary, or not valid UTF-8, or UTF-16 with its byte order mark. Nothing
in such a file is checked. This rule has no key and is always an error, so a run never passes because a file could
not be read.

### `scan-limit`

Reports a folder past a limit of docs/limits.md (more files and folders than the listing reads, folders nested more
than 32 deep, more HTML files) or a file past a limit of the reader (elements, depth, attributes, names, values). The
rest is not read, so the run fails. This rule has no key and is always an error.

## The report

Every finding has its rule, its level, the file, the line and the column, what was found and what to change; with
`--explain`, also the rule, the points of the public pages it rests on and the tool's own choice. Findings are sorted by
level, then file, line, column and rule. A rule lists at most 500 findings; the rest are counted in a note and still
count for the result. The table of files gives, for each file, its forms, fields, buttons and findings by level; the
summary counts the files, the forms, the fields, the named and the required fields, the fields with an autocomplete
field name, the select lists and the buttons.

The run fails when a finding is at or above the fail-on level (`error` by default): exit code `1`; otherwise `0`. A
usage or input error gives `2` and no result.
