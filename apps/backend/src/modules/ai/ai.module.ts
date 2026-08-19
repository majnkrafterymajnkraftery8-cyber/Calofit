import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  providers: [
    {
      provide: 'AI_PROVIDER',
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('AI_PROVIDER', 'gemini');
        if (provider === 'gemini') {
          return new GeminiProvider(config);
        }
        return new OpenAIProvider(config);
      },
      inject: [ConfigService],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
