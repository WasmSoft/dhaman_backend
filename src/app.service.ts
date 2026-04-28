import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'dhaman-backend',
      status: 'ok',
      phase: 0,
    };
  }
}
