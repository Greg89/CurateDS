import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CollectionWorkspace } from "@/components/collection-workspace";

export default async function CollectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  if (!z.string().uuid().safeParse(collectionId).success) notFound();
  return <CollectionWorkspace>{children}</CollectionWorkspace>;
}
