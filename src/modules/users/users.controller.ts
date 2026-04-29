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
  UpdateUserDto,
  UpdateUserProfileDto,
  UserProfileResponseDto,
  UserResponseDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description:
      "Returns the authenticated freelancer's account summary. Password hash is never included.",
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getMe() {
    return this.usersService.getMe();
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user',
    description:
      'Partially updates display name and avatar URL. Email, role, and credentials are immutable via this endpoint and are silently ignored if sent.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  updateMe(@Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(dto);
  }

  @Get('me/profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Returns the authenticated freelancer's extended profile settings. Creates default settings (currency: SAR, locale: ar) on first access.",
  })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getProfile() {
    return this.usersService.getProfile();
  }

  @Patch('me/profile')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Partially updates business name, bio, specialization, preferred currency, and locale. Omitted fields are preserved. Creates settings on first update (upsert).',
  })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  updateProfile(@Body() dto: UpdateUserProfileDto) {
    return this.usersService.updateProfile(dto);
  }
}
