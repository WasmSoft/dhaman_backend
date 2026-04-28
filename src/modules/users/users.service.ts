import { Injectable } from '@nestjs/common';
import { UpdateCurrentUserDto } from './dto/users.dto';

/**
 * Module responsibility:
 * - Freelancer profile retrieval and self-service updates.
 * Main entities touched:
 * - User, UserSettings.
 * Expected endpoints:
 * - GET /users/me
 * - PATCH /users/me
 * Business rules:
 * - Restrict access to the authenticated user profile.
 * - Preserve stable identity fields during profile updates.
 * Implementation phases:
 * - Phase 1.
 * Error cases to document:
 * - UNAUTHORIZED, AUTH_USER_NOT_FOUND.
 * Testing cases to cover:
 * - profile retrieval, valid profile update, invalid payload.
 */
@Injectable()
export class UsersService {
  getCurrentUser() {
    return this.placeholder('getCurrentUser');
  }

  updateCurrentUser(dto: UpdateCurrentUserDto) {
    return this.placeholder('updateCurrentUser', { dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'users',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
