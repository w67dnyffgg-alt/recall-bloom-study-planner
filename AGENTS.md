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
- Data access goes through hooks in `src/lib/data.ts` using the browser client with per-user RLS (`user_id = auth.uid()`), so other users can never read records.
- Notifications plug in via `setNotifier()` in `src/lib/notifications.ts`; review scheduling already calls it, so add delivery there instead of in review code.
- Signed-in pages live under `src/routes/_authenticated/` and render inside `AppShell` (sidebar on iPad/Mac, bottom tab bar on iPhone).
