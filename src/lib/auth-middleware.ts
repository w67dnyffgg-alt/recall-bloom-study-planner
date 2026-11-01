import { createMiddleware } from "@tanstack/react-start";
import { isLocalMode } from "./storage-mode";
import { supabase } from "@/integrations/supabase/client";
// Keep legacy server functions authenticated; local actions never request a session.
export const attachStorageAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  if (isLocalMode()) return next();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
