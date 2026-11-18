import { injectBasicCatalogStyles, MessageProcessor, NodeResolver, renderA2uiNode } from '@a2ui/web_core/v1_0';
import { nothing, render } from 'lit';
import { pageCatalog, validateSurface } from './catalog.js';

export function mountPage(container, page) {
  const message = validateSurface(page.surface);
  const processor = new MessageProcessor([pageCatalog], undefined, { version: '1.0' });
  const slot = container.ownerDocument.createElement('div');
  let resolver;
  try {
    injectBasicCatalogStyles();
    processor.processMessages(structuredClone(message));
    resolver = new NodeResolver(processor.model.getSurface('page'));
    container.replaceChildren(slot);
    render(renderA2uiNode(resolver.rootNode.value), slot);
  } catch (error) {
    resolver?.dispose();
    processor.dispose();
    throw error;
  }
  return () => {
    render(nothing, slot);
    slot.remove();
    resolver.dispose();
    processor.dispose();
  };
}
