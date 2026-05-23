"use client";

import { useCallback, useEffect, useState } from "react";

export function ItemGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(count - 1, 0));
  const current = images[safeIndex];

  const next = useCallback(
    () => setIndex((i) => (count > 0 ? (i + 1) % count : 0)),
    [count]
  );
  const prev = useCallback(
    () => setIndex((i) => (count > 0 ? (i - 1 + count) % count : 0)),
    [count]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, next, prev]);

  if (count === 0) return null;

  return (
    <>
      <button
        type="button"
        className="gallery__hero"
        onClick={() => setOpen(true)}
        aria-label={`View ${title} at full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={title} />
        <span className="gallery__hero-expand" aria-hidden="true">
          ⤢ Open
        </span>
      </button>

      {count > 1 ? (
        <div className="gallery__thumbs" role="list">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="listitem"
              className={`gallery__thumb ${i === safeIndex ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === safeIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${title}, image ${safeIndex + 1} of ${count}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            Close ✕
          </button>

          {count > 1 ? (
            <button
              type="button"
              className="lightbox__nav lightbox__nav--prev"
              onClick={prev}
              aria-label="Previous image"
            >
              ‹
            </button>
          ) : null}

          <div className="lightbox__stage" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={title} />
          </div>

          {count > 1 ? (
            <button
              type="button"
              className="lightbox__nav lightbox__nav--next"
              onClick={next}
              aria-label="Next image"
            >
              ›
            </button>
          ) : null}

          {count > 1 ? (
            <div className="lightbox__count" aria-hidden="true">
              {safeIndex + 1} / {count}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
