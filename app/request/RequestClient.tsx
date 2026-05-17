"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getItemsByIds, priceTeaser } from "@/lib/inventory";
import { ItemPlaceholder } from "@/components/ItemPlaceholder";
import { RentalRequestForm } from "@/components/forms/RentalRequestForm";
import { TapeLabel } from "@/components/TapeLabel";

export function RequestClient() {
  const ids = useCart((s) => s.ids);
  const hydrated = useCart((s) => s.hydrated);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const items = hydrated ? getItemsByIds(ids) : [];
  const selected = items.map((i) => ({ id: i.id, title: i.title }));

  return (
    <div className="form-wrap">
      <div className="wrap">
        <section style={{ marginBottom: 40 }}>
          <TapeLabel rotate={-2}>Selected objects</TapeLabel>
          <h2 className="section-head__title" style={{ marginTop: 14, marginBottom: 18 }}>
            {hydrated ? items.length : 0} in this request
          </h2>

          {!hydrated ? (
            <p className="form-files">Loading your request…</p>
          ) : items.length === 0 ? (
            <div className="empty">
              <h3>No objects selected yet.</h3>
              <p>
                Add objects from the{" "}
                <Link href="/archive" className="hot">
                  archive
                </Link>{" "}
                — or send a general rental request below and describe what you
                need in the notes.
              </p>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {items.map((item) => (
                  <div key={item.id} className="cart-row">
                    <Link href={`/archive/${item.slug}`} className="cart-row__thumb">
                      {item.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.images[0]} alt={item.title} />
                      ) : (
                        <ItemPlaceholder item={item} />
                      )}
                    </Link>
                    <div className="cart-row__info">
                      <Link href={`/archive/${item.slug}`} className="cart-row__title">
                        {item.title}
                      </Link>
                      <div className="cart-row__meta">
                        {item.id.toUpperCase()} · {item.category} ·{" "}
                        {priceTeaser(item)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-row__remove"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.title}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="archive-bar__clear" onClick={clear}>
                Clear all
              </button>
            </>
          )}
        </section>

        <div className="form-grid">
          <RentalRequestForm selectedItems={selected} onSubmitted={clear} />
          <aside className="form-aside">
            <TapeLabel className="form-aside__tape" rotate={2}>
              What happens next
            </TapeLabel>
            <h3>Inquiry, not checkout.</h3>
            <ul>
              <li>Your request reaches RaderENT directly — read by a person.</li>
              <li>We confirm availability by hand; nothing here is live stock.</li>
              <li>You get a hold and a quote, with room for flexible deals.</li>
              <li>Delivery, pickup, and logistics are scoped with you.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
