"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { InventoryItem } from "@/lib/types";
import { sourceOwnerLabels } from "@/lib/categories";
import { ItemCard } from "@/components/ItemCard";

type Facets = {
  categories: string[];
  eras: string[];
  tags: string[];
  sources: string[];
};

const SORTS = ["Default", "Price · low to high", "Price · high to low", "A–Z"];

export function ArchiveBrowser({
  items,
  facets,
}: {
  items: InventoryItem[];
  facets: Facets;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState(() => params.get("category") ?? "");
  const [era, setEra] = useState(() => params.get("era") ?? "");
  const [source, setSource] = useState(() => params.get("source") ?? "");
  const [sort, setSort] = useState(() => params.get("sort") ?? "Default");
  const [tags, setTags] = useState<string[]>(() => {
    const t = params.get("tags") ?? params.get("tag");
    return t ? t.split(",").filter(Boolean) : [];
  });

  // Keep the URL in sync so a filtered archive view is shareable and
  // bookmarkable. Skips the first run — initial state already came from the URL.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const q = new URLSearchParams();
    if (search) q.set("q", search);
    if (category) q.set("category", category);
    if (era) q.set("era", era);
    if (source) q.set("source", source);
    if (sort !== "Default") q.set("sort", sort);
    if (tags.length) q.set("tags", tags.join(","));
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [search, category, era, source, sort, tags, pathname, router]);

  const toggleTag = (t: string) =>
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const hasFilters =
    search || category || era || source || tags.length > 0 || sort !== "Default";

  const reset = () => {
    setSearch("");
    setCategory("");
    setEra("");
    setSource("");
    setSort("Default");
    setTags([]);
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((item) => {
      if (category && item.category !== category) return false;
      if (era && item.era !== era) return false;
      if (source && item.source_owner !== source) return false;
      if (tags.length > 0 && !tags.some((t) => item.tags.includes(t))) return false;
      if (q) {
        const haystack = [
          item.title,
          item.description,
          item.category,
          item.era,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const priceOf = (i: InventoryItem) =>
      i.price_day ?? Number.POSITIVE_INFINITY;
    if (sort === "Price · low to high") {
      list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    } else if (sort === "Price · high to low") {
      list = [...list].sort((a, b) => {
        const av = a.price_day ?? -1;
        const bv = b.price_day ?? -1;
        return bv - av;
      });
    } else if (sort === "A–Z") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [items, search, category, era, source, tags, sort]);

  return (
    <div className="archive">
      <div className="wrap">
        <div className="filters">
          <div className="filters__search">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the archive — title, vibe, era, function…"
              aria-label="Search inventory"
            />
          </div>
          <div className="filters__row">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {facets.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={era}
              onChange={(e) => setEra(e.target.value)}
              aria-label="Filter by era"
            >
              <option value="">All eras</option>
              {facets.eras.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-label="Filter by source"
            >
              <option value="">All sources</option>
              {facets.sources.map((s) => (
                <option key={s} value={s}>
                  {sourceOwnerLabels[s] ?? s}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort results"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="filters__chips">
            {facets.tags.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${tags.includes(t) ? "chip--on" : ""}`}
                aria-pressed={tags.includes(t)}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="archive-bar">
          <span>
            {results.length} {results.length === 1 ? "object" : "objects"}
            {items.length !== results.length ? ` / ${items.length}` : ""}
          </span>
          {hasFilters && (
            <button type="button" className="archive-bar__clear" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>

        <h2 className="sr-only">Inventory results</h2>

        {results.length === 0 ? (
          <div className="empty">
            <h3>Nothing matches that yet.</h3>
            <p>
              The archive is a curated subset. Can&apos;t find it? Use{" "}
              <a href="/source" className="hot">
                Source Something
              </a>{" "}
              — that&apos;s exactly what it&apos;s for.
            </p>
          </div>
        ) : (
          <div className="grid">
            {results.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
