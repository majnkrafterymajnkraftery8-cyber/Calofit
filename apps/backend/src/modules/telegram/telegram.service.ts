import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

import * as fs from 'fs';
import * as path from 'path';

type SupportedLang = 'uz' | 'ru' | 'en';

// ─── Multi-Language Phrase Banks ────────────────────────────

const MORNING_PHRASES: Record<SupportedLang, string[]> = {
  ru: [
    'Доброе утро! ☀️ Как спалось? Пора заправить организм энергией! Что у тебя сегодня вкусненького на завтрак? Загружай фото или загляни в CaloFit! 🍳',
    'С добрым утром, чемчик! 🌅 Завтрак — главный источник бодрости. Чем сегодня порадовал свой организм? Отправляй фото — я всё рассчитаю! 🥞',
    'Привет-привет! ☕ Утренний заряд энергии — залог успешного дня. Поделись, чем позавтракал? 🥪',
    'Доброе утречко! 🍳 Завтрак — это основа дня! Поделись фоточкой тарелочки, а я посчитаю калории и подкажу полезность! 🥑',
    'Утро доброе! 🥐 Чашка кофе и сбалансированный завтрак — и день удался! Что у тебя сегодня на столе?',
  ],
  uz: [
    'Xayrli tong! ☀️ Uyqungiz qanday bo\'ldi? Kunni energiya bilan boshlaymiz! Nonushtaga nima edingiz? Rasm yuboring yoki CaloFit-ga kiring! 🍳',
    'Xayrli tong! 🌅 Nonushta — kun bo\'yi tetiklik manbai. Bugun nimalar bilan tanovul qildingiz? Rasmini yuboring, hisoblab beraman! 🥞',
    'Salom-salom! ☕ Ertalabki ovqatlanish — muvaffaqiyatli kun kaliti. Nonushtangiz rasmini yuborasizmi? 🥪',
    'Ertalabki salom! 🍳 Nonushtaga nima tanovul qildingiz? Likopcha rasmini yuboring, barcha kaloriyalarni hisoblaymiz! 🥑',
  ],
  en: [
    'Good morning! ☀️ How did you sleep? Time to fuel up for the day! What did you have for breakfast? Send a photo or open CaloFit! 🍳',
    'Good morning! 🌅 Breakfast is key for energy. What\'s on your plate today? Send a photo and I will analyze it! 🥞',
    'Morning! ☕ A healthy breakfast sets the tone for a productive day. What delicious meal did you start with today? 🥪',
  ],
};

const LUNCH_PHRASES: Record<SupportedLang, string[]> = {
  ru: [
    'Привет! Время обеденного перерыва 🥗 Чем порадуешь свой организм? Сделай фото блюда — я всё посчитаю! 📸',
    'Обед — время восполнить силы! 🍲 Что аппетитного на тарелке? Загружай фото в CaloFit!',
    'Эй, пупс, не забудь пообедать! 🍕 Организму нужны белки и углеводы. Что вкусненького у тебя сегодня?',
    'Середина дня — самое время подкрепиться! 🥗 Поделись своим обедом — и я сразу рассчитаю макронутриенты! 🥑',
    'Приятного аппетита! 🍜 Показывай свой обед, проверим баланс белков, жиров и углеводов!',
  ],
  uz: [
    'Salom! Tushlik vaqti bo\'ldi 🥗 Organizmingiz uchun nima tanovul qilasiz? Taom rasmini yuboring, kkal hisoblaymiz! 📸',
    'Tushlik — kuch yig\'ish vaqti! 🍲 Likopchangizda nima bor? CaloFit-ga yuklang!',
    'Tushlik qilishni unutmang! 🍕 Oqsillar va uglevodlar juda muhim. Bugun nima yeyapsiz?',
    'Kun o\'rtasi — quvvat yig\'ish vaqti! 🥗 Tushlik rasmini yuboring, makronutrientlarni hisoblaymiz! 🥑',
  ],
  en: [
    'Hello! It\'s lunch time 🥗 What are you feeding your body today? Take a photo and I will calculate the calories! 📸',
    'Lunch time! 🍲 What yummy food is on your plate? Upload a photo to CaloFit!',
    'Hey there! Don\'t forget to have lunch. Your body needs protein and healthy carbs. What are you having today?',
  ],
};

