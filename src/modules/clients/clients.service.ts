import { Injectable } from '@nestjs/common';
import { AgreementStatus, Client, Prisma } from '@prisma/client';
import { ClsService } from '../../common/cls/cls.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  ClientListResponseDto,
  ClientQueryDto,
  ClientResponseDto,
  ClientSummaryResponseDto,
  CreateClientDto,
  ResolveClientDto,
  UpdateClientDto,
} from './dto/clients.dto';

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
 * - Phase 2.
 * Error cases to document:
 * - CLIENT_NOT_FOUND, CLIENT_EMAIL_ALREADY_EXISTS.
 * Testing cases to cover:
 * - create, list, retrieve, update, ownership boundaries.
 */
@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clsService: ClsService,
  ) {}

  async create(dto: CreateClientDto): Promise<ClientResponseDto> {
    const freelancerId = this.getFreelancerId();
    const normalizedEmail = this.normalizeEmail(dto.email);

    try {
      const client = await this.prisma.client.create({
        data: {
          freelancerId,
          name: dto.name,
          email: normalizedEmail,
          phone: dto.phone,
          companyName: dto.companyName,
        },
      });

      return this.toClientResponse(client);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new AppException({ code: ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS });
      }

      throw error;
    }
  }

  async findAll(query: ClientQueryDto = {}): Promise<ClientListResponseDto> {
    const freelancerId = this.getFreelancerId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.ClientWhereInput = {
      freelancerId,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients.map((client) => this.toClientResponse(client)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async list(query: ClientQueryDto = {}): Promise<ClientListResponseDto> {
    return this.findAll(query);
  }

  async getById(id: string): Promise<ClientResponseDto> {
    const freelancerId = this.getFreelancerId();

    const client = await this.prisma.client.findFirst({
      where: { id, freelancerId },
    });

    if (!client) {
      this.throwClientNotFound();
    }

    return this.toClientResponse(client);
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientResponseDto> {
    const freelancerId = this.getFreelancerId();

    const existingClient = await this.prisma.client.findFirst({
      where: { id, freelancerId },
    });

    if (!existingClient) {
      this.throwClientNotFound();
    }

    const data: Prisma.ClientUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = this.normalizeEmail(dto.email);
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.companyName !== undefined) data.companyName = dto.companyName;

    try {
      const updatedClient = await this.prisma.client.update({
        where: { id },
        data,
      });

      return this.toClientResponse(updatedClient);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new AppException({ code: ErrorCode.CLIENT_EMAIL_ALREADY_EXISTS });
      }

      throw error;
    }
  }

  async findOneOrCreateByEmail(
    dto: ResolveClientDto,
  ): Promise<ClientResponseDto> {
    const freelancerId = this.getFreelancerId();
    const normalizedEmail = this.normalizeEmail(dto.email);

    const existingClient = await this.prisma.client.findFirst({
      where: { freelancerId, email: normalizedEmail },
    });

    if (existingClient) {
      return this.toClientResponse(existingClient);
    }

    try {
      const client = await this.prisma.client.create({
        data: {
          freelancerId,
          name: dto.name,
          email: normalizedEmail,
          phone: dto.phone,
          companyName: dto.companyName,
        },
      });

      return this.toClientResponse(client);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const retriedClient = await this.prisma.client.findFirst({
          where: { freelancerId, email: normalizedEmail },
        });

        if (retriedClient) {
          return this.toClientResponse(retriedClient);
        }
      }

      throw error;
    }
  }

  async getSummary(id: string): Promise<ClientSummaryResponseDto> {
    const freelancerId = this.getFreelancerId();

    const client = await this.prisma.client.findFirst({
      where: { id, freelancerId },
    });

    if (!client) {
      this.throwClientNotFound();
    }

    const agreements = await this.prisma.agreement.findMany({
      where: { clientId: id, freelancerId },
      include: { milestones: true },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts: Record<AgreementStatus, number> = {
      DRAFT: 0,
      SENT: 0,
      APPROVED: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      DISPUTED: 0,
    };

    for (const agreement of agreements) {
      statusCounts[agreement.status]++;
    }

    const allMilestones = agreements.flatMap((a) => a.milestones);
    const currencies = new Set(allMilestones.map((m) => m.currency));

    if (currencies.size > 1) {
      throw new AppException({ code: ErrorCode.CLIENT_SUMMARY_MIXED_CURRENCY });
    }

    const currency = currencies.size === 1 ? [...currencies][0] : null;

    const totalAmount = allMilestones.reduce(
      (sum, m) => sum + m.amount.toNumber(),
      0,
    );
    const releasedAmount = allMilestones
      .filter((m) => m.paymentStatus === 'RELEASED')
      .reduce((sum, m) => sum + m.amount.toNumber(), 0);
    const pendingAmount = totalAmount - releasedAmount;

    const recentAgreements = agreements.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      totalAmount: a.totalAmount.toNumber(),
      currency: a.currency,
      createdAt: a.createdAt,
    }));

    return {
      client: this.toClientResponse(client),
      agreements: {
        total: agreements.length,
        byStatus: statusCounts,
      },
      payments: {
        totalAmount,
        releasedAmount,
        pendingAmount,
        currency,
      },
      recentAgreements,
    };
  }

  private getFreelancerId(): string {
    const userId = this.clsService.get('userId');

    if (!userId) {
      throw new AppException({ code: ErrorCode.UNAUTHORIZED });
    }

    return userId;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === 'P2002';
    }
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'P2002'
    );
  }

  private toClientResponse(client: Client): ClientResponseDto {
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      companyName: client.companyName,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  private throwClientNotFound(): never {
    throw new AppException({ code: ErrorCode.CLIENT_NOT_FOUND });
  }
}
