import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { CurrentUser } from '@common/tenant/current-user.decorator';
import type { CurrentUserPayload } from '@common/tenant/current-user.decorator';
import { NotificationInboxService } from '../application/notification-inbox.service';
import {
  NotificationDeliveryStatus,
  NotificationDomain,
} from '../domain/notification.enums';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly inbox: NotificationInboxService) {}

  @Get('inbox')
  async listInbox(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('domain') domain?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const domainEnum =
      domain && Object.values(NotificationDomain).includes(domain as NotificationDomain)
        ? (domain as NotificationDomain)
        : undefined;
    const statusEnum =
      status &&
      Object.values(NotificationDeliveryStatus).includes(
        status as NotificationDeliveryStatus,
      )
        ? (status as NotificationDeliveryStatus)
        : undefined;

    return this.inbox.listInbox({
      userId: user.id,
      companyId,
      domain: domainEnum,
      status: statusEnum,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('domain') domain?: string,
  ) {
    const domainEnum =
      domain && Object.values(NotificationDomain).includes(domain as NotificationDomain)
        ? (domain as NotificationDomain)
        : undefined;
    const count = await this.inbox.getUnreadCount(user.id, companyId, domainEnum);
    return { count };
  }

  @Patch('deliveries/:id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inbox.markRead(id, user.id, companyId);
  }

  @Post('deliveries/mark-all-read')
  async markAllRead(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('domain') domain?: string,
  ) {
    const domainEnum =
      domain && Object.values(NotificationDomain).includes(domain as NotificationDomain)
        ? (domain as NotificationDomain)
        : undefined;
    return this.inbox.markAllRead(user.id, companyId, domainEnum);
  }

  @Patch('deliveries/:id/dismiss')
  async dismiss(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inbox.dismiss(id, user.id, companyId);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return {
      userId: user.id,
      defaults: {
        STOCK: { enabled: true, channel: 'IN_APP' },
      },
    };
  }
}
