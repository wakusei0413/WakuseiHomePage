# Maintainability And Quality Cleanup

Date: 2026-04-21

## Overview

Perform a medium-scope maintainability pass on the static site without changing its overall feature set, configuration shape, or visual design. Focus the work on clarifying startup orchestration, reducing internal complexity in the wallpaper module, tightening config validation internals, and adding regression-oriented tests for the most failure-prone paths.

## Goals

- Keep page behavior materially unchanged for modern and legacy-compatible modes.
- Improve code readability and change safety in the most complex runtime paths.
- Expand automated verification beyond config field presence checks.
- Preserve the existing plain-static-site architecture and ESM module layout.

## Non-Goals

- No visual redesign or UX rewrite.
- No framework migration.
- No large config schema redesign.
- No broad refactor of unrelated modules.
- No replacement of the wallpaper feature or its public API.

## Current Pain Points

### 1. Entry-point responsibility is too broad

`js/app.js` currently owns startup orchestration, config failure fallback, Font Awesome loading, wallpaper startup, scroll animation setup, mobile sticky avatar behavior, compatibility branching, and final module initialization. The file is still understandable, but too many unrelated responsibilities sit in one place, which makes edits riskier than necessary.

### 2. Wallpaper module concentrates too much mutable state

`js/wallpaper.js` keeps one large stateful object with request racing, retry logic, placeholder lifecycle, progress updates, lazy loading, and auto-scroll management all interleaved. The public contract is acceptable, but internal structure makes bug diagnosis and future edits harder.

### 3. Config validation is correct but repetitive

`js/validate-config.js` duplicates path traversal and type assertions across `exists()` and `required()`. That is manageable today, but future config growth will make the current approach more error-prone.

### 4. Test coverage is skewed toward static config shape

Current tests mostly confirm that config fields exist and that a few validator errors are produced. There is little regression protection around runtime decisions, compatibility branches, or internal logic extracted for maintainability work.

## Target Design

## 1. Startup Orchestration Boundaries

### Keep `js/app.js` as the single entry point

`js/app.js` remains the runtime entry point loaded by `index.html`, but it becomes a thin orchestrator instead of a mixed orchestration-plus-feature file.

It should be responsible for:

- importing startup dependencies
- validating `CONFIG`
- deciding whether the page can continue in enhanced mode or must degrade
- invoking a small set of page/bootstrap functions in a clear order
- starting feature modules that must remain top-level runtime concerns

It should no longer contain the detailed implementation of page-level setup behaviors such as scroll animation wiring or sticky avatar event binding.

### Add a lightweight page/bootstrap module

Create one focused module for page-level initialization concerns currently embedded in `js/app.js`. Exact filename can be finalized during implementation, but its role is fixed: centralize DOM setup helpers that are not independent product features.

This module should own logic such as:

- revealing main content and hiding the loading overlay
- simplifying loading text in legacy-compatible mode
- initializing scroll-reveal behavior
- initializing mobile sticky avatar behavior
- handling any small page-scoped enhancement wiring that does not deserve its own top-level feature module

The intent is not to create a large abstraction layer. The module should expose a small number of explicit functions that `app.js` can call in order.

## 2. Startup Data Flow

The runtime should follow one readable startup chain:

1. Import `CONFIG` and validate it.
2. If validation fails, log concrete config errors, reveal the main content, hide the loading overlay, and stop enhanced initialization.
3. If validation succeeds, apply base profile and social content.
4. Evaluate compatibility mode once and use that decision consistently.
5. In compatibility mode, keep only the safe baseline behavior.
6. In modern mode, start enhanced modules in a stable order: asset loading, wallpaper, typewriter, time, scroll effects, and mobile-only interaction helpers.

This concentrates startup ordering decisions in one place so future maintenance does not require reading several unrelated IIFEs to understand initialization dependencies.

## 3. Error Handling Model

Error handling should be intentionally simple and separated by failure type.

### Config errors

Config validation failures are startup blockers for enhanced behavior, but not for page visibility. They should produce concrete field-level errors, show the page shell, and stop further initialization.

### Module-local runtime failures

Failures in optional or external-dependency-heavy features, especially wallpaper loading and remote Font Awesome CSS loading, should degrade locally. A failed enhancement must not strand the page behind the loading overlay or prevent baseline content from appearing.

### Compatibility-mode skips

Logs should distinguish between:

- a module being intentionally skipped because the browser is in legacy-compatible mode
- a module attempting to initialize and failing unexpectedly

That distinction improves diagnosis without adding a more complex logging system.

## 4. Wallpaper Module Refactor Constraints

### Preserve the public interface

`WallpaperScroller` remains the exported constructor used by `js/app.js`. The maintainability pass should not force consumers to adopt a new API.

### Reorganize internals by responsibility

The internal implementation should be decomposed into smaller private methods grouped by concern:

- request construction and concurrent source racing
- retry timing and backoff behavior
- placeholder creation, observation, and cleanup
- loading progress updates during initial preload
- auto-scroll loop behavior and load-threshold reactions
- teardown behavior for timers, animation frames, observers, and DOM cleanup

The goal is not object-model purity. The goal is to make each behavior readable in isolation and reduce the cost of modifying one aspect without scanning the entire file.

### Preserve behavior where practical

Existing behavior should stay the same unless a small change is necessary to remove ambiguity or fix a maintainability-adjacent defect discovered during refactor. If such a change is needed, it must remain narrowly scoped and be covered by tests.

## 5. Config Validation Refactor Constraints

Keep `js/validate-config.js` as a hand-written validator rather than introducing a schema library. This project is small, and external validation machinery would add more weight than value.

The internal design should instead improve clarity by:

- centralizing nested-path lookup
- separating presence checks from type assertions more cleanly
- reducing repeated traversal code
- making error generation easier to reason about and extend

Validation rules should continue to match the current config shape and repo expectations.

## 6. Testing Strategy

Testing should stay lightweight and use the existing Node test runner.

### Tests to retain

- current config validation baseline tests
- current config field presence tests
- current slogan selector tests

### Tests to add or expand

- validator edge cases for the refactored internal helpers
- startup decision tests for config-failure fallback paths
- compatibility-mode decision tests for whether enhancements are skipped or initialized
- targeted tests for any extracted pure helpers created during refactor
- wallpaper-adjacent tests only where behavior can be validated without fragile network coupling

### DOM-related testing approach

Keep DOM tests minimal and focused on observable branching behavior, not pixel-perfect output or heavy integration simulation. The purpose is to catch regressions in startup logic, not to build a full browser test stack.

## 7. Verification Standard

The implementation is only complete when all of the following pass:

- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run build`

These commands define the acceptance line for this maintainability pass.

## Implementation Scope Summary

Expected touched areas:

- `js/app.js`
- one new page/bootstrap helper module under `js/`
- `js/wallpaper.js`
- `js/validate-config.js`
- relevant tests under `tests/`

Possible small supporting edits are acceptable if they directly serve the goals above, but unrelated cleanup should be avoided.

## Success Criteria

- `app.js` is noticeably smaller and easier to scan as an orchestrator.
- page-level setup code is grouped behind clearer module boundaries.
- `WallpaperScroller` keeps its public contract while becoming easier to reason about internally.
- config validation logic is easier to extend without duplicating traversal logic.
- automated tests better cover startup and regression-prone behavior.
- full repo verification passes without changing the project's static-site architecture.
