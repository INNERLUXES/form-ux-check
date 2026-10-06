// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// sites to examples/output. CI runs it and then fails if those files changed, so the example output in the repository
// is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const MESSY = ['examples/messy', '--config', 'examples/config.json'];
export const CLEAN = ['examples/clean'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the messy site: the counts, the summary, one finding of every rule, and the result.
export const EXPECTED = [
  'input: 4 HTML files; 2 other files passed over; 1 folder named .git or node_modules passed over; 1 path excluded',
  'config: examples/config.json (Kestrel Cycle Hire form review): include **/*.html and **/*.htm; exclude vendor/**; option limit 30',
  'findings: 32 (7 error, 22 warning, 3 info)',
  'files: 4 HTML, with 5 forms',
  'fields: 23, 20 with a label or another name, 2 required, 9 with an autocomplete field name; select lists: 1',
  '<input type="search" name="q"> has no programmatic label',
  'is named only by its placeholder "Your email address"',
  'is a plain text field, but name="email": use type="email"',
  '"phone" is not an autofill token; did you mean "tel"?',
  'use autocomplete="shipping street-address"',
  'autocomplete="off" on a password field',
  'its label "First name *" says it is required',
  '<input type="checkbox" name="terms"> is required, but its label',
  'aria-errormessage names the id "card-number-error"',
  '<span> reads like an error message ("Choose a longer password.")',
  'the id "password" is given to 2 elements',
  '2 radio buttons named "riding" are not in a fieldset',
  '<button> has no text, no image with alt text',
  '<form> holds 2 fields and no submit button',
  'tabindex="3" puts it ahead of the order of the page',
  'inputmode="digits" is not one of none, text, decimal, numeric, tel, search, email, url',
  'pattern="[0-9]{5}" asks for digits',
  'holds 36 options, more than 30',
  'note: 1 path matching vendor/** is left out',
  'not an accessibility audit and not a conformance claim',
  'RESULT: FAIL - 7 findings at or above error (7 error, 22 warning, 3 info)'
];
// What must not be reported: the excluded vendor widget, the demo page under node_modules, the forms in a comment and in
// a script, the hint and the error message that are linked, and the findings of input problems.
export const UNWANTED = ['vendor/widget', 'node_modules/', 'offer-code', 'promo', 'password-rules', 'ERROR    unreadable-file', 'ERROR    scan-limit', 'RESULT: PASS'];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const messy = await run(MESSY);
  process.stdout.write(messy.out);
  expect('messy site', messy, 1, EXPECTED, UNWANTED);

  const clean = await run(CLEAN);
  expect('clean site', clean, 0, ['input: 2 HTML files; 1 other file passed over', 'findings: 0', 'fields: 10, 10 with a label or another name, 2 required, 4 with an autocomplete field name', 'RESULT: PASS - no finding at or above error'], ['  ERROR  ', '  WARNING  ', 'RESULT: FAIL']);

  // Without the configuration, the vendor widget is read too, and 36 options stay under the default limit of 40.
  expect('messy, no configuration', await run(['examples/messy']), 1, ['examples/messy/vendor/widget/old-form.html', 'option limit 40'], ['many-options               examples/']);
  // Only the errors are shown with --min-severity error.
  expect('messy, errors only', await run([...MESSY, '--min-severity', 'error']), 1, ['findings: 7 (7 error); 25 below error not shown', 'RESULT: FAIL - 7 findings at or above error'], ['WARNING  ', 'INFO  ']);
  // The clean site still passes when warnings fail the run.
  expect('clean, fail on info', await run([...CLEAN, '--fail-on', 'info']), 0, ['RESULT: PASS - no finding at or above info'], []);
  // A path that is a file stops the run.
  const F = 'examples/messy/index.html';
  expect('a folder that is a file', await run([F]), 2, [`${F}: is a file; give the folder of the site`], [], 'err');

  // The README shows the whole report of the messy site, the --explain lines of one finding, the GitHub annotations
  // of two findings, the start of the CSV report and the report of the clean site.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  if (!readme.includes(messy.out)) problems.push('README: the sample output of the messy site differs from a real run');
  if (!readme.includes(clean.out)) problems.push('README: the sample output of the clean site differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/messy.txt'), messy.out);
  await writeFile(resolve(root, 'examples/output/clean.txt'), clean.out);
  const explain = await run([...MESSY, '--explain']);
  if (explain.code !== 1) problems.push(`explain: exit code ${explain.code}, expected 1`);
  const lines = explain.out.split('\n');
  const at = lines.findIndex((l) => l.includes('placeholder-only-label') && l.includes('examples/messy/index.html'));
  const sample = lines.slice(at, at + 7).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the --explain sample of the placeholder differs from a real run');
  await writeFile(resolve(root, 'examples/output/messy-explain.txt'), explain.out);
  const github = await run([...MESSY, '--format', 'github']);
  if (github.code !== 1) problems.push(`github: exit code ${github.code}, expected 1`);
  const picked = github.out.split('\n').filter((x) => x.includes('title=form-ux-check missing-label::') || x.includes('title=form-ux-check autocomplete-invalid::'));
  if (picked.length !== 3) problems.push(`github: the sample lines are not in the output (${picked.length})`);
  for (const l of picked.filter((x) => !x.includes('password2'))) if (!readme.includes(l)) problems.push('README: the GitHub sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/messy-github.txt'), github.out);
  const csv = await run([...MESSY, '--format', 'csv']);
  if (csv.code !== 1) problems.push(`csv: exit code ${csv.code}, expected 1`);
  const head = csv.out.split('\r\n').slice(0, 4).join('\n');
  if (!readme.includes(head)) problems.push('README: the CSV sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/messy-findings.csv'), csv.out);
  const json = await run([...MESSY, '--json', '--explain']);
  if (json.code !== 1) problems.push(`json: exit code ${json.code}, expected 1`);
  await writeFile(resolve(root, 'examples/output/messy.json'), json.out);
  const defaults = await run(['--print-defaults']);
  if (defaults.code !== 0) problems.push(`--print-defaults: exit code ${defaults.code}, expected 0`);
  await writeFile(resolve(root, 'examples/output/defaults.json'), defaults.out);

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
