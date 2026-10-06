# Inputs

## The folder

```
form-ux-check <folder> [--exclude <pattern>]... [--config <file>]
```

Name one folder: the folder of the site, the one that holds its pages. Every file below it that an include pattern
names is read; the folders .git and node_modules are passed over, in any case of letters, and so is every path that
matches an exclude pattern. A folder that is a file, a symbolic link or missing stops the run with exit code `2`. Check
two sites in two runs.

The paths in the report are relative to the folder you run the command in, with forward slashes on every system,
followed by the line.

## The files

| File | What is read |
| --- | --- |
| `*.html`, `*.htm` (the default include patterns) | every element and attribute of the markup, the text inside each element and the alt text of its images |
| any other file an include pattern names | the same, read as HTML; template code inside it is text and is not run |

Names are compared without regard to case, so `Index.HTML` is read too. A file is read as UTF-8, with or without a
byte order mark, or as UTF-16 with its byte order mark.

The templates of Vue, Svelte, JSX and TSX are not read by default. Their attributes are often bound to values that
exist only when the page runs (`:id`, `v-bind:for`, `{id}`, `htmlFor`), so a reading of them as text would report fields
that have a label in the browser, and miss others; decision 2 says why. An include pattern can name such files, at the
risk of those false findings; the tool reads them as HTML and nothing more.

## Exclude patterns

`--exclude <pattern>` and `exclude` of the configuration leave paths of the folder out, and `include` names the files
to read. A pattern is matched against the path relative to the folder, with forward slashes, in lowercase: `*` is any
run of characters but a slash, `?` one character but a slash, `**` any run of characters with slashes, and `**/` any
run of folders, none included. A folder is left out when the pattern matches its path or its path with a slash after
it, so `vendor/**` leaves out the folder vendor and all below it, and `**/drafts/**` every folder named drafts. A
pattern may not be absolute, hold a backslash or `..`, or be longer than 200 characters. The patterns of `--exclude`
add to those of the configuration.

## The configuration file

The configuration is one JSON object, read by a strict reader of RFC 8259 (no comments, no trailing comma, no name
given twice). Every key is optional; without `--config` the defaults apply, and `--print-defaults` writes them out. A
key the tool does not know is an error with its line and a suggestion, and stops the run with exit code `2`.

```json
{
  "name": "Kestrel Cycle Hire form review",
  "include": ["**/*.html", "**/*.htm"],
  "exclude": ["vendor/**"],
  "rules": { "manyOptions": "off", "positiveTabindex": "error" },
  "optionLimit": 30,
  "minSeverity": "info",
  "failOn": "error"
}
```

| Key | Value | Default |
| --- | --- | --- |
| `name` | a text of 1 to 120 characters, shown in the report | none |
| `include` | 1 to 200 path patterns of the files to read | `**/*.html`, `**/*.htm` |
| `exclude` | up to 200 path patterns of paths to leave out | none |
| `rules` | an object of rule keys to `info`, `warning`, `error` or `off` | below |
| `optionLimit` | a whole number from 2 to 10,000: a select with more options is noted by `many-options` | 40 |
| `minSeverity` | the lowest level shown: `info`, `warning` or `error` | `info` |
| `failOn` | the lowest level that fails the run | `error` |

The lists replace their defaults as a whole, and a value given twice in a list is kept once. `--min-severity` and
`--fail-on` on the command line win over the configuration. No key takes a regular expression.

## The keys of rules

| Key | Rule | Default |
| --- | --- | --- |
| `rules.missingLabel` | `missing-label` | error |
| `rules.placeholderOnly` | `placeholder-only-label` | warning |
| `rules.inputType` | `input-type-mismatch` | warning |
| `rules.autocompleteInvalid` | `autocomplete-invalid` | error |
| `rules.autocompleteMissing` | `autocomplete-missing` | warning |
| `rules.autocompleteOffLogin` | `autocomplete-off-login` | warning |
| `rules.requiredNotProgrammatic` | `required-not-programmatic` | warning |
| `rules.requiredNotVisible` | `required-not-visible` | info |
| `rules.brokenReference` | `broken-reference` | error |
| `rules.unlinkedError` | `unlinked-error` | warning |
| `rules.duplicateId` | `duplicate-id` | error |
| `rules.groupName` | `group-without-name` | warning |
| `rules.buttonName` | `button-without-name` | error |
| `rules.formSubmit` | `form-without-submit` | warning |
| `rules.positiveTabindex` | `positive-tabindex` | warning |
| `rules.inputmodeMismatch` | `inputmode-mismatch` | warning |
| `rules.manyOptions` | `many-options` | info |

`unreadable-file` and `scan-limit` have no key: they are always errors. Setting a rule to `off` leaves it out of the
findings and the counts, and a note names it.

### Why the levels are what they are

The errors are the findings that break a field for some people whatever else is on the page: a field or a button with
no name, an autocomplete value a browser cannot read, a reference to an id that is not there, and an id given twice
that a label names. The warnings are the findings that make a form harder to use or that a page can make up for in a
way the tool cannot see. The notes are the findings that ask for a look rather than a change: a required field whose
indication may sit elsewhere on the page, and a long select list.
