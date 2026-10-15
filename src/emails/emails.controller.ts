import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailsService } from './emails.service';
import { GenerateEmailDto } from './generate-email.dto';

@Controller('emails')
export class EmailsController {
  private logger = new Logger(EmailsController.name);

  constructor(private readonly emailsService: EmailsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateEmailDto) {
    return this.emailsService.generate(dto);
  }

  @Post('generate/stream')
  async stream(@Body() dto: GenerateEmailDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) controller.abort();
    });

    try {
      for await (const event of this.emailsService.generateStream(
        dto,
        controller.signal,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (error: any) {
      if (!controller.signal.aborted) {
        this.logger.error(
          `Stream failed: ${error?.status ?? ''} ${error?.message ?? ''}`,
        );
        const message =
          error?.status === 429
            ? 'Too many requests. Please try again later.'
            : 'Failed to generate email';
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      }
    } finally {
      res.end();
    }
  }
}
