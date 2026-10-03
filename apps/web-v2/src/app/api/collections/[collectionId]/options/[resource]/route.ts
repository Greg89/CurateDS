import { itemRoute } from "@/lib/item-route";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ collectionId: string; resource: string }> }) {
  const { collectionId, resource } = await context.params;
  return itemRoute(request, collectionId, [resource], true);
}
