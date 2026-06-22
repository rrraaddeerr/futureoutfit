import type { BucketKey } from "./data";

export type Entry = {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
};

export type IdeaStatus = "spark" | "exploring" | "committed" | "archived";
export type IdeaSource = "remix" | "ai" | "manual";

export type Idea = {
  id: string;
  text: string;
  source: IdeaSource;
  status: IdeaStatus;
  notes: string;
  nextSteps: string[];
  createdAt: number;
};

export type Reaction = "yes" | "maybe" | "no";

export type PathReaction = {
  reaction: Reaction | null;
  notes: string;
  updatedAt: number;
};

export type Affirmation = {
  id: string;
  text: string;
  favorite: boolean;
  mine: boolean;
  createdAt: number;
};

export type Win = {
  id: string;
  text: string;
  createdAt: number;
};

export type Reframe = {
  id: string;
  doubt: string;
  reframe: string;
  createdAt: number;
};

export type Visualization = {
  id: string;
  prompt: string;
  response: string;
  createdAt: number;
};

export type Gratitude = {
  id: string;
  text: string;
  createdAt: number;
};

export type FutureLetter = {
  id: string;
  body: string;
  createdAt: number;
  unlockAt: number;
  opened: boolean;
};

export type Buckets = Record<BucketKey, Entry[]>;
