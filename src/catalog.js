import { A2uiLitElement, basicCatalog, MessageProcessor } from '@a2ui/web_core/v1_0';
import { css, html, nothing } from 'lit';
import { z } from 'zod';

export const catalogId = 'https://github.com/Harzva/A2Page/catalogs/page-v1';
const names = ['Text', 'Column', 'Row', 'Card', 'Divider', 'CheckBox'];
class PageText extends A2uiLitElement {
  static styles = css`
    :host { display: block; overflow-wrap: anywhere; }
    .caption { font-size: .875em; font-weight: 650; }
  `;

  render() {
    const props = this.controller.props;
    if (!props) return nothing;
    return html`<span class=${props.variant === 'caption' ? 'caption' : ''}>${props.text}</span>`;
  }
}
const plainText = { ...basicCatalog.components.get('Text'), tagName: 'a2page-text', element: PageText };
export const pageCatalog = basicCatalog.derive({
  catalogId,
  components: names.map(name => name === 'Text' ? plainText : name),
  functions: [],
});

const identifier = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const text = z.string().max(2000);
const path = z.object({ '@path': z.string().regex(/^\/[A-Za-z][A-Za-z0-9_-]{0,63}$/) }).strict();
const component = (name, fields) => z.object({ id: identifier, component: z.literal(name), ...fields }).strict();
const children = z.array(identifier).min(1).max(32);
const surfaceSchema = z.object({
  version: z.literal('1.0'),
  createSurface: z.object({
    surfaceId: z.literal('page'),
    catalogId: z.literal(catalogId),
    components: z.array(z.discriminatedUnion('component', [
      component('Text', { text, variant: z.enum(['body', 'caption']).optional() }),
      component('Column', { children }),
      component('Row', { children }),
      component('Card', { child: identifier }),
      component('Divider', {}),
      component('CheckBox', { label: text, value: path }),
    ])).min(1).max(160),
    dataModel: z.record(identifier, z.boolean()).optional(),
  }).strict(),
}).strict();

export function validateSurface(input) {
  const message = surfaceSchema.parse(input);
  const { components, dataModel = {} } = message.createSurface;
  if (Object.keys(dataModel).length > 160 ||
      Object.keys(dataModel).some(key => ['constructor', 'prototype'].includes(key))) {
    throw new Error('Invalid page data model');
  }
  const nodes = new Map(components.map(node => [node.id, node]));
  const seen = new Set();
  function visit(id, depth) {
    const node = nodes.get(id);
    if (!node || seen.has(id) || depth > 12) throw new Error('Invalid page component tree');
    seen.add(id);
    if (node.component === 'CheckBox' && !Object.hasOwn(dataModel, node.value['@path'].slice(1))) {
      throw new Error('Checkbox must bind to existing page data');
    }
    for (const child of node.children ?? (node.child ? [node.child] : [])) visit(child, depth + 1);
  }
  visit('root', 0);
  if (nodes.size !== components.length || seen.size !== nodes.size) throw new Error('Invalid page component tree');

  const processor = new MessageProcessor([pageCatalog], undefined, { version: '1.0' });
  try {
    processor.processMessages(structuredClone(message));
  } finally {
    processor.dispose();
  }
  return message;
}
