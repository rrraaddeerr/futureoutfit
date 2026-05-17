import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllItems,
  getItemBySlug,
  getRelatedItems,
  formatPrice,
} from "@/lib/inventory";
import { sourceOwnerLabels } from "@/lib/categories";
import { ItemPlaceholder } from "@/components/ItemPlaceholder";
import { ItemCard } from "@/components/ItemCard";
import { AddToRequestButton } from "@/components/AddToRequestButton";
import { TapeLabel } from "@/components/TapeLabel";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllItems().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) return { title: "Object not found" };
  return {
    title: item.title,
    description: `${item.description} — ${item.category}, ${item.era}. Rental inquiry via rent.co.`,
  };
}

export default async function ItemPage({ params }: Params) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();

  const related = getRelatedItems(item, 4);

  return (
    <div className="item">
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/archive">Archive</Link>
          {" / "}
          <Link href={`/archive?category=${encodeURIComponent(item.category)}`}>
            {item.category}
          </Link>
          {" / "}
          <span>{item.id.toUpperCase()}</span>
        </nav>

        <div className="item__top">
          <div className="item__media">
            {item.images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.images[0]} alt={item.title} />
            ) : (
              <ItemPlaceholder item={item} />
            )}
          </div>

          <div>
            <TapeLabel className="item__cat" rotate={-2}>
              {item.category}
            </TapeLabel>
            <h1 className="item__title">{item.title}</h1>
            <p className="item__desc">{item.description}</p>

            <div className="price-box">
              <div className="price-box__item">
                <span className="price-box__k">Day rate</span>
                <span className="price-box__v">{formatPrice(item.price_day)}</span>
              </div>
              <div className="price-box__item">
                <span className="price-box__k">Week rate</span>
                <span className="price-box__v">{formatPrice(item.price_week)}</span>
              </div>
              <div className="price-box__item">
                <span className="price-box__k">Replacement value</span>
                <span className="price-box__v">
                  {formatPrice(item.replacement_value)}
                </span>
              </div>
            </div>

            <p className="item__avail">
              Availability is not guaranteed live. {item.availability_note}
            </p>

            <AddToRequestButton itemId={item.id} variant="full" />

            <table className="spec">
              <tbody>
                <tr>
                  <th>Item ID</th>
                  <td>{item.id.toUpperCase()}</td>
                </tr>
                <tr>
                  <th>Dimensions</th>
                  <td>{item.dimensions}</td>
                </tr>
                <tr>
                  <th>Era</th>
                  <td>{item.era}</td>
                </tr>
                <tr>
                  <th>Source / owner</th>
                  <td>{sourceOwnerLabels[item.source_owner] ?? item.source_owner}</td>
                </tr>
                <tr>
                  <th>Location</th>
                  <td>{item.location}</td>
                </tr>
                <tr>
                  <th>Condition</th>
                  <td>{item.condition}</td>
                </tr>
              </tbody>
            </table>

            <div className="tag-row">
              {item.tags.map((t) => (
                <TapeLabel key={t}>{t}</TapeLabel>
              ))}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="section" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <div className="section-head">
              <div>
                <TapeLabel className="section-head__tape">Related</TapeLabel>
                <h2 className="section-head__title">Pairs well with</h2>
              </div>
            </div>
            <div className="grid">
              {related.map((r) => (
                <ItemCard key={r.id} item={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
