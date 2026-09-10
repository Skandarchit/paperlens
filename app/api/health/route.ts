import { getAIConfig } from '@/lib/server-config';
export function GET() { return Response.json({ status: 'ok', aiAvailable: !!getAIConfig() }, { headers: { 'Cache-Control': 'no-store' } }); }
