import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readLocal, restoreLocal } from "@/lib/local-store";
import { emptyBackup } from "@/lib/local-model";
import { UnitForm } from "@/routes/_authenticated/units";
const gate = vi.hoisted(() => ({ release: () => {} }));
vi.mock("@/lib/catalog", async (original) => {
  const actual = await original<typeof import("@/lib/catalog")>();
  return {
    ...actual,
    saveMaterial: async (...args: Parameters<typeof actual.saveMaterial>) => {
      await new Promise<void>((resolve) => {
        gate.release = resolve;
      });
      return actual.saveMaterial(...args);
    },
  };
});
describe("inline material creation", () => {
  it("preserves unit text typed while the material is being saved", async () => {
    localStorage.setItem("rememo-storage-mode", "local");
    const b = emptyBackup();
    b.subjects.push({ id: "subject", name: "民法" });
    b.settings.last_subject_id = "subject";
    const old = await readLocal();
    const state = await restoreLocal(b, "replace", old.revision);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["local-state"], state);
    const view = render(
      <QueryClientProvider client={qc}>
        <UnitForm onDone={() => {}} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "教材を追加" }));
    fireEvent.change(screen.getByRole("textbox", { name: "追加する教材名" }), {
      target: { value: "基本書" },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加して選択" }));
    fireEvent.change(screen.getByPlaceholderText("例：第3章 意思表示"), {
      target: { value: "消えてはいけない単元名" },
    });
    fireEvent.change(screen.getByPlaceholderText("ポイントや苦手なところ"), {
      target: { value: "入力中のメモ" },
    });
    expect(screen.getByRole("button", { name: "記録する" })).toBeDisabled();
    await act(async () => {
      gate.release();
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "記録する" })).toBeEnabled());
    expect(screen.getByPlaceholderText("例：第3章 意思表示")).toHaveValue("消えてはいけない単元名");
    expect(screen.getByPlaceholderText("ポイントや苦手なところ")).toHaveValue("入力中のメモ");
    expect((screen.getAllByRole("combobox")[1] as HTMLSelectElement).value).not.toBe("");
    view.unmount();
    qc.clear();
    localStorage.removeItem("rememo-storage-mode");
  });
});
