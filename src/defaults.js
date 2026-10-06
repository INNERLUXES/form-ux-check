// The built-in configuration: the level of every rule, the files that are read, the paths left out, the number of
// options past which a select list is noted, the lowest level shown and the level that fails the run. docs/inputs.md
// describes every key, and --print-defaults writes the configuration out.

// The level of every rule that the configuration can set. The two rules of input problems are always errors.
export const DEFAULT_RULES = {
  missingLabel: 'error',
  placeholderOnly: 'warning',
  inputType: 'warning',
  autocompleteInvalid: 'error',
  autocompleteMissing: 'warning',
  autocompleteOffLogin: 'warning',
  requiredNotProgrammatic: 'warning',
  requiredNotVisible: 'info',
  brokenReference: 'error',
  unlinkedError: 'warning',
  duplicateId: 'error',
  groupName: 'warning',
  buttonName: 'error',
  formSubmit: 'warning',
  positiveTabindex: 'warning',
  inputmodeMismatch: 'warning',
  manyOptions: 'info'
};

// The files that are read, as patterns relative to the folder, compared in lowercase.
export const DEFAULT_INCLUDE = ['**/*.html', '**/*.htm'];

// Paths of the folder that are not read. None by default; the folders .git and node_modules are never read.
export const DEFAULT_EXCLUDE = [];

// A select list with more options than this is noted by many-options.
export const DEFAULT_OPTION_LIMIT = 40;

// The lowest level of a finding that is shown.
export const DEFAULT_MIN_SEVERITY = 'info';

// The lowest level of a finding that fails the run.
export const DEFAULT_FAIL_ON = 'error';
