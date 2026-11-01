<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project rules

- Spaced-repetition rules live only in `src/lib/srs.ts` (pure functions, tested in `src/test/srs.test.ts`); UI and data code must call them, never re-implement intervals.
- Data access goes through hooks in `src/lib/data.ts`. The active static app uses IndexedDB only. The retained legacy cloud mode uses the browser client with per-user RLS (`user_id = auth.uid()`); never access or change cloud data during static-app work.
- Notifications plug in via `setNotifier()` in `src/lib/notifications.ts`; review scheduling already calls it, so add delivery there instead of in review code.
- Signed-in pages live under `src/routes/_authenticated/` and render inside `AppShell` (sidebar on iPad/Mac, bottom tab bar on iPhone).

## Active deployment

- Develop on `codex/github-pages`; do not push or merge to Lovable-connected `main`.
- Default dev/build/preview are the independent static app. Use legacy scripts only for explicit migration work.
- Preserve IndexedDB, JSON compatibility, and SRS calculations. Hash routing and relative assets support GitHub Pages project URLs without rewrites.
- Never change repository visibility to enable Pages without explicit permission. Code preparation is distinct from publication.
- Normal pushes only build; a release commit prefixed `[publish-pages]` deploys after Pages settings and plan availability are confirmed.
