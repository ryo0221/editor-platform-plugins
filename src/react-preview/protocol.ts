import { z } from 'zod';
import { validatePreviewDocument } from './catalog';
const id = z.string().uuid();
const renderSchema = z.object({ protocol: z.literal(1), type: z.literal('render'), sessionId: id, requestId: id,
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), mode: z.enum(['edit', 'interact']),
  viewport: z.object({ width: z.union([z.literal(390), z.literal(1024), z.literal(1400)]), height: z.literal(700) }).strict(), document: z.unknown() }).strict();
export function parseRender(raw: unknown) {
  const request = renderSchema.parse(raw);
  return { ...request, document: validatePreviewDocument(request.document) };
}
export const bootstrapSchema = z.object({ protocol: z.literal(1), type: z.literal('host-ready-request') }).strict();
export function expectedSender(event: { source: unknown; origin: string }, parent: unknown, origin: string) {
  return !!parent && event.source === parent && event.origin === origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
}
