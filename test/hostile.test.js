import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LIMITS, MAX_PROBLEMS, checkText, defaultConfig, globMatch, parseHtml, readAutocomplete, wordsOf } from '../src/index.js';
import { P, SITE, cli, form, page, run, siteWith, withFiles } from './helpers.js';

// Hostile input: pages built to exhaust the memory, the stack or the time, to make the tool follow a link out of the
// folder, to rewrite the terminal, to start a second workflow command, to slip a formula into a spreadsheet or to
// change how objects behave. Each heavy test also checks the time, because work that grows faster than the input is a
// failure even when the answer is right. Tests that need a symbolic link, a device or file permissions are guarded
// with process.platform, and none of them asserts a line: lines are asserted in the tests that run everywhere.

const LIMIT = { timeout: 180000 };
// Coverage counting slows every line of the tool several times over, so a run with --experimental-test-coverage gets a
// wider time limit. A plain `npm test` keeps the tight one, and that is the run that guards against slow growth.
// The runner sets NODE_V8_COVERAGE for its test processes only when coverage is on.
const COVERAGE = Boolean(process.env.NODE_V8_COVERAGE);
const fast = async (fn, ms = 5000) => {
  const limit = COVERAGE ? ms * 4 : ms;
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < limit, `took ${Date.now() - start} ms`);
  return result;
};
const refused = (fn) => {
  try {
    fn();
  } catch {
    // refused input is fine; the time is what is checked
  }
};

test('hostile: thousands of fields, labels, ids, groups, forms and options are checked in one pass', LIMIT, async () => {
  const fields = Array.from({ length: 3000 }, (_, i) => `<input name="f${i}" id="d${i % 10}" aria-describedby="m${i}"><label for="d${i % 10}">L</label><input type="radio" name="r${i % 50}">`).join('\n');
  const forms = Array.from({ length: 1500 }, (_, i) => `<form id="x${i}"><input name="a${i}"></form>`).join('');
  const options = `<select name="s">${'<option>o'.repeat(20000)}</select>`;
  const r = await fast(() => checkText(page(`<form>${fields}${options}</form>${forms}`), defaultConfig()), 30000);
  assert.ok(r.findings.filter((f) => f.rule === 'broken-reference').length >= 3000);
  assert.equal(r.findings.filter((f) => f.rule === 'many-options').length, 1);
  assert.equal(r.stats.forms, 1501);
  const capped = JSON.parse((await run(siteWith({ [P]: page(fields) }), ['s', '--json'])).out);
  assert.equal(capped.findings.filter((f) => f.rule === 'broken-reference').length, LIMITS.maxFindingsPerRule);
  assert.ok(capped.totals.notListed > 1500);
});

test('hostile: long runs of brackets, quotes, references, comments, attributes and names are read or stopped in one pass', LIMIT, async () => {
  for (const text of ['<'.repeat(300000), `<a ${'b="1" '.repeat(200)}>`, `<a b="${'&amp;'.repeat(60000)}">`, `<p>${'&lt;'.repeat(60000)}</p>`, `<p>${'<!---->'.repeat(100000)}</p>`, `<p>${'<?x?>'.repeat(100000)}</p>`, `<r>${'<br>'.repeat(150000)}</r>`, '<p>'.repeat(100000), '<div>'.repeat(100000), `<a ${'x'.repeat(300000)}`, `<p>${'&'.repeat(200000)}</p>`, `<script>${'</'.repeat(150000)}`, `<a b='${"'".repeat(1)}${'x'.repeat(300000)}`, '</a>'.repeat(100000), `<select>${'<option>'.repeat(100000)}`, `<form>${'<form>'.repeat(100000)}`, '<label>'.repeat(400) + '<input>'.repeat(10000), `<p>${'<b>'.repeat(500)}${'</p>'.repeat(50000)}`]) {
    await fast(() => refused(() => checkText(text, defaultConfig())));
  }
  assert.throws(() => parseHtml(`<r>${'<br>'.repeat(10)}</r>`, { maxHtmlElements: 5 }), /more than 5 elements/);
  assert.match(checkText('<div>'.repeat(600), defaultConfig()).findings[0].found, /elements nested more than 512 deep/);
});

