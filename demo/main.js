import './style.css';
import { createPageService } from '../src/pages.js';
import { mountPage } from '../src/renderer.js';
import { openBrowserStore } from './browser-store.js';
import { meetingDraft, pageId, scope } from './sample.js';

const element = id => document.getElementById(id);
const notice = element('notice');
const request = element('request');
const send = element('send');
const libraryOpen = element('library-open');
const chatOpen = element('chat-open');
const title = element('page-title');
const pageElement = element('page');
let page;
let dispose;
let busy = false;
let opener;

function toggleControls() {
  request.disabled = busy;
  send.disabled = busy;
  libraryOpen.disabled = busy;
  chatOpen.disabled = busy;
  for (const option of request.options) option.disabled = option.value === 'create' ? !!page : !page;
  if (request.selectedOptions[0]?.disabled) request.value = page ? 'risks' : 'create';
}

function updateLinks() {
  element('reply').hidden = !page;
  libraryOpen.hidden = !page;
  if (!page) return;
  element('library-message').textContent = 'A saved page is ready to open.';
  element('card-title').textContent = page.title;
  element('card-state').textContent = page.revision === 1 ? 'Open page →' : 'Updated · Open latest →';
}

function showPage({ focus = false } = {}) {
  dispose?.();
  dispose = mountPage(element('surface'), page);
  title.textContent = page.title;
  element('revision').textContent = 'Revision ' + page.revision;
  element('empty').hidden = true;
  pageElement.hidden = false;
  if (focus) title.focus();
}

async function start() {
  const service = createPageService({ store: await openBrowserStore(), newId: () => pageId });
  async function refresh() {
    try {
      page = await service.get(scope, pageId);
    } catch (error) {
      if (error.code !== 'PAGE_NOT_FOUND') throw error;
      page = undefined;
    }
    updateLinks();
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    toggleControls();
    notice.textContent = '';
    try {
      await action();
    } catch (error) {
      notice.textContent = error.code === 'PAGE_CONFLICT' ? error.message : 'Could not read or save the local page.';
    } finally {
      busy = false;
      toggleControls();
    }
  }

  await refresh();
  toggleControls();

  for (const button of [libraryOpen, chatOpen]) {
    button.addEventListener('click', () => run(async () => {
      await refresh();
      if (!page) return;
      opener = button;
      showPage({ focus: true });
    }));
  }

  element('close-page').addEventListener('click', () => {
    dispose?.();
    dispose = undefined;
    pageElement.hidden = true;
    element('empty').hidden = false;
    (opener ?? libraryOpen).focus();
  });

  element('turn').addEventListener('submit', event => {
    event.preventDefault();
    const command = request.value;
    return run(async () => {
      const draft = meetingDraft(command === 'risks');
      if (command === 'create') {
        page = await service.create(scope, draft);
      } else {
        if (!page || !['risks', 'restore'].includes(command)) return;
        page = await service.update(scope, page.id, page.revision, draft);
      }
      updateLinks();
      if (!pageElement.hidden) showPage();
      notice.textContent = command === 'create' ? 'Page saved. Open it from its card.' : 'Saved revision ' + page.revision + ' to the same page.';
    });
  });
}

start().catch(() => { notice.textContent = 'Local page storage is unavailable in this browser.'; });
