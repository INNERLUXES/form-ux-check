# form-ux-check

Form UX check. Give it the folder of a site. It reads every HTML file in it as text, with a reader of its own, runs no
browser, and lists the form usability and accessibility problems it can see in the markup: fields with no label,
placeholders used as the only label, text fields that should be email, tel, url or number fields, missing and invalid
autocomplete tokens, required fields with no visible or programmatic indication, references to ids that are not
there, error messages that no field points at, ids given twice and named by a label, radio button and check box groups
with no group name, buttons with no name, forms with no submit button, tabindex above 0, autocomplete off on login
fields, inputmode and pattern values that do not fit the field, and very long select lists. Every finding has its file,
line and column, what was found and what to change, and the run exits with a code a pipeline can act on.

**It is an input to a UX audit: not an accessibility audit and not a conformance claim.** It runs no script and no style
sheet, so it does not see what a script adds or a style hides; it reads what the files say, and the checks are a
heuristic. A clean run means only that none of the forms of its rules were found, and people still have to use the
forms, with a keyboard, a screen reader and a phone, before anyone can say they work.

Forms are where a site asks people for something, and where small markup mistakes cost the most: a field a screen
reader announces with no name, a phone field that brings up a full keyboard, a password field the password manager
cannot fill, an error message nobody hears. The W3C Understanding documents name what is expected
(https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), the WHATWG HTML Standard defines the
autocomplete tokens (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill), and the W3C
forms tutorial shows the markup (https://www.w3.org/WAI/tutorials/forms/labels/). Before a team reviews its forms by
hand, it needs the list: which fields, which pages, which lines. This tool writes that list from the files, on every
change.

- **One check per problem.** Seventeen rules, each with what it looks at, what it cannot see, the public pages it rests
  on and what to change, and two rules of input problems that are always errors.
- **The autofill list of the HTML Standard.** autocomplete values are read token by token in the order the standard
  writes, with a suggestion for the token that was probably meant.
- **A reader of its own.** A safe HTML reader with no dependency: one pass with no recursion, limits of depth,
  elements, attributes, names and values, UTF-8 and UTF-16 by the byte order mark, LF, CRLF and CR line ends.
- Reports as text, JSON, CSV with one row per finding and GitHub workflow annotations, with an exit code for a
  pipeline: `0` no finding at or above the `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 109
pass 107
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link, a device or file permissions (links in the folder to a file and to a folder, a folder and a
configuration named through a link, `/dev/null` named as a folder, and an HTML file with no read access); they are
guarded with `process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs
the same tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install, and no browser is needed.

```
git clone https://github.com/INNERLUXES/form-ux-check.git
cd form-ux-check
node bin/form-ux-check.js examples/messy --config examples/config.json
```

Or without a clone, in the folder of your own site:

```
npx --yes github:INNERLUXES/form-ux-check .
```

`examples/` holds two made-up sites. `examples/messy/` is the site of a bike hire shop: a search form and a newsletter
form on the home page, an account sign-up page and a login page, and a booking page with a delivery address, a long
list of pick-up points and card details. Between them they hold one finding of every rule. They also hold what must not
be reported: a form in a comment and one in a script, a demo page under `node_modules`, a hint that is linked, and a
vendor widget the configuration leaves out. `examples/clean/` is the site of a library, with a search form and a form
to ask for a reader card, which passes with no finding.

## Usage

```
form-ux-check <folder> [--exclude <pattern>]... [--config <file>] [options]
```

```
--exclude <pattern>       a path of the folder to leave out, relative to it, such as vendor/** or **/drafts/**;
                          may be given more than once, and adds to exclude of the configuration
--config <file>           settings in strict JSON: include, exclude, rules, optionLimit, minSeverity and failOn
                          (--print-defaults shows them)
--format <name>           text, json, csv or github (default: text); csv writes one row per finding, github writes
                          workflow commands that GitHub shows as annotations
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: info, warning, error (default: minSeverity of
                          the configuration, else info)
--fail-on <level>         the lowest level of a finding that fails the run: info, warning, error (default: failOn of
                          the configuration, else error)
--explain                 show the rule, the public sources and the tool's own choice behind each finding
--print-defaults          print the built-in configuration and exit
--help                    show the usage
--version                 show the version
```

Name one folder, the one that holds the pages of the site. The paths in the report are relative to the folder you run
the command in, with forward slashes on every system, followed by the line.

The report of the messy example starts with what was read, the configuration, the rules and the findings in one line
each; then every file with its forms, fields, buttons and findings; then the summary; then the count of findings of
every rule; then the findings, errors first, each with what to change:

```
form-ux-check: examples/messy
input: 4 HTML files; 2 other files passed over; 1 folder named .git or node_modules passed over; 1 path excluded; 0 links not followed
config: examples/config.json (Kestrel Cycle Hire form review): include **/*.html and **/*.htm; exclude vendor/**; option limit 30; minimum severity info; fail on error
rules: missing-label (error); placeholder-only-label (warning); input-type-mismatch (warning); autocomplete-invalid (error); autocomplete-missing (warning); autocomplete-off-login (warning); required-not-programmatic (warning); required-not-visible (info); broken-reference (error); unlinked-error (warning); duplicate-id (error); group-without-name (warning); button-without-name (error); form-without-submit (warning); positive-tabindex (warning); inputmode-mismatch (warning); many-options (info); unreadable-file (error); scan-limit (error)
findings: 32 (7 error, 22 warning, 3 info)

Files (4)

  file                                  forms  fields  buttons  error  warning  info
  examples/messy/account/login.htm      1      2       0        0      4        0
  examples/messy/account/signup.html    1      9       1        4      8        2
  examples/messy/booking/checkout.html  1      10      1        1      7        1
  examples/messy/index.html             2      2       2        2      3        0

Summary

  files: 4 HTML, with 5 forms
  fields: 23, 20 with a label or another name, 2 required, 9 with an autocomplete field name; select lists: 1
  buttons: 4

Rules (19)

  rule                       level    findings
  missing-label              error    2
  placeholder-only-label     warning  1
  input-type-mismatch        warning  4
  autocomplete-invalid       error    1
  autocomplete-missing       warning  4
  autocomplete-off-login     warning  3
  required-not-programmatic  warning  1
  required-not-visible       info     2
  broken-reference           error    2
  unlinked-error             warning  1
  duplicate-id               error    1
  group-without-name         warning  1
  button-without-name        error    1
  form-without-submit        warning  1
  positive-tabindex          warning  2
  inputmode-mismatch         warning  4
  many-options               info     1
  unreadable-file            error    0
  scan-limit                 error    0

Findings (32)

  ERROR    autocomplete-invalid       examples/messy/account/signup.html:21
           <input type="text" name="phone" id="phone">: autocomplete="phone": "phone" is not an autofill token; did you mean "tel"?
           fix: use on, off, or the tokens of the HTML Standard in their order, such as "shipping postal-code" or "work email"; the message suggests the token that was probably meant

  ERROR    broken-reference           examples/messy/account/signup.html:25
           <input type="email" name="email" id="email">: aria-describedby names the id "email-hint", which no element of the file has
           fix: point the attribute at the id of the element that holds the label, the hint or the error message, or give that element the id; an error message that is added later must get the id the field already names

  ERROR    missing-label              examples/messy/account/signup.html:35
           <input type="password" name="password2" id="password"> has no programmatic label: no label, aria-labelledby, aria-label, title or placeholder names it
           fix: add a visible <label for="id"> with the id of the field, or wrap the field and its text in a label; where no visible label fits the design, name the field with aria-labelledby pointing at visible text, or with aria-label

  ERROR    duplicate-id               examples/messy/account/signup.html:35
           the id "password" is given to 2 elements, <input type="password" name="password" id="password"> at line 29 first; the for attribute of <label for="password"> at line 28 reaches the first one only
           fix: give every element its own id, and point each label and reference at the one it means

  ERROR    broken-reference           examples/messy/booking/checkout.html:69
           <input name="cardNumber" id="card-number">: aria-errormessage names the id "card-number-error", which no element of the file has
           fix: point the attribute at the id of the element that holds the label, the hint or the error message, or give that element the id; an error message that is added later must get the id the field already names

  ERROR    missing-label              examples/messy/index.html:16
           <input type="search" name="q"> has no programmatic label: no label, aria-labelledby, aria-label, title or placeholder names it
           fix: add a visible <label for="id"> with the id of the field, or wrap the field and its text in a label; where no visible label fits the design, name the field with aria-labelledby pointing at visible text, or with aria-label

  ERROR    button-without-name        examples/messy/index.html:17
           <button> has no text, no image with alt text, no aria-label, no aria-labelledby that points at text and no title: a screen reader announces it as a button with no name
           fix: put the words in the button, or alt text on its image; for an icon button, add aria-label with what it does

  WARNING  form-without-submit        examples/messy/account/login.htm:10
           <form> holds 2 fields and no submit button
           fix: add a <button type="submit"> with a clear name, so the form is sent by an explicit action that works with a keyboard and with Enter

  WARNING  autocomplete-off-login     examples/messy/account/login.htm:10
           <form>: autocomplete="off" on a form with a password field (line 14) that has no token of its own keeps password managers from filling it
           fix: remove autocomplete="off" and name the fields: username, current-password on a login form, new-password where a password is set, so that password managers can fill them and people can paste

  WARNING  autocomplete-off-login     examples/messy/account/login.htm:12
           <input type="email" name="email" id="login-email">: autocomplete="off" on a login field next to a password field keeps password managers from filling it, and browsers ignore it there
           fix: remove autocomplete="off" and name the fields: username, current-password on a login form, new-password where a password is set, so that password managers can fill them and people can paste

  WARNING  autocomplete-missing       examples/messy/account/login.htm:14
           <input type="password" name="password" id="login-password"> asks for a password value and it has no autocomplete: use autocomplete="current-password"
           fix: add autocomplete with the token the message names, with shipping or billing in front where the form has both addresses; a field that does not ask for data about the person filling it in can be left out with the configuration

  WARNING  autocomplete-missing       examples/messy/account/signup.html:13
           <input type="text" name="firstName" id="first-name"> asks for "firstName" and it has no autocomplete: use autocomplete="given-name"
           fix: add autocomplete with the token the message names, with shipping or billing in front where the form has both addresses; a field that does not ask for data about the person filling it in can be left out with the configuration

  WARNING  required-not-programmatic  examples/messy/account/signup.html:13
           <input type="text" name="firstName" id="first-name">: its label "First name *" says it is required, but it has no required attribute and no aria-required="true"
           fix: add the required attribute to the field (or aria-required="true" where the form checks the value itself), so that assistive technology says it is required too

  WARNING  input-type-mismatch        examples/messy/account/signup.html:21
           <input type="text" name="phone" id="phone"> is a plain text field, but name="phone": use type="tel"
           fix: use the type the message names: type="email", type="tel" or type="url" bring the fitting on-screen keyboard and checks, and type="number" fits a counted number only (not a card number, a code or a postal code, which take inputmode="numeric")

  WARNING  positive-tabindex          examples/messy/account/signup.html:21
           <input type="text" name="phone" id="phone">: tabindex="3" puts it ahead of the order of the page
           fix: remove the tabindex, or use 0, and put the fields in the source in the order they should be filled

  WARNING  autocomplete-off-login     examples/messy/account/signup.html:29
           <input type="password" name="password" id="password">: autocomplete="off" on a password field keeps password managers from filling it, and browsers ignore it there
           fix: remove autocomplete="off" and name the fields: username, current-password on a login form, new-password where a password is set, so that password managers can fill them and people can paste

  WARNING  unlinked-error             examples/messy/account/signup.html:31
           <span> reads like an error message ("Choose a longer password."), but no aria-describedby or aria-errormessage of a field names it, and it has no id
           fix: give the message an id and name it in aria-describedby (or aria-errormessage with aria-invalid="true") of its field, or announce it with role="alert"

  WARNING  group-without-name         examples/messy/account/signup.html:38
           2 radio buttons named "riding" are not in a fieldset with a legend or a named group, so the question they answer is not announced
           fix: put the group in a <fieldset> with a <legend> that asks the question, or in an element with role="group" (role="radiogroup" for radio buttons) and aria-labelledby pointing at the question

  WARNING  positive-tabindex          examples/messy/account/signup.html:41
           <button>: tabindex="1" puts it ahead of the order of the page
           fix: remove the tabindex, or use 0, and put the fields in the source in the order they should be filled

  WARNING  input-type-mismatch        examples/messy/booking/checkout.html:12
           <input type="text" name="qty" id="riders"> is a plain text field, but its name asks for a counted number: use type="number"
           fix: use the type the message names: type="email", type="tel" or type="url" bring the fitting on-screen keyboard and checks, and type="number" fits a counted number only (not a card number, a code or a postal code, which take inputmode="numeric")

  WARNING  autocomplete-missing       examples/messy/booking/checkout.html:18
           <input name="shipping_address" id="ship-street"> asks for "shipping_address" and it has no autocomplete: use autocomplete="shipping street-address"
           fix: add autocomplete with the token the message names, with shipping or billing in front where the form has both addresses; a field that does not ask for data about the person filling it in can be left out with the configuration

  WARNING  inputmode-mismatch         examples/messy/booking/checkout.html:20
           <input name="shipping_postcode" id="ship-zip">: pattern="[0-9]{5}" asks for digits, but the field brings a full keyboard: add inputmode="numeric"
           fix: use the inputmode the message names, or remove the attribute that has no effect; digits that are not a counted number take type="text" with inputmode="numeric"

  WARNING  input-type-mismatch        examples/messy/booking/checkout.html:22
           <input type="text" name="website" id="ship-site"> is a plain text field, but autocomplete="url": use type="url"
           fix: use the type the message names: type="email", type="tel" or type="url" bring the fitting on-screen keyboard and checks, and type="number" fits a counted number only (not a card number, a code or a postal code, which take inputmode="numeric")

  WARNING  inputmode-mismatch         examples/messy/booking/checkout.html:69
           <input name="cardNumber" id="card-number"> asks for a card number, which is digits, with a full keyboard: add inputmode="numeric"
           fix: use the inputmode the message names, or remove the attribute that has no effect; digits that are not a counted number take type="text" with inputmode="numeric"

  WARNING  inputmode-mismatch         examples/messy/booking/checkout.html:71
           <input name="cardExpiry" id="card-exp">: inputmode="digits" is not one of none, text, decimal, numeric, tel, search, email, url
           fix: use the inputmode the message names, or remove the attribute that has no effect; digits that are not a counted number take type="text" with inputmode="numeric"

  WARNING  inputmode-mismatch         examples/messy/booking/checkout.html:73
           <input type="number" name="cvc" id="card-cvc">: pattern applies to the text, search, url, tel, email and password types only; the browser ignores it here
           fix: use the inputmode the message names, or remove the attribute that has no effect; digits that are not a counted number take type="text" with inputmode="numeric"

  WARNING  placeholder-only-label     examples/messy/index.html:29
           <input type="text" name="email"> is named only by its placeholder "Your email address", which disappears when someone types and may not be read out
           fix: add a visible label that stays on screen while the person types; keep the placeholder, if at all, for an example of the format

  WARNING  input-type-mismatch        examples/messy/index.html:29
           <input type="text" name="email"> is a plain text field, but name="email": use type="email"
           fix: use the type the message names: type="email", type="tel" or type="url" bring the fitting on-screen keyboard and checks, and type="number" fits a counted number only (not a card number, a code or a postal code, which take inputmode="numeric")

  WARNING  autocomplete-missing       examples/messy/index.html:29
           <input type="text" name="email"> asks for "email" and it has no autocomplete: use autocomplete="email"
           fix: add autocomplete with the token the message names, with shipping or billing in front where the form has both addresses; a field that does not ask for data about the person filling it in can be left out with the configuration

  INFO     required-not-visible       examples/messy/account/signup.html:17
           <input type="text" name="lastName" id="last-name"> is required, but its label, description and legend show no asterisk and no word required
           fix: say it in the label or the legend, as text such as (required) or an asterisk explained at the top of the form

  INFO     required-not-visible       examples/messy/account/signup.html:40
           <input type="checkbox" name="terms"> is required, but its label, description and legend show no asterisk and no word required
           fix: say it in the label or the legend, as text such as (required) or an asterisk explained at the top of the form

  INFO     many-options               examples/messy/booking/checkout.html:27
           <select name="station" id="station"> holds 36 options, more than 30, with no hint linked by aria-describedby
           fix: consider a text field with a datalist or a search, grouping the options with optgroup, or a hint that typing the first letters jumps to an option

note: 1 path matching vendor/** is left out
note: 1 folder named .git or node_modules is passed over

This check reads the HTML files on disk as text and runs no browser, no script and no style sheet; the checks are a heuristic. A finding is a lead with a file and a line for a UX audit, and a clean result is not an accessibility audit and not a conformance claim (docs/limits.md).

RESULT: FAIL - 7 findings at or above error (7 error, 22 warning, 3 info)
```

With `--explain`, each finding also shows the rule, the points of the public pages it rests on and the tool's own
choice:

```
  WARNING  placeholder-only-label     examples/messy/index.html:29
           <input type="text" name="email"> is named only by its placeholder "Your email address", which disappears when someone types and may not be read out
           fix: add a visible label that stays on screen while the person types; keep the placeholder, if at all, for an example of the format
           rule: a field named by its placeholder alone
           basis: placeholder text is not a replacement for a label: assistive technology may not read it, and it disappears as soon as someone types (Form Instructions (W3C WAI Forms Tutorial), https://www.w3.org/WAI/tutorials/forms/instructions/)
           basis: a placeholder is not a label and must never be needed to understand a form (<input>: The HTML Input element (MDN), https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input)
           the tool's own choice: a field whose only name is its placeholder: no label with text, no aria-labelledby that points at text, no aria-label and no title; browsers do take the placeholder as a last resort for the name, so it is a warning and not missing-label
```

The clean example passes:

```
form-ux-check: examples/clean
input: 2 HTML files; 1 other file passed over; 0 folders named .git or node_modules passed over; 0 paths excluded; 0 links not followed
config: built-in defaults: include **/*.html and **/*.htm; exclude none; option limit 40; minimum severity info; fail on error
rules: missing-label (error); placeholder-only-label (warning); input-type-mismatch (warning); autocomplete-invalid (error); autocomplete-missing (warning); autocomplete-off-login (warning); required-not-programmatic (warning); required-not-visible (info); broken-reference (error); unlinked-error (warning); duplicate-id (error); group-without-name (warning); button-without-name (error); form-without-submit (warning); positive-tabindex (warning); inputmode-mismatch (warning); many-options (info); unreadable-file (error); scan-limit (error)
findings: 0

Files (2)

  file                            forms  fields  buttons  error  warning  info
  examples/clean/index.html       1      1       1        0      0        0
  examples/clean/visit/card.html  1      9       1        0      0        0

Summary

  files: 2 HTML, with 2 forms
  fields: 10, 10 with a label or another name, 2 required, 4 with an autocomplete field name; select lists: 0
  buttons: 2

Rules (19)

  rule                       level    findings
  missing-label              error    0
  placeholder-only-label     warning  0
  input-type-mismatch        warning  0
  autocomplete-invalid       error    0
  autocomplete-missing       warning  0
  autocomplete-off-login     warning  0
  required-not-programmatic  warning  0
  required-not-visible       info     0
  broken-reference           error    0
  unlinked-error             warning  0
  duplicate-id               error    0
  group-without-name         warning  0
  button-without-name        error    0
  form-without-submit        warning  0
  positive-tabindex          warning  0
  inputmode-mismatch         warning  0
  many-options               info     0
  unreadable-file            error    0
  scan-limit                 error    0

Findings (0)

  none

This check reads the HTML files on disk as text and runs no browser, no script and no style sheet; the checks are a heuristic. A finding is a lead with a file and a line for a UX audit, and a clean result is not an accessibility audit and not a conformance claim (docs/limits.md).

RESULT: PASS - no finding at or above error
```

## How the files are read

1. The folder is listed with a list of folders of its own and no link followed; every file that an include pattern
   names (`**/*.html` and `**/*.htm` by default) is read, and the folders .git and node_modules and the paths of
   `--exclude` are passed over.
2. Each file is decoded by its byte order mark (UTF-8 with or without one, UTF-16 with one) and read once by the safe
   HTML reader of src/html.js into a light tree: elements, attributes, offsets and the text inside each element.
   Comments, scripts and styles are passed over; a form inside a form is left out, as a browser leaves it out.
3. The checks of src/forms.js work out the label of every field (for and id, a wrapping label, aria-labelledby,
   aria-label, title, placeholder), the form of every field, the groups of radio buttons and check boxes, the ids and
   the references to them, and the purpose of a field from its autocomplete, its type, its name and its id.
4. autocomplete values are read by src/autofill.js against the autofill list of the HTML Standard.

[docs/method.md](docs/method.md) gives the details, and
[decision 2](docs/decisions/0002-read-html-with-a-safe-reader-of-its-own-and-run-no-browser.md) says why the files are
read with a reader of the tool's own and no browser.

## What it reports

| Rule | Key | Default level | Finds |
| --- | --- | --- | --- |
| `missing-label` | `rules.missingLabel` | error | a field with no label, aria-labelledby, aria-label, title or placeholder |
| `placeholder-only-label` | `rules.placeholderOnly` | warning | a field named by its placeholder alone |
| `input-type-mismatch` | `rules.inputType` | warning | a text field whose autocomplete, name or id says email, tel, url or a counted number |
| `autocomplete-invalid` | `rules.autocompleteInvalid` | error | an autocomplete value outside the grammar and the token list of the HTML Standard |
| `autocomplete-missing` | `rules.autocompleteMissing` | warning | a field for personal data, by its type, name or id, with no autocomplete field name |
| `autocomplete-off-login` | `rules.autocompleteOffLogin` | warning | autocomplete off on a password field, a username or email field next to one, or their form |
| `required-not-programmatic` | `rules.requiredNotProgrammatic` | warning | a label that says required on a field with no required or aria-required |
| `required-not-visible` | `rules.requiredNotVisible` | info | a required field whose label, description and legend do not say so |
| `broken-reference` | `rules.brokenReference` | error | aria-describedby, aria-errormessage, aria-labelledby, for, list or form naming a missing id |
| `unlinked-error` | `rules.unlinkedError` | warning | an element named like an error message, in a form, that no field references |
| `duplicate-id` | `rules.duplicateId` | error | an id held by two elements and named by a label or a reference |
| `group-without-name` | `rules.groupName` | warning | radio buttons or check boxes sharing a name, outside a named fieldset or group |
| `button-without-name` | `rules.buttonName` | error | a button with no text, alt text, aria-labelledby, aria-label, title or value |
| `form-without-submit` | `rules.formSubmit` | warning | a form with fields and no submit button |
| `positive-tabindex` | `rules.positiveTabindex` | warning | a tabindex above 0 |
| `inputmode-mismatch` | `rules.inputmodeMismatch` | warning | an inputmode or pattern that is unknown, ignored or at odds with the type |
| `many-options` | `rules.manyOptions` | info | a select with more options than `optionLimit` and no hint |
| `unreadable-file` | none | error | a file that cannot be read |
| `scan-limit` | none | error | input past the limits of a run |

The two rules of input problems are always errors. [docs/method.md](docs/method.md) says exactly what each rule looks
at and what it cannot see, and [docs/rules-and-sources.md](docs/rules-and-sources.md) gives the points of the public
pages each rule rests on.

## Inputs and excluded paths

| Input | What is read |
| --- | --- |
| `*.html`, `*.htm` | every element and attribute of the markup, and the text inside each element |
| `include` | the files to read, as patterns relative to the folder, `**/*.html` and `**/*.htm` by default |
| `--exclude <pattern>` and `exclude` | paths left out, matched relative to the folder: `*` and `?` stay in one folder, `**` crosses folders, so `vendor/**` leaves the folder vendor out |

The folders .git and node_modules are never read. Templates of Vue, Svelte, JSX and TSX are not read by default:
their attributes are often bound to values that only exist at run time, so a reading of them as text would report
fields that have a label in the browser;
[decision 2](docs/decisions/0002-read-html-with-a-safe-reader-of-its-own-and-run-no-browser.md) says more, and
[docs/inputs.md](docs/inputs.md) describes every input.

## What is not checked

The tool reads the files it is given and never guesses. It does not:

- run scripts, so a field, a label, an id or an error message that a script adds, and a form sent by a script, are not
  seen as the browser sees them;
- apply style sheets, so a label hidden with CSS, a field shown only on some screens, color and contrast are not seen;
- compute the full accessible name of every element: it follows the common sources of a name, in the order of
  docs/method.md;
- know whose data a field asks for, so a field for a friend's email address is treated like the user's own;
- check content: whether a label is clear, whether an error message helps, whether the order of the fields makes sense;
- read custom widgets with ARIA roles such as combobox or textbox, other than the groups of radio buttons and check
  boxes;
- read a date or the clock;
- say that a page conforms to WCAG: it is not an accessibility audit and not a conformance claim.

So a clean run means the folder holds none of the forms the rules look for, and every report says so.

## The configuration file

```json
{
  "name": "Kestrel Cycle Hire form review",
  "exclude": ["vendor/**"],
  "optionLimit": 30
}
```

Every key is optional, and without `--config` the defaults apply. `include` lists the files to read and `exclude` the
paths to leave out, as patterns relative to the folder; `rules` sets the level of each rule (`info`, `warning`,
`error` or `off`); `optionLimit` sets the number of options past which a select list is noted (40 by default);
`minSeverity` sets the lowest level shown and `failOn` the lowest level that fails the run. A key the tool does not
know is an error with its line and a suggestion, and a key named twice is refused. [docs/inputs.md](docs/inputs.md)
describes every key, and `--print-defaults` writes the whole default configuration out.

## Formats

- `text`: for a terminal: what was read, the configuration, the rules, the files, the summary, the count of every rule,
  the findings with the file and line and what to change, the notes, the notice and the result. With `--explain` also
  the rule, the points of the public pages and the tool's own choice behind each finding.
- `json` (or `--json`): the whole report: the input, the configuration, the files, the summary, the counts per rule,
  every finding with its file, line and column, the totals, the result, the notes and the notice.
- `csv`: one record per finding, ready for a sheet: the level, the rule, the file, the line, the column, what was found
  and what to change, with CRLF line ends as RFC 4180 writes. A field that a spreadsheet could read as a formula gets a
  single quote in front. The start of the messy example:

```
level,rule,file,line,column,found,fix
error,autocomplete-invalid,examples/messy/account/signup.html,21,52,"<input type=""text"" name=""phone"" id=""phone"">: autocomplete=""phone"": ""phone"" is not an autofill token; did you mean ""tel""?","use on, off, or the tokens of the HTML Standard in their order, such as ""shipping postal-code"" or ""work email""; the message suggests the token that was probably meant"
error,broken-reference,examples/messy/account/signup.html,25,74,"<input type=""email"" name=""email"" id=""email"">: aria-describedby names the id ""email-hint"", which no element of the file has","point the attribute at the id of the element that holds the label, the hint or the error message, or give that element the id; an error message that is added later must get the id the field already names"
error,missing-label,examples/messy/account/signup.html,35,9,"<input type=""password"" name=""password2"" id=""password""> has no programmatic label: no label, aria-labelledby, aria-label, title or placeholder names it","add a visible <label for=""id""> with the id of the field, or wrap the field and its text in a label; where no visible label fits the design, name the field with aria-labelledby pointing at visible text, or with aria-label"
```

- `github`: one workflow command per finding, `::error`, `::warning` or `::notice` (for info) with the file, line and
  column, which GitHub shows as an annotation in the pull request, then a summary line. The characters a command gives
  a meaning to are escaped. Two findings of the messy example:

```
::error file=examples/messy/account/signup.html,line=21,col=52,title=form-ux-check autocomplete-invalid::<input type="text" name="phone" id="phone">: autocomplete="phone": "phone" is not an autofill token; did you mean "tel"?; fix: use on, off, or the tokens of the HTML Standard in their order, such as "shipping postal-code" or "work email"; the message suggests the token that was probably meant
::error file=examples/messy/index.html,line=16,col=7,title=form-ux-check missing-label::<input type="search" name="q"> has no programmatic label: no label, aria-labelledby, aria-label, title or placeholder names it; fix: add a visible <label for="id"> with the id of the field, or wrap the field and its text in a label; where no visible label fits the design, name the field with aria-labelledby pointing at visible text, or with aria-label
```

## Exit codes

`0`: no finding at or above the fail-on level (`error` by default). `1`: at least one finding at or above it; with the
default, a field with no label, an invalid autocomplete value, a reference to a missing id, an id given twice, a button
with no name, or a file the tool could not read; with `--fail-on warning`, the warnings too. `2`: a usage or input
error: no folder named, two folders named, an unknown option, an option given twice, `--explain` with the csv or github
format, a URL in place of a path, a folder that is a file or is missing, a symbolic link, an `--exclude` pattern that
is not valid, or a configuration with an unknown key, a key named twice or a value of the wrong kind. With exit code
`2` the tool gives no result and prints the problems on standard error.

## Limits

The tool reads files; it fetches nothing and connects to nothing. A run reports the forms of docs/method.md that the
folder holds. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 4 MB for a file, 50,000
files and folders listed, folders nested up to 32 deep, 5,000 HTML files, 200,000 elements in a file nested up to 512
deep with up to 256 attributes each, names of 256 and values of 65,536 characters, 500 findings listed per rule.
[docs/threat-model.md](docs/threat-model.md) lists the risks of reading these files from a pull request and their
controls, and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the configuration, lists the folder, reads every file and builds the report of the run |
| `src/walk.js`, `src/files.js` | the listing of the folder with no link followed, and the bounded reading of files by their byte order mark |
| `src/html.js` | the safe HTML reader: one pass, no recursion, with limits |
| `src/forms.js` | the checks of one file: labels, types, autocomplete, required fields, ids, groups, buttons, forms, tabindex, inputmode and pattern, select lists |
| `src/autofill.js` | the autocomplete grammar and the autofill token list of the HTML Standard |
| `src/hints.js` | the purpose of a field from its autocomplete, type, name and id |
| `src/glob.js` | the path patterns |
| `src/config.js`, `src/defaults.js` | the configuration file over the defaults |
| `src/rules.js` | the rules, their levels and the result |
| `src/report.js`, `src/csv.js`, `src/json.js`, `src/text.js`, `src/size.js`, `src/words.js` | the text, JSON, CSV and GitHub output, the strict JSON reader of the configuration, the cleaning of text from the input, number formats and compared words |
| `src/data.js` | the public pages and the points the rules rest on, in this project's own words |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

| Fact | Source |
| --- | --- |
| Labels or instructions where input is asked for, and required fields in them | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html |
| The purpose of fields about the user, given by autocomplete tokens | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html |
| Errors identified and described in text | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html |
| A name and a role for every control, and failure F68 | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html |
| Labels, fieldset and legend, grouping roles and title in markup | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html |
| A focus order that keeps meaning, and failure F44 | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html |
| Submit buttons for a change of context (G80, H32) | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/on-input.html |
| Password managers and paste on login forms | W3C WAI, https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html |
| The autocomplete grammar and the autofill token list | WHATWG, https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill |
| How a label finds its control | WHATWG, https://html.spec.whatwg.org/multipage/forms.html#the-label-element |
| Labels, groups, instructions, required fields and error messages | W3C WAI forms tutorial, https://www.w3.org/WAI/tutorials/forms/labels/ and the pages next to it |
| autocomplete tokens and off on login fields | MDN, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete |
| The values of inputmode | MDN, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode |
| Input types, the keyboards they bring, pattern and placeholder | MDN, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input |
| tabindex above 0 | MDN, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex |
| Browsers ignore autocomplete off on login fields | MDN, https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Turning_off_form_autocompletion |
| aria-errormessage and aria-describedby | MDN, https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-errormessage |
| datalist as an alternative to a long list | MDN, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist |
| Unique ids | MDN, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id |
| The CSV format | RFC 4180, https://www.rfc-editor.org/rfc/rfc4180 |
| Repeated names in a JSON object, and UTF-8 | RFC 8259, https://www.rfc-editor.org/rfc/rfc8259 |
| Formulas hidden in CSV files | OWASP, https://community.owasp.org/attacks/CSV_Injection |
| Annotations from workflow commands | GitHub Docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |

[research/sources.md](research/sources.md) has a note on each page, in this project's own words.

## Background

A form collects what a business needs from the people who use it, and its markup decides whether they can: whether a
screen reader names the field, whether the phone brings up the right keyboard, whether the browser can fill in the
address, whether an error is heard. These details pile up page by page and are rarely read side by side, which is the
first thing a team does when it reviews the UX of a product or brings in designers for it. How such work is staffed and
carried out is described on the page [UX Design Services](https://innerluxes.dev/application/ux-design).

## License

MIT
