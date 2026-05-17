"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The inquiry cart — a saved list of item ids the visitor wants to rent.
 * Deliberately not a checkout: it only assembles the `selected_items` for a
 * manual rental request. Persisted to localStorage so a list survives a visit.
 */
interface CartState {
  ids: string[];
  hydrated: boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
  setHydrated: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrated: false,
      add: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      toggle: (id) =>
        set((s) =>
          s.ids.includes(id)
            ? { ids: s.ids.filter((x) => x !== id) }
            : { ids: [...s.ids, id] }
        ),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "rentco-inquiry-cart",
      partialize: (s) => ({ ids: s.ids }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);
