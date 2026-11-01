import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  localStorage.removeItem("rememo-storage-mode");
});
afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.removeItem("rememo-storage-mode");
});
describe("independent static distribution", () => {
  it("starts locally without login or a localStorage preference", async () => {
    vi.stubEnv("VITE_STANDALONE", "true");
    const mode = await import("@/lib/storage-mode");
    expect(mode.isStandalone).toBe(true);
    expect(mode.isLocalMode()).toBe(true);
  });
  it("refuses cloud switching even if an old preference says cloud", async () => {
    vi.stubEnv("VITE_STANDALONE", "true");
    localStorage.setItem("rememo-storage-mode", "cloud");
    const mode = await import("@/lib/storage-mode");
    expect(mode.isLocalMode()).toBe(true);
    expect(() => mode.switchStorageMode("cloud")).toThrow("端末内保存専用");
  });
  it("retains legacy mode selection in the existing build", async () => {
    vi.stubEnv("VITE_STANDALONE", "");
    const mode = await import("@/lib/storage-mode");
    expect(mode.isLocalMode()).toBe(false);
    localStorage.setItem("rememo-storage-mode", "local");
    expect(mode.isLocalMode()).toBe(true);
  });
});
