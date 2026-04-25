# Repository Guidelines

## Project Structure & Module Organization
This repository is a WeChat Mini Program for baby food allergy tracking. App entry files live at the root: `app.js`, `app.json`, and `app.wxss`. Page modules are under `pages/` and follow the Mini Program four-file pattern, for example `pages/index/index.js`, `.wxml`, `.wxss`, and `.json`. Shared logic lives in `utils/` and `data/`; keep stateful UI code in pages/components and reusable calculation code in helpers such as `utils/plan-engine.js`. Reusable UI belongs in `components/`, the custom tab bar is in `custom-tab-bar/`, and image assets are under `static/`. Cloud functions are organized by function name in `cloudfunctions/`. Product changes and proposals are tracked in `openspec/`.

## Build, Test, and Development Commands
Install Node dependencies with `npm install`. There is no `npm test` or `npm run dev` script yet; local development is done through WeChat DevTools by opening the repository root as a Mini Program project. Asset generation scripts are run directly, for example `node generate-icons.js` or `node generateMismatchIcons.js`. Use these scripts only when updating generated food or tab assets.

## Coding Style & Naming Conventions
Follow the existing JavaScript style: 2-space indentation, semicolons, single quotes, and CommonJS `require(...)`. Use camelCase for variables and functions, PascalCase only where framework APIs require it, and kebab-case for component/page directories. Keep comments brief and task-oriented. Match Mini Program naming conventions exactly: page paths must stay aligned across `app.json` and the `pages/<name>/` directory.

## Testing Guidelines
Automated tests are not configured yet. For logic changes in `utils/` or `data/`, add simple deterministic checks before shipping and verify affected flows manually in WeChat DevTools. Smoke-test the main paths: onboarding, record entry, plan progress, allergy trace, and settings. If a change touches visuals, include screenshots in the PR.

## Commit & Pull Request Guidelines
Git history currently contains only `Initial Commit`, so adopt short imperative commit messages such as `Add record sheet animation fix`. Keep commits scoped to one change. PRs should include a concise summary, impacted pages/components, manual test notes, and screenshots or screen recordings for UI work. Link the related `openspec/changes/...` entry when the PR implements a tracked proposal.


<claude-mem-context>
# Memory Context

# [呀咪宝宝辅食] recent context, 2026-04-25 10:47pm GMT+8

No previous sessions found.
</claude-mem-context>