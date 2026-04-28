import { Injectable } from '@nestjs/common';
import { UpdateSettingsDto } from './dto/settings.dto';

/**
 * Module responsibility:
 * - Manage freelancer default policies and preference values.
 * Main entities touched:
 * - UserSettings.
 * Expected endpoints:
 * - GET /settings
 * - PATCH /settings
 * Business rules:
 * - Keep one settings record per user.
 * - Validate supported currency and strictness values.
 * Implementation phases:
 * - Phase 6.
 * Error cases to document:
 * - SETTINGS_NOT_FOUND, SETTINGS_INVALID_VALUE.
 * Testing cases to cover:
 * - fetch existing settings, initialize defaults, invalid values.
 */
@Injectable()
export class SettingsService {
  getCurrent() {
    return this.placeholder('getCurrent');
  }

  updateCurrent(dto: UpdateSettingsDto) {
    return this.placeholder('updateCurrent', { dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'settings',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
