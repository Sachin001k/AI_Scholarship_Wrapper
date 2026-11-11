/**
 * POST /api/v1/match — Path A matching (design doc §5.4, §6.7).
 * Accepts the profile in the body so guests (demo mode) can match too;
 * signed-in clients send the same shape. Errors use RFC 7807 problem+json.
 */
import { getCatalog } from "@/lib/catalog/queries";
import { profileSchema } from "@/lib/domain/profile-schema";
import { computeMatches } from "@/lib/recommendation/service";

const problem = (status: number, title: string, detail?: unknown) =>
  Response.json({ type: "about:blank", title, status, detail }, { status, headers: { "content-type": "application/problem+json" } });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body?.profile);
  if (!parsed.success) return problem(400, "Invalid profile", parsed.error.issues.slice(0, 5));

  const catalog = await getCatalog();
  const result = computeMatches(parsed.data, catalog.opportunities, new Date());
  return Response.json({ ...result, source: catalog.source }, { headers: { "cache-control": "no-store" } });
}
