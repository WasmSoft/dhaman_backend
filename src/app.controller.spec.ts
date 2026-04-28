import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return the phase 0 health payload', () => {
      expect(appController.getHealth()).toEqual({
        service: 'dhaman-backend',
        status: 'ok',
        phase: 0,
      });
    });
  });
});
