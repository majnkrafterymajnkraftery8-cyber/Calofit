import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

const MORNING_PHRASES = [
  'Доброе утро! ☀️ Как спалось? Пора заправить организм энергией! Что у тебя сегодня вкусненького на завтрак? Загружай фото или загляни в CaloFit! 🍳',
  'С добрым утром, чемчик! 🌅 Завтрак — главный источник бодрости. Чем сегодня порадовал свой организм? Отправляй фото — я всё рассчитаю! 🥞',
  'Привет-привет! ☕ Утренний заряд энергии — залог успешного дня. Поделись, чем позавтракал? 🥪',
  'Доброе утречко! 🍳 Завтрак — это основа дня! Поделись фоточкой тарелочки, а я посчитаю калории и подкажу полезность! 🥑',
  'Утро доброе! 🥐 Чашка кофе и сбалансированный завтрак — и день удался! Что у тебя сегодня на столе?',
];

const LUNCH_PHRASES = [
  'Привет! Время обеденного перерыва 🥗 Чем порадуешь свой организм? Сделай фото блюда — я всё посчитаю! 📸',
  'Обед — время восполнить силы! 🍲 Что аппетитного на тарелке? Загружай фото в CaloFit!',
  'Эй, пупс, не забудь пообедать! 🍕 Организму нужны белки и углеводы. Что вкусненького у тебя сегодня?',
  'Середина дня — самое время подкрепиться! 🥗 Поделись своим обедом — и я сразу рассчитаю макронутриенты! 🥑',
  'Приятного аппетита! 🍜 Показывай свой обед, проверим баланс белков, жиров и углеводов!',
];

const DINNER_PHRASES = [
  'Добрый вечер! 🌙 Как прошёл день? Пора порадовать себя лёгким и вкусным ужином! Что у тебя сегодня? 🍽️',
  'Время ужина! 🐟 Легкий ужин — залог отличного и глубокого сна. Отправь фото тарелочки!',
  'Вечерний привет! 🥗 Зафиксируй свой ужин, чтобы посмотреть, сколько калорий осталось на сегодня!',
  'Добрый вечерок! 🌙 Чем ужинаешь сегодня? Показывай тарелку, чтобы дневник питания был полным! 🥗',
  'Ужин — время расслабиться и вкусно поесть 🍲 Сделай быстрый снимок — ИИ всё проанализирует!',
];

