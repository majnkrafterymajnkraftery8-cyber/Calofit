import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 100 } })
  @ApiOperation({ summary: "Ro'yxatdan o'tish" })
  @ApiResponse({ status: 201, description: 'Muvaffaqiyatli ro\'yxatdan o\'tish' })
  @ApiResponse({ status: 409, description: 'Email allaqachon mavjud' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    }
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60 * 1000, limit: 100 } })
  @ApiOperation({ summary: 'Tizimga kirish' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish' })
  @ApiResponse({ status: 401, description: "Noto'g'ri hisob ma'lumotlari" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Get('verify-email')
  @Public()
  @ApiOperation({ summary: 'Emailni tasdiqlash' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({ status: 200, description: 'Email tasdiqlandi' })
  @ApiResponse({ status: 401, description: 'Yaroqsiz token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tasdiqlash xatini qayta yuborish' })
  @ApiResponse({ status: 200, description: 'Xat yuborildi' })
  async resendVerification(
    @Body() body: { email: string; locale?: string },
  ) {
    return this.authService.resendVerification(body.email, body.locale || 'uz');
  }

  @Post('google/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish' })
  async googleCallback(
    @Body() body: { code: string; redirectUri: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleLogin(body.code, body.redirectUri);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    return {
      accessToken: result.accessToken,
      user: {
        email: result.email,
        hasProfile: result.hasProfile,
      },
    };
  }

  @Post('telegram/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram Web App authentication' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish' })
  async telegramLogin(
    @Body() body: { initData: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.telegramLogin(body.initData);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    return {
      accessToken: result.accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        hasProfile: result.user.hasProfile,
      },
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token yangilash' })
  @ApiResponse({ status: 200, description: 'Yangi access token' })
  @ApiResponse({ status: 401, description: 'Refresh token yaroqsiz' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    const result = await this.authService.refresh(refreshToken);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tizimdan chiqish' })
  @ApiResponse({ status: 204, description: 'Muvaffaqiyatli chiqish' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    await this.authService.logout(userId, refreshToken);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  }
}
