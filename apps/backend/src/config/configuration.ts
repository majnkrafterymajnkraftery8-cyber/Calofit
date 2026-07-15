import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // AI
  AI_PROVIDER: Joi.string().valid('openai', 'gemini').default('openai'),
  OPENAI_API_KEY: Joi.when('AI_PROVIDER', {
    is: 'openai',
    then: Joi.string().required(),
  }),
  OPENAI_MODEL: Joi.string().default('gpt-4o'),

  // Storage
  STORAGE_PROVIDER: Joi.string().valid('supabase').default('supabase'),
  SUPABASE_URL: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_BUCKET: Joi.string().default('food-images'),

  // CORS
  CORS_ORIGINS: Joi.string().required(),
});
