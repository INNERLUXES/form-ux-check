# 2. Read HTML with a safe reader of its own, and run no browser

## Status

Accepted

## Context

The facts the checks need sit in the markup of the pages: the fields, their attributes, the labels and the ids they
name, the text inside a label or a button. A browser would see more: what a script adds, what a style hides, the full
accessible name. But a browser in a pipeline that checks pull requests would run the scripts of the pull request, load
whatever addresses the pages name, need a large install and a display, and give results that depend on timing and on
the network.

A general HTML library would bring code the project does not review, and a parser that builds the whole tree of the
HTML Standard is more than the checks need. Regular expressions over HTML break on nested and unusual markup and can
take a very long time on hostile input.

Framework templates (Vue, Svelte, JSX, TSX) look like HTML but are not: an id, a `for` or an `aria-labelledby` is often
bound to a value that exists only when the component runs (`:id="fieldId"`, `{id}`, `htmlFor={id}`), and attribute names
change (`className`, `autoComplete`). Read as text, such a template would show fields with no label that do have one in
the browser, and the report would fill with findings that are not true.

## Decision

1. Pages are read by src/html.js, a safe HTML reader of the tool's own: one pass, a list of open elements of its own and
   no recursion, limits of depth, elements, attributes, names and values, and the parts of the HTML Standard the checks
   need, listed in docs/method.md. A file past a limit is a `scan-limit` finding with its place.
2. The tool runs no browser, no script and no style sheet, loads nothing a page names, and compiles no `pattern`
   attribute; a pattern is read by a fixed scanner.
3. Only HTML is read by default (`*.html` and `*.htm`). Framework templates are not read, because their bound
   attributes cannot be known without running them; the include patterns can name other files, which are then read as
   HTML and nothing more. A site built from templates is checked in its built output.
4. The checks are a heuristic over the markup as written, and every report says so.

## Consequences

- The tool needs no browser, no install and no network, runs in seconds on a large site, and the same files give the
  same report on Linux, Windows and macOS.
- What a script or a style changes is not seen (docs/limits.md); a clean result is not an accessibility audit and not a
  conformance claim, and people still have to try the forms.
- Unusual markup may give a tree that differs from the browser's in places the checks rarely depend on; docs/limits.md
  lists them.
