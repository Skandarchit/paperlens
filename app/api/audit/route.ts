import { audit } from '@/lib/audit/engine';
import { auditInputSchema, readBoundedJSON } from '@/lib/audit/validation';
import { auditWithAI } from '@/lib/audit/ai';
import { getAIConfig } from '@/lib/server-config';
export async function POST(request: Request) {
  try {
    const parsed = auditInputSchema.safeParse(await readBoundedJSON(request));
    if (!parsed.success) return Response.json({ error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 });
    if (parsed.data.useAI) {
      const config = getAIConfig();
      if (!config) return Response.json({ error: 'AI review is not configured. Switch it off to run the rule-based audit.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      try { return Response.json(await auditWithAI(parsed.data, config), { headers: { 'Cache-Control': 'no-store' } }); }
      catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'AI review failed.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } }); }
    }
    return Response.json(audit(parsed.data), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'The audit could not be completed.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
}
