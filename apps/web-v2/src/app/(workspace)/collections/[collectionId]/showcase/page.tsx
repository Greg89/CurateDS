import type { Metadata } from "next";
import { CollectionShowcase } from "@/components/collection-showcase";

export const metadata: Metadata = {
  title: "Private showcase preview",
  description: "Your private collection presentation in CurateDS.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CollectionShowcase />;
}
