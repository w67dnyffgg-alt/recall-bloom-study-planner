export const isStandalone = import.meta.env["VITE_STANDALONE"] === "true";

export function isLocalMode() {
  if (isStandalone) return true;
  return typeof window !== "undefined" && localStorage.getItem("rememo-storage-mode") === "local";
}
// A full navigation isolates query caches and tears down all cloud subscriptions.
export function switchStorageMode(mode: "local" | "cloud") {
  if (isStandalone && mode === "cloud") throw new Error("この公開版は端末内保存専用です");
  localStorage.setItem("rememo-storage-mode", mode);
  window.location.assign(mode === "local" ? "/home" : "/auth");
}
