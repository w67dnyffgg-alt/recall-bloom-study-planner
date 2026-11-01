export function isLocalMode() {
  return typeof window !== "undefined" && localStorage.getItem("rememo-storage-mode") === "local";
}
// A full navigation isolates query caches and tears down all cloud subscriptions.
export function switchStorageMode(mode: "local" | "cloud") {
  localStorage.setItem("rememo-storage-mode", mode);
  window.location.assign(mode === "local" ? "/home" : "/auth");
}
