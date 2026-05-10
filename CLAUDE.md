# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Local-only PWA for tracking daily emotions, menstrual cycle phase, and a free-form note, plus history and stats views. Russian-language UI ("Мои эмоции"). Mobile-first — design and test against narrow viewports. All data stays on device in IndexedDB; there is no backend.

## Commands

Package manager is Bun (see `bun.lock`).

- `bun run dev` — Vite dev server
- `bun run build` — `tsc -b` then `vite build`
- `bun run lint` — ESLint over the repo
- `bun run preview` — preview the production build

There is no test setup.

## Architecture

- **Stack**: React 19 + TypeScript + Vite 8, `react-router-dom` v7 (`HashRouter` — required so the built app works when opened from `file://` or any subpath, since `vite.config.ts` sets `base: './'`), `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- **Routing**: three top-level pages mounted in `src/App.tsx` — `/` Track, `/history` History, `/stats` Stats — with a shared `BottomNav`.
- **Persistence** (`src/lib/db.ts`): a single `idb` database `EmotionTrackerV2`, store `dailyLogs`, indexed `by-date`. The record `id` is the date string `YYYY-MM-DD`, so saving a day overwrites any prior entry for that day. Schema version is `1` — bumping it requires an `upgrade` migration.
- **Domain model** (`src/types.ts`): `EMOTION_CATEGORIES` is the source of truth for the five categories (ГНЕВ, СТРАХ, ГРУСТЬ, РАДОСТЬ, ЛЮБОВЬ) and their emotions; `CYCLE_PHASES` lists the menstrual cycle phases. UI category coloring (e.g. checkbox colors, selected-phase color) is keyed off these names.
- **State**: `src/hooks/useEmotions.ts` is the one hook that wraps all DB access — load, `saveDay`, `removeLog`, `changeDate` (delete-then-put because the key is the date). Pages call this directly; there is no global store.
- **Styling**: a single `src/index.css`. `App.tsx` writes `--scroll-y` to `document.body` on scroll for CSS that needs the current scroll offset.
