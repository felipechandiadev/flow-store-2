import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MailProcessor } from './mail.processor';

export type SendMailDto = {
  template: string;
  to: string;
  locale?: string;
  variables?: Record<string, string>;
  idempotencyKey?: string;
  replyTo?: string;
};

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private queue!: Queue;

  constructor(private readonly processor: MailProcessor) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };
    this.queue = new Queue('mail-send', { connection });
    this.processor.startWorker(connection);
  }

  async onModuleDestroy() {
    await this.queue?.close();
    await this.processor.stopWorker();
  }

  async enqueue(dto: SendMailDto) {
    const job = await this.queue.add(
      'send',
      dto,
      {
        jobId: dto.idempotencyKey || undefined,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    this.logger.log(`Queued mail ${dto.template} → ${dto.to} (${job.id})`);
    return { jobId: String(job.id), status: 'queued' as const };
  }
}
