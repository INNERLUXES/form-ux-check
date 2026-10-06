import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_LIMITS, ConfigError, DEFAULT_EXCLUDE, DEFAULT_INCLUDE, DEFAULT_OPTION_LIMIT, DEFAULT_RULES, KEYS, RULES, defaultConfig, defaultsAsConfig, distance, isObject, kindOf, pathPatternProblem, readConfig, suggestion, validateConfig } from '../src/index.js';
import { P, SITE, configOf, form, run, siteWith } from './helpers.js';

// The configuration file: every key with a good value and a bad one, unknown keys with their line and a suggestion,
// and a key named twice refused.

const problems = (text) => {
  try {
    readConfig(text, 'c.json');
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    return error.problems;
  }
  return [];
};

test('config: the defaults, and --print-defaults read back give the same configuration', () => {
  const d = defaultConfig();
  assert.deepEqual(d.rules, DEFAULT_RULES);
  assert.deepEqual(d.include, DEFAULT_INCLUDE);
  assert.deepEqual(d.exclude, DEFAULT_EXCLUDE);
  assert.equal(d.optionLimit, DEFAULT_OPTION_LIMIT);
  assert.equal(d.minSeverity, 'info');
  assert.equal(d.failOn, 'error');
  const back = readConfig(JSON.stringify(defaultsAsConfig()), 'd.json');
  assert.deepEqual({ ...back, file: null, name: null }, d);
  assert.deepEqual(Object.keys(KEYS), ['name', 'include', 'exclude', 'rules', 'optionLimit', 'minSeverity', 'failOn']);
  d.include.push('x');
  assert.equal(defaultConfig().include.length, 2, 'the defaults are copied, never shared');
  assert.deepEqual(Object.keys(DEFAULT_RULES), RULES.filter((r) => r.key).map((r) => r.key), 'every rule of the configuration has a key, in the order of the rules');
  assert.deepEqual(Object.entries(DEFAULT_RULES).filter(([, v]) => v === 'error').map(([k]) => k), ['missingLabel', 'autocompleteInvalid', 'brokenReference', 'duplicateId', 'buttonName']);
});

test('config: every key with a good value is taken; the lists replace their defaults and keep a value once', () => {
  const c = configOf({ name: 'Review', include: ['**/*.html', 'pages/*.php', 'pages/*.php'], exclude: ['vendor/**'], rules: { manyOptions: 'off', positiveTabindex: 'error' }, optionLimit: 2, minSeverity: 'warning', failOn: 'warning' });
  assert.equal(c.name, 'Review');
  assert.deepEqual(c.include, ['**/*.html', 'pages/*.php']);
  assert.deepEqual(c.exclude, ['vendor/**']);
  assert.equal(c.rules.manyOptions, 'off');
  assert.equal(c.rules.positiveTabindex, 'error');
  assert.equal(c.optionLimit, 2);
  assert.equal(c.minSeverity, 'warning');
  assert.equal(c.failOn, 'warning');
});

test('config: an unknown key is an error with its line and a suggestion, at the top and in rules', () => {
  assert.deepEqual(problems('{\n  "failOm": "error"\n}'), ['c.json: line 2: "failOm" is not a key of the configuration; did you mean "failOn"?']);
  assert.deepEqual(problems('{\n  "rules": {\n    "missingLabels": "off"\n  }\n}'), ['c.json: line 3: "missingLabels" is not a key of rules; did you mean "missingLabel"?']);
  assert.deepEqual(problems('{"includes": []}'), ['c.json: line 1: "includes" is not a key of the configuration; did you mean "include"?']);
  assert.deepEqual(problems('{"colour": 1}'), ['c.json: line 1: "colour" is not a key of the configuration']);
});

