import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_COLUMNS, NOTICE, USAGE, VERSION, buildReport, csvField, defaultConfig, escapeData, escapeProperty, parseArgs, summaryLines, toCsv, toGithub, toJson, toText } from '../src/index.js';
import { P, Q, SITE, cli, form, lineOf, page, run, siteWith } from './helpers.js';

const WARN = siteWith({ [P]: form(['<label>A <input name="a" tabindex="2"></label>']) });
const ERROR_PAGE = form(['<input name="a">']);
const ERROR = siteWith({ [P]: ERROR_PAGE });
const INFO = siteWith({ [P]: form(['<label>A <input name="a" required></label>']) });

test('cli: exit 0 below the fail-on level, 1 at or above it, from the flag or the configuration', async () => {
  const clean = await run(SITE);
  assert.equal(clean.code, 0, clean.err);
  assert.match(clean.out, /^form-ux-check: s\ninput: 2 HTML files; 0 other files passed over; 0 folders named \.git or node_modules passed over; 0 paths excluded; 0 links not followed\nconfig: built-in defaults: include \*\*\/\*\.html and \*\*\/\*\.htm; exclude none; option limit 40; minimum severity info; fail on error\n/);
  assert.match(clean.out, /\nfindings: 0\n/);
  assert.match(clean.out, /RESULT: PASS - no finding at or above error\n$/);
  assert.equal(clean.err, '');
  assert.equal((await run(WARN)).code, 0, 'a warning does not fail the run by default');
  assert.equal((await run(WARN, ['s', '--fail-on', 'warning'])).code, 1);
  assert.equal((await run(INFO, ['s', '--fail-on', 'warning'])).code, 0);
  assert.equal((await run(INFO, ['s', '--fail-on', 'info'])).code, 1);
  const configured = await run({ ...WARN, 'c.json': '{"failOn": "warning"}' }, ['s', '--config', 'c.json']);
  assert.equal(configured.code, 1);
  assert.match(configured.out, /RESULT: FAIL - 1 finding at or above warning \(1 warning\)\n$/);
  assert.equal((await run({ ...WARN, 'c.json': '{"failOn": "warning"}' }, ['s', '--config', 'c.json', '--fail-on', 'error'])).code, 0, 'the flag wins over the configuration');
  const error = await run(ERROR);
  assert.equal(error.code, 1);
  assert.match(error.out, /RESULT: FAIL - 1 finding at or above error \(1 error\)\n$/);
  assert.match(error.out, new RegExp(`\\n {2}ERROR {4}missing-label {14}s/index\\.html:${lineOf(ERROR_PAGE, '<input name="a">')}\\n`));
});

test('cli: a file that cannot be read is an unreadable-file error, a file past a limit a scan-limit error, and the run goes on', async () => {
  const r = await run(siteWith({ 's/bin.html': Buffer.from([0x3c, 0, 0x3e]), 's/latin.htm': Buffer.from([0x61, 0xe9]) }), ['s', '--json']);
  assert.equal(r.code, 1);
  const out = JSON.parse(r.out);
  const f = out.findings.filter((x) => x.rule === 'unreadable-file');
  assert.deepEqual(f.map((x) => [x.file, x.line, x.column]), [['s/bin.html', 1, 1], ['s/latin.htm', 1, 1]]);
  assert.match(f[0].found, /the file cannot be read: holds binary data/);
  assert.deepEqual(out.files.find((x) => x.file === 's/bin.html'), { file: 's/bin.html', forms: 0, fields: 0, buttons: 0, byLevel: { error: 1, warning: 0, info: 0 } });
  const big = await run(siteWith({ 's/big.html': `<p>${'x'.repeat(200)}</p>` }), ['s', '--json'], { maxFileBytes: 100 });
  assert.match(JSON.parse(big.out).findings[0].found, /the file cannot be read: .*bytes is over the 100 byte limit/);
  const deep = await run({ 's/deep.html': '<div><div><div><div>' }, ['s', '--json'], { maxHtmlDepth: 3 });
  assert.deepEqual(JSON.parse(deep.out).findings.map((x) => [x.rule, x.line, x.column]), [['scan-limit', 1, 16]]);
});

test('cli: files saved as UTF-16 with their byte order mark, with a UTF-8 mark, or with CRLF or CR line ends, give the same findings', async () => {
  const html = form(['<input type="text" name="email" placeholder="Email" tabindex="3">', '<label for="x">X *</label><input id="x" autocomplete="phone">']);
  const base = JSON.parse((await run(siteWith({ [P]: html }), ['s', '--json'])).out);
  assert.ok(base.findings.length >= 6);
  for (const change of [(t) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(t, 'utf16le')]), (t) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(t)]), (t) => t.split('\n').join('\r\n'), (t) => t.split('\n').join('\r')]) {
    const r = JSON.parse((await run(siteWith({ [P]: change(html) }), ['s', '--json'])).out);
    assert.deepEqual(r.findings, base.findings);
  }
});

