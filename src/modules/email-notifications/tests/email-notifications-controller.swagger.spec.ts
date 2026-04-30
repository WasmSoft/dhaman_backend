import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmailNotificationsController } from '../email-notifications.controller';
import { AgreementsController } from '../../agreements/agreements.controller';
import {
  PreviewEmailDto,
  EmailPreviewResponseDto,
  SendTestNotificationDto,
  EmailLogQueryDto,
  EmailNotificationResponseDto,
  PaginatedEmailNotificationsResponseDto,
} from '../dto/email-notifications.dto';

describe('email notifications swagger contract', () => {
  it('exports the controller and DTO classes', () => {
    expect(EmailNotificationsController).toBeDefined();
    expect(PreviewEmailDto).toBeDefined();
    expect(EmailPreviewResponseDto).toBeDefined();
    expect(SendTestNotificationDto).toBeDefined();
    expect(EmailLogQueryDto).toBeDefined();
    expect(EmailNotificationResponseDto).toBeDefined();
    expect(PaginatedEmailNotificationsResponseDto).toBeDefined();
  });

  const controllerPath = join(
    __dirname,
    '..',
    'email-notifications.controller.ts',
  );
  let controllerSource: string;

  beforeAll(() => {
    controllerSource = readFileSync(controllerPath, 'utf8');
  });

  it('documents the controller with ApiTags', () => {
    expect(controllerSource).toContain('@ApiTags(');
  });

  it('has ApiBearerAuth on the email-notifications controller', () => {
    expect(controllerSource).toContain('@ApiBearerAuth()');
  });

  it('documents preview with ApiOperation, ApiBody, and ApiResponse status codes', () => {
    // The preview endpoint is on EmailNotificationsController which has @ApiBearerAuth at class level
    expect(controllerSource).toContain('@ApiBody({ type: PreviewEmailDto })');
    expect(controllerSource).toContain('EmailPreviewResponseDto');
    expect(controllerSource).toMatch(/status:\s*200/);
    expect(controllerSource).toMatch(/status:\s*400/);
    expect(controllerSource).toMatch(/status:\s*401/);
    expect(controllerSource).toMatch(/status:\s*404/);
  });

  it('documents logs endpoint with query parameters and paginated response', () => {
    expect(controllerSource).toContain("summary: 'List freelancer-scoped email notification logs'");
    expect(controllerSource).toContain("name: 'type'");
    expect(controllerSource).toContain("name: 'status'");
    expect(controllerSource).toContain("name: 'agreementId'");
    expect(controllerSource).toContain("name: 'recipientEmail'");
    expect(controllerSource).toContain("name: 'from'");
    expect(controllerSource).toContain("name: 'to'");
    expect(controllerSource).toContain("name: 'page'");
    expect(controllerSource).toContain("name: 'limit'");
    expect(controllerSource).toContain('PaginatedEmailNotificationsResponseDto');
  });

  it('documents test notification with SendTestNotificationDto and EmailNotificationResponseDto', () => {
    expect(controllerSource).toContain('SendTestNotificationDto');
    expect(controllerSource).toContain("summary: 'Send a test notification'");
  });
});

describe('agreements resend invite swagger contract', () => {
  const agreementsControllerPath = join(
    __dirname,
    '..',
    '..',
    'agreements',
    'agreements.controller.ts',
  );
  let agreementsSource: string;

  beforeAll(() => {
    agreementsSource = readFileSync(agreementsControllerPath, 'utf8');
  });

  it('documents resend-invite with ApiBearerAuth, ApiOperation, and ApiParam', () => {
    expect(agreementsSource).toContain('@ApiBearerAuth()');
    expect(agreementsSource).toContain("summary: 'Resend an agreement invitation'");
    expect(agreementsSource).toContain("@ApiParam({ name: 'id', description: 'Agreement ID'");
    expect(agreementsSource).toContain('EmailNotificationResponseDto');
  });

  it('documents resend-invite with 201, 400, 401, 404, and 409 ApiResponses', () => {
    expect(agreementsSource).toContain("status: 201,");
    expect(agreementsSource).toContain('@Post(\':id/resend-invite\')');
  });
});
