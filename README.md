# A2Page

**Pages an agent can create, and keep editing.** A2Page adds stable, revisable page records to [A2UI](https://a2ui.org/). It is a small host library and a working meeting follow-up demo, not a new wire protocol.

[中文说明](README.zh-CN.md) · [Bot Studio integration guide](docs/bot-studio.md)

## Try it

With Node.js 24 (or a supported version from `package.json`):

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. Send **Create a meeting follow-up page**, then open the page card. Check an item and close and reopen the page: the checkbox is local view state, so it resets. Send **Put launch risks first** to add a risk section above the decisions on the same page. Refresh and reopen from the original card to see revision 2.

The demo uses a scripted agent and synthetic meeting data; it doesn't call a model, request credentials, or send the page to a server. IndexedDB stores the latest document in this browser and origin. The demo is not a shared service.

## Integrate

- `a2page`: `createPageService({ store })` provides `create(scope, draft)`, `get(scope, id)`, and `update(scope, id, expectedRevision, draft)`. A draft contains a title and a complete A2UI v1.0 `createSurface` snapshot. The host owns page IDs and scope.
- `a2page/catalog`: `catalogId`, `pageCatalog`, and `validateSurface()` define the preview's restricted profile. It allows text, rows, columns, cards, dividers, and bound checkboxes. It rejects other events or components, functions, remote media, and malformed trees. Use `demo/sample.js` for an example draft.
- `a2page/renderer`: `mountPage(container, page)` replaces the contents of a dedicated browser container and returns a disposer. The host can render the same record beside chat, in a library, or in its own route.

Supply a store with `read(scope, id)` and atomic `compareAndSet(page, expectedRevision)`. Expected revision `0` means the record must not exist. A stale revision fails with `PAGE_CONFLICT`; no automatic retry or overwrite. A2Page validates the scope in returned records, but authenticating the caller and authorizing the workspace and thread are **host responsibilities**. See the [reference store](demo/browser-store.js) for an IndexedDB implementation.

Version 0.1 stores the latest snapshot, not revision history. It does not support live network data, streaming page patches, team permission management, or public links. Package imports are available when vendored or installed from source; no npm release yet.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Use `A2PAGE_CHROME=1 npm run test:browser` to run against an existing Google Chrome installation.

MIT licensed. The renderer uses the Apache-2.0-licensed official `@a2ui/web_core` package. Grok Bot Pages inspired the side-by-side workflow; this project is independent and uses no Grok Bot code or assets.
