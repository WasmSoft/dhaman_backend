export const AGREEMENT_STATUS_VALUES = [
  'DRAFT',
  'SENT',
  'APPROVED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
] as const;

export const MILESTONE_STATUS_VALUES = [
  'DRAFT',
  'ACTIVE',
  'IN_REVIEW',
  'ACCEPTED',
  'CHANGES_REQUESTED',
  'CANCELLED',
] as const;

export const PAYMENT_STATUS_VALUES = [
  'WAITING',
  'RESERVED',
  'CLIENT_REVIEW',
  'AI_REVIEW',
  'READY_TO_RELEASE',
  'RELEASED',
  'ON_HOLD',
  'FAILED',
  'REFUNDED',
  'NOT_REQUIRED',
] as const;

export const DELIVERY_STATUS_VALUES = [
  'DRAFT',
  'NOT_SUBMITTED',
  'SUBMITTED',
  'CLIENT_REVIEW',
  'IN_REVIEW',
  'ACCEPTED',
  'CHANGES_REQUESTED',
  'DISPUTED',
] as const;

export const AI_REVIEW_STATUS_VALUES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export const AI_RECOMMENDATION_VALUES = [
  'ACCEPT',
  'REJECT',
  'PARTIAL',
  'NEEDS_HUMAN_REVIEW',
] as const;

export const CHANGE_REQUEST_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'DECLINED',
  'PAID',
] as const;

export const TIMELINE_EVENT_TYPE_VALUES = [
  'AGREEMENT_CREATED',
  'AGREEMENT_SENT',
  'AGREEMENT_APPROVED',
  'MILESTONE_CREATED',
  'MILESTONE_UPDATED',
  'MILESTONE_DELETED',
  'MILESTONES_REORDERED',
  'PAYMENT_RESERVED',
  'PAYMENT_RELEASED',
  'PAYMENT_STATUS_CHANGED',
  'PAYMENT_ESCALATED_TO_AI',
  'PAYMENT_READY_TO_RELEASE',
  'PAYMENT_ON_HOLD',
  'DELIVERY_SUBMITTED',
  'DELIVERY_ACCEPTED',
  'DELIVERY_CHANGES_REQUESTED',
  'CHANGE_REQUEST_CREATED',
  'CHANGE_REQUEST_APPROVED',
  'CHANGE_REQUEST_DECLINED',
  'AI_REVIEW_REQUESTED',
  'AI_REVIEW_COMPLETED',
  'AI_REVIEW_RECOMMENDATION_ACCEPTED',
  'EMAIL_SENT',
] as const;

export const TIMELINE_ACTOR_ROLE_VALUES = [
  'FREELANCER',
  'CLIENT',
  'SYSTEM',
  'AI',
] as const;

export type AgreementStatus = (typeof AGREEMENT_STATUS_VALUES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUS_VALUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUS_VALUES)[number];
export type AiReviewStatus = (typeof AI_REVIEW_STATUS_VALUES)[number];
export type AiRecommendation = (typeof AI_RECOMMENDATION_VALUES)[number];
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUS_VALUES)[number];
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPE_VALUES)[number];
export type TimelineActorRole = (typeof TIMELINE_ACTOR_ROLE_VALUES)[number];
