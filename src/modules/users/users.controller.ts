import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateCurrentUserDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me() {
    return this.usersService.getCurrentUser();
  }

  @Patch('me')
  updateMe(@Body() dto: UpdateCurrentUserDto) {
    return this.usersService.updateCurrentUser(dto);
  }
}
