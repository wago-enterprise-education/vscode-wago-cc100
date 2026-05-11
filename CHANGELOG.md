# Change Log

All notable changes to the "vscode-wago-cc100" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Changed

- Add workflow to create release on PR merge to main

### Fixed

- uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided
- Fix missing ssh2 transitive dependencies (asn1, safer-buffer, bcrypt-pbkdf, tweetnacl) in `.vscodeignore`
- CVE-2026-6321 fast-uri vulnerable to path traversal via percent-encoded dot segments

## [0.2.5] - 2026-04-17

### Changed

- Force Node 24 for workflows
- Deployment setting in workflow files updated
- Update packages

### Fixed

- CVE-2026-40186 sanitize-html allowedTags Bypass via Entity-Decoded Text in nonTextTags Elements
- CVE-2026-4800 lodash vulnerable to Code Injection via `_.template` imports key names
- CVE-2026-2950 lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit`

## [0.2.4] - 2026-03-27

### Added

- Update npm packages
- Add Github action workflow which creates a release branch
- Add Github action workflow which takes the VSIX from a release and publishes it to the marketplace using the VSCE_PAT secret for authentication
- Add Github action workflow which can be manually triggered to verify that the VSCE_PAT is working
- Add [documentation](.github/workflows/README.md) for all workflows in the `.github/workflows` folder

### Changed

- Update workflow `release.yml` to use node.js version 24 for building the vsix package, as version 20 is going to be deprecated soon
- Renamed workflow `release.yml` to `build-vsix.yml` to better reflect its purpose
- Add manual triggering to workflow on release, tag, branch or any commit
- Manually triggered `build-vsix.yml` workflow runs do attach the resulting VSIX as artifact with commit hash in the name for better traceability

### Fixed

- CVE-2026-33532 yaml is vulnerable to Stack Overflow via deeply nested YAML collections
- Add `ssh2` as external dependency in `esbuild.js` to avoid build issues related to the `ssh2` package when using esbuild for bundling

## [0.2.3] - 2026-03-16

### Added

- Add esbuild bundler for optimized extension packaging

### Fixed

- Update NPM packages
- Update node.js to version 20 in release.yml workflow for Github Actions to fix build issue
- CVE-2026-1528 Undici: Malicious WebSocket 64-bit length overflows parser and crashes the client
- CVE-2026-1525 Undici has an HTTP Request/Response Smuggling issue
- CVE-2026-1527 Undici has CRLF Injection in undici via `upgrade` option

### Removed

- Update .vscodeignore: devDocs, .github and .prettierignore

## [0.2.2] - 2026-03-10

### Added

- Add `release.yml` workflow for Github Actions to automatically build the vsix and attach the file to the release when a new release is created on Github
- Add 751-9401  for supported WAGO CC100 devices

### Fixed

- Updated NPM packages
- CVE-2026-29786 tar has Hardlink Path Traversal via Drive-Relative Linkpath

### Removed

- The workflow file for vsix distributionn to the marketplace failed. Deactivated for now

## [0.2.1] - 2026-03-04

### Fixed

- Updated NPM packages
- CVE-2026-27903 minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments
- CVE-2026-26960 Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction
- CVE-2026-2391 qs's arrayLimit bypass in comma parsing allows denial of service

## [0.2.0] - 2026-02-05

### Added

- Controller management view in the Activity Bar (add/configure/rename/reset/remove controllers)
- Project workflows: **Create Project**, **Init Project**, **Open Project** (including project version detection and updated templates)
- **Upload All** command for multi-controller uploads
- Remote debugging integration ("Remote cc100 debugger") and controller selection for debugging
- Developer documentation under `res/devDocs` (architecture/sequence diagrams)
- Prettier configuration and npm scripts (`format`, `build`)

### Changed

- Major internal refactor: new extension core modules (manager/factories/shared types/constants) and a new connection management implementation
- More VS Code-native integration (Activity Bar view, commands, welcome views, and context menus)
- Updated dependencies (removed unused packages, added `tar` and `yaml`, updated `ssh2`)
- Updated project template layout (introduced `wago.yaml` and controller templates; removed legacy template libs)
- Updated/renamed media assets for better cross-platform path/case consistency; updated extension icon

### Fixed

- "Create Project" error when the target folder already exists
- SSH key generation and remote folder creation issues
- Upload robustness: preserve directory structure, ensure target directories exist, improved cleanup/reset behavior, and more reliable Docker image handling
- Upload behavior: ensure the uploaded Python application starts correctly; improved multi-upload behavior
- Network/address handling improvements (allow DNS hostnames; fix IP switching issues; improved gateway/netmask validation)
- IO-Check issues (analog write) and minor label typo (digital input)

### Removed

- Legacy menu/settings/homepage webview assets and other unused media/resources
- Bundled legacy Python 3.7.6 `.ipk` file from the repository

## [0.1.11] - 2026-01-30

### Fixed

- CVE-2025-13465 Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions
- Updated NPM packages
- Update download URL for CC100IO.py to Tag V1.1

## [0.1.10] - 2026-01-12

### Fixed

- CVE-2025-15284 qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion
- Updated NPM packages
- Corrected markdown issues in README

## [0.1.9] - 2025-12-05

### Fixed

- CVE-2025-65945 auth0/node-jws Improperly Verifies HMAC Signature
- Updated NPM packages

## [0.1.8] - 2025-11-19

### Fixed

- CVE-2025-64756 glob CLI: Command injection via -c/--cmd executes matches with shell:true

## [0.1.7] - 2025-11-18

### Fixed

- CVE-2025-54798 tmp allows arbitrary temporary file / directory write via symbolic link `dir` parameter (closes #7)
- CVE-2025-59343 tar-fs has a symlink validation bypass if destination directory is predictable with a specific tarball (closes #8)
- CVE-2025-64718 js-yaml has prototype pollution in merge (<<) (closes #10)

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
