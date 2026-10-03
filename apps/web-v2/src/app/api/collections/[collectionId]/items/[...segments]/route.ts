import { itemRoute } from "@/lib/item-route";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ collectionId: string; segments: string[] }> };
async function handle(request: Request, context: Context) {
  const { collectionId, segments } = await context.params;
  return itemRoute(request, collectionId, segments);
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
