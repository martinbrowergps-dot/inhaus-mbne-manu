import { createFileRoute } from "@tanstack/react-router";

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handle({ request }: { request: Request }) {
  const expected = process.env["SYNC_SHEETS_TOKEN"];
  const provided = request.headers.get("x-sync-token") ?? "";
  if (!expected || !timingSafeEqualStr(provided, expected)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { runSync } = await import("@/lib/sync-sheets.server");
    const result = await runSync({ origem: "cron" });
    return Response.json(result);
  } catch (err) {
    console.error("[sync-sheets] falha:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/hooks/sync-sheets")({
  server: {
    handlers: {
      POST: handle,
      GET: handle,
    },
  },
});
