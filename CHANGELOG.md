# Change Log

All notable changes to the "vscode-wago-cc100" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.1.6] - 2025-07-29

### Fixed

- CVE-2025-7783 Critical severity

## [0.1.5] - 2025-06-03

### Fixed
  
- CVE-2025-47279 undici Denial of Service attack via bad certificate data
- CVE-2025-48387 tar-fs can extract outside the specified dir with a specific tarball

## [0.1.4] - 2025-01-21

### Fixed

- CVE-2024-55565 issue with nanoid < 3.3.8
  Did `npm update --save sanitize-html`, since sanitize-html brought in the dependency

## [0.1.3] - 2024-12-11

### Fixed

- use `ssh2.utils.generateKeyPair()` instead of local ssh client (closes #10)
- Use external browser for help (closes #3)
- WAGO W Logo changed to a square 256x256 image (closes #8)

## [0.1.2] - 2024-11-29

### Added

- Added script for continuous integration and deployment to VS Code Marketplace
  (Tests still missing)

### Fixed

- Issue #3: Broken link. Changed from old documentation to current README

## [0.1.1] - 2024-11-08

### Fixed

- Issue #1: renamed `CC100 programming interface` to `WAGO CC100`
- Issue #2: links repaired

## [0.1.0] - 2024-11-08

- Initial release
