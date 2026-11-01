import { emptyBackup, parseBackup, mergeBackups, type Backup } from "./local-model";

type State = {
  data: Backup;
  revision: number;
  lastBackupAt: string | null;
  migrationCheckedAt: string | null;
};
let dbPromise: Promise<IDBDatabase> | undefined;
function database() {
  if (!dbPromise)
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("rememo-local", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onerror = () =>
        reject(
          new Error("端末内保存を開けません。プライベートブラウズや空き容量を確認してください"),
        );
      r.onblocked = () => reject(new Error("他のタブを閉じて、もう一度開いてください"));
      r.onsuccess = () => {
        r.result.onversionchange = () => {
          r.result.close();
          dbPromise = undefined;
        };
        resolve(r.result);
      };
    }).catch((e) => {
      dbPromise = undefined;
      throw e;
    });
  return dbPromise;
}
function initial(): State {
  return { data: emptyBackup(), revision: 0, lastBackupAt: null, migrationCheckedAt: null };
}
// Every read-modify-write runs in one IndexedDB transaction, across tabs as well.
async function transaction(change?: (state: State) => void): Promise<State> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", change ? "readwrite" : "readonly");
    const store = tx.objectStore("state");
    const req = store.get("current");
    let state: State;
    let failure: unknown;
    req.onsuccess = () => {
      try {
        state = (req.result as State | undefined) ?? initial();
        state.data = parseBackup(state.data);
        if (change) {
          change(state);
          state.data = parseBackup(state.data);
          state.revision++;
          store.put(state, "current");
        }
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      if (change && typeof window !== "undefined") {
        window.dispatchEvent(new Event("rememo-data"));
        if (typeof BroadcastChannel !== "undefined") {
          const ch = new BroadcastChannel("rememo-data");
          ch.postMessage("changed");
          ch.close();
        }
      }
      resolve(state);
    };
    tx.onabort = tx.onerror = () =>
      reject(failure ?? tx.error ?? new Error("保存に失敗しました。空き容量を確認してください"));
  });
}
export const readLocal = () => transaction();
export const changeLocal = (change: (data: Backup) => void) =>
  transaction((s) => {
    change(s.data);
  });
export function restoreLocal(
  incoming: Backup,
  mode: "replace" | "merge",
  expectedRevision: number,
) {
  return transaction((s) => {
    if (s.revision !== expectedRevision)
      throw new Error("確認中にデータが更新されました。ファイルを選び直してください");
    s.data = mode === "replace" ? parseBackup(incoming) : mergeBackups(s.data, incoming);
    s.migrationCheckedAt = null;
  });
}
export const markBackup = (at: string) =>
  transaction((s) => {
    s.lastBackupAt = at;
  });
export const markMigrationChecked = () =>
  transaction((s) => {
    s.migrationCheckedAt = new Date().toISOString();
  });
export function backupDue(last: string | null, now = Date.now()) {
  return !last || now - Date.parse(last) >= 7 * 86400000;
}