test('hostile: autocomplete values, names and patterns of any length are read in time bounded by their length', LIMIT, async () => {
  await fast(() => {
    for (let i = 0; i < 200; i += 1) {
      readAutocomplete(`${'section-x '.repeat(5000)}email`);
      wordsOf('aB'.repeat(100000));
    }
  });
  const path = `${'a/'.repeat(500)}b`;
  await fast(() => {
    for (let i = 0; i < 200; i += 1) globMatch(`${'*'.repeat(100)}**${'?*'.repeat(50)}c`, path);
  });
  assert.equal(globMatch('**/b', path), true);
  const html = form([`<label>A <input name="a" pattern="${'[0-9]'.repeat(1000)}" autocomplete="${'x '.repeat(10000)}"></label>`]);
  await fast(() => checkText(html, defaultConfig()));
});

test('hostile: thousands of folders and files are listed in seconds, and the limits of a folder hold', LIMIT, async () => {
  const files = { ...SITE };
  for (let i = 0; i < 300; i += 1) files[`s/m${i}/page${i}.html`] = form([`<label>A <input name="a${i}"></label>`]);
  const r = await fast(() => run(files, ['s', '--json']), 60000);
  assert.equal(JSON.parse(r.out).input.htmlFiles, 302);
  const capped = JSON.parse((await run(files, ['s', '--json'], { maxInputFiles: 10 })).out);
  assert.match(capped.findings.find((f) => f.rule === 'scan-limit').found, /the folder holds more than 10 HTML files/);
  assert.equal(capped.result.pass, false);
  const entries = JSON.parse((await run(files, ['s', '--json'], { maxProjectEntries: 5 })).out);
  assert.match(entries.findings.find((f) => f.rule === 'scan-limit').found, /more than 5 files and folders/);
  const deep = { ...SITE, [`s/${'d/'.repeat(40)}a.html`]: 'x' };
  const depth = JSON.parse((await run(deep, ['s', '--json'])).out);
  assert.match(depth.findings.find((f) => f.rule === 'scan-limit').found, /folders nested more than 32 deep/);
});

test('hostile: a file over its size limit is an unreadable-file error, and a configuration over its limit stops the run', LIMIT, async () => {
  const big = await run(siteWith({ [P]: `<!-- ${'x'.repeat(LIMITS.maxFileBytes)} -->` }), ['s', '--json']);
  assert.match(JSON.parse(big.out).findings.find((f) => f.rule === 'unreadable-file').found, /bytes is over the 4 MB limit/);
  const config = await run({ ...SITE, 'c.json': ' '.repeat(LIMITS.maxConfigBytes + 1) }, ['s', '--config', 'c.json']);
  assert.equal(config.code, 2);
  assert.match(config.err, /c\.json: [\d,]+ bytes is over the 1 MB limit/);
  const many = await run({ ...SITE, 'c.json': JSON.stringify(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, 1]))) }, ['s', '--config', 'c.json']);
  assert.match(many.err, /\n {2}and 10 more\n$/);
  assert.equal(many.err.split('\n').filter((l) => l.startsWith('  c.json')).length, MAX_PROBLEMS);
});

test('hostile: long names, values and texts are capped in the messages', LIMIT, async () => {
  const long = 'x'.repeat(3000);
  const out = JSON.parse((await fast(() => run(siteWith({ [P]: form([`<input name="${long}" placeholder="${long}" autocomplete="${long}">`]) }), ['s', '--json']))).out);
  assert.ok(out.findings.length >= 2);
  assert.ok(out.findings.every((f) => f.found.length <= 800));
});

test('hostile: control, escape, direction and line separator characters in values are removed from every format', async () => {
  const evil = 'a&#x1b;[31m&#x202e;&#x2028;b';
  const files = siteWith({ [P]: form([`<input name="${evil}" placeholder="${evil}">`]) });
  for (const format of ['text', 'json', 'csv', 'github']) {
    const r = await run(files, ['s', '--format', format, '--fail-on', 'warning']);
    assert.equal(r.code, 1, format);
    for (const c of ['\u001b', '\u202e', '\u2028']) assert.ok(!r.out.includes(c) && !JSON.stringify(JSON.parse(format === 'json' ? r.out : '{}')).includes(c), `${format}: ${JSON.stringify(c)}`);
  }
});

