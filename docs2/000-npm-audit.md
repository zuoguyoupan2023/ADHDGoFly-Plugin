# npm audit report

Generated from `npm audit --json` on 2026-07-22.

## Summary

The project currently reports 5 vulnerable package groups:

- Critical: 1
- High: 4
- Direct vulnerable dependencies: 1 (`pdfjs-dist`)
- Transitive vulnerable dependencies: 4 (`tar`, `@mapbox/node-pre-gyp`, `minimatch`, `brace-expansion`)

Dependency paths observed locally:

- `pdfjs-dist@3.11.174`
- `pdfjs-dist@3.11.174 -> canvas@2.11.2 -> @mapbox/node-pre-gyp@1.0.11 -> tar@6.2.1`
- `archiver@5.3.2 -> archiver-utils@2.1.0 -> glob@7.2.3 -> minimatch@3.1.2 -> brace-expansion@1.1.12`
- `archiver@5.3.2 -> readdir-glob@1.1.3 -> minimatch@5.1.6 -> brace-expansion@2.0.2`

## Alerts

### 1. `tar`

- Severity: critical
- Direct dependency: no
- Current installed version: `6.2.1`
- Path: `pdfjs-dist -> canvas -> @mapbox/node-pre-gyp -> tar`
- Affected range reported by audit: `<=7.5.18`
- Representative advisories:
  - `GHSA-34x7-hfp2-rc4v`: arbitrary file creation/overwrite via hardlink path traversal
  - `GHSA-8qq5-rm4j-mr97`: arbitrary file overwrite and symlink poisoning
  - `GHSA-23hp-3jrh-7fpw`: decompression/parse DoS via unlimited input
  - Several additional path traversal, symlink, crash, and archive parsing advisories
- Fix availability: yes, through dependency updates

How to fix:

1. Remove the vulnerable dependency path by upgrading `pdfjs-dist` to a version that no longer depends on the vulnerable `canvas/@mapbox/node-pre-gyp/tar` chain, or where the chain resolves to patched versions.
2. Run `npm install pdfjs-dist@latest` or the chosen target version.
3. Verify `build.js` still finds distributable PDF.js files. Newer PDF.js versions may use `.mjs` builds instead of the current `build/pdf.min.js` and `build/pdf.worker.min.js` files.
4. If the file layout changed, update `build.js`, `offscreen/pdf-parser.html`, and `offscreen/pdf-parser.js` together.
5. Re-run `npm audit`, PDF parsing tests/manual checks, and `npm run build`.

### 2. `pdfjs-dist`

- Severity: high
- Direct dependency: yes
- Current installed version: `3.11.174`
- Affected range reported by audit: `<=4.1.392`
- Advisory: `GHSA-wgrm-67xf-hhpq`
- Title: PDF.js vulnerable to arbitrary JavaScript execution upon opening a malicious PDF
- Fix availability: yes, audit suggests `pdfjs-dist@6.1.200`
- Semver impact: major version upgrade

How to fix:

1. Upgrade `pdfjs-dist` to a patched major version, likely `6.x`.
2. Check whether the browser/offscreen build artifacts are still named `pdf.min.js` and `pdf.worker.min.js`.
3. If not, migrate the offscreen parser to the new module build or copy the correct legacy build files.
4. Test with a normal PDF, a scanned/image-heavy PDF, and a PDF that previously parsed successfully.
5. Run `npm audit` and `npm run build`.

### 3. `minimatch`

- Severity: high
- Direct dependency: no
- Current installed versions:
  - `3.1.2` through `archiver -> archiver-utils -> glob`
  - `5.1.6` through `archiver -> readdir-glob`
- Affected range reported by audit: `<=3.1.3 || 5.0.0 - 5.1.7`
- Representative advisories:
  - `GHSA-3ppc-4f35-3m26`: ReDoS via repeated wildcards
  - `GHSA-7r86-cg39-jmmj`: combinatorial backtracking via multiple non-adjacent GLOBSTAR segments
  - `GHSA-23c5-xmqv-rm74`: nested extglob ReDoS
- Fix availability: yes

How to fix:

1. Prefer upgrading `archiver` to a newer major/minor that pulls patched `minimatch` versions.
2. If `archiver` does not resolve it, evaluate replacing `archiver` or using npm `overrides` for transitive packages.
3. Be careful with overrides: `glob@7` may expect the `minimatch@3` API.
4. Re-run package creation with `npm run build` and inspect the produced zip files.

### 4. `brace-expansion`

- Severity: high
- Direct dependency: no
- Current installed versions:
  - `1.1.12` through `minimatch@3.1.2`
  - `2.0.2` through `minimatch@5.1.6`
- Affected range reported by audit: `<=1.1.15 || 2.0.0 - 2.1.1`
- Representative advisories:
  - `GHSA-f886-m6hf-6m8v`: zero-step sequence causes process hang and memory exhaustion
  - `GHSA-3jxr-9vmj-r5cp`: DoS via exponential-time expansion of consecutive non-expanding groups
- Fix availability: yes

How to fix:

1. This should be fixed together with `minimatch`, because `brace-expansion` is pulled in by `minimatch`.
2. Upgrade `archiver` and its dependency tree first.
3. If needed, add a narrowly scoped npm `overrides` entry for `brace-expansion`, then run `npm install`.
4. Re-run `npm audit` and `npm run build`.

### 5. `@mapbox/node-pre-gyp`

- Severity: high
- Direct dependency: no
- Current installed version: `1.0.11`
- Path: `pdfjs-dist -> canvas -> @mapbox/node-pre-gyp`
- Affected range reported by audit: `<=1.0.11`
- Reported via: vulnerable `tar`
- Fix availability: yes

How to fix:

1. Prefer removing this path by upgrading `pdfjs-dist` so the project no longer installs the old optional `canvas` native dependency chain.
2. If `canvas` remains installed, update it to a release that no longer uses vulnerable `@mapbox/node-pre-gyp/tar` versions.
3. Confirm Chrome extension packaging does not require native `canvas`; if it is not needed at runtime, verify it is only an install-time optional dependency.
4. Re-run `npm audit` and `npm run build`.

## Recommended repair order

1. Upgrade `pdfjs-dist` first, because it is the only direct vulnerable dependency and it also owns the critical `tar` path through `canvas`.
2. Verify PDF parsing and update `build.js` if the PDF.js artifact names changed.
3. Upgrade `archiver` next to resolve `minimatch` and `brace-expansion`.
4. Use `overrides` only if normal upgrades cannot produce a clean dependency tree.
5. Run:

```bash
npm audit
npm run build
```

Then manually test:

- PDF parsing in the extension.
- Manual install zip generation.
- Chrome and Edge package contents.
