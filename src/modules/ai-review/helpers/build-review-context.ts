import {
  BuildReviewContextInput,
  ReviewContext,
  ReviewEvidenceItem,
  ReviewPolicyContext,
} from './review-context.types';

function buildPolicies(input: BuildReviewContextInput): ReviewPolicyContext[] {
  if (!input.agreement.policy) {
    return [];
  }

  return [
    {
      type: 'delay',
      clause: input.agreement.policy.delayPolicy,
      rules: {
        freelancerDelayGraceDays:
          input.agreement.policy.freelancerDelayGraceDays,
      },
    },
    {
      type: 'cancellation',
      clause: input.agreement.policy.cancellationPolicy,
    },
    {
      type: 'extraRequest',
      clause: input.agreement.policy.extraRequestPolicy,
    },
    {
      type: 'review',
      clause: input.agreement.policy.reviewPolicy,
      rules: {
        clientReviewPeriodDays: input.agreement.policy.clientReviewPeriodDays,
      },
    },
  ];
}

function buildEvidence(input: BuildReviewContextInput): ReviewEvidenceItem[] {
  const evidence: ReviewEvidenceItem[] = [];

  if (input.delivery.deliveryUrl) {
    evidence.push({
      kind: 'url',
      ref: input.delivery.deliveryUrl,
    });
  }

  if (input.delivery.fileUrl) {
    evidence.push({
      kind: 'file',
      ref: input.delivery.fileUrl,
      fileName: input.delivery.fileName ?? undefined,
      fileType: input.delivery.fileType ?? undefined,
    });
  }

  return evidence;
}

function buildAcceptanceCriteria(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function serializeAmount(
  value: BuildReviewContextInput['milestone']['amount'],
): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  return value.toFixed(2);
}

export function buildReviewContext(
  input: BuildReviewContextInput,
): ReviewContext {
  return {
    agreement: {
      title: input.agreement.title,
      description: input.agreement.description,
      serviceType: input.agreement.serviceType,
      currency: input.agreement.currency,
    },
    policies: buildPolicies(input),
    milestone: {
      title: input.milestone.title,
      description: input.milestone.description ?? '',
      amount: serializeAmount(input.milestone.amount),
      currency: input.milestone.currency,
      acceptanceCriteria: buildAcceptanceCriteria(
        input.milestone.acceptanceCriteria,
      ),
      revisionLimit: input.milestone.revisionLimit,
    },
    delivery: {
      summary: input.delivery.summary,
      notes: input.delivery.notes ?? '',
      evidence: buildEvidence(input),
    },
    objection: input.objection,
    relatedCriteria: input.relatedCriteria ?? [],
    locale: input.locale === 'en' ? 'en' : 'ar',
  };
}