test('cli: --min-severity hides the findings below it and says so', async () => {
  const r = await run(INFO, ['s', '--min-severity', 'warning']);
  assert.equal(r.code, 0);
  assert.match(r.out, /findings: 0; 1 below warning not shown/);
  assert.match(r.out, /note: 1 finding below warning is not shown/);
});

test('cli: the folder and --exclude must be usable, or the run stops with no result', async () => {
  const file = await run(SITE, [P]);
  assert.equal(file.code, 2);
  assert.match(file.err, /s\/index\.html: is a file; give the folder of the site/);
  assert.match((await run(SITE, ['nowhere'])).err, /nowhere: no such file or folder/);
  assert.match((await run(SITE, ['s', '--exclude', '../x'])).err, /--exclude "\.\.\/x" leaves the folder with \.\./);
  const excluded = JSON.parse((await run(ERROR, ['s', '--exclude', 'index.html', '--json'])).out);
  assert.deepEqual(excluded.findings, []);
  assert.equal(excluded.input.excluded, 1);
  assert.match(excluded.notes.join('\n'), /1 path matching index\.html is left out/);
  const empty = await run({ 's/readme.txt': 'x' }, ['s']);
  assert.match(empty.out, /note: the folder holds no file that the include patterns name/);
  const none = await run({ 's/a.html': page('<p>No form here.</p>') }, ['s']);
  assert.match(none.out, /note: the files hold no form and no form field/);
  const nested = await run({ 's/a.html': page('<form><form><label>A <input name="a"></label><button>Go</button></form></form><form><form></form></form>') }, ['s']);
  assert.match(nested.out, /note: 2 forms inside another form are left out, as a browser leaves them out/);
  const one = await run({ 's/a.html': page('<form><form></form></form>'), 's/.git/x.html': 'x', 's/node_modules/y.html': 'y' }, ['s']);
  assert.match(one.out, /note: 1 form inside another form is left out, as a browser leaves it out/);
  assert.match(one.out, /note: 2 folders named \.git or node_modules are passed over/);
});

test('cli: usage errors give exit code 2 and the usage', async () => {
  for (const argv of [[], ['--format', 'xml', 's'], ['--min-severity', 'fatal', 's'], ['--fail-on'], ['s', '--bogus'], ['s', '--config', 'a', '--config', 'b'], ['s', '--explain', '--format', 'csv'], ['s', '--json', '--format', 'csv'], ['-'], ['s', '--config', '-'], ['https://example.test/site'], ['s', '--config', 'https://a.test/c.json'], ['s', 't'], ['s', '--exclude', '--json']]) {
    const r = await cli(argv, process.cwd());
    assert.equal(r.code, 2, argv.join(' '));
    assert.equal(r.out, '');
    assert.match(r.err, /^form-ux-check: .+\n\nUsage: form-ux-check/, argv.join(' '));
  }
  assert.match((await cli(['https://example.test/site'], process.cwd())).err, /never fetches a URL/);
  assert.match((await cli(['s', 't'], process.cwd())).err, /give one folder/);
  assert.throws(() => parseArgs(['s', ...Array.from({ length: 101 }, () => ['--exclude', 'x']).flat()]), /more than 100 exclude patterns/);
  assert.deepEqual(parseArgs(['s', '--exclude', 'a', '--exclude', 'b']).exclude, ['a', 'b']);
  assert.equal(parseArgs(['s', '--json', '--format', 'json']).format, 'json');
});

test('cli: --help, --version and --print-defaults', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const s of ['--exclude', '--config', '--format', '--json', '--min-severity', '--fail-on', '--explain', '--print-defaults', 'Exit codes: 0', 'missing-label (rules.missingLabel)', 'unreadable-file (always error)', 'runs no browser']) assert.ok(USAGE.includes(s), s);
  assert.equal((await cli(['-v'], process.cwd())).out, `${VERSION}\n`);
  assert.equal((await cli(['-h'], process.cwd())).code, 0);
  const d = await cli(['--print-defaults'], process.cwd());
  assert.equal(JSON.parse(d.out).name, 'built-in defaults');
  assert.equal(JSON.parse(d.out).optionLimit, 40);
});

