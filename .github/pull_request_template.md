## What changes

<!-- One or two sentences. -->

## Checks

- [ ] `npm test`, `npm run test:coverage`, `npm run check` and `npm run example` pass, and the files under `examples/output` are the ones `npm run example` wrote
- [ ] A change to a rule is described in docs/method.md, says what it can and cannot see, and has a test with the HTML written inline and a near miss on each side
- [ ] A change to what the tool cannot see is in docs/limits.md
- [ ] A change to a key of the configuration, to the words of src/hints.js or to the forms of HTML that are read is in docs/inputs.md or docs/method.md, and in the README
- [ ] A change to a point of a public page is in src/data.js, research/sources.md and docs/rules-and-sources.md, in this project's own words, with no long quotation
- [ ] A change to the autofill list of src/autofill.js follows the HTML Standard, token for token
- [ ] Nothing in the change, the README or the output reads as an accessibility audit or a conformance claim; the tool reads the files on disk as text and runs no browser
- [ ] The HTML reader still stops at its limits with the place, never recurses, and keeps every pass over the elements bounded
- [ ] No pattern is built from a file or the configuration, and a pattern attribute of a page is read as text and never compiled
- [ ] Text from the input goes through `safeText` before it reaches the output or an error message, the GitHub format escapes what a workflow command gives a meaning to, and the CSV format neutralizes a leading formula character
- [ ] The tool still reads no clock and no locale, opens no network connection, runs nothing it reads, evaluates nothing and writes nothing to disk
- [ ] Work stays bounded: the limits of docs/limits.md hold, and a hostile test has a time check that widens under coverage through `NODE_V8_COVERAGE`
- [ ] A test that depends on the operating system (a link, a device, file permissions) is guarded with `process.platform`, asserts no line of its own, and builds its paths with `resolve()` from forward-slash names
- [ ] No real company, site or person in fixtures or examples, hosts only on the reserved `.test` domain, and no number that reads like a year
- [ ] The commit messages of this pull request follow Conventional Commits
