import { collectionRoute } from "@/lib/collection-route";
export const dynamic = "force-dynamic";
export async function GET() {
  return collectionRoute();
}
export async function POST(request: Request) {
  return collectionRoute(request);
}
