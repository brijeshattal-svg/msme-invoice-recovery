export async function GET() {
  // Reports only whether the key is set, never the key itself.
  return Response.json(
    { ok: true, hasKey: Boolean(process.env.ANTHROPIC_API_KEY) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
