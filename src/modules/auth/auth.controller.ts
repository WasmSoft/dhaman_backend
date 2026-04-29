import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto, RegisterDto, UserProfileDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register freelancer account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    description: 'Freelancer account created and access token issued.',
    status: HttpStatus.CREATED,
    type: AuthResponseDto,
  })
  @ApiResponse({
    description: 'VALIDATION_ERROR: Registration input failed validation.',
    status: HttpStatus.BAD_REQUEST,
  })
  @ApiResponse({
    description: 'AUTH_EMAIL_ALREADY_EXISTS: Email is already registered.',
    status: HttpStatus.CONFLICT,
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    description: 'Credentials validated and access token issued.',
    status: HttpStatus.OK,
    type: AuthResponseDto,
  })
  @ApiResponse({
    description: 'VALIDATION_ERROR: Login input failed validation.',
    status: HttpStatus.BAD_REQUEST,
  })
  @ApiResponse({
    description: 'AUTH_INVALID_CREDENTIALS: Email or password is invalid.',
    status: HttpStatus.UNAUTHORIZED,
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    description: 'Current authenticated user profile.',
    status: HttpStatus.OK,
    type: UserProfileDto,
  })
  @ApiResponse({
    description:
      'UNAUTHORIZED, AUTH_TOKEN_INVALID, or AUTH_TOKEN_EXPIRED: Bearer authentication failed.',
    status: HttpStatus.UNAUTHORIZED,
  })
  @ApiResponse({
    description: 'AUTH_USER_NOT_FOUND: Authenticated user no longer exists.',
    status: HttpStatus.NOT_FOUND,
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    description:
      'Confirms logout for API clients. MVP logout is stateless; clients remove the token locally.',
    summary: 'Logout current authenticated session',
  })
  @ApiResponse({
    description:
      'Logout confirmed. No server-side token revocation is created.',
    schema: {
      example: { message: 'Logged out' },
      properties: {
        message: { example: 'Logged out', type: 'string' },
      },
      type: 'object',
    },
    status: HttpStatus.OK,
  })
  @ApiResponse({
    description:
      'UNAUTHORIZED, AUTH_TOKEN_INVALID, or AUTH_TOKEN_EXPIRED: Bearer authentication failed.',
    status: HttpStatus.UNAUTHORIZED,
  })
  logout(): { message: string } {
    return { message: 'Logged out' };
  }
}
