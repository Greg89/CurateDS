"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Collection } from "@/lib/collections";

const Context = createContext<Collection | null>(null);
export function CollectionProvider({
  collection,
  children,
}: {
  collection: Collection;
  children: ReactNode;
}) {
  return <Context.Provider value={collection}>{children}</Context.Provider>;
}
export function useCollection() {
  const collection = useContext(Context);
  if (!collection)
    throw new Error(
      "Collection context is only available inside a collection route.",
    );
  return collection;
}
