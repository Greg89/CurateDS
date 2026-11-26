import type { Metadata } from "next";
import { PublicationReview } from "@/components/publication-review";
export const metadata: Metadata = {
  title: "Private sharing review",
  description: "Review your collection before sharing it.",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <PublicationReview />;
}
