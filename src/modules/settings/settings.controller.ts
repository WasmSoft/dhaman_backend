import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  DefaultPoliciesResponseDto,
  SettingsResponseDto,
} from './dto/settings-response.dto';
import { UpdateDefaultPoliciesDto } from './dto/update-default-policies.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current freelancer settings',
    description:
      'Returns the authenticated freelancer settings record, creating default settings if none exist yet.',
  })
  @ApiResponse({ status: 200, type: SettingsResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 500, type: ErrorResponseDto })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({
    summary: 'Update current freelancer settings',
    description:
      'Updates general freelancer preferences that affect future agreements and future system behavior only.',
  })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({ status: 200, type: SettingsResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 500, type: ErrorResponseDto })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  @Get('default-policies')
  @ApiOperation({
    summary: 'Get default agreement policies',
    description:
      'Returns the authenticated freelancer default agreement policy text used to prefill future agreements.',
  })
  @ApiResponse({ status: 200, type: DefaultPoliciesResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 500, type: ErrorResponseDto })
  getDefaultPolicies() {
    return this.settingsService.getDefaultPolicies();
  }

  @Patch('default-policies')
  @ApiOperation({
    summary: 'Update default agreement policies',
    description:
      'Updates default agreement policy text used only for future agreements and does not change existing agreement policies.',
  })
  @ApiBody({ type: UpdateDefaultPoliciesDto })
  @ApiResponse({ status: 200, type: DefaultPoliciesResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 500, type: ErrorResponseDto })
  updateDefaultPolicies(@Body() dto: UpdateDefaultPoliciesDto) {
    return this.settingsService.updateDefaultPolicies(dto);
  }
}
