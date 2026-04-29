import { ReviewContext } from './review-context.types';

function formatPolicies(context: ReviewContext): string {
  if (context.policies.length === 0) {
    return 'No policies provided.';
  }

  return context.policies
    .map((policy) => {
      const rules: string[] = [];

      if (policy.rules?.clientReviewPeriodDays !== undefined) {
        rules.push(
          `clientReviewPeriodDays: ${policy.rules.clientReviewPeriodDays}`,
        );
      }

      if (policy.rules?.freelancerDelayGraceDays !== undefined) {
        rules.push(
          `freelancerDelayGraceDays: ${policy.rules.freelancerDelayGraceDays}`,
        );
      }

      if (rules.length === 0) {
        return `- ${policy.type}: ${policy.clause}`;
      }

      return `- ${policy.type}: ${policy.clause} (${rules.join(', ')})`;
    })
    .join('\n');
}

function formatCriteria(criteria: string[]): string {
  if (criteria.length === 0) {
    return 'No acceptance criteria provided.';
  }

  return criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n');
}

function formatEvidence(context: ReviewContext): string {
  if (context.delivery.evidence.length === 0) {
    return 'No evidence references provided.';
  }

  return context.delivery.evidence
    .map((item, index) => {
      if (item.kind === 'url') {
        return `${index + 1}. URL: ${item.ref}`;
      }

      const fileDetails = [item.fileName, item.fileType].filter(Boolean).join(' | ');

      return `${index + 1}. FILE: ${item.ref}${fileDetails ? ` | ${fileDetails}` : ''}`;
    })
    .join('\n');
}

function formatRelatedCriteria(context: ReviewContext): string {
  if (context.relatedCriteria.length === 0) {
    return 'No related criteria specified.';
  }

  return context.relatedCriteria
    .map((criterion, index) => `${index + 1}. ${criterion}`)
    .join('\n');
}

export function buildReviewPrompt(context: ReviewContext): string {
  const reasoningLanguage =
    context.locale === 'en'
      ? 'Write the reasoning text in English.'
      : 'Write the reasoning text in Arabic.';

  return [
    '1. Output rules',
    'Return JSON only.',
    'Do not add text before or after JSON.',
    'Keep JSON keys in English.',
    'Use only the information below.',
    '',
    '2. Task',
    'Review the delivery against the agreement, milestone, policies, objection, and evidence.',
    'Evaluate each acceptance criterion one by one.',
    'Identify any requested item that is outside the milestone scope.',
    reasoningLanguage,
    '',
    '3. JSON schema',
    '{',
    '  "matchScore": number,',
    '  "recommendation": "ACCEPT" | "REJECT" | "PARTIAL" | "NEEDS_HUMAN_REVIEW",',
    '  "completedCriteria": string[],',
    '  "missingCriteria": string[],',
    '  "outOfScopeItems": string[],',
    '  "reasoning": string',
    '}',
    '',
    '4. Recommendation rules',
    '> 80 -> ACCEPT',
    '< 40 -> REJECT',
    '40-80 -> PARTIAL',
    'ambiguous -> NEEDS_HUMAN_REVIEW',
    '',
    '5. Agreement',
    `Title: ${context.agreement.title}`,
    `Description: ${context.agreement.description}`,
    `Service type: ${context.agreement.serviceType}`,
    `Currency: ${context.agreement.currency}`,
    '',
    '6. Policies',
    formatPolicies(context),
    '',
    '7. Milestone',
    `Title: ${context.milestone.title}`,
    `Description: ${context.milestone.description || 'No milestone description provided.'}`,
    `Amount: ${context.milestone.amount} ${context.milestone.currency}`,
    `Revision limit: ${context.milestone.revisionLimit}`,
    'Acceptance criteria:',
    formatCriteria(context.milestone.acceptanceCriteria),
    '',
    '8. Delivery',
    `Summary: ${context.delivery.summary}`,
    `Notes: ${context.delivery.notes || 'No delivery notes provided.'}`,
    'Evidence references:',
    formatEvidence(context),
    '',
    '9. Client objection',
    context.objection,
    '',
    '10. Related criteria to weigh carefully',
    formatRelatedCriteria(context),
  ].join('\n');
}
