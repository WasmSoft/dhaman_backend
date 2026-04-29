import type { Prisma } from '@prisma/client';

export type ReviewLocale = 'ar' | 'en';

export type ReviewPolicyType =
  | 'delay'
  | 'cancellation'
  | 'extraRequest'
  | 'review';

export type ReviewPolicyContext = {
  type: ReviewPolicyType;
  clause: string;
  rules?: {
    clientReviewPeriodDays?: number;
    freelancerDelayGraceDays?: number;
  };
};

export type ReviewEvidenceItem = {
  kind: 'url' | 'file';
  ref: string;
  fileName?: string;
  fileType?: string;
};

export type ReviewContext = {
  agreement: {
    title: string;
    description: string | null;
    serviceType: string | null;
    currency: string;
  };
  policies: ReviewPolicyContext[];
  milestone: {
    title: string;
    description: string;
    amount: string;
    currency: string;
    acceptanceCriteria: string[];
    revisionLimit: number;
  };
  delivery: {
    summary: string;
    notes: string;
    evidence: ReviewEvidenceItem[];
  };
  objection: string;
  relatedCriteria: string[];
  locale: ReviewLocale;
};

export type ReviewResult = {
  matchScore: number;
  recommendation: 'ACCEPT' | 'REJECT' | 'PARTIAL' | 'NEEDS_HUMAN_REVIEW';
  completedCriteria: string[];
  missingCriteria: string[];
  outOfScopeItems: string[];
  reasoning: string;
};

export type BuildReviewContextInput = {
  agreement: {
    title: string;
    description: string | null;
    serviceType: string | null;
    currency: string;
    policy?: {
      delayPolicy: string;
      cancellationPolicy: string;
      extraRequestPolicy: string;
      reviewPolicy: string;
      clientReviewPeriodDays: number;
      freelancerDelayGraceDays: number;
    } | null;
  };
  milestone: {
    title: string;
    description: string | null;
    amount: Prisma.Decimal | string | number;
    currency: string;
    acceptanceCriteria: unknown;
    revisionLimit: number;
  };
  delivery: {
    summary: string;
    notes: string | null;
    deliveryUrl: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileType: string | null;
  };
  objection: string;
  relatedCriteria?: string[];
  locale?: ReviewLocale;
};
