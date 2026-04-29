export const DASHBOARD_OVERVIEW_POPULATED_EXAMPLE = {
  success: true,
  data: {
    range: '30d',
    currency: 'USD',
    metrics: [
      {
        key: 'protected_amount',
        label: 'Protected amount',
        value: '1250.00',
        valueType: 'money',
        currency: 'USD',
        status: 'RESERVED',
        trend: null,
      },
      {
        key: 'active_agreements',
        label: 'Active agreements',
        value: 3,
        valueType: 'count',
        currency: null,
        status: 'ACTIVE',
        trend: null,
      },
    ],
    paymentSummary: [
      {
        currency: 'USD',
        protectedAmount: '1250.00',
        releasedAmount: '750.00',
        pendingAmount: '500.00',
        readyToReleaseAmount: '250.00',
        byStatus: {
          RESERVED: '1250.00',
          RELEASED: '750.00',
        },
      },
    ],
    agreementSummary: {
      total: 8,
      active: 3,
      completed: 2,
      disputed: 0,
      draftOrSent: 3,
      byStatus: {
        ACTIVE: 3,
        COMPLETED: 2,
        DRAFT: 1,
        SENT: 2,
      },
    },
    aiReviewSummary: {
      total: 5,
      byStatus: {
        COMPLETED: 3,
        PENDING: 2,
      },
      byRecommendation: {
        ACCEPT: 2,
        NEEDS_HUMAN_REVIEW: 1,
      },
    },
    changeRequestSummary: {
      total: 2,
      byStatus: {
        PENDING: 1,
        APPROVED: 1,
      },
      amountsByCurrency: {
        USD: '300.00',
      },
    },
    generatedAt: '2026-04-29T12:00:00.000Z',
  },
  meta: {
    requestId: 'req_01HZX7N8K2',
  },
} as const;

export const DASHBOARD_OVERVIEW_EMPTY_EXAMPLE = {
  success: true,
  data: {
    range: '30d',
    currency: null,
    metrics: [],
    paymentSummary: [],
    agreementSummary: {
      total: 0,
      active: 0,
      completed: 0,
      disputed: 0,
      draftOrSent: 0,
      byStatus: {},
    },
    aiReviewSummary: {
      total: 0,
      byStatus: {},
      byRecommendation: {},
    },
    changeRequestSummary: {
      total: 0,
      byStatus: {},
      amountsByCurrency: {},
    },
    generatedAt: '2026-04-29T12:00:00.000Z',
  },
  meta: {
    requestId: 'req_01HZX7N8K2',
  },
} as const;

export const DASHBOARD_ACTIONS_REQUIRED_POPULATED_EXAMPLE = {
  success: true,
  data: {
    items: [
      {
        id: 'action_payment_123',
        type: 'payments',
        title: 'Payment ready to release',
        description:
          'Review the completed milestone and release the protected payment.',
        agreementId: '8d1a58a2-e89f-4a21-9b6e-becce6a1e985',
        agreementTitle: 'Landing page redesign',
        sourceId: '44f8b0c8-3d35-4fc2-b7df-a7660d824afe',
        sourceStatus: 'READY_TO_RELEASE',
        amount: '250.00',
        currency: 'USD',
        createdAt: '2026-04-29T11:00:00.000Z',
        priority: 'high',
      },
    ],
  },
  meta: {
    requestId: 'req_01HZX7N8K2',
  },
} as const;

export const DASHBOARD_ACTIONS_REQUIRED_EMPTY_EXAMPLE = {
  success: true,
  data: {
    items: [],
  },
  meta: {
    requestId: 'req_01HZX7N8K2',
  },
} as const;

export const DASHBOARD_RECENT_ACTIVITY_POPULATED_EXAMPLE = {
  success: true,
  data: {
    items: [
      {
        id: '3c27f53a-839a-4e2b-aa3e-76883ed3a535',
        agreementId: '8d1a58a2-e89f-4a21-9b6e-becce6a1e985',
        agreementTitle: 'Landing page redesign',
        type: 'DELIVERY_SUBMITTED',
        title: 'Delivery submitted',
        description: 'The freelancer submitted milestone delivery for review.',
        actorRole: 'FREELANCER',
        createdAt: '2026-04-29T10:30:00.000Z',
        metadata: {
          milestoneId: '91a8a2fa-23dc-47aa-b284-fb6e751ce47b',
        },
      },
    ],
  },
  meta: {
    requestId: 'req_01HZX7N8K2',
  },
} as const;

export const DASHBOARD_RECENT_ACTIVITY_EMPTY_EXAMPLE = {
  success: true,
  data: {
    items: [],
  },
  meta: {
    requestId: 'req_01HZX7N8K2',
  },
} as const;

export const DASHBOARD_VALIDATION_ERROR_EXAMPLE = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request data.',
    localizedMessage: 'Invalid request data.',
    details: {},
    fieldErrors: [
      {
        field: 'limit',
        message: 'limit must not be greater than 50',
      },
    ],
    requestId: 'req_01HZX7N8K2',
    timestamp: '2026-04-29T12:00:00.000Z',
    path: '/api/v1/dashboard/actions-required',
    method: 'GET',
  },
} as const;

export const DASHBOARD_RANGE_INVALID_ERROR_EXAMPLE = {
  success: false,
  error: {
    code: 'DASHBOARD_RANGE_INVALID',
    message: 'Dashboard date range is invalid.',
    localizedMessage: 'Dashboard date range is invalid.',
    details: {},
    fieldErrors: [
      {
        field: 'range',
        message: 'range must be one of 7d, 30d, 90d, all',
      },
    ],
    requestId: 'req_01HZX7N8K2',
    timestamp: '2026-04-29T12:00:00.000Z',
    path: '/api/v1/dashboard/overview',
    method: 'GET',
  },
} as const;

export const DASHBOARD_UNAUTHORIZED_ERROR_EXAMPLE = {
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication is required.',
    localizedMessage: 'Authentication is required.',
    details: {},
    fieldErrors: [],
    requestId: 'req_01HZX7N8K2',
    timestamp: '2026-04-29T12:00:00.000Z',
    path: '/api/v1/dashboard/overview',
    method: 'GET',
  },
} as const;

export const DASHBOARD_AGREEMENT_NOT_FOUND_ERROR_EXAMPLE = {
  success: false,
  error: {
    code: 'AGREEMENT_NOT_FOUND',
    message: 'Agreement was not found.',
    localizedMessage: 'Agreement was not found.',
    details: {},
    fieldErrors: [],
    requestId: 'req_01HZX7N8K2',
    timestamp: '2026-04-29T12:00:00.000Z',
    path: '/api/v1/dashboard/recent-activity',
    method: 'GET',
  },
} as const;

export const DASHBOARD_AGGREGATION_ERROR_EXAMPLE = {
  success: false,
  error: {
    code: 'DASHBOARD_AGGREGATION_FAILED',
    message: 'Dashboard analytics could not be calculated.',
    localizedMessage: 'Dashboard analytics could not be calculated.',
    details: {},
    fieldErrors: [],
    requestId: 'req_01HZX7N8K2',
    timestamp: '2026-04-29T12:00:00.000Z',
    path: '/api/v1/dashboard/overview',
    method: 'GET',
  },
} as const;
