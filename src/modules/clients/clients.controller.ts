import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { ClientsService } from './clients.service';
import {
  ClientListResponseDto,
  ClientResponseDto,
  ClientSummaryResponseDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/clients.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({
    summary: 'List clients',
    description:
      'Returns a paginated list of clients owned by the authenticated freelancer.',
  })
  @ApiResponse({ status: 200, type: ClientListResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  list() {
    return this.clientsService.list();
  }

  @Post()
  @ApiOperation({
    summary: 'Create client',
    description:
      'Creates a new client record for the authenticated freelancer.',
  })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get client by ID',
    description:
      'Returns a single client record owned by the authenticated freelancer.',
  })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getById(@Param('id', ParseUuidPipe) id: string) {
    return this.clientsService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update client',
    description:
      'Partially updates a client record owned by the authenticated freelancer.',
  })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Get(':id/summary')
  @ApiOperation({
    summary: 'Get client relationship summary',
    description:
      'Returns aggregated agreement counts, payment totals, and recent agreements for an owned client.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Client UUID' })
  @ApiResponse({ status: 200, type: ClientSummaryResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  getSummary(@Param('id', ParseUuidPipe) id: string) {
    return this.clientsService.getSummary(id);
  }
}