test('report: the JSON report holds the input, the configuration, the files, the summary, the findings and the result', async () => {
  const out = JSON.parse((await run(ERROR, ['s', '--json'])).out);
  assert.deepEqual(Object.keys(out), ['tool', 'version', 'input', 'config', 'files', 'summary', 'rules', 'findings', 'totals', 'result', 'notes', 'notice']);
  assert.equal(out.tool, 'form-ux-check');
  assert.equal(out.notice, NOTICE);
  const f = out.findings[0];
  assert.deepEqual(Object.keys(f), ['rule', 'level', 'file', 'line', 'column', 'at', 'found', 'fix']);
  assert.equal(f.at, `${P}:${f.line}`);
  assert.equal(out.rules.length, 19);
  assert.deepEqual(Object.keys(out.files[0]), ['file', 'forms', 'fields', 'buttons', 'byLevel']);
  assert.deepEqual(Object.keys(out.summary), ['files', 'forms', 'fields', 'named', 'buttons', 'required', 'autocomplete', 'selects']);
  const explained = JSON.parse((await run(ERROR, ['s', '--json', '--explain'])).out);
  assert.ok(explained.findings[0].basis.length > 0);
  assert.ok(explained.findings[0].own.length > 0);
});

test('report: text with --explain, the empty tables, the cap of findings per rule, and every format of the same run', async () => {
  const many = form(Array.from({ length: 8 }, (_, i) => `<input name="f${i}">`));
  const r = await run(siteWith({ [P]: many, [Q]: null }), ['s', '--explain'], { maxFindingsPerRule: 5 });
  assert.match(r.out, /rule: a field with no label, aria-labelledby, aria-label, title or placeholder\n {11}basis: every user interface component has a name/);
  assert.match(r.out, /the tool's own choice: an input that is not hidden/);
  assert.match(r.out, /note: 3 findings past the limit of 5 per rule are counted but not listed/);
  assert.match(r.out, /Findings \(5\)/);
  const empty = buildReport({ input: { folder: 'x', htmlFiles: 0, otherFiles: 0, foldersPassedOver: 0, excluded: 0, links: 0, include: [], exclude: [] }, files: [], summary: { files: 0, forms: 0, fields: 0, named: 0, buttons: 0, required: 0, autocomplete: 0, selects: 0 }, raw: [], config: { ...defaultConfig(), file: 'c.json', name: 'Named', rules: { ...defaultConfig().rules, manyOptions: 'off', groupName: 'off' } }, minSeverity: 'info', failOn: 'error', version: '1' });
  const text = toText(empty);
  assert.match(text, /config: c\.json \(Named\): include none; exclude none/);
  assert.match(text, /Files \(0\)\n\n {2}none\n/);
  assert.match(text, /Findings \(0\)\n\n {2}none\n/);
  assert.match(text, /note: 2 rules are off: group-without-name, many-options/);
  assert.deepEqual(summaryLines(empty).length, 4);
  assert.equal(toCsv(empty), 'level,rule,file,line,column,found,fix\r\n');
  assert.match(toGithub(empty), /^form-ux-check: 0 HTML files, 0 forms, 0 fields, 0 findings; RESULT: PASS/);
  assert.equal(JSON.parse(toJson(empty)).findings.length, 0);
});

test('report: CSV fields are quoted and a leading formula character is neutralized; GitHub commands are escaped', async () => {
  assert.deepEqual(CSV_COLUMNS, ['level', 'rule', 'file', 'line', 'column', 'found', 'fix']);
  assert.equal(csvField('a,b'), '"a,b"');
  assert.equal(csvField('say "x"'), '"say ""x"""');
  assert.equal(csvField('=1+1'), "'=1+1");
  assert.equal(csvField('@x'), "'@x");
  assert.equal(csvField('-x'), "'-x");
  assert.equal(csvField('+x'), "'+x");
  assert.equal(csvField('\tx'), "'\tx");
  assert.equal(csvField('\nx'), '"\'\nx"');
  assert.equal(csvField(null), '');
  assert.equal(csvField(3), '3');
  assert.equal(escapeData('a%b\r\nc'), 'a%25b%0D%0Ac');
  assert.equal(escapeProperty('a:b,c'), 'a%3Ab%2Cc');
  const csv = (await run(ERROR, ['s', '--format', 'csv'])).out;
  assert.ok(csv.startsWith('level,rule,file,line,column,found,fix\r\nerror,missing-label,s/index.html,'));
  const gh = (await run(ERROR, ['s', '--format', 'github'])).out;
  assert.match(gh, /^::error file=s\/index\.html,line=\d+,col=1,title=form-ux-check missing-label::<input name="a"> has no programmatic label/);
  assert.match(gh, /\nform-ux-check: 2 HTML files, 2 forms, 2 fields, 1 finding; RESULT: FAIL/);
  const info = (await run(INFO, ['s', '--format', 'github'])).out;
  assert.match(info, /^::notice file=/);
});
