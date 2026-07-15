export interface JwtPayload {
  sub: string; // userId
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
}
