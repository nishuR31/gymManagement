import crypto from "node:crypto";
import type { AuthUserDto, RoleName } from "@gym/shared";
import { canManageRole } from "../config/auth.js";
import type { Env } from "../config/env.js";
import { errors } from "../errors/app-error.js";
import type { AuthRepository, AuthUserRecord } from "../repositories/auth.repository.js";
import type { RequestActor, RequestContext } from "../types/auth.js";
import { addDays } from "../utils/dates.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createRefreshToken, hashRefreshToken } from "../utils/refresh-token.js";
import { TokenService } from "./token.service.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: AuthUserDto;
  tokens: AuthTokens;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: RoleName;
}

export class AuthService {
  public constructor(
    private readonly repository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly env: Env
  ) {}

  public async register(input: RegisterInput, actor: RequestActor, context: RequestContext): Promise<AuthUserDto> {
    const email = input.email.toLowerCase();

    if (!canManageRole(actor.role, input.role)) {
      throw errors.forbidden("You cannot create users with that role");
    }

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser) {
      throw errors.conflict("A user with that email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.createUser({
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleName: input.role
    });

    await this.repository.writeAuditLog({
      userId: actor.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      metadata: { role: input.role },
      ...context
    });

    return toUserDto(user);
  }

  public async login(email: string, password: string, context: RequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());

    if (!user || !user.isActive) {
      throw errors.unauthorized("Invalid email or password");
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw errors.unauthorized("Invalid email or password");
    }

    const tokens = await this.issueTokens(user, context);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "AUTH_LOGIN",
      entity: "Session",
      entityId: tokens.refreshToken.slice(0, 8),
      ...context
    });

    return {
      user: toUserDto(user),
      tokens
    };
  }

  public async memberLogin(email: string, password: string, context: RequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());

    if (!user || user.role !== "MEMBER" || !user.memberId) {
      throw errors.domain(403, "NOT_A_MEMBER", "You are not a member of ValorFitness");
    }

    if (!user.isActive) {
      throw errors.unauthorized("Invalid email or password");
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw errors.unauthorized("Invalid email or password");
    }

    const tokens = await this.issueTokens(user, context);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "AUTH_MEMBER_LOGIN",
      entity: "Session",
      entityId: tokens.refreshToken.slice(0, 8),
      ...context
    });

    return {
      user: toUserDto(user),
      tokens
    };
  }

  public async refresh(refreshToken: string, context: RequestContext): Promise<AuthResult> {
    const tokenHash = hashRefreshToken(refreshToken);
    const persistedToken = await this.repository.findRefreshTokenByHash(tokenHash);
    const now = new Date();

    if (!persistedToken) {
      throw errors.unauthorized("Invalid refresh token");
    }

    if (persistedToken.revokedAt && wasRotated(persistedToken)) {
      await this.repository.revokeSession(persistedToken.sessionId);
      await this.repository.revokeRefreshTokensForSession(persistedToken.sessionId);
      await this.repository.writeAuditLog({
        userId: persistedToken.userId,
        action: "AUTH_REFRESH_REUSE_DETECTED",
        entity: "Session",
        entityId: persistedToken.sessionId,
        ...context
      });
      throw errors.unauthorized("Invalid refresh token");
    }

    if (
      persistedToken.revokedAt ||
      persistedToken.expiresAt <= now ||
      persistedToken.session.revokedAt ||
      persistedToken.session.expiresAt <= now ||
      !persistedToken.user.isActive
    ) {
      throw errors.unauthorized("Invalid refresh token");
    }

    const nextRefreshToken = createRefreshToken();
    const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
    const nextRefreshTokenRecord = await this.repository.createRefreshToken({
      tokenHash: nextRefreshTokenHash,
      userId: persistedToken.userId,
      sessionId: persistedToken.sessionId,
      expiresAt: addDays(now, this.env.REFRESH_TOKEN_TTL_DAYS)
    });
    await this.repository.revokeRefreshToken(persistedToken.id, nextRefreshTokenRecord.id);

    const accessToken = this.tokenService.signAccessToken(toUserDto(persistedToken.user));
    await this.repository.writeAuditLog({
      userId: persistedToken.userId,
      action: "AUTH_REFRESH",
      entity: "Session",
      entityId: persistedToken.sessionId,
      ...context
    });

    return {
      user: toUserDto(persistedToken.user),
      tokens: {
        accessToken,
        refreshToken: nextRefreshToken,
        expiresIn: this.env.JWT_ACCESS_EXPIRES_IN
      }
    };
  }

  public async logout(refreshToken: string | undefined, context: RequestContext): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const persistedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!persistedToken) {
      return;
    }

    await this.repository.revokeRefreshToken(persistedToken.id);
    await this.repository.revokeSession(persistedToken.sessionId);
    await this.repository.writeAuditLog({
      userId: persistedToken.userId,
      action: "AUTH_LOGOUT",
      entity: "Session",
      entityId: persistedToken.sessionId,
      ...context
    });
  }

  public async requestPasswordReset(email: string, context: RequestContext): Promise<{ resetToken?: string }> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());

    if (!user || !user.isActive) {
      return {};
    }

    const resetToken = this.tokenService.signPasswordResetToken(
      user.id,
      passwordFingerprint(user.passwordHash),
      `${this.env.PASSWORD_RESET_TOKEN_TTL_MINUTES}m`
    );

    await this.repository.writeAuditLog({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user.id,
      ...context
    });

    return this.env.NODE_ENV === "production" ? {} : { resetToken };
  }

  public async confirmPasswordReset(token: string, newPassword: string, context: RequestContext): Promise<void> {
    const claims = this.tokenService.verifyPasswordResetToken(token);
    const user = await this.repository.findUserById(claims.sub);

    if (!user || !user.isActive || claims.fingerprint !== passwordFingerprint(user.passwordHash)) {
      throw errors.unauthorized("Invalid password reset token");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.repository.updatePassword(user.id, passwordHash);
    await this.repository.revokeAllUserSessions(user.id);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "PASSWORD_RESET_CONFIRMED",
      entity: "User",
      entityId: user.id,
      ...context
    });
  }

  public async me(actor: RequestActor): Promise<AuthUserDto> {
    return actor;
  }

  public async completeFirstPassword(actor: RequestActor, newPassword: string, context: RequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserById(actor.id);

    if (!user || !user.isActive) {
      throw errors.unauthorized();
    }

    if (!user.mustChangePassword) {
      throw errors.conflict("Password has already been changed");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.repository.updatePassword(user.id, passwordHash, false);
    await this.repository.revokeAllUserSessions(user.id);

    const updatedUser = await this.repository.findUserById(user.id);
    if (!updatedUser) {
      throw errors.unauthorized();
    }

    const tokens = await this.issueTokens(updatedUser, context);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "FIRST_PASSWORD_SET",
      entity: "User",
      entityId: user.id,
      ...context
    });

    return {
      user: toUserDto(updatedUser),
      tokens
    };
  }

  private async issueTokens(user: AuthUserRecord, context: RequestContext): Promise<AuthTokens> {
    const now = new Date();
    const expiresAt = addDays(now, this.env.REFRESH_TOKEN_TTL_DAYS);
    const session = await this.repository.createSession({
      userId: user.id,
      expiresAt,
      ...context
    });
    const refreshToken = createRefreshToken();
    await this.repository.createRefreshToken({
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      sessionId: session.id,
      expiresAt
    });

    return {
      accessToken: this.tokenService.signAccessToken(toUserDto(user)),
      refreshToken,
      expiresIn: this.env.JWT_ACCESS_EXPIRES_IN
    };
  }
}

function toUserDto(user: AuthUserRecord): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    mustChangePassword: user.mustChangePassword
  };
}

function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex");
}

function wasRotated(token: { rotatedAt: Date | null; replacedByTokenId: string | null }): boolean {
  return Boolean(token.rotatedAt || token.replacedByTokenId);
}
