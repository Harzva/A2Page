const keyFor = (scope, id) => [scope.workspaceId, scope.threadId, id];

export async function openBrowserStore() {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('a2page-demo-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pages');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return {
    read(scope, id) {
      return new Promise((resolve, reject) => {
        const request = database.transaction('pages').objectStore('pages').get(keyFor(scope, id));
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    },
    compareAndSet(page, expectedRevision) {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction('pages', 'readwrite');
        const records = transaction.objectStore('pages');
        const key = keyFor(page.scope, page.id);
        const request = records.get(key);
        let saved = false;
        request.onsuccess = () => {
          const current = request.result;
          if (expectedRevision === 0 ? current === undefined : current?.revision === expectedRevision) {
            records.put(page, key);
            saved = true;
          }
        };
        transaction.oncomplete = () => resolve(saved);
        transaction.onabort = () => reject(transaction.error ?? new Error('Page write was interrupted'));
      });
    },
  };
}
