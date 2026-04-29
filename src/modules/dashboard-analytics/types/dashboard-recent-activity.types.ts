import type { IsoTimestampString } from './dashboard-common.types';
import type {
  TimelineActorRole,
  TimelineEventType,
} from './dashboard-status.types';

export interface DashboardRecentActivity {
  id: string;
  agreementId: string;
  agreementTitle?: string | null;
  type: TimelineEventType;
  title: string;
  description: string;
  actorRole: TimelineActorRole;
  createdAt: IsoTimestampString;
  metadata?: Record<string, unknown> | null;
}

export interface DashboardRecentActivityResponse {
  items: DashboardRecentActivity[];
}
