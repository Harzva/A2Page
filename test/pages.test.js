import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meetingDraft, pageId, scope } from '../demo/sample.js';
import { createPageService } from '../src/pages.js';

function createFixture() {
  const records = new Map();
  const keyFor = (context, id) => JSON.stringify([context.workspaceId, context.threadId, id]);
  const store = {
    read: (context, id) => records.get(keyFor(context, id)),
    compareAndSet(page, revision) {
      const key = keyFor(page.scope, page.id);
      if ((records.get(key)?.revision ?? 0) !== revision) return false;
      records.set(key, page);
      return true;
    },
  };
  const service = () => createPageService({ store, newId: () => pageId });
  return { newService: service, service: service(), store };
}

test('an old page reference opens the latest committed revision of the same page', async () => {
  const { service, newService } = createFixture();
  const created = await service.create(scope, meetingDraft());
  const updated = await service.update(scope, created.id, 1, meetingDraft(true));
  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.revision, 2);
  assert.deepEqual(await newService().get(scope, created.id), updated);
});

test('concurrent revisions cannot overwrite each other', async () => {
  const { service } = createFixture();
  await service.create(scope, meetingDraft());
  const results = await Promise.allSettled([
    service.update(scope, pageId, 1, meetingDraft(true)),
    service.update(scope, pageId, 1, meetingDraft()),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected')?.reason.code, 'PAGE_CONFLICT');
  assert.equal((await service.get(scope, pageId)).revision, 2);
});

test('reads and updates require both workspace and conversation to match', async () => {
  const { service, store } = createFixture();
  const created = await service.create(scope, meetingDraft());
  for (const wrong of [{ ...scope, workspaceId: 'other' }, { ...scope, threadId: 'other' }]) {
    await assert.rejects(service.get(wrong, pageId), { code: 'PAGE_NOT_FOUND' });
    await assert.rejects(service.update(wrong, pageId, 1, meetingDraft(true)), { code: 'PAGE_NOT_FOUND' });
  }
  const badStore = createPageService({ store: { ...store, read: () => created } });
  await assert.rejects(badStore.get({ ...scope, threadId: 'other' }, pageId), { code: 'PAGE_NOT_FOUND' });
});

test('rejects unsupported components, functions, cycles, and unknown data bindings before committing', async () => {
  const { service } = createFixture();
  const change = [
    surface => { surface.components[1].component = 'Image'; },
    surface => { surface.components[1].text = { call: 'openUrl', args: {} }; },
    surface => { surface.components[0].children.push('root'); },
    surface => { delete surface.dataModel.docsChecked; },
    surface => { surface.components.find(node => node.id === 'docs').value = { path: '/docsChecked' }; },
    surface => { surface.sendDataModel = true; },
  ];
  for (const mutate of change) {
    const draft = meetingDraft();
    mutate(draft.surface.createSurface);
    await assert.rejects(service.create(scope, draft));
    await assert.rejects(service.get(scope, pageId), { code: 'PAGE_NOT_FOUND' });
  }
});

test('local view mutations do not leak into the stored page', async () => {
  const { service } = createFixture();
  const page = await service.create(scope, meetingDraft());
  page.surface.createSurface.dataModel.docsChecked = true;
  const saved = await service.get(scope, page.id);
  assert.equal(saved.surface.createSurface.dataModel.docsChecked, false);
  saved.surface.createSurface.dataModel.docsChecked = true;
  assert.equal((await service.get(scope, page.id)).surface.createSurface.dataModel.docsChecked, false);
});

test('a rejected update leaves the saved page intact', async () => {
  const { service } = createFixture();
  const page = await service.create(scope, meetingDraft());
  await assert.rejects(service.update(scope, page.id, 1, { title: 'Invalid', surface: {} }));
  assert.deepEqual(await service.get(scope, page.id), page);
});
