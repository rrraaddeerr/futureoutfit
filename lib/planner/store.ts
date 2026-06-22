"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BUCKETS, type BucketKey } from "./data";
import type {
  Affirmation,
  Buckets,
  Entry,
  FutureLetter,
  Gratitude,
  Idea,
  IdeaSource,
  IdeaStatus,
  PathReaction,
  Reaction,
  Reframe,
  Visualization,
  Win,
} from "./types";

function id(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBuckets(): Buckets {
  return Object.fromEntries(BUCKETS.map((b) => [b.key, [] as Entry[]])) as Buckets;
}

interface PlannerState {
  hydrated: boolean;
  setHydrated: () => void;

  buckets: Buckets;
  addEntry: (key: BucketKey, text: string, note?: string) => void;
  updateEntry: (key: BucketKey, entryId: string, patch: Partial<Entry>) => void;
  removeEntry: (key: BucketKey, entryId: string) => void;

  ideas: Idea[];
  addIdea: (text: string, source: IdeaSource) => Idea;
  updateIdea: (ideaId: string, patch: Partial<Idea>) => void;
  setIdeaStatus: (ideaId: string, status: IdeaStatus) => void;
  removeIdea: (ideaId: string) => void;

  pathReactions: Record<string, PathReaction>;
  setPathReaction: (pathId: string, reaction: Reaction | null) => void;
  setPathNotes: (pathId: string, notes: string) => void;

  affirmations: Affirmation[];
  addAffirmation: (text: string, mine?: boolean) => void;
  toggleFavoriteAffirmation: (affirmationId: string) => void;
  removeAffirmation: (affirmationId: string) => void;

  wins: Win[];
  addWin: (text: string) => void;
  removeWin: (winId: string) => void;

  reframes: Reframe[];
  addReframe: (doubt: string, reframe: string) => void;
  removeReframe: (reframeId: string) => void;

  visualizations: Visualization[];
  addVisualization: (prompt: string, response: string) => void;
  removeVisualization: (vId: string) => void;

  gratitudes: Gratitude[];
  addGratitude: (text: string) => void;
  removeGratitude: (gId: string) => void;

  letters: FutureLetter[];
  addLetter: (body: string, unlockAt: number) => void;
  openLetter: (letterId: string) => void;
  removeLetter: (letterId: string) => void;

  ownerName: string;
  setOwnerName: (name: string) => void;

  aiEnabled: boolean;
  setAiEnabled: (on: boolean) => void;

  reset: () => void;
  importJson: (json: unknown) => boolean;
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      buckets: emptyBuckets(),
      addEntry: (key, text, note) => {
        const t = text.trim();
        if (!t) return;
        const entry: Entry = { id: id(), text: t, note: note?.trim() || undefined, createdAt: Date.now() };
        set((s) => ({ buckets: { ...s.buckets, [key]: [entry, ...s.buckets[key]] } }));
      },
      updateEntry: (key, entryId, patch) =>
        set((s) => ({
          buckets: {
            ...s.buckets,
            [key]: s.buckets[key].map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
          },
        })),
      removeEntry: (key, entryId) =>
        set((s) => ({ buckets: { ...s.buckets, [key]: s.buckets[key].filter((e) => e.id !== entryId) } })),

      ideas: [],
      addIdea: (text, source) => {
        const idea: Idea = {
          id: id(),
          text: text.trim(),
          source,
          status: "spark",
          notes: "",
          nextSteps: [],
          createdAt: Date.now(),
        };
        set((s) => ({ ideas: [idea, ...s.ideas] }));
        return idea;
      },
      updateIdea: (ideaId, patch) =>
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, ...patch } : i)) })),
      setIdeaStatus: (ideaId, status) =>
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, status } : i)) })),
      removeIdea: (ideaId) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== ideaId) })),

      pathReactions: {},
      setPathReaction: (pathId, reaction) =>
        set((s) => ({
          pathReactions: {
            ...s.pathReactions,
            [pathId]: {
              reaction,
              notes: s.pathReactions[pathId]?.notes ?? "",
              updatedAt: Date.now(),
            },
          },
        })),
      setPathNotes: (pathId, notes) =>
        set((s) => ({
          pathReactions: {
            ...s.pathReactions,
            [pathId]: {
              reaction: s.pathReactions[pathId]?.reaction ?? null,
              notes,
              updatedAt: Date.now(),
            },
          },
        })),

      affirmations: [],
      addAffirmation: (text, mine = true) => {
        const t = text.trim();
        if (!t) return;
        const a: Affirmation = { id: id(), text: t, favorite: false, mine, createdAt: Date.now() };
        set((s) => ({ affirmations: [a, ...s.affirmations] }));
      },
      toggleFavoriteAffirmation: (affirmationId) =>
        set((s) => ({
          affirmations: s.affirmations.map((a) =>
            a.id === affirmationId ? { ...a, favorite: !a.favorite } : a
          ),
        })),
      removeAffirmation: (affirmationId) =>
        set((s) => ({ affirmations: s.affirmations.filter((a) => a.id !== affirmationId) })),

      wins: [],
      addWin: (text) => {
        const t = text.trim();
        if (!t) return;
        const w: Win = { id: id(), text: t, createdAt: Date.now() };
        set((s) => ({ wins: [w, ...s.wins] }));
      },
      removeWin: (winId) => set((s) => ({ wins: s.wins.filter((w) => w.id !== winId) })),

      reframes: [],
      addReframe: (doubt, reframe) => {
        const d = doubt.trim(), r = reframe.trim();
        if (!d || !r) return;
        const item: Reframe = { id: id(), doubt: d, reframe: r, createdAt: Date.now() };
        set((s) => ({ reframes: [item, ...s.reframes] }));
      },
      removeReframe: (reframeId) =>
        set((s) => ({ reframes: s.reframes.filter((r) => r.id !== reframeId) })),

      visualizations: [],
      addVisualization: (prompt, response) => {
        const r = response.trim();
        if (!r) return;
        const v: Visualization = { id: id(), prompt, response: r, createdAt: Date.now() };
        set((s) => ({ visualizations: [v, ...s.visualizations] }));
      },
      removeVisualization: (vId) =>
        set((s) => ({ visualizations: s.visualizations.filter((v) => v.id !== vId) })),

      gratitudes: [],
      addGratitude: (text) => {
        const t = text.trim();
        if (!t) return;
        const g: Gratitude = { id: id(), text: t, createdAt: Date.now() };
        set((s) => ({ gratitudes: [g, ...s.gratitudes] }));
      },
      removeGratitude: (gId) => set((s) => ({ gratitudes: s.gratitudes.filter((g) => g.id !== gId) })),

      letters: [],
      addLetter: (body, unlockAt) => {
        const b = body.trim();
        if (!b) return;
        const l: FutureLetter = { id: id(), body: b, createdAt: Date.now(), unlockAt, opened: false };
        set((s) => ({ letters: [l, ...s.letters] }));
      },
      openLetter: (letterId) =>
        set((s) => ({ letters: s.letters.map((l) => (l.id === letterId ? { ...l, opened: true } : l)) })),
      removeLetter: (letterId) => set((s) => ({ letters: s.letters.filter((l) => l.id !== letterId) })),

      ownerName: "",
      setOwnerName: (name) => set({ ownerName: name.trim() }),

      aiEnabled: false,
      setAiEnabled: (on) => set({ aiEnabled: on }),

      reset: () =>
        set({
          buckets: emptyBuckets(),
          ideas: [],
          pathReactions: {},
          affirmations: [],
          wins: [],
          reframes: [],
          visualizations: [],
          gratitudes: [],
          letters: [],
          ownerName: "",
        }),

      importJson: (json) => {
        if (!json || typeof json !== "object") return false;
        const partial = json as Partial<PlannerState>;
        set((s) => ({
          buckets: partial.buckets ?? s.buckets,
          ideas: partial.ideas ?? s.ideas,
          pathReactions: partial.pathReactions ?? s.pathReactions,
          affirmations: partial.affirmations ?? s.affirmations,
          wins: partial.wins ?? s.wins,
          reframes: partial.reframes ?? s.reframes,
          visualizations: partial.visualizations ?? s.visualizations,
          gratitudes: partial.gratitudes ?? s.gratitudes,
          letters: partial.letters ?? s.letters,
          ownerName: partial.ownerName ?? s.ownerName,
        }));
        return true;
      },
    }),
    {
      name: "futureplanner-v1",
      partialize: (s) => ({
        buckets: s.buckets,
        ideas: s.ideas,
        pathReactions: s.pathReactions,
        affirmations: s.affirmations,
        wins: s.wins,
        reframes: s.reframes,
        visualizations: s.visualizations,
        gratitudes: s.gratitudes,
        letters: s.letters,
        ownerName: s.ownerName,
        aiEnabled: s.aiEnabled,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

export type { PlannerState };
