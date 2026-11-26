import { collectionRoute } from "@/lib/collection-route";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  return collectionRoute(
    request,
    (await context.params).collectionId,
    "summary",
  );
}
