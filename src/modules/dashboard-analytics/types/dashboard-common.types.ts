export const DASHBOARD_RANGE_VALUES = ['7d', '30d', '90d', 'all'] as const;
export type DashboardRange = (typeof DASHBOARD_RANGE_VALUES)[number];

export const DASHBOARD_DEFAULT_RANGE: DashboardRange = '30d';

export const DASHBOARD_MIN_LIST_LIMIT = 1;
export const DASHBOARD_MAX_LIST_LIMIT = 50;
export const DASHBOARD_DEFAULT_LIST_LIMIT = 10;

export type MoneyString = string;
export type CurrencyCode = string;
export type IsoTimestampString = string;
