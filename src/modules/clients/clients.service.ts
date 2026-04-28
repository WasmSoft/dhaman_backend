import { Injectable } from '@nestjs/common';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';

/**
 * Module responsibility:
 * - Manage freelancer-owned client records.
 * Main entities touched:
 * - Client, AuditLog.
 * Expected endpoints:
 * - GET /clients
 * - POST /clients
 * - GET /clients/:id
 * - PATCH /clients/:id
 * Business rules:
 * - Scope all records to the authenticated freelancer.
 * - Enforce unique client email rules per freelancer.
 * Implementation phases:
 * - Phase 1.
 * Error cases to document:
 * - CLIENT_NOT_FOUND, CLIENT_EMAIL_ALREADY_EXISTS.
 * Testing cases to cover:
 * - create, list, retrieve, update, ownership boundaries.
 */
@Injectable()
export class ClientsService {
  list() {
    return this.placeholder('list');
  }

  create(dto: CreateClientDto) {
    return this.placeholder('create', { dto });
  }

  getById(id: string) {
    return this.placeholder('getById', { id });
  }

  update(id: string, dto: UpdateClientDto) {
    return this.placeholder('update', { id, dto });
  }

  private placeholder(action: string, details?: Record<string, unknown>) {
    return {
      module: 'clients',
      action,
      phase: 0,
      status: 'not-implemented',
      ...details,
    };
  }
}
