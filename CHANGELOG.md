# Changes

## 1.0.0

First release.

- Lists form usability and accessibility problems in the HTML files of a folder, with file, line and column, as an
  input to a UX audit: every file that an include pattern names (`**/*.html` and `**/*.htm` by default), with .git and
  node_modules passed over and `--exclude` patterns left out. Runs no browser, no script and no style sheet, fetches
  nothing, follows no symbolic link and reads no clock.
- A safe HTML reader with no dependency: one pass with no recursion, limits of depth, elements, attributes, names and
  values, void elements, comments, raw text, the implied end tags the checks need, a form inside a form left out as a
  browser leaves it out, UTF-8 and UTF-16 by the byte order mark, LF, CRLF and CR line ends.
- The autocomplete grammar and the autofill token list of the HTML Standard, read token by token, with a suggestion for
  the token that was probably meant.
- The purpose of a field from its autocomplete, its type, and the words of its name and id, looked up as a whole in a
  short table so that hotel never reads as tel.
- Seventeen rules in three levels: a field with no programmatic label (`missing-label`), a placeholder used as the only
  label (`placeholder-only-label`), a text field for an email address, a phone number, a web address or a counted
  number (`input-type-mismatch`), an invalid autocomplete value (`autocomplete-invalid`), a field for personal data with
  no autocomplete token (`autocomplete-missing`), autocomplete off on a login field (`autocomplete-off-login`), a label
  that says required on a field that is not marked (`required-not-programmatic`), a required field with no visible
  indication (`required-not-visible`), a reference to a missing id (`broken-reference`), an error message no field
  points at (`unlinked-error`), an id given twice and named by a reference (`duplicate-id`), radio buttons or check
  boxes with no group name (`group-without-name`), a button with no name (`button-without-name`), a form with no submit
  button (`form-without-submit`), a tabindex above 0 (`positive-tabindex`), an inputmode or pattern that does not fit
  (`inputmode-mismatch`) and a very long select list (`many-options`); and two rules of input problems that cannot be
  lowered (`unreadable-file`, `scan-limit`).
- A table of the files with their forms, fields, buttons and findings, and a summary of the forms, fields, names,
  required fields, autocomplete tokens, select lists and buttons.
- A configuration file in strict JSON over documented defaults: the files to read, the paths left out, the level of
  every rule, the option limit, the minimum severity and the level that fails the run; a key the tool does not know is
  an error with its line and a suggestion, and a key named twice is refused.
- Reports as text, JSON, CSV with one row per finding (`--format csv`) and GitHub workflow commands (`--format github`)
  that show each finding as an annotation; every finding has its file, line and column; `--min-severity`, `--fail-on`,
  `--explain` with the rule, the sources and the tool's own choice, and `--print-defaults`. Exit code `0` when no
  finding is at or above the fail-on level, `1` when one is, `2` for a usage or input error, with no result.
- An input to a UX audit, not an accessibility audit and not a conformance claim: every report says so.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
