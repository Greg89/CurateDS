import { readiness } from "@/lib/readiness";
export const dynamic = "force-dynamic";
export async function GET() {
  return readiness(process.env);
}
export async function HEAD() {
  const response = await GET();
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
