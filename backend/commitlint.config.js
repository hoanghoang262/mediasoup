/** @type {import('@commitlint/types').UserConfig} */
const commitLintConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2, // Error level (0: disabled, 1: warning, 2: error)
      'always', // Rule is always applied
      [
        'feat', // New feature for the user, not a new feature for build script
        'fix', // Bug fix for the user, not a fix to a build script
        'docs', // Documentation only changes
        'style', // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'test', // Adding missing tests or correcting existing tests
        'chore', // Other changes that don't modify src or test files
        'perf', // A code change that improves performance
        'ci', // Changes to our CI configuration files and scripts
        'revert', // Reverts a previous commit
        'build', // Changes that affect the build system or external dependencies
        'merge', // Merge branch
        'rebase', // Rebase branch
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'app', // App directory structure
        'ui', // UI components
        'api', // API router and data fetching
        'state', // State management
        'styles', // CSS and styling
        'config', // Configuration files
        'assets', // Static assets
        'test', // Test files
        'deps', // Dependencies
        'docs', // Documentation
      ],
    ],
    'type-case': [2, 'always', 'lower-case'], // Type must be lowercase
    'type-empty': [2, 'never'], // Type cannot be empty
    'scope-case': [2, 'always', 'lower-case'], // Scope must be lowercase
    'scope-empty': [2, 'never'], // Scope cannot be empty
    'subject-case': [2, 'always', 'lower-case'], // Subject must be lowercase
    'subject-empty': [2, 'never'], // Subject cannot be empty
    'subject-full-stop': [2, 'never', '.'], // Subject cannot end with period
    'header-max-length': [2, 'always', 150], // Header (first line) cannot be longer than 72 characters
  },
};

export default commitLintConfig;
