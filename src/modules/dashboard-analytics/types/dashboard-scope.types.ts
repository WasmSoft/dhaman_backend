export const DASHBOARD_REQUIRED_CONTEXT_FIELDS = [
  'requestId',
  'correlationId',
  'locale',
  'actorType',
  'userId',
  'userRole',
] as const;

export interface DashboardScopeContext {
  userId: string;
  agreementId?: string;
  locale?: string;
  requestId?: string;
  correlationId?: string;
  actorType?: string;
  userRole?: string;
}
