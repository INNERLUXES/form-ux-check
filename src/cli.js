// Command line: form-ux-check <folder> [--exclude <pattern>]... [--config <file>] [options]

import { readFileSync } from 'node:fs';
import { InputError, LIMITS, checkFolder } from './check.js';
import { defaultsAsConfig } from './config.js';
import { toCsv } from './csv.js';
import { LEVELS } from './data.js';
import { toGithub, toJson, toText } from './report.js';
import { RULES } from './rules.js';
import { safeText } from './text.js';

export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const FORMATS = { text: toText, json: toJson, csv: toCsv, github: toGithub };

export const USAGE = `Usage: form-ux-check <folder> [--exclude <pattern>]... [--config <file>] [options]

Lists form usability and accessibility problems in the HTML files of a folder, with file, line and column, as an input
to a UX audit: fields with no label, placeholders used as labels, text fields that should be email, tel, url or number,
missing and invalid autocomplete tokens, required fields with no indication, references to missing ids, error messages
no field points at, ids given twice, radio and check box groups with no name, buttons with no name, forms with no
submit button, tabindex above 0, autocomplete off on login fields, inputmode and pattern that do not fit, and very
long select lists. It reads *.html and *.htm files as text with a reader of its own: it runs no browser, no script and
no style sheet, fetches nothing, reads no clock, follows no symbolic link and writes nothing to disk. The folders .git
and node_modules are passed over.

Options:
  --exclude <pattern>       a path of the folder to leave out, relative to it, such as vendor/** or **/drafts/**;
                            may be given more than once, and adds to exclude of the configuration
  --config <file>           settings in strict JSON: include, exclude, rules, optionLimit, minSeverity and failOn
                            (--print-defaults shows them)
  --format <name>           text, json, csv or github (default: text); csv writes one row per finding, github writes
                            workflow commands that GitHub shows as annotations
  --json                    the same as --format json
  --min-severity <level>    the lowest level of a finding that is shown: ${LEVELS.join(', ')} (default: minSeverity of
                            the configuration, else info)
  --fail-on <level>         the lowest level of a finding that fails the run: ${LEVELS.join(', ')} (default: failOn of
                            the configuration, else error)
  --explain                 show the rule, the public sources and the tool's own choice behind each finding
  --print-defaults          print the built-in configuration and exit
  --help                    show this text
  --version                 show the version

Rules: ${RULES.map((r) => `${r.id} (${r.key === null ? 'always error' : `rules.${r.key}`})`).join(', ')}.

Exit codes: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
`;

const isUrl = (f) => /^[a-z][a-z0-9+.-]*:\/\//i.test(f);

export function parseArgs(argv) {
  const o = { folder: null, exclude: [], config: null, format: null, json: false, minSeverity: null, failOn: null, explain: false, printDefaults: false, help: false, version: false };
  const once = (name, current, value) => {
    if (current !== null) throw new Error(`${name} was given twice`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && v.length > 2)) throw new Error(`${a} needs a value`);
      if (v === '-') throw new Error('reading from standard input is not supported; give a file or a folder');
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a === '--explain') o.explain = true;
    else if (a === '--json') o.json = true;
    else if (a === '--print-defaults') o.printDefaults = true;
    else if (a === '--exclude') {
      if (o.exclude.length >= LIMITS.maxExcludes) throw new Error(`more than ${LIMITS.maxExcludes} exclude patterns`);
      o.exclude.push(next());
    } else if (a === '--config') o.config = once(a, o.config, next());
    else if (a === '--format') o.format = once(a, o.format, next());
    else if (a === '--min-severity') o.minSeverity = once(a, o.minSeverity, next());
    else if (a === '--fail-on') o.failOn = once(a, o.failOn, next());
    else if (a === '-') throw new Error('reading from standard input is not supported; give a file or a folder');
    else if (a.startsWith('-')) throw new Error(`unknown argument ${a}`);
    else {
      if (o.folder !== null) throw new Error('give one folder; check two sites in two runs');
      o.folder = a;
    }
  }
  if (o.json) {
    if (o.format !== null && o.format !== 'json') throw new Error(`--json and --format ${o.format} ask for two formats; give one`);
    o.format = 'json';
  }
  if (o.format === null) o.format = 'text';
  if (!o.help && !o.version && !o.printDefaults) {
    if (o.folder === null) throw new Error('give the folder of the site to check, such as form-ux-check .');
    for (const p of [o.folder, o.config].filter((x) => x !== null)) if (isUrl(p)) throw new Error('give a local path; the tool never fetches a URL');
    if (!Object.hasOwn(FORMATS, o.format)) throw new Error(`unknown format ${o.format} (text, json, csv or github)`);
    for (const [flag, v] of [['--min-severity', o.minSeverity], ['--fail-on', o.failOn]]) if (v !== null && !LEVELS.includes(v)) throw new Error(`${flag}: unknown level ${v} (${LEVELS.join(', ')})`);
    if (o.explain && (o.format === 'github' || o.format === 'csv')) throw new Error(`--explain adds the sources of each finding to the text and JSON reports; the ${o.format} format has no place for them`);
  }
  return o;
}

const clean = (text) => safeText(text, 1500);

// Exit code: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, limits = undefined, base = process.cwd()) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (error) {
    io.err(`form-ux-check: ${clean(error.message)}\n\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  if (o.version) {
    io.out(`${VERSION}\n`);
    return 0;
  }
  if (o.printDefaults) {
    io.out(`${JSON.stringify(defaultsAsConfig(), null, 2)}\n`);
    return 0;
  }
  let report;
  try {
    report = await checkFolder({ folder: o.folder, config: o.config, exclude: o.exclude, minSeverity: o.minSeverity, failOn: o.failOn, version: VERSION, limits: { ...LIMITS, ...(limits ?? {}) }, base });
  } catch (error) {
    if (error instanceof InputError) io.err(`form-ux-check: no result, the input has ${error.problems.length === 1 ? 'a problem' : 'problems'}:\n${error.problems.map((p) => `  ${clean(p)}`).join('\n')}\n`);
    else io.err(`form-ux-check: ${clean(error.message)}\n`);
    return 2;
  }
  io.out(FORMATS[o.format](report, { explain: o.explain }));
  return report.result.pass ? 0 : 1;
}
