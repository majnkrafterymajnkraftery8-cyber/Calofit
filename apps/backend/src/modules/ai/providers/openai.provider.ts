import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  AIProvider,
  FoodAnalysisResult,
} from '../interfaces/ai-provider.interface';

// ─── Zod Schema ───────────────────────────────────────────
const FoodAnalysisSchema = z.object({
  is_food: z.boolean(),
  food_name: z.string().min(1).max(100),
  food_name_local: z.string().max(100),
  portion_size: z.string().min(1).max(200),
  calories: z.number().min(0).max(10_000),
  protein: z.number().min(0).max(1_000),
  fat: z.number().min(0).max(1_000),
  carbs: z.number().min(0).max(1_000),
  confidence_score: z.number().min(0).max(1),
  notes: z.string().max(200),
  ingredients: z.array(z.string()),
  health_advice: z.string().nullable().optional(),
  portion_breakdown: z.string().nullable().optional(),
});

// ─── OpenAI JSON Schema ───────────────────────────────────
const FOOD_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean', description: 'True if the image contains food or drink' },
    food_name: { type: 'string', description: 'Name of the food/dish in English. Max 100 chars.' },
    food_name_local: { type: 'string', description: 'Local/Uzbek name if known. Empty string if unknown.' },
    portion_size: { type: 'string', description: 'Estimated portion description (e.g. "1 serving (~300g)")' },
    calories: { type: 'number', description: 'Total calories (kcal) for the entire visible portion. Non-negative.' },
    protein: { type: 'number', description: 'Total protein in grams. Non-negative.' },
    fat: { type: 'number', description: 'Total fat in grams. Non-negative.' },
    carbs: { type: 'number', description: 'Total carbohydrates in grams. Non-negative.' },
    confidence_score: { type: 'number', description: 'Confidence level from 0.0 to 1.0.' },
    notes: { type: 'string', description: 'Optional brief note about uncertainty. Max 200 chars.' },
    ingredients: { 
      type: 'array', 
      items: { type: 'string' }, 
      description: 'List of detected key ingredients in the language of the request (Uzbek/Russian).' 
    },
    health_advice: { 
      type: 'string', 
      description: 'Detailed professional dietician advice about this dish, its nutritional pros and cons, health benefits or warnings (e.g. "Taom oqsilga boy, biroq yog` miqdori ko`p..."). Return in the user`s language (Uzbek or Russian).' 
    },
    portion_breakdown: { 
      type: 'string', 
      description: 'Estimated breakdown of dish weight components (e.g. "Guruch: ~150g, Go`sht: ~100g, Sabzavotlar: ~50g").' 
    }
  },
  required: [
    'is_food', 
    'food_name', 
    'food_name_local', 
    'portion_size', 
    'calories', 
    'protein', 
    'fat', 
    'carbs', 
    'confidence_score', 
    'notes', 
    'ingredients', 
    'health_advice', 
    'portion_breakdown'
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a professional dietician, nutritionist, and food recognition AI.
Your task is to analyze food images and provide accurate nutritional information along with professional dietetic guidance.

RULES:
1. Analyze ONLY food/drink items visible in the image.
2. If the image does not contain food, set "is_food" to false and return zero values.
3. Estimate portion size based on visual cues (plate size, utensils, context).
4. If multiple dishes are visible, analyze the TOTAL combined nutrition.
5. Provide values per the ENTIRE visible portion, not per 100g.
6. Use standard nutritional databases (USDA, regional cuisine knowledge) for accuracy.
7. For Central Asian cuisine (palov, lagman, samsa, etc.), apply region-specific values.
8. confidence_score reflects your certainty: 0.9-1.0 clear, 0.7-0.89 good, 0.5-0.69 unclear, below 0.5 cannot identify.
9. Under "health_advice", write a professional dietician analysis of the food, explaining its health pros and cons, and friendly suggestions.
10. Under "ingredients", list all key visible ingredients of the dish.
11. Under "portion_breakdown", list individual weight estimates of each main ingredient.
12. Always respond with valid JSON matching the schema. No extra text.`;

const USER_PROMPT = 'Analyze this food image, perform a full dietician analysis, and return a JSON object matching the required schema.';

@Injectable()
export class OpenAIProvider extends AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private config: ConfigService) {
    super();
    this.client = new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY') });
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  async analyzeFood(buffer: Buffer, mimeType: string, locale?: string): Promise<FoodAnalysisResult> {
    let rawContent: string;

    const userLanguage = locale === 'ru' ? 'Russian' : locale === 'en' ? 'English' : 'Uzbek';
    const dynamicPrompt = `Analyze this food image, perform a full dietician analysis, and return a JSON object matching the required schema. IMPORTANT: All text/string fields ("food_name_local", "portion_size", "notes", "ingredients", "health_advice", "portion_breakdown") MUST be written in the following language: ${userLanguage}.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'food_analysis',
            strict: true,
            schema: FOOD_ANALYSIS_SCHEMA,
          },
        },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${buffer.toString('base64')}`,
                  detail: 'high',
                },
              },
              { type: 'text', text: dynamicPrompt },
            ],
          },
        ],
      });

      rawContent = response.choices[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.error('OpenAI API error', err?.message);
      throw new Error('AI_API_ERROR');
    }

    // JSON parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      this.logger.error('JSON parse failed', rawContent);
      throw new Error('AI_PARSE_ERROR');
    }

    // Zod validation
    const result = FoodAnalysisSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error('Zod validation failed', result.error.message);
      throw new Error('AI_INVALID_RESPONSE');
    }

    if (!result.data.is_food) {
      throw new Error('NOT_FOOD_IMAGE');
    }

    return {
      foodName: result.data.food_name_local || result.data.food_name,
      portionSize: result.data.portion_size,
      calories: Math.round(result.data.calories * 100) / 100,
      protein: Math.round(result.data.protein * 100) / 100,
      fat: Math.round(result.data.fat * 100) / 100,
      carbs: Math.round(result.data.carbs * 100) / 100,
      confidenceScore: result.data.confidence_score,
      ingredients: result.data.ingredients,
      healthAdvice: result.data.health_advice || null,
      portionBreakdown: result.data.portion_breakdown || null,
    };
  }
}
