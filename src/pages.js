import { z } from 'zod';
import { validateSurface } from './catalog.js';

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/);
const itemScope = z.object({ workspaceId: identifier, threadId: identifier }).strict();
const draftSchema = z.object({ title: z.string().trim().min(1).max(120), surface: z.unknown() }).strict();
const savedSchema = draftSchema.extend({
  schemaVersion: z.literal(1),
  id: identifier,
  scope: itemScope,
  revision: z.number().int().positive().safe(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const storageError = (code, message) => Object.assign(new Error(message), { code });
const missing = () => storageError('PAGE_NOT_FOUND', 'Page not found in this conversation.');
const conflict = () => storageError('PAGE_CONFLICT', 'The page has changed. Reload the latest version before editing.');

export function createPageService({
  store,
  newId = () => globalThis.crypto.randomUUID(),
  now = () => new Date(),
}) {
  async function get(scope, id) {
    const expected = itemScope.parse(scope);
    const pageId = identifier.parse(id);
    const raw = await store.read(expected, pageId);
    if (raw == null) throw missing();
    const page = savedSchema.parse(raw);
    if (page.id !== pageId || page.scope.workspaceId !== expected.workspaceId ||
        page.scope.threadId !== expected.threadId) throw missing();
    return { ...page, surface: validateSurface(page.surface) };
  }

  async function create(scope, input) {
    const { title, surface } = draftSchema.parse(input);
    const createdAt = now().toISOString();
    const page = {
      schemaVersion: 1, id: identifier.parse(newId()), scope: itemScope.parse(scope),
      title, revision: 1, createdAt, updatedAt: createdAt, surface: validateSurface(surface),
    };
    if (!await store.compareAndSet(structuredClone(page), 0)) throw conflict();
    return page;
  }

  async function update(scope, id, expectedRevision, input) {
    const current = await get(scope, id);
    if (expectedRevision !== current.revision) throw conflict();
    const { title, surface } = draftSchema.parse(input);
    const page = {
      ...current, title, surface: validateSurface(surface),
      updatedAt: now().toISOString(), revision: current.revision + 1,
    };
    if (!await store.compareAndSet(structuredClone(page), expectedRevision)) throw conflict();
    return page;
  }

  return { create, get, update };
}
