import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { OpenAIProvider } from './providers/openai.provider';

@Module({
  providers: [
    {
      provide: 'AI_PROVIDER',
      useFactory: (config: ConfigService) => {
        // Provider pattern — env var bilan almashtirish mumkin
        const provider = config.get<string>('AI_PROVIDER', 'openai');
        if (provider === 'openai') {
          return new OpenAIProvider(config);
        }
        // Kelajakda: 'gemini' → new GeminiProvider(config)
        return new OpenAIProvider(config);
      },
      inject: [ConfigService],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
