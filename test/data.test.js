import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTICE, POINTS, RULES, SOURCES, pointPage, source } from '../src/index.js';
import { configOf } from './helpers.js';

// The public pages the checks rest on: every page of src/data.js is listed in research/sources.md and in
// docs/rules-and-sources.md, every rule names points that exist, and no point is a long quote.

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');

test('data: every page has an id, a title and an https address with no number that reads like a year, and every point names a page', () => {
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length);
  for (const s of SOURCES) {
    assert.match(s.url, /^https:\/\/[a-z0-9.-]+\//, s.id);
    assert.doesNotMatch(s.url, /(?:19|20)\d{2}/, s.id);
    assert.ok(s.title.length > 10, s.id);
  }
  for (const [key, p] of Object.entries(POINTS)) {
    assert.ok(source(p.source), `${key}: ${p.source}`);
    assert.equal(pointPage(key).id, p.source);
    assert.ok(p.text.length < 300, `${key} is short`);
    assert.ok(!/"[^"]{20,}"/.test(p.text), `${key} is written in this project's own words, with no long quotation`);
  }
  for (const s of SOURCES) assert.ok(Object.values(POINTS).some((p) => p.source === s.id), `${s.id} is used by a point`);
  for (const host of ['www.w3.org', 'html.spec.whatwg.org', 'developer.mozilla.org', 'www.rfc-editor.org', 'community.owasp.org', 'docs.github.com']) assert.ok(SOURCES.some((s) => s.url.startsWith(`https://${host}/`)), host);
  for (const page of ['labels-or-instructions', 'identify-input-purpose', 'error-identification', 'name-role-value', 'info-and-relationships', 'focus-order', 'on-input', 'accessible-authentication-minimum', '#autofill', '#the-label-element', 'tutorials/forms/labels', 'tutorials/forms/grouping', 'tutorials/forms/instructions', 'tutorials/forms/validation', 'tutorials/forms/notifications', 'Attributes/autocomplete', 'Global_attributes/inputmode', 'Elements/input', 'Global_attributes/tabindex', 'Turning_off_form_autocompletion', 'aria-errormessage', 'Elements/datalist', 'Global_attributes/id', 'rfc4180', 'rfc8259', 'CSV_Injection', 'workflow-commands']) assert.ok(SOURCES.some((s) => s.url.includes(page)), page);
});

test('data: the points name what the checks lean on, and none gives a date', () => {
  assert.match(POINTS.nameProgrammatic.text, /F68/);
  assert.match(POINTS.purposeProgrammatic.text, /F107/);
  assert.match(POINTS.focusOrderMeaning.text, /F44/);
  assert.match(POINTS.autofillGrammar.text, /section- token/);
  assert.match(POINTS.labelFor.text, /first element in tree order/);
  assert.match(POINTS.placeholderNotLabel.text, /not a replacement for a label/);
  assert.match(POINTS.patternTypes.text, /text, search, url, tel, email and password/);
  assert.match(POINTS.loginOffIgnored.text, /ignore autocomplete off/);
  const months = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/;
  for (const p of Object.values(POINTS)) assert.doesNotMatch(p.text, months);
});

test('data: every rule names points that exist, the ids and keys are unique, and every rule says what to change', () => {
  for (const r of RULES) {
    assert.ok(r.basis.length > 0, r.id);
    for (const k of r.basis) assert.ok(POINTS[k], `${r.id}: ${k}`);
    assert.match(r.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(typeof r.rule(configOf()), 'string');
    assert.equal(typeof r.rule(configOf({ optionLimit: 2 })), 'string');
    assert.ok(r.own.length > 20, r.id);
    assert.ok(r.fix.length > 10, r.id);
    assert.ok(r.title.length > 5, r.id);
  }
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  assert.equal(new Set(RULES.filter((r) => r.key).map((r) => r.key)).size, RULES.filter((r) => r.key).length);
  const used = new Set(RULES.flatMap((r) => r.basis));
  for (const k of Object.keys(POINTS).filter((x) => !used.has(x))) assert.ok(['csvRecords', 'csvInjection', 'githubAnnotations'].includes(k), `${k} is used by no rule`);
  assert.ok(NOTICE.startsWith('This check reads the HTML files on disk as text and runs no browser'));
  assert.ok(NOTICE.includes('not an accessibility audit and not a conformance claim'));
  assert.ok(NOTICE.includes('docs/limits.md'));
});

test('research/sources.md: lists every page with its address, in its own words', async () => {
  const note = await read('research/sources.md');
  for (const s of SOURCES) assert.ok(note.includes(s.url), s.url);
  assert.ok(note.includes('Each page was fetched and read before it was listed.'));
  const quotes = note.match(/"[^"]{60,}"/g) ?? [];
  assert.deepEqual(quotes, [], 'no long quotation');
  assert.ok(!note.includes('\r'));
});

test('docs/rules-and-sources.md: every rule with its points, its choice and its fix, and every page', async () => {
  const doc = await read('docs/rules-and-sources.md');
  for (const r of RULES) {
    assert.ok(doc.includes(`### \`${r.id}\``), r.id);
    for (const k of r.basis) assert.ok(doc.includes(POINTS[k].text.slice(1)), `${r.id}: ${k}`);
    assert.ok(doc.includes(r.fix.slice(1)), `${r.id}: fix`);
    assert.ok(doc.includes(r.own.slice(1)), `${r.id}: own`);
  }
  for (const s of SOURCES) assert.ok(doc.includes(s.url), s.url);
  for (const [key, p] of Object.entries(POINTS)) assert.ok(doc.includes(`| \`${key}\` | ${pointPage(key).title} | ${p.text} |`), key);
});