const DINNER_PHRASES: Record<SupportedLang, string[]> = {
  ru: [
    'Добрый вечер! 🌙 Как прошёл день? Пора порадовать себя лёгким и вкусным ужином! Что у тебя сегодня? 🍽️',
    'Время ужина! 🐟 Легкий ужин — залог отличного и глубокого сна. Отправь фото тарелочки!',
    'Вечерний привет! 🥗 Зафиксируй свой ужин, чтобы посмотреть, сколько калорий осталось на сегодня!',
    'Добрый вечерок! 🌙 Чем ужинаешь сегодня? Показывай тарелку, чтобы дневник питания был полным! 🥗',
    'Ужин — время расслабиться и вкусно поесть 🍲 Сделай быстрый снимок — ИИ всё проанализирует!',
  ],
  uz: [
    'Xayrli kech! 🌙 Kuningiz qanday o\'tdi? Yengil va mazali kechki ovqat vaqti keldi! 🍽️',
    'Kechki ovqat vaqti! 🐟 Yengil ovqatlanish — tinch va chuqur uyqu garovi! Rasm yuboring!',
    'Kechki salom! 🥗 Bugungi ovqatlaringizni tekshirib, kkal me\'yorini ko\'rib oling!',
  ],
  en: [
    'Good evening! 🌙 How was your day? Time for a light and healthy dinner! What are you having? 🍽️',
    'Dinner time! 🐟 A light dinner guarantees great sleep. Share a picture of your dish!',
    'Evening check-in! 🥗 Log your dinner to see how many calories you have left for today!',
  ],
};

