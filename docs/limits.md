# Limits

The tool runs no browser: it reads the HTML files of a folder from disk, as text. Its result is an input to a UX audit,
not an accessibility audit and not a conformance claim. It runs no script and no style sheet, fetches nothing,
connects to no system and asks nobody anything. A finding points at a line where the markup of a form needs a look,
and a run without findings says only that the folder holds none of the forms of docs/method.md. Every report ends with
a sentence that says so.

## What it cannot see

- **What a script does.** No script runs, so a field, a label, an id, an error message or a whole form that a script
  writes, a `required` or `aria-invalid` set later, and a form that a script sends with no submit button are not seen
  as the browser sees them. The checks are a heuristic over the markup as written.
- **What a style sheet does.** No style sheet is applied, so a label hidden with CSS, a field shown only on small
  screens, the visible order of the fields, color and contrast are not seen; a visually hidden label counts as a label.
- **The full accessible name.** The tool follows the common sources of a name in the order of docs/method.md; it does
  not compute the whole name a browser builds, with CSS content, hidden content and roles.
- **Custom widgets.** Elements with ARIA roles such as combobox, textbox, checkbox or listbox are not read as fields;
  only the groups of radio buttons and check boxes use `role="group"` and `role="radiogroup"`.
- **Whose data a field asks for.** WCAG 1.3.5 covers fields about the user. A field for a friend's email address looks
  the same in the markup, and is reported the same; turn the rule off or down for such pages.
- **Words.** Whether a label is clear, an error message helps, an instruction is right, and whether the purpose the
  table of src/hints.js gives a name is the one the page means. The table holds the common names only.
- **Templates.** The templates of Vue, Svelte, JSX and TSX are not read by default, because their bound attributes have
  values only when the page runs (decision 2); server-side templates named by an include pattern are read as HTML, and
  their code is plain text.
- **Other pages.** Each file is checked on its own: an id named in one file and given in another is a broken reference.
  Files outside the folder are not read.
- **Time.** The tool reads no clock and no dates
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **Whether a finding matters to you.** A page may make up for a finding in a way the tool cannot see. Set the level
  of a rule, or turn it off, in the configuration.

## The reader

- The HTML reader of src/html.js follows the HTML Standard where the checks need it and simplifies the rest: a few
  start tags close the element before them (docs/method.md lists them); other implied end tags, the adoption agency
  of formatting elements and foster parenting in tables are not modeled, so the tree of unusual markup may differ from
  the one a browser builds.
- Named character references other than `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` and `&nbsp;` are kept as written.
- A file is read as UTF-8, with or without a byte order mark, or as UTF-16 with its byte order mark; UTF-16 with no
  mark, and any other encoding, is an `unreadable-file` finding. A `meta charset` is not read.

## Size limits

Past a limit, the input is refused with exit code `2` and no result, a file is an error finding, or the listing stops
with a `scan-limit` finding.

| What | Limit |
| --- | --- |
| an HTML file | 4 MB; a larger one is an `unreadable-file` finding |
| the configuration | 1 MB |
| files and folders of the folder listed | 50,000 |
| folders nested | 32 deep |
| HTML files | 5,000 |
| elements of an HTML file | 200,000, nested up to 512 deep, with up to 256 attributes each |
| names and values in HTML | 256 and 65,536 characters |
| entries of a list of the configuration | 200 |
| exclude patterns | 100, of up to 200 characters |
| findings of one rule | 500 listed; the rest are counted in a note and still count for the result |
| problems of the input | 20 listed; the rest are counted |

The tests check thousands of fields, labels, ids, groups, forms and options, runs of hundreds of thousands of
brackets, quotes, references, comments, attributes, names and end tags, elements nested past the limit, long
autocomplete values, names and patterns, and folders nested past the limit, each with a time check.
