import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { buildMessages, buildStreamMessages } from './email-prompt';
import { GenerateEmailDto } from './generate-email.dto';

@Injectable()
export class EmailsService {
  private client: OpenAI;
  private logger = new Logger(EmailsService.name);

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('API_KEY'),
      baseURL: this.config.get('BASE_URL'),
    });
  }

  async generate(dto: GenerateEmailDto) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.get('MODEL')!,
        messages: buildMessages(dto),
        temperature: 0.2,
        max_tokens: 500,
      });

      const text = response.choices[0]?.message?.content ?? '';
      this.logger.log(`Tokens: ${JSON.stringify(response.usage)}`);

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new HttpException('The AI returned an invalid response', 502);
      }

      const { subject, body } = (parsed ?? {}) as Record<string, unknown>;
      if (typeof subject !== 'string' || typeof body !== 'string') {
        throw new HttpException('The AI returned an invalid response', 502);
      }

      return { subject, body, usage: response.usage };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Generation failed: ${error?.status ?? ''} ${error?.message ?? ''}`);
      if (error?.status === 429) {
        throw new HttpException('Too many requests. Please try again later.', 429);
      }
      throw new HttpException('Failed to generate email', 502);
    }
  }

  async *generateStream(dto: GenerateEmailDto, signal?: AbortSignal) {
    const stream = await this.client.chat.completions.create(
      {
        model: this.config.get('MODEL')!,
        messages: buildStreamMessages(dto),
        temperature: 0.4,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 500,
      },
      { signal },
    );

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield { type: 'text' as const, text };

      if (chunk.usage) {
        this.logger.log(`Stream tokens: ${JSON.stringify(chunk.usage)}`);
        yield { type: 'usage' as const, usage: chunk.usage };
      }
    }
  }
}
