# 3. Check the files on disk, and fetch nothing

## Status

Accepted

## Context

Some facts about a form live elsewhere: the page as a server renders it, the script a page loads from another address,
the style sheet that hides a label, the current version of a guideline. A check could fetch the live site, crawl its
links or download the scripts. Each would need the network and often credentials, would make the result depend on the
state of a server, would run code from elsewhere, and would let a file in a pull request make the pipeline reach an
address it names.

What a team needs first, to review its forms, is a list of what to look at and where: the fields, the labels, the
tokens, the ids, the buttons, as the repository holds them.

## Decision

1. The tool reads the files of the folder and the configuration, and nothing else. It fetches nothing, crawls nothing,
   runs no program and calls no service.
2. The autofill token list, the list of input types and the list of inputmode values are copied into the code from the
   HTML Standard and MDN, and the public pages each rule rests on are named in src/data.js and research/sources.md, each
   fetched and read before it was listed; the tool never looks them up while it runs.
3. The tool lists what to look at and what to change; it changes nothing.

## Consequences

- The result depends only on the files, and a run needs no network access, no secret and no browser.
- A page that only exists on a server is not checked; point the tool at the built output of the site.
- When the HTML Standard adds an autofill token, the list in src/autofill.js is updated in a release, with a test.
