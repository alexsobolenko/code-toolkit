# Change Log

## [1.1.0] - 2026-08-09

- Fixed toggle quotes producing invalid syntax when converting strings containing backticks or `${...}` into template literals
- Fixed a memory leak where color highlight decorations were never released as colors changed in the document
- Fixed severe performance degradation of toggle multiline expression on large JavaScript/TypeScript files
- Comment and color highlights now only scan the visible editor area (plus a configurable padding) instead of the whole file, improving performance on large files
- Added a language filter for color highlights (`color-highlight.languages`)

## [1.0.0] - 2026-06-30

- Rewrote the extension's internal architecture for better maintainability (no intended functional changes)
- Added test coverage for all features

## [0.2.0] - 2026-05-26

- Added automated tests for extension features
- Added CI pipelines for GitHub, GitLab, and Codeberg

## [0.1.6] - 2026-05-26

- Added color highlights for HEX, RGB/RGBA, HSL/HSLA, and CSS color names

## [0.1.5] - 2026-05-24

- Highlight comments in code

## [0.1.4] - 2026-05-20

- Added increment and decrement number commands

## [0.1.3] - 2026-05-19

- Fixed fatal error

## [0.1.2] - 2026-05-19

- Added toggle multiline expression feature

## [0.1.1] - 2026-05-19

- Added toggle case feature

## [0.1.0] - 2026-05-18

- Added toggle quotes feature
- Added commitlint
- Initial release
