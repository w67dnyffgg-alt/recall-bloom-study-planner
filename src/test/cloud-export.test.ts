import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}));
import { exportCloud } from "@/lib/cloud-export";
const date = "2026-11-01T00:00:00.000Z";
const rows = Array.from({ length: 1001 }, (_, i) => ({
  id: `unit-${i}`,
  subject: "民法",
  material: "基本書",
  unit_name: "単元",
  pages: "",
  memo: "",
  studied_at: date,
  created_at: date,
  stage: 0,
  next_review_at: "2026-11-01T01:00:00.000Z",
  user_id: "private",
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "private" } }, error: null });
});
describe("safe legacy export", () => {
  it("reads every page twice and never calls any write operation", async () => {
    const ranges: number[] = [];
    mocks.from.mockImplementation((table: string) => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => {
            ranges.push(from);
            return { data: table === "study_units" ? rows.slice(from, to + 1) : [], error: null };
          },
        }),
      }),
    }));
    const b = await exportCloud();
    expect(b.units).toHaveLength(1001);
    expect(b.subjects).toHaveLength(1);
    expect(ranges).toEqual([0, 500, 1000, 0, 0, 500, 1000, 0]);
    expect(JSON.stringify(b)).not.toContain('"user_id"');
  });
  it("rejects partial or failed retrieval", async () => {
    mocks.from.mockImplementation(() => ({
      select: () => ({
        order: () => ({ range: async () => ({ data: null, error: new Error("network") }) }),
      }),
    }));
    await expect(exportCloud()).rejects.toThrow("network");
  });
  it("rejects account changes during retrieval", async () => {
    mocks.getUser
      .mockResolvedValueOnce({ data: { user: { id: "private" } } })
      .mockResolvedValueOnce({ data: { user: { id: "other" } } });
    mocks.from.mockImplementation(() => ({
      select: () => ({ order: () => ({ range: async () => ({ data: [], error: null }) }) }),
    }));
    await expect(exportCloud()).rejects.toThrow("ログイン状態");
  });
});
