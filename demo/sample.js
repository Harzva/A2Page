import { catalogId } from '../src/catalog.js';

export const scope = { workspaceId: 'example', threadId: 'launch-meeting' };
export const pageId = 'launch-follow-up';

export function meetingDraft(riskFirst = false) {
  const order = riskFirst ? ['risk', 'decisions', 'actions'] : ['decisions', 'actions'];
  return {
    title: 'Launch meeting follow-up',
    surface: {
      version: '1.0',
      createSurface: {
        surfaceId: 'page',
        catalogId,
        dataModel: { docsChecked: false, rolloutChecked: false },
        components: [
          { id: 'root', component: 'Column', children: ['intro', 'rule', ...order] },
          { id: 'intro', component: 'Text', text: 'A staged release is still on track. Confirm rollback ownership before opening the next cohort.' },
          { id: 'rule', component: 'Divider' },
          ...(riskFirst ? [
            { id: 'risk', component: 'Card', child: 'riskText' },
            { id: 'riskText', component: 'Text', text: 'Launch risk: rollback ownership is not confirmed. Hold any cohort expansion until a reviewer signs off.' },
          ] : []),
          { id: 'decisions', component: 'Column', children: ['decisionLabel', 'decisionText'] },
          { id: 'decisionLabel', component: 'Text', text: 'DECISIONS', variant: 'caption' },
          { id: 'decisionText', component: 'Text', text: 'Start with the pilot cohort. Review reliability after one day before expanding.' },
          { id: 'actions', component: 'Column', children: ['actionLabel', 'docs', 'rollout'] },
          { id: 'actionLabel', component: 'Text', text: 'FOLLOW-UPS', variant: 'caption' },
          { id: 'docs', component: 'CheckBox', label: 'Lin · Review release notes', value: { '@path': '/docsChecked' } },
          { id: 'rollout', component: 'CheckBox', label: 'Zhou · Confirm rollback owner', value: { '@path': '/rolloutChecked' } },
        ],
      },
    },
  };
}
