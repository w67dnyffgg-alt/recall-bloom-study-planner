import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  createHashHistory,
  Outlet,
  HeadContent,
  redirect,
} from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { Route as HomeRoute } from "@/routes/_authenticated/home";
import { Route as UnitsRoute } from "@/routes/_authenticated/units";
import { Route as CalendarRoute } from "@/routes/_authenticated/calendar";
import { Route as SettingsRoute } from "@/routes/_authenticated/settings";

// Reuse the existing pages and SRS; there is no server, auth route or cloud loader.
const root = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <HeadContent />
      <Outlet />
      <Toaster position="top-center" />
    </>
  ),
  errorComponent: () => (
    <main className="p-8">
      <h1>画面を読み込めませんでした</h1>
      <p>ページを再読み込みしてください。保存データは削除しないでください。</p>
      <a href="#/home">ホームへ戻る</a>
    </main>
  ),
  notFoundComponent: () => (
    <main className="p-8">
      <p>ページが見つかりません</p>
      <a href="#/home">ホームへ戻る</a>
    </main>
  ),
});
const app = createRoute({
  getParentRoute: () => root,
  id: "_authenticated",
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
const home = HomeRoute.update({
  id: "/home",
  path: "/home",
  getParentRoute: () => app,
} as Parameters<typeof HomeRoute.update>[0]);
const units = UnitsRoute.update({
  id: "/units",
  path: "/units",
  getParentRoute: () => app,
} as Parameters<typeof UnitsRoute.update>[0]);
const calendar = CalendarRoute.update({
  id: "/calendar",
  path: "/calendar",
  getParentRoute: () => app,
} as Parameters<typeof CalendarRoute.update>[0]);
const settings = SettingsRoute.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => app,
} as Parameters<typeof SettingsRoute.update>[0]);
const index = createRoute({
  getParentRoute: () => root,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
});
const auth = createRoute({
  getParentRoute: () => root,
  path: "/auth",
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
});
const routeTree = root.addChildren([
  index,
  auth,
  app.addChildren([home, units, calendar, settings]),
]);
export const createStandaloneRouter = (queryClient: QueryClient) =>
  createRouter({
    routeTree,
    history: createHashHistory(),
    context: { queryClient },
    scrollRestoration: true,
  });
