import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  // ─── Register ─────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: 'Bu email allaqachon ro\'yxatdan o\'tgan',
      });
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    // Auto-verify if email is admin@calofit.com or matches admin prefix
    const isTestAccount = dto.email.toLowerCase().startsWith('admin@');
    
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        isEmailVerified: isTestAccount,
        verificationToken: isTestAccount ? null : rawToken,
        verificationTokenExpiresAt: isTestAccount ? null : expiresAt,
      },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (!user.isEmailVerified) {
      // Send real/console-log verification email
      await this.mailService.sendVerificationEmail(user.email, dto.locale || 'uz', rawToken);
      
      return {
        accessToken: null,
        refreshToken: null,
        user: { id: user.id, email: user.email, hasProfile: false, isEmailVerified: false },
      };
    }

    const tokens = await this.generateAndSaveTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, email: user.email, hasProfile: false, isEmailVerified: true },
    };
  }

  // ─── Login ────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, isEmailVerified: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: "Email yoki parol noto'g'ri",
      });
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: "Email yoki parol noto'g'ri",
      });
    }

    // Secure restriction: block access if user is not verified
    if (!user.isEmailVerified) {
      throw new ForbiddenException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Iltimos, avval pochtangizni tasdiqlang.',
      });
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const tokens = await this.generateAndSaveTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        hasProfile: !!profile,
      },
    };
  }

  // ─── Verify Email ─────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_TOKEN',
        message: 'Tasdiqlash havolasi noto\'g\'ri yoki eskirgan',
      });
    }

    if (user.verificationTokenExpiresAt && new Date() > user.verificationTokenExpiresAt) {
      throw new UnauthorizedException({
        error: 'EXPIRED_TOKEN',
        message: 'Tasdiqlash havolasining muddati o\'tgan',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    return { success: true };
  }

  // ─── Resend Verification Token ────────────────────────
  async resendVerification(email: string, locale: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException({
        error: 'NOT_FOUND',
        message: 'Foydalanuvchi topilmadi',
      });
    }

    if (user.isEmailVerified) {
      throw new ConflictException({
        error: 'ALREADY_VERIFIED',
        message: 'Email allaqachon tasdiqlangan',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: rawToken,
        verificationTokenExpiresAt: expiresAt,
      },
    });

    await this.mailService.sendVerificationEmail(user.email, locale, rawToken);

    return { success: true };
  }

  // ─── Google OAuth Login / Callback ────────────────────
  async googleLogin(code: string, redirectUri: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new ForbiddenException({
        error: 'GOOGLE_OAUTH_NOT_CONFIGURED',
        message: 'Google Client credentials are not configured on the backend.',
      });
    }

    try {
      // 1. Exchange authorization code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || 'Failed to exchange auth code');
      }

      // 2. Fetch user profile from google userinfo API
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profile = await userinfoRes.json();
      if (!userinfoRes.ok || !profile.email) {
        throw new Error('Failed to fetch Google user profile');
      }

      // 3. Find or Create user in our DB
      let user = await this.prisma.user.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (!user) {
        // Create secure random password for OAuth user
        const securePass = crypto.randomBytes(32).toString('hex');
        const passwordHash = await argon2.hash(securePass);

        user = await this.prisma.user.create({
          data: {
            email: profile.email.toLowerCase(),
            passwordHash,
            isEmailVerified: true, // Google pre-verifies emails
          },
        });
      } else if (!user.isEmailVerified) {
        // If local user registered but didn't verify, verify now because Google oauth confirms email ownership
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
        });
      }

      const profileExists = await this.prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      const tokens = await this.generateAndSaveTokens(user.id);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        hasProfile: !!profileExists,
        email: user.email,
      };
    } catch (err: any) {
      this.logger.error('Google OAuth exchange failed', err.stack);
      throw new UnauthorizedException({
        error: 'GOOGLE_OAUTH_FAILED',
        message: `Google authorization failed: ${err.message}`,
      });
    }
  }

  // ─── Refresh ──────────────────────────────────────────
  async refresh(refreshToken: string) {
    // JWT verify
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Refresh token yaroqsiz yoki muddati o\'tgan',
      });
    }

    // DB dan tekshiruv
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, isRevoked: true, expiresAt: true },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Refresh token yaroqsiz',
      });
    }

    // Eski tokenni bekor qilish (rotation)
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true },
    });

    // Yangi token pair
    const tokens = await this.generateAndSaveTokens(payload.sub);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ─── Logout ───────────────────────────────────────────
  async logout(userId: string, refreshToken: string | undefined) {
    if (!refreshToken) return;

    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  // ─── Private helpers ──────────────────────────────────
  private async generateAndSaveTokens(userId: string) {
    const accessToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any,
      },
    );

    const refreshToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      },
    );

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