test('config: a value of the wrong kind is an error, and all problems are listed in the order of their lines', () => {
  const p = problems('{\n  "name": "",\n  "rules": {"manyOptions": "loud", "buttonName": 3},\n  "include": ["/abs", 2],\n  "exclude": ["a\\\\b", "../up", ""],\n  "optionLimit": 1.5,\n  "minSeverity": "fatal",\n  "failOn": null\n}');
  assert.deepEqual(p, [
    'c.json: line 2: name must be a text of 1 to 120 characters',
    'c.json: line 3: rules.manyOptions must be one of info, warning, error, off, not "loud"',
    'c.json: line 3: rules.buttonName must be one of info, warning, error, off, not 3',
    'c.json: line 4: include[0]: "/abs" is absolute; write it relative to the folder',
    'c.json: line 4: include[1] must be a text, not a number',
    'c.json: line 5: exclude[0]: "a\\b" uses a backslash; write paths with forward slashes',
    'c.json: line 5: exclude[1]: "../up" leaves the folder with ..',
    'c.json: line 5: exclude[2]: "" must be 1 to 200 characters',
    'c.json: line 6: optionLimit must be a whole number from 2 to 10000, not 1.5',
    'c.json: line 7: minSeverity must be one of info, warning, error',
    'c.json: line 8: failOn must be one of info, warning, error'
  ]);
  assert.deepEqual(problems('{"rules": []}'), ['c.json: line 1: rules must be an object, not a list']);
  assert.deepEqual(problems('{"include": []}'), ['c.json: line 1: include must name at least one pattern, such as **/*.html']);
  assert.deepEqual(problems('{"exclude": "x"}'), ['c.json: line 1: exclude must be a list, not a string']);
  assert.deepEqual(problems('{"optionLimit": "40"}'), ['c.json: line 1: optionLimit must be a whole number from 2 to 10000, not "40"']);
  assert.deepEqual(problems('{"optionLimit": 10001}'), ['c.json: line 1: optionLimit must be a whole number from 2 to 10000, not 10001']);
  assert.deepEqual(problems(`{"exclude": ${JSON.stringify(Array(CONFIG_LIMITS.maxListEntries + 1).fill('a'))}}`), [`c.json: line 1: exclude holds more than ${CONFIG_LIMITS.maxListEntries} entries`]);
});

test('config: JSON that is not strict, a name given twice and a value that is not an object are refused', () => {
  assert.match(problems('{"failOn": "error",}')[0], /c\.json: line 1, column 20: a comma before the closing brace/);
  assert.match(problems('{"failOn": "error", "failOn": "info"}')[0], /appears twice in one object/);
  assert.match(problems('// comment\n{}')[0], /a comment; JSON has no comments/);
  assert.deepEqual(problems('[]'), ['c.json: line 1: the configuration must be a JSON object, not a list']);
  assert.throws(() => validateConfig('x'), ConfigError);
});

test('config: the suggestion and the checks of patterns', () => {
  assert.equal(distance('nmae', 'name'), 1);
  assert.equal(suggestion('x'.repeat(70), ['name']), '');
  assert.equal(suggestion('zzzzzz', ['name']), '');
  assert.equal(suggestion('nmae', ['name', 'x'.repeat(70)]), '; did you mean "name"?');
  assert.equal(kindOf(null), 'null');
  assert.equal(kindOf({}), 'an object');
  assert.equal(kindOf(true), 'a boolean');
  assert.ok(isObject({}) && !isObject([]));
  assert.equal(pathPatternProblem('**/drafts/**'), null);
  assert.match(pathPatternProblem('C:/x'), /absolute/);
  assert.match(pathPatternProblem('a\u0001'), /control character/);
  assert.match(pathPatternProblem('x'.repeat(201)), /must be 1 to 200 characters/);
});

test('config: through a run, a rule set to off gives no finding and a note, include picks the files, and a bad configuration stops the run', async () => {
  const files = siteWith({ [P]: form(['<input name="a">']), 'c.json': '{"rules": {"missingLabel": "off"}}' });
  const r = await run(files, ['s', '--config', 'c.json']);
  assert.equal(r.code, 0);
  assert.match(r.out, /findings: 0\n/);
  assert.match(r.out, /note: 1 rule is off: missing-label\n/);
  const only = await run({ ...files, 's/page.php': form(['<input name="b">']), 'c.json': '{"include": ["**/*.PHP"]}' }, ['s', '--config', 'c.json', '--json']);
  assert.deepEqual(JSON.parse(only.out).files.map((f) => f.file), ['s/page.php']);
  const bad = await run({ ...SITE, 'c.json': '{"failon": "info"}' }, ['s', '--config', 'c.json']);
  assert.equal(bad.code, 2);
  assert.equal(bad.out, '');
  assert.match(bad.err, /^form-ux-check: no result, the input has a problem:\n {2}c\.json: line 1: "failon" is not a key of the configuration; did you mean "failOn"\?\n$/);
  assert.match((await run(SITE, ['s', '--config', 'none.json'])).err, /none\.json: no such file or folder/);
  assert.equal((await run({ ...SITE, 'c.json': '{"rules": {"unreadableFile": "off"}}' }, ['s', '--config', 'c.json'])).code, 2, 'the rules of input problems have no key');
});
