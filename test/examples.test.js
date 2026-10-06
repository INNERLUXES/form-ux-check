import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLEAN, EXPECTED, MESSY, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');
const M = 'examples/messy';
const HOME = `${M}/index.html`;
const SIGNUP = `${M}/account/signup.html`;
const LOGIN = `${M}/account/login.htm`;
const CHECKOUT = `${M}/booking/checkout.html`;

test('examples: the messy site fails with the report that is saved in examples/output', async () => {
  const r = await run(MESSY);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('messy.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the clean site passes with no finding and the report that is saved', async () => {
  const r = await run(CLEAN);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('clean.txt'));
  assert.match(r.out, /\nfindings: 0\n/);
  assert.equal((await run([...CLEAN, '--config', 'examples/config.json', '--fail-on', 'info'])).code, 0, 'the clean site also passes with the configuration of the messy one, at every level');
});

test('examples: --explain, JSON, CSV, the GitHub commands and the defaults are the reports that are saved', async () => {
  const outputs = { 'messy-explain.txt': [...MESSY, '--explain'], 'messy.json': [...MESSY, '--json', '--explain'], 'messy-findings.csv': [...MESSY, '--format', 'csv'], 'messy-github.txt': [...MESSY, '--format', 'github'], 'defaults.json': ['--print-defaults'] };
  for (const [name, args] of Object.entries(outputs)) assert.equal((await run(args)).out, await saved(name), name);
});

test('examples: every rule fires on the messy site, each on the line built for it', async () => {
  const report = JSON.parse((await run([...MESSY, '--json'])).out);
  const lines = {};
  for (const f of [HOME, SIGNUP, LOGIN, CHECKOUT]) lines[f] = (await readFile(resolve(root, f), 'utf8')).split('\n');
  const at = (file, needle) => `${file}:${lines[file].findIndex((l) => l.includes(needle)) + 1}`;
  const of = (rule) => report.findings.filter((f) => f.rule === rule).map((f) => f.at);
  assert.deepEqual(of('missing-label'), [at(SIGNUP, 'name="password2"'), at(HOME, 'name="q"')]);
  assert.deepEqual(of('placeholder-only-label'), [at(HOME, 'placeholder=')]);
  assert.deepEqual(of('button-without-name'), [at(HOME, '<svg')]);
  assert.deepEqual(of('autocomplete-invalid'), [at(SIGNUP, 'autocomplete="phone"')]);
  assert.deepEqual(of('duplicate-id'), [at(SIGNUP, 'name="password2"')]);
  assert.deepEqual(of('broken-reference'), [at(SIGNUP, 'email-hint'), at(CHECKOUT, 'card-number-error')]);
  assert.deepEqual(of('unlinked-error'), [at(SIGNUP, 'field-error')]);
  assert.deepEqual(of('group-without-name'), [at(SIGNUP, 'value="commute"')]);
  assert.deepEqual(of('form-without-submit'), [at(LOGIN, '<form')]);
  assert.deepEqual(of('positive-tabindex'), [at(SIGNUP, 'tabindex="3"'), at(SIGNUP, 'tabindex="1"')]);
  assert.deepEqual(of('many-options'), [at(CHECKOUT, '<select')]);
  assert.deepEqual(of('required-not-programmatic'), [at(SIGNUP, 'name="firstName"')]);
  assert.deepEqual(of('required-not-visible'), [at(SIGNUP, 'name="lastName"'), at(SIGNUP, 'name="terms"')]);
  assert.deepEqual(of('autocomplete-off-login'), [at(LOGIN, '<form'), at(LOGIN, 'name="email"'), at(SIGNUP, 'name="password" autocomplete="off"')]);
  assert.deepEqual(report.rules.filter((r) => r.findings === 0).map((r) => r.id), ['unreadable-file', 'scan-limit']);
  assert.deepEqual(report.files.map((f) => f.file), [LOGIN, SIGNUP, CHECKOUT, HOME]);
});

test('examples: without the configuration, the vendor widget is read too; node_modules never is', async () => {
  const report = JSON.parse((await run(['examples/messy', '--json'])).out);
  assert.ok(report.findings.some((f) => f.file === 'examples/messy/vendor/widget/old-form.html' && f.rule === 'missing-label'));
  assert.ok(!report.findings.some((f) => f.rule === 'many-options'), '36 options stay under the default limit of 40');
  assert.ok(!report.findings.some((f) => f.file.includes('node_modules')));
  assert.equal(report.input.foldersPassedOver, 1);
});

test('examples: the same files written with CRLF line ends and as UTF-16 give the same output', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'form-ux-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    for (const f of [HOME, SIGNUP, CHECKOUT]) {
      const text = await readFile(resolve(root, f), 'utf8');
      await writeFile(resolve(dir, f), text.split('\n').join('\r\n'));
    }
    const login = (await readFile(resolve(root, LOGIN), 'utf8')).split('\n').join('\r\n');
    await writeFile(resolve(dir, LOGIN), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(login, 'utf16le')]));
    assert.equal((await run([...MESSY, '--explain'], dir)).out, await saved('messy-explain.txt'));
    assert.equal((await run(CLEAN, dir)).out, await saved('clean.txt'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
