# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which files you give it, where the output goes, and who may
change the configuration. A clean result is not an accessibility audit and not a conformance claim; it is a folder with
none of the forms the rules look for, not a finding that the forms work for everyone.

## How the tool behaves by default

- **Reads, never runs.** The tool reads the HTML files of the folder and the configuration it is given. It follows no
  symbolic link, fetches no URL, refuses an argument that looks like an address, runs no browser, no script and no
  style sheet, compiles no pattern attribute, evaluates nothing and writes nothing to disk.
- **Every rule on from the first run.** A field or a button with no name, an invalid autocomplete value, a reference to
  a missing id and an id given twice that a reference names are errors; a placeholder used as a label, a text field
  that should be typed, a missing autocomplete token, autocomplete off on a login field, a required field the markup
  does not mark, an unlinked error message, an unnamed group, a form with no submit button, a tabindex above 0 and an
  inputmode or pattern that does not fit are warnings; a required field with no visible indication and a long select
  list are notes.
- **Fail closed on what it cannot read.** A file that cannot be read and input past the limits of a run are error
  findings that fail the run at the default `failOn` of `error`; these two rules have no key and cannot be lowered or
  set off. A folder that cannot be used and an exclude pattern that is not valid stop the run with exit code `2` and no
  result.
- **Unknown keys are errors.** A key in the configuration that the tool does not know stops the run, with its line and
  a suggestion, so a typo such as `failOm` cannot leave a default in place. A key named twice stops the run.
- **No regular expression from the input.** No pattern is built from a file or the configuration.
- **No recursion.** The listing of the folder and the readers keep lists of their own, so a deep file cannot exhaust
  the stack.
- **No prototype tricks.** Names from the input are kept in Map objects and looked up in maps and sets or with
  `Object.hasOwn`, and the JSON reader defines own properties, so `__proto__` is only a name.
- **Clean output.** Text from the input, file names included, has control characters, line separators and direction
  controls removed and its length capped before it reaches a report or an error message. The GitHub format escapes
  `%`, CR and LF in a message and also `:` and `,` in a property. The CSV format puts a single quote in front of a field
  that a spreadsheet could read as a formula.
- **The same input gives the same output.** No clock, no zone, no locale and no random number
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`"failOn": "warning"`.** Placeholders used as labels, untyped fields, missing autocomplete tokens and the other
  warnings fail the run too; use it once the errors are gone, so that new pages keep to the same bar.
- **Raise a rule.** Set `positiveTabindex` or `groupName` to `error` once the site has none.
- **Keep `exclude` short.** Leave out only folders that are not pages of the site, and review a new pattern like a
  change to code.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: Form UX check
    run: npx --yes github:INNERLUXES/form-ux-check . --format github
```

- Give the job read access to the contents and nothing more. The tool needs no secret, no browser and no server.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Check the built pages when the site is built: point the tool at the output folder of the build, where the HTML is
  what the browser gets, rather than at templates.
- Do not hide the exit code with a trailing `|| true`. To see the report without failing, keep `failOn` at `error` and
  keep the JSON or CSV report as an artifact of the job.
- Treat a CSV report built from files you do not trust as untrusted data: open it with formulas off.

## Protecting the configuration

The configuration decides which files are read, which rules report, which paths are left out and what fails the run.
Keep it in the repository, put its path in `CODEOWNERS` with the people who own the forms, and require their review in
branch protection. Review a change that sets a rule to off or lower, narrows `include`, adds an exclude pattern or
raises `failOn` like a change to code: each of them can hide a problem.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
