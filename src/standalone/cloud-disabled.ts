// A fail-closed replacement used only by the independent static build.
// Legacy source remains available for migration; no SDK or credentials ship here.
export const supabase = new Proxy(
  {},
  {
    get() {
      throw new Error("この公開版は端末内保存専用です。クラウドには接続しません。");
    },
  },
);
