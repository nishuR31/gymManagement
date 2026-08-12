import type { AuthUserDto, RoleName } from "@gym/shared";

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: RoleName;
}

export interface RequestActor extends AuthUserDto {}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}
