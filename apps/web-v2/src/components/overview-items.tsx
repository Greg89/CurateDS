"use client";
import Link from "next/link";
import { ItemImage } from "./item-shared";
import type { RecentItem } from "@/lib/collections";

export function OverviewItems({
  title,
  items,
  collectionId,
}: {
  title: string;
  items: RecentItem[];
  collectionId: string;
}) {
  return (
    <section className="overview-items" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/collections/${collectionId}/items/${item.id}`}>
              <ItemImage
                key={item.primaryImageUrl}
                url={item.primaryImageUrl}
                name={item.name}
              />
              <h3>{item.name}</h3>
            </Link>
            <p>{item.description || "A part of your collection."}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
