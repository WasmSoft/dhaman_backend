import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getCurrent() {
    return this.settingsService.getCurrent();
  }

  @Patch()
  updateCurrent(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateCurrent(dto);
  }
}