test('hostile: a value cannot end a workflow command or start another one, and a formula is neutralized in CSV', async () => {
  const files = siteWith({ [P]: form(['<input name="%0A::error file=x::y&#10;::warning::z">']) });
  const github = await run(files, ['s', '--format', 'github']);
  const lines = github.out.trimEnd().split('\n');
  assert.ok(lines.slice(0, -1).every((l) => /^::(?:error|warning|notice) file=/.test(l)), github.out);
  assert.ok(github.out.includes('%250A::error file=x::y ::warning::z'));
  const csv = await run(siteWith({ [P]: form(['<input name="=HYPERLINK(1)">']) }), ['s', '--format', 'csv']);
  assert.ok(csv.out.split('\r\n').slice(1, -1).every((l) => !/,[=+@-]/.test(l.replace(/,"[^"]*"/g, ','))), csv.out);
});

test('hostile: __proto__, constructor and toString as ids, names, keys and attribute names change nothing', async () => {
  const html = form(['<label for="__proto__">A</label><input id="__proto__" name="constructor" __proto__="x" aria-describedby="toString hasOwnProperty">', '<label>B <input type="radio" name="__proto__"></label><label>C <input type="radio" name="__proto__"></label>']);
  const out = JSON.parse((await run({ ...siteWith({ [P]: html }), 'c.json': '{"rules": {"__proto__": "off"}}' }, ['s', '--json'])).out);
  assert.deepEqual(out.findings.map((f) => f.rule).sort(), ['broken-reference', 'group-without-name']);
  assert.match(out.findings.find((f) => f.rule === 'broken-reference').found, /the ids "toString", "hasOwnProperty"/);
  const bad = await run({ ...SITE, 'c.json': '{"rules": {"__proto__": "off"}}' }, ['s', '--config', 'c.json']);
  assert.match(bad.err, /"__proto__" is not a key of rules/);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.toString.call([]), '[object Array]');
});

test('hostile: CRLF, CR and a byte order mark give the same report as LF', async () => {
  const files = siteWith({ [P]: form(['<input name="email">', '<label>B *<input name="b" tabindex="4"></label>']) });
  const lf = JSON.parse((await run(files, ['s', '--json'])).out);
  for (const [name, change] of [['CRLF', (t) => t.split('\n').join('\r\n')], ['CR', (t) => t.split('\n').join('\r')], ['BOM', (t) => `\ufeff${t}`]]) {
    const other = JSON.parse((await run(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, change(v)])), ['s', '--json'])).out);
    assert.deepEqual(other.findings.map((f) => [f.rule, f.line, f.column]), lf.findings.map((f) => [f.rule, f.line, f.column]), name);
  }
});

test('hostile: the tool writes nothing: a run leaves the folder as it was', async () => {
  await withFiles(SITE, async (dir) => {
    const { readdir } = await import('node:fs/promises');
    const before = (await readdir(dir, { recursive: true })).sort();
    await cli(['s', '--format', 'csv'], dir);
    await cli(['s', '--json'], dir);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
  });
});

test('hostile: a symbolic link in the folder is counted and not followed, and a link named is refused', async (t) => {
  if (process.platform === 'win32') {
    t.skip('symbolic links need extra rights on Windows');
    return;
  }
  await withFiles(SITE, async (dir) => {
    await mkdir(resolve(dir, 'outside'));
    await writeFile(resolve(dir, 'outside/x.html'), '<form><input name="a"></form>\n');
    await symlink(resolve(dir, 'outside'), resolve(dir, 's/loop'));
    await symlink(resolve(dir, 'outside/x.html'), resolve(dir, 's/x.html'));
    await symlink(resolve(dir, 's'), resolve(dir, 's-link'));
    const out = JSON.parse((await cli(['s', '--json'], dir)).out);
    assert.equal(out.input.links, 2);
    assert.deepEqual(out.findings, []);
    assert.match(out.notes.join('\n'), /2 symbolic links are not followed/);
    const named = await cli(['s-link'], dir);
    assert.equal(named.code, 2);
    assert.match(named.err, /is a symbolic link, which is not followed/);
    await symlink(resolve(dir, 'outside/x.html'), resolve(dir, 'c.json'));
    assert.equal((await cli(['s', '--config', 'c.json'], dir)).code, 2);
  });
});

test('hostile: a device named as a folder is refused, and a file with no read access is an unreadable-file error', async (t) => {
  if (process.platform === 'win32') {
    t.skip('devices and file modes work differently on Windows');
    return;
  }
  const device = await cli(['/dev/null'], process.cwd());
  assert.equal(device.code, 2);
  assert.match(device.err, /is not a regular file or folder/);
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('the root user reads every file whatever its mode');
    return;
  }
  await withFiles(SITE, async (dir) => {
    await chmod(resolve(dir, P), 0o000);
    const r = await cli(['s', '--json'], dir);
    assert.match(JSON.parse(r.out).findings.find((f) => f.rule === 'unreadable-file').found, /cannot be read \(EACCES\)/);
    await chmod(resolve(dir, P), 0o644);
  });
});
