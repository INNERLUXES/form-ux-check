// Shared test helpers: HTML pages built inline, read in memory or written into a temporary folder that is removed after
// the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux, macOS and Windows.
// The line a test expects is found with lineOf(), which counts lines the way the tool does, so a test never holds a
// line number worked out by hand for one system only. No test reads the clock, the time zone or the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkText, defaultConfig, lineStarts, main, positionOf, readConfig } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'form-ux-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function offsetOf(text, needle, n) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return at;
}

// The line (from 1) of the n-th place where needle starts in text.
export const lineOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).line;

// The column (from 1) of the n-th place where needle starts in text.
export const columnOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).column;

// The configuration of a configuration object, through the real reader, or the defaults.
export const configOf = (object = null) => (object === null ? defaultConfig() : readConfig(JSON.stringify(object), 'config.json'));

// An HTML page with this body.
export function page(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Test page</title>
</head>
<body>
${body}
</body>
</html>
`;
}

// A form with these lines inside and a submit button.
export const form = (lines, attrs = '') => page(`<form action="/send"${attrs ? ` ${attrs}` : ''}>\n${lines.join('\n')}\n<button type="submit">Send</button>\n</form>`);

// The findings of one page, through the reader and the checks: [{ rule, line, column, found }].
export const findingsIn = (html, config = defaultConfig()) => checkText(html, config).findings;

// The rule ids of the findings of one page.
export const rulesIn = (html, config) => findingsIn(html, config).map((f) => f.rule);

// The findings of one rule on one page.
export const ofRule = (html, rule, config) => findingsIn(html, config).filter((f) => f.rule === rule);

export const P = 's/index.html';
export const Q = 's/contact/form.htm';

// A site with nothing to report: a labelled search form and a contact form that follows every rule.
export const SITE = {
  [P]: page('<form action="/search" role="search">\n  <label for="q">Search</label>\n  <input type="search" id="q" name="q">\n  <button>Search</button>\n</form>'),
  [Q]: form(['<label for="mail">Email (required)</label>', '<input type="email" id="mail" name="email" autocomplete="email" required>'])
};

// The site with some files changed or added; null takes a file out.
export function siteWith(changes = {}) {
  const out = { ...SITE };
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

// Writes the files and runs the command line with these arguments (paths relative to the folder).
export async function run(files, args = ['s'], limits) {
  return withFiles(files, async (dir) => {
    let out = '';
    let err = '';
    const code = await main(args, { out: (t) => { out += t; }, err: (t) => { err += t; } }, limits, dir);
    return { code, out, err, dir };
  });
}

// The JSON report of a folder of files, with more arguments.
export async function reportOf(files, args = ['s'], limits) {
  const r = await run(files, [...args, '--json'], limits);
  if (r.code === 2) throw new Error(r.err);
  return { ...JSON.parse(r.out), code: r.code };
}

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, dir) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, dir);
  return { code, out, err };
}