const EVENING_SUMMARY_PHRASES = [
  'Отличный день! 🏆 Давай посмотрим твои успехи в CaloFit. Нажми кнопку ниже и проверь свои калории за сегодня! 📊',
  'Добрый вечерок! 🌙 Загляни в дневник CaloFit, чтобы подвести итоги дня и посмотреть норму калорий! 📈',
  'День подходит к концу 🌠 Проверь свой баланс калорий и отдыхай с чистой совестью! ✨',
];

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private botToken: string;
  private webAppUrl: string;
  private isPolling = false;
  private lastUpdateId = 0;
  private activeChatIds: Set<number> = new Set();
  private lastPhraseIndices: Record<string, number> = {};

  constructor(
    private config: ConfigService,
    private aiService: AiService,
    private prisma: PrismaService,
  ) {
    this.botToken =
      this.config.get<string>('TELEGRAM_BOT_TOKEN') ||
      '8838776318:AAERdKmFhaN-JgRhrslpeVdVUVZhtghoXCw';
    this.webAppUrl =
      this.config.get<string>('TELEGRAM_WEBAPP_URL') ||
      'https://calofit-neon.vercel.app/uz/dashboard';
  }

  async onModuleInit() {
    this.logger.log('Initializing Telegram Bot Service...');
    await this.setupBotCommandsAndMenu();
    this.startLongPolling();
    this.startScheduledNotificationTimer();
  }

  onModuleDestroy() {
    this.isPolling = false;
  }

  // ─── Setup Bot WebApp Menu Button ────────────────────────
  private async setupBotCommandsAndMenu() {
    try {
      // 1. Set Chat Menu Button to open WebApp
      await fetch(`https://api.telegram.org/bot${this.botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '📱 Открыть CaloFit',
            web_app: { url: this.webAppUrl },
          },
        }),
      });

      // 2. Set Bot Commands list
      await fetch(`https://api.telegram.org/bot${this.botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: '🚀 Открыть приложение и начать' },
            { command: 'app', description: '📱 Запустить CaloFit WebApp' },
            { command: 'remind', description: '🔔 Проверить калории за сегодня' },
          ],
        }),
      });

      this.logger.log('Telegram Bot WebApp Menu and Commands set successfully.');
    } catch (err: any) {
      this.logger.error('Failed to setup Telegram Bot commands/menu', err?.message);
    }
  }

  // ─── Long Polling for Telegram Bot Updates ────────────────
  private async startLongPolling() {
    this.isPolling = true;
    while (this.isPolling) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=10`,
        );

        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              this.lastUpdateId = update.update_id;
              await this.handleUpdate(update);
            }
          }
        }
      } catch (err: any) {
        // Silent reconnect delay
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  // ─── Update Handler ───────────────────────────────────────
  private async handleUpdate(update: any) {
    const message = update.message;
    if (!message) return;

    const chatId = message.chat?.id;
    if (!chatId) return;

    // Track active subscriber
    this.activeChatIds.add(chatId);

    // 1. Text commands (/start, /app, etc.)
    if (message.text) {
      const text = message.text.trim();
      if (text.startsWith('/start') || text.startsWith('/app')) {
        await this.sendWelcomeMessage(chatId, message.from?.first_name || 'Друг');
      } else if (text.startsWith('/remind')) {
        await this.sendRandomNotification(chatId, 'summary');
      } else {
        // General text answer with WebApp button
        await this.sendCustomMessage(
          chatId,
          `Привет, ${message.from?.first_name || ''}! 👋\nЧтобы посчитать калории, отследить дневную норму или спросить у ИИ Диетолога — просто нажми кнопку ниже или отправь мне фото еды! 📸`,
        );
      }
    }

    // 2. Photo uploads
    if (message.photo && Array.isArray(message.photo)) {
      await this.handlePhotoAnalysis(chatId, message.photo);
    }
  }

  // ─── Welcome Message with Persistent WebApp Button ────────
  private async sendWelcomeMessage(chatId: number, firstName: string) {
    const text = `Привет, ${firstName}! 👋 Добро пожаловать в **CaloFit** — твой умный персональный помощник по питанию и калориям!\n\n🥗 **Что я умею:**\n1. Рассчитывать твою индивидуальную суточную норму калорий.\n2. Анализировать любую еду по фото за 3 секунды.\n3. Давать профессиональные советы от ИИ Диетолога.\n\nНажми кнопку ниже, чтобы открыть приложение! 👇`;

    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '📱 Открыть CaloFit', web_app: { url: this.webAppUrl } }],
          ],
          resize_keyboard: true,
        },
      }),
    });
  }

  // ─── Send Custom Message with Inline WebApp Button ─────────
  public async sendCustomMessage(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Открыть CaloFit', web_app: { url: this.webAppUrl } }],
          ],
        },
      }),
    });
  }

  // ─── Photo Analysis Handler ────────────────────────────────
  private async handlePhotoAnalysis(chatId: number, photos: any[]) {
    try {
      await this.sendCustomMessage(chatId, '📸 Снимок получен! Анализирую тарелку с помощью ИИ...');

      // Get largest resolution photo
      const largestPhoto = photos[photos.length - 1];
      const fileRes = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${largestPhoto.file_id}`,
      );
      const fileData = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        await this.sendCustomMessage(chatId, '⚠️ Не удалось загрузить фото. Попробуйте еще раз!');
        return;
      }

      const photoUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
      const imgRes = await fetch(photoUrl);
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // AI Analysis
      const result = await this.aiService.analyzeFood(buffer, 'image/jpeg', 'ru');

      const msgText = `🥗 **Результат анализа блюда:**\n\n📌 **${result.foodName}**\n⚖️ Порция: ${result.portionSize}\n🔥 Калории: **${result.calories} ккал**\n\n🔹 Белки: ${result.protein}г\n🔹 Жиры: ${result.fat}г\n🔹 Углеводы: ${result.carbs}г\n\n💡 **Совет диетолога:**\n${result.healthAdvice || 'Сбалансированное блюдо!'}`;

      await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msgText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Открыть дневник в CaloFit', web_app: { url: this.webAppUrl } }],
            ],
          },
        }),
      });
    } catch (err: any) {
      await this.sendCustomMessage(
        chatId,
        '⚠️ Извините, не удалось распознать еду на этой фотографии. Попробуйте сделать более чёткий снимок!',
      );
    }
  }

  // ─── Non-repetitive Phrase Picker ─────────────────────────
  private getRandomPhrase(category: 'morning' | 'lunch' | 'dinner' | 'summary'): string {
    let phrases: string[];
    switch (category) {
      case 'morning':
        phrases = MORNING_PHRASES;
        break;
      case 'lunch':
        phrases = LUNCH_PHRASES;
        break;
      case 'dinner':
        phrases = DINNER_PHRASES;
        break;
      case 'summary':
      default:
        phrases = EVENING_SUMMARY_PHRASES;
        break;
    }

    const lastIdx = this.lastPhraseIndices[category] ?? -1;
    let nextIdx: number;
    do {
      nextIdx = Math.floor(Math.random() * phrases.length);
    } while (phrases.length > 1 && nextIdx === lastIdx);

    this.lastPhraseIndices[category] = nextIdx;
    return phrases[nextIdx];
  }

  // ─── Broadcast Notification to All Active Users ───────────
  public async broadcastNotification(category: 'morning' | 'lunch' | 'dinner' | 'summary') {
    const text = this.getRandomPhrase(category);
    this.logger.log(`Broadcasting ${category} reminder to ${this.activeChatIds.size} subscribers...`);

    for (const chatId of Array.from(this.activeChatIds)) {
      try {
        await this.sendCustomMessage(chatId, text);
      } catch (err: any) {
        // Ignore dead chat IDs
      }
    }
  }

  public async sendRandomNotification(chatId: number, category: 'morning' | 'lunch' | 'dinner' | 'summary') {
    const text = this.getRandomPhrase(category);
    await this.sendCustomMessage(chatId, text);
  }

  // ─── Scheduled Reminders Timer ────────────────────────────
  private startScheduledNotificationTimer() {
    // Check every minute for target reminder times (08:30, 13:00, 19:30, 21:30)
    setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Morning 08:30
      if (hours === 8 && minutes === 30) {
        this.broadcastNotification('morning');
      }
      // Lunch 13:00
      if (hours === 13 && minutes === 0) {
        this.broadcastNotification('lunch');
      }
      // Dinner 19:30
      if (hours === 19 && minutes === 30) {
        this.broadcastNotification('dinner');
      }
      // Evening Summary 21:30
      if (hours === 21 && minutes === 30) {
        this.broadcastNotification('summary');
      }
    }, 60000);
  }
}