const EVENING_SUMMARY_PHRASES: Record<SupportedLang, string[]> = {
  ru: [
    'Отличный день! 🏆 Давай посмотрим твои успехи в CaloFit. Нажми кнопку ниже и проверь свои калории за сегодня! 📊',
    'Добрый вечерок! 🌙 Загляни в дневник CaloFit, чтобы подвести итоги дня и посмотреть норму калорий! 📈',
    'День подходит к концу 🌠 Проверь свой баланс калорий и отдыхай с чистой совестью! ✨',
  ],
  uz: [
    'Ajoyib kun! 🏆 CaloFit-dagi natijalaringizni ko\'ramiz. Pastdagi tugmani bosing va bugungi kaloriyalaringizni tekshiring! 📊',
    'Kechki salom! 🌙 CaloFit kundaligingizga kiring va bugungi sarflangan kkal-ni tekshiring! 📈',
  ],
  en: [
    'Great day! 🏆 Let\'s review your progress in CaloFit. Click the button below to check your daily calories! 📊',
    'Evening review! 🌙 Open CaloFit diary to check your calorie balance for today! 📈',
  ],
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private botToken: string;
  private webAppUrl: string;
  private isPolling = false;
  private lastUpdateId = 0;

  private activeChatIds: Set<number> = new Set();
  private userLanguages: Map<number, SupportedLang> = new Map();
  private lastPhraseIndices: Record<string, number> = {};

  constructor(
    private config: ConfigService,
    private aiService: AiService,
    private prisma: PrismaService,
  ) {
    this.botToken =
      this.config.get<string>('TELEGRAM_BOT_TOKEN') ||
      '8838776318:AAEm4AqkHfKmVDj6vVdOyF1k_w974YyL1jU';
    this.webAppUrl =
      this.config.get<string>('TELEGRAM_WEBAPP_URL') ||
      'https://calofit-liart.vercel.app/ru/dashboard';
  }

  async onModuleInit() {
    this.logger.log('Initializing Telegram Bot Service...');
    this.loadSubscribersFromFile();
    await this.setupBotCommandsAndMenu();
    this.startLongPolling();
    this.startScheduledNotificationTimer();
  }

  onModuleDestroy() {
    this.isPolling = false;
  }

  private loadSubscribersFromFile() {
    try {
      const filePath = path.join(process.cwd(), 'telegram_subscribers.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: number) => this.activeChatIds.add(id));
          this.logger.log(`Loaded ${this.activeChatIds.size} saved Telegram subscribers.`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load Telegram subscribers file: ${err?.message}`);
    }
  }

  private saveSubscribersToFile() {
    try {
      const filePath = path.join(process.cwd(), 'telegram_subscribers.json');
      fs.writeFileSync(filePath, JSON.stringify(Array.from(this.activeChatIds)), 'utf-8');
    } catch {}
  }

  // ─── Setup Bot Menu Button & Commands ───────────────────────
  private async setupBotCommandsAndMenu() {
    try {
      // 1. Set Chat Menu Button to open WebApp
      await fetch(`https://api.telegram.org/bot${this.botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '📱 CaloFit',
            web_app: { url: this.webAppUrl },
          },
        }),
      });

      // 2. Set Bot Commands
      await fetch(`https://api.telegram.org/bot${this.botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: '🚀 Start bot & choose language / Boshlash' },
            { command: 'lang', description: '🌐 Change language / Tilni o\'zgartirish' },
            { command: 'app', description: '📱 Open CaloFit WebApp' },
            { command: 'remind', description: '🔔 Check daily calories' },
          ],
        }),
      });

      this.logger.log('Telegram Bot WebApp Menu and Commands set successfully.');
    } catch (err: any) {
      this.logger.error('Failed to setup Telegram Bot commands/menu', err?.message);
    }
  }

  // ─── Long Polling ──────────────────────────────────────────
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
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  // ─── Main Update Router ────────────────────────────────────
  private async handleUpdate(update: any) {
    // 1. Callback Query (Language buttons clicked)
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }

    const message = update.message;
    if (!message) return;

    const chatId = message.chat?.id;
    if (!chatId) return;

    // Track active subscriber and save persistently
    if (!this.activeChatIds.has(chatId)) {
      this.activeChatIds.add(chatId);
      this.saveSubscribersToFile();
    }

    // Default language from user's telegram telegram code if not set
    if (!this.userLanguages.has(chatId)) {
      const langCode = message.from?.language_code || 'ru';
      const userLang: SupportedLang = langCode.startsWith('uz')
        ? 'uz'
        : langCode.startsWith('en')
        ? 'en'
        : 'ru';
      this.userLanguages.set(chatId, userLang);
    }

    // 2. Text Commands
    if (message.text) {
      const text = message.text.trim();
      if (text.startsWith('/start') || text.startsWith('/lang') || text.startsWith('/language')) {
        await this.sendLanguageSelectionMenu(chatId, message.from?.first_name || 'Friend');
      } else if (text.startsWith('/app')) {
        await this.sendAppLauncherMessage(chatId);
      } else if (text.startsWith('/remind')) {
        await this.sendRandomNotification(chatId, 'summary');
      } else {
        const lang = this.getUserLang(chatId);
        const promptText =
          lang === 'uz'
            ? `Salom, ${message.from?.first_name || ''}! 👋\nKaloriyalarigizni hisoblash yoki AI Dietolog bilan muloqot qilish uchun pastdagi tugmani bosing yoki taom rasmini yuboring! 📸`
            : lang === 'en'
            ? `Hello, ${message.from?.first_name || ''}! 👋\nTo calculate calories or talk to AI Dietician, tap the button below or send a meal photo! 📸`
            : `Привет, ${message.from?.first_name || ''}! 👋\nЧтобы посчитать калории или спросить ИИ Диетолога — просто нажми кнопку ниже или отправь фото еды! 📸`;

        await this.sendCustomMessage(chatId, promptText);
      }
    }

    // 3. Photo uploads
    if (message.photo && Array.isArray(message.photo)) {
      await this.handlePhotoAnalysis(chatId, message.photo);
    }
  }

  // ─── Language Selection Menu on /start ──────────────────────
  private async sendLanguageSelectionMenu(chatId: number, firstName: string) {
    const text = `Привет, ${firstName}! 👋 Добро пожаловать в **CaloFit**!\n\nIltimos, bot tilini tanlang:\nПожалуйста, выберите язык бота:\nPlease select the bot language:`;

    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🇺🇿 O\'zbekcha', callback_data: 'set_lang_uz' }],
            [{ text: '🇷🇺 Русский', callback_data: 'set_lang_ru' }],
            [{ text: '🇬🇧 English', callback_data: 'set_lang_en' }],
          ],
        },
      }),
    });
  }

  // ─── Handle Callback Query ──────────────────────────────────
  private async handleCallbackQuery(cb: any) {
    const chatId = cb.message?.chat?.id;
    const data = cb.data;
    if (!chatId || !data) return;

    // Answer callback query to remove loading spinner in Telegram
    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id }),
      });
    } catch {}

    if (data.startsWith('set_lang_')) {
      const selectedLang = data.replace('set_lang_', '') as SupportedLang;
      this.userLanguages.set(chatId, selectedLang);

      await this.sendLanguageConfirmedMessage(chatId, selectedLang);
    }
  }

  // ─── Confirmation Message after Language Selection ──────────
  private async sendLanguageConfirmedMessage(chatId: number, lang: SupportedLang) {
    let text = '';
    let buttonLabel = '';

    if (lang === 'uz') {
      text = `✅ **Til tanlandi: O'zbekcha!** 🇺🇿\n\n🎯 **Yangi foydalanuvchilar uchun yo'riqnoma:**\n\n1️⃣ Pastdagi **«🚀 CaloFit App-ni ochish»** tugmasini bosing.\n2️⃣ Ilova avtomatik ravishda Telegram profilingiz orqali tizimga kiradi!\n3️⃣ O'z ma'lumotlaringizni (bo'y, vazn, maqsad) kiriting.\n4️⃣ Taom rasmini yuklang — AI 3 sekundda kkal va makronutrientlarni hisoblaydi!\n\n👇 **Ilovaga kirish uchun bosing:**`;
      buttonLabel = '🚀 CaloFit App-ni ochish';
    } else if (lang === 'en') {
      text = `✅ **Language set to English!** 🇬🇧\n\n🎯 **Beginner's Guide:**\n\n1️⃣ Tap the **«🚀 Open CaloFit App»** button below.\n2️⃣ You will automatically log in using your Telegram account!\n3️⃣ Complete your quick profile (height, weight, goal).\n4️⃣ Snap a photo of your meal — AI calculates calories & macros in 3s!\n\n👇 **Tap below to open Mini App:**`;
      buttonLabel = '🚀 Open CaloFit App';
    } else {
      text = `✅ **Язык выбран: Русский!** 🇷🇺\n\n🎯 **Гайд для новичков (Как пользоваться):**\n\n1️⃣ Нажмите кнопку **«🚀 Открыть CaloFit App»** ниже (или синюю кнопку меню слева внизу).\n2️⃣ Вход произойдет **автоматически** через ваш Telegram-аккаунт в 1 клик!\n3️⃣ Заполните параметры (рост, вес, цель).\n4️⃣ Делайте фото любого блюда — ИИ моментально рассчитает калории, белки, жиры и углеводы!\n\n👇 **Жмите кнопку ниже, чтобы запустить Mini App:**`;
      buttonLabel = '🚀 Открыть CaloFit App';
    }

    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: buttonLabel, web_app: { url: this.webAppUrl } }],
          ],
          resize_keyboard: true,
        },
      }),
    });
  }

  private async sendAppLauncherMessage(chatId: number) {
    const lang = this.getUserLang(chatId);
    const label =
      lang === 'uz' ? '📱 CaloFit-ni ochish' : lang === 'en' ? '📱 Open CaloFit' : '📱 Открыть CaloFit';
    const text =
      lang === 'uz'
        ? 'CaloFit ilovasini ishga tushirish uchun pastdagi tugmani bosing 👇'
        : lang === 'en'
        ? 'Tap the button below to launch CaloFit WebApp 👇'
        : 'Нажми кнопку ниже, чтобы запустить приложение CaloFit 👇';

    await this.sendCustomMessage(chatId, text, label);
  }

  // ─── Send Custom Message with WebApp Inline Button ──────────
  public async sendCustomMessage(chatId: number, text: string, buttonText?: string) {
    const lang = this.getUserLang(chatId);
    const label =
      buttonText ||
      (lang === 'uz'
        ? '📱 CaloFit-ni ochish'
        : lang === 'en'
        ? '📱 Open CaloFit'
        : '📱 Открыть CaloFit');

    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: label, web_app: { url: this.webAppUrl } }],
          ],
        },
      }),
    });
  }

  // ─── Photo Analysis Handler ────────────────────────────────
  private async handlePhotoAnalysis(chatId: number, photos: any[]) {
    const lang = this.getUserLang(chatId);
    const waitMsg =
      lang === 'uz'
        ? '📸 Rasm qabul qilindi! AI yordamida tahlil qilinmoqda...'
        : lang === 'en'
        ? '📸 Photo received! Analyzing meal with AI...'
        : '📸 Снимок получен! Анализирую тарелку с помощью ИИ...';

    try {
      await this.sendCustomMessage(chatId, waitMsg);

      const largestPhoto = photos[photos.length - 1];
      const fileRes = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${largestPhoto.file_id}`,
      );
      const fileData = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        throw new Error('Could not fetch file path');
      }

      const photoUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
      const imgRes = await fetch(photoUrl);
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // AI Analysis in user's language
      const result = await this.aiService.analyzeFood(buffer, 'image/jpeg', lang);

      let msgText = '';
      if (lang === 'uz') {
        msgText = `🥗 **Taom tahlili natijasi:**\n\n📌 **${result.foodName}**\n⚖️ Portsiya: ${result.portionSize}\n🔥 Kaloriya: **${result.calories} kkal**\n\n🔹 Oqsil: ${result.protein}g\n🔹 Yog': ${result.fat}g\n🔹 Uglevod: ${result.carbs}g\n\n💡 **Dietolog maslahati:**\n${result.healthAdvice || 'Sog\'lom taom!'}`;
      } else if (lang === 'en') {
        msgText = `🥗 **Meal Analysis Result:**\n\n📌 **${result.foodName}**\n⚖️ Portion: ${result.portionSize}\n🔥 Calories: **${result.calories} kcal**\n\n🔹 Protein: ${result.protein}g\n🔹 Fat: ${result.fat}g\n🔹 Carbs: ${result.carbs}g\n\n💡 **Dietician Advice:**\n${result.healthAdvice || 'Healthy meal!'}`;
      } else {
        msgText = `🥗 **Результат анализа блюда:**\n\n📌 **${result.foodName}**\n⚖️ Порция: ${result.portionSize}\n🔥 Калории: **${result.calories} ккал**\n\n🔹 Белки: ${result.protein}г\n🔹 Жиры: ${result.fat}г\n🔹 Углеводы: ${result.carbs}г\n\n💡 **Совет диетолога:**\n${result.healthAdvice || 'Сбалансированное блюдо!'}`;
      }

      await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msgText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'uz' ? '📱 Kundalikni ochish' : lang === 'en' ? '📱 Open Log' : '📱 Открыть дневник', web_app: { url: this.webAppUrl } }],
            ],
          },
        }),
      });
    } catch (err: any) {
      const errText =
        lang === 'uz'
          ? '⚠️ Kechirasiz, rasmdagi taomni aniqlab bo\'lmadi. Qaytadan aniqroq rasm yuboring!'
          : lang === 'en'
          ? '⚠️ Sorry, could not identify food in this photo. Please try sending a clearer picture!'
          : '⚠️ Извините, не удалось распознать еду на этой фотографии. Попробуйте сделать более чёткий снимок!';
      await this.sendCustomMessage(chatId, errText);
    }
  }

  // ─── Non-repetitive Phrase Picker per Language ─────────────
  private getRandomPhrase(chatId: number, category: 'morning' | 'lunch' | 'dinner' | 'summary'): string {
    const lang = this.getUserLang(chatId);
    let phrasesMap: Record<SupportedLang, string[]>;

    switch (category) {
      case 'morning':
        phrasesMap = MORNING_PHRASES;
        break;
      case 'lunch':
        phrasesMap = LUNCH_PHRASES;
        break;
      case 'dinner':
        phrasesMap = DINNER_PHRASES;
        break;
      case 'summary':
      default:
        phrasesMap = EVENING_SUMMARY_PHRASES;
        break;
    }

    const phrases = phrasesMap[lang] || phrasesMap.ru;
    const key = `${chatId}_${category}`;
    const lastIdx = this.lastPhraseIndices[key] ?? -1;

    let nextIdx: number;
    do {
      nextIdx = Math.floor(Math.random() * phrases.length);
    } while (phrases.length > 1 && nextIdx === lastIdx);

    this.lastPhraseIndices[key] = nextIdx;
    return phrases[nextIdx];
  }

  private getUserLang(chatId: number): SupportedLang {
    return this.userLanguages.get(chatId) || 'ru';
  }

  // ─── Broadcast Notification to All Active Users ───────────
  public async broadcastNotification(category: 'morning' | 'lunch' | 'dinner' | 'summary') {
    this.logger.log(`Broadcasting ${category} reminder to ${this.activeChatIds.size} subscribers...`);

    for (const chatId of Array.from(this.activeChatIds)) {
      try {
        const text = this.getRandomPhrase(chatId, category);
        await this.sendCustomMessage(chatId, text);
      } catch (err: any) {
        // Ignore dead chat IDs
      }
    }
  }

  public async sendRandomNotification(chatId: number, category: 'morning' | 'lunch' | 'dinner' | 'summary') {
    const text = this.getRandomPhrase(chatId, category);
    await this.sendCustomMessage(chatId, text);
  }

  // ─── Scheduled Reminders Timer (Uzbekistan Time: Asia/Tashkent UTC+5) ─────
  private startScheduledNotificationTimer() {
    let lastFiredSlot = '';

    setInterval(() => {
      // Get current time in Uzbekistan timezone (Asia/Tashkent)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Tashkent',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(new Date());
      const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

      const slotKey = `${hours}:${minutes}`;
      if (lastFiredSlot === slotKey) return;

      // Morning 08:30 UZB
      if (hours === 8 && minutes === 30) {
        lastFiredSlot = slotKey;
        this.broadcastNotification('morning');
      }
      // Lunch 13:00 UZB
      if (hours === 13 && minutes === 0) {
        lastFiredSlot = slotKey;
        this.broadcastNotification('lunch');
      }
      // Dinner 19:30 UZB
      if (hours === 19 && minutes === 30) {
        lastFiredSlot = slotKey;
        this.broadcastNotification('dinner');
      }
      // Evening Summary 21:30 UZB
      if (hours === 21 && minutes === 30) {
        lastFiredSlot = slotKey;
        this.broadcastNotification('summary');
      }
    }, 30000);
  }
}
