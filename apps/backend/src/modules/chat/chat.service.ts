import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SendMessageDto } from './dto/send-message.dto';

const DIETICIAN_SYSTEM_PROMPT = `You are a professional dietician, nutritionist, and health coach.
Your target is to provide healthy, structured, and science-backed nutritional advice.

RULES:
1. Act as a friendly and expert dietician.
2. Answer in the same language as the user (Uzbek, Russian, or English).
3. Keep the advice customized to the user's inquiry.
4. If the user asks about unrelated topics (like movies, programming, history), politely remind them that you are a dietician and can only help with health, meal planning, and nutrition topics.
5. Format your answers clearly using Markdown (use lists, bold text, etc.).`;

@Injectable()
export class ChatService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(ChatService.name);

  constructor(private config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY') });
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async getResponse(dto: SendMessageDto): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: DIETICIAN_SYSTEM_PROMPT },
      ];

      // Append conversation history if present
      if (dto.history && dto.history.length > 0) {
        dto.history.forEach((msg) => {
          messages.push({ role: msg.role, content: msg.content });
        });
      }

      // Append the latest user message
      messages.push({ role: 'user', content: dto.message });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
    } catch (error) {
      this.logger.error('Failed to communicate with OpenAI API', error);
      throw new Error('AI_COMMUNICATION_ERROR');
    }
  }
}
