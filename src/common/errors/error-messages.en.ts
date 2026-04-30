import { ErrorCode } from '../enums/error-code.enum';

export const errorMessagesEn: Record<ErrorCode, string> = {
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCode.VALIDATION_ERROR]: 'Validation error',
  [ErrorCode.UNAUTHORIZED]: 'Unauthorized',
  [ErrorCode.FORBIDDEN]: 'Forbidden',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.CONFLICT]: 'Conflict',
  [ErrorCode.BAD_REQUEST]: 'Bad request',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: 'Email already exists',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Authentication token expired',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Authentication token is invalid',
  [ErrorCode.AUTH_USER_NOT_FOUND]: 'Authenticated user not found',
  [ErrorCode.USER_NOT_FOUND]: 'User was not found',
  [ErrorCode.CLIENT_NOT_FOUND]: 'Client not found',
  [ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS]: 'Client email already exists',
  [ErrorCode.CLIENT_SUMMARY_MIXED_CURRENCY]:
    'Client summary contains agreements in multiple currencies',
  [ErrorCode.AGREEMENT_NOT_FOUND]: 'Agreement not found',
  [ErrorCode.AGREEMENT_NOT_DRAFT]: 'Agreement is not in draft state',
  [ErrorCode.AGREEMENT_ALREADY_SENT]: 'Agreement was already sent',
  [ErrorCode.AGREEMENT_ALREADY_APPROVED]: 'Agreement was already approved',
  [ErrorCode.AGREEMENT_CANNOT_BE_MODIFIED]: 'Agreement cannot be modified',
  [ErrorCode.AGREEMENT_CLIENT_REQUIRED]: 'Agreement client is required',
  [ErrorCode.AGREEMENT_POLICY_REQUIRED]: 'Agreement policy is required',
  [ErrorCode.POLICY_NOT_FOUND]: 'Agreement policy not found',
  [ErrorCode.POLICY_INVALID_REVIEW_PERIOD]: 'Invalid review period',
  [ErrorCode.POLICY_INVALID_CONTENT]: 'Invalid policy content',
  [ErrorCode.MILESTONE_NOT_FOUND]: 'Milestone not found',
  [ErrorCode.MILESTONE_INVALID_AMOUNT]: 'Invalid milestone amount',
  [ErrorCode.MILESTONE_INVALID_ORDER]: 'Invalid milestone order',
  [ErrorCode.MILESTONE_ALREADY_SUBMITTED]: 'Milestone was already submitted',
  [ErrorCode.MILESTONE_NOT_ACTIVE]: 'Milestone is not active',
  [ErrorCode.MILESTONE_PAYMENT_NOT_RESERVED]:
    'Milestone payment is not reserved',
  [ErrorCode.MILESTONE_PAYMENT_NOT_WAITING]:
    'Milestone payment must be waiting before deletion',
  [ErrorCode.PAYMENT_NOT_FOUND]: 'Payment not found',
  [ErrorCode.PAYMENT_ALREADY_RESERVED]: 'Payment was already reserved',
  [ErrorCode.PAYMENT_ALREADY_RELEASED]: 'Payment was already released',
  [ErrorCode.PAYMENT_NOT_READY_TO_RELEASE]: 'Payment is not ready to release',
  [ErrorCode.PAYMENT_INVALID_AMOUNT]: 'Invalid payment amount',
  [ErrorCode.PAYMENT_DEMO_MODE_ONLY]:
    'Operation is available in demo mode only',
  [ErrorCode.PAYMENT_INVALID_TRANSITION]: 'Invalid payment state transition',
  [ErrorCode.PAYMENT_MILESTONE_REQUIRED]:
    'Milestone is required for this payment operation',
  [ErrorCode.DELIVERY_NOT_FOUND]: 'Delivery not found',
  [ErrorCode.DELIVERY_ALREADY_SUBMITTED]: 'Delivery was already submitted',
  [ErrorCode.DELIVERY_URL_OR_FILE_REQUIRED]: 'Delivery URL or file is required',
  [ErrorCode.DELIVERY_NOT_IN_REVIEW]: 'Delivery is not in review state',
  [ErrorCode.DELIVERY_ALREADY_ACCEPTED]: 'Delivery was already accepted',
  [ErrorCode.DELIVERY_ALREADY_EXISTS]: 'An editable delivery already exists for this milestone',
  [ErrorCode.DELIVERY_NOT_EDITABLE]: 'Delivery cannot be edited in its current state',
  [ErrorCode.DELIVERY_NOT_SUBMITTABLE]: 'Delivery cannot be submitted in its current state',
  [ErrorCode.DELIVERY_EVIDENCE_REQUIRED]: 'Delivery evidence is required',
  [ErrorCode.DELIVERY_NOT_REVIEWABLE]: 'Delivery is not ready for client review',
  [ErrorCode.AGREEMENT_NOT_ACTIVE]: 'Agreement is not active',
  [ErrorCode.PAYMENT_NOT_RESERVED]: 'Payment must be reserved before delivery review',
  [ErrorCode.PORTAL_TOKEN_INVALID]: 'Portal token is invalid',
  [ErrorCode.PORTAL_TOKEN_EXPIRED]: 'Portal token has expired',
  [ErrorCode.PORTAL_TOKEN_REVOKED]: 'Portal token was revoked',
  [ErrorCode.PORTAL_AGREEMENT_NOT_FOUND]: 'Portal agreement not found',
  [ErrorCode.PORTAL_ACTION_NOT_ALLOWED]: 'Portal action is not allowed',
  [ErrorCode.AI_PLAN_GENERATION_FAILED]: 'AI plan generation failed',
  [ErrorCode.AI_REVIEW_FAILED]: 'AI review failed',
  [ErrorCode.AI_REVIEW_NOT_FOUND]: 'AI review not found',
  [ErrorCode.AI_REVIEW_ALREADY_COMPLETED]: 'AI review was already completed',
  [ErrorCode.AI_INVALID_RESPONSE]: 'AI provider returned an invalid response',
  [ErrorCode.CHANGE_REQUEST_NOT_FOUND]: 'Change request was not found.',
  [ErrorCode.CHANGE_REQUEST_AMOUNT_INVALID]:
    'Change request amount must be greater than zero.',
  [ErrorCode.CHANGE_REQUEST_NOT_EDITABLE]:
    'Change request cannot be edited in its current state.',
  [ErrorCode.CHANGE_REQUEST_NOT_SENDABLE]:
    'Change request cannot be sent in its current state.',
  [ErrorCode.CHANGE_REQUEST_NOT_APPROVABLE]:
    'Change request cannot be approved in its current state.',
  [ErrorCode.CHANGE_REQUEST_NOT_DECLINABLE]:
    'Change request cannot be declined in its current state.',
  [ErrorCode.CHANGE_REQUEST_NOT_APPROVED]:
    'Change request must be approved before funding.',
  [ErrorCode.PAYMENT_NOT_FUNDABLE]:
    'Payment cannot be funded in its current state.',
  [ErrorCode.AI_REVIEW_NOT_ELIGIBLE_FOR_CHANGE_REQUEST]:
    'AI review cannot create a change request.',
  [ErrorCode.EMAIL_SEND_FAILED]: 'Email send failed',
  [ErrorCode.EMAIL_TEMPLATE_NOT_FOUND]: 'Email template not found',
  [ErrorCode.EMAIL_RENDER_FAILED]: 'Email template could not be rendered',
  [ErrorCode.EMAIL_RECIPIENT_REQUIRED]: 'Recipient email is required',
  [ErrorCode.CLIENT_EMAIL_MISSING]: 'Client email address is missing',
  [ErrorCode.EMAIL_TYPE_NOT_SUPPORTED]:
    'Email notification type is not supported',
  [ErrorCode.EMAIL_CONTEXT_INCOMPLETE]: 'Email context is incomplete',
  [ErrorCode.EMAIL_NOTIFICATIONS_DISABLED]:
    'Email notifications are disabled for this user',
  [ErrorCode.AGREEMENT_NOT_INVITABLE]:
    'Agreement cannot be invited in its current state',
  [ErrorCode.SETTINGS_NOT_FOUND]: 'Settings not found',
  [ErrorCode.SETTINGS_CREATE_FAILED]: 'Could not create default settings',
  [ErrorCode.SETTINGS_UPDATE_FAILED]: 'Could not update settings',
  [ErrorCode.SETTINGS_INVALID_AI_STRICTNESS]:
    'AI strictness value is invalid',
  [ErrorCode.SETTINGS_INVALID_CURRENCY]: 'Default currency is invalid',
  [ErrorCode.SETTINGS_POLICY_INVALID]:
    'Default agreement policy is invalid',
  [ErrorCode.SETTINGS_INVALID_VALUE]: 'Settings value is invalid',
  [ErrorCode.DASHBOARD_RANGE_INVALID]: 'Dashboard date range is invalid.',
  [ErrorCode.DASHBOARD_AGGREGATION_FAILED]:
    'Dashboard analytics could not be calculated.',
  [ErrorCode.TIMELINE_EVENT_TYPE_INVALID]: 'Timeline event type is invalid.',
  [ErrorCode.TIMELINE_METADATA_INVALID]: 'Timeline metadata is invalid.',
  [ErrorCode.PORTAL_TOKEN_CREATE_FAILED]: 'Could not create portal link.',
  [ErrorCode.AGREEMENT_NOT_APPROVABLE]:
    'Agreement cannot be approved in its current state.',
  [ErrorCode.AGREEMENT_NOT_CHANGEABLE]:
    'Agreement changes cannot be requested in its current state.',
  [ErrorCode.AGREEMENT_NOT_REJECTABLE]:
    'Agreement cannot be rejected in its current state.',
};
