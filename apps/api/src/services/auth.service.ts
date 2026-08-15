import crypto from "node:crypto";
// @ts-ignore
import * as otplib from "otplib";
const authenticator = otplib.authenticator;
import qrcode from "qrcode";
// @ts-ignore
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
// @ts-ignore
import type { VerifiedRegistrationResponse, RegistrationResponseJSON, VerifiedAuthenticationResponse, AuthenticationResponseJSON } from "@simplewebauthn/server";
import type { AuthUserDto, RoleName, TwoFactorSetupResponse } from "@gym/shared";
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

  public async login(email: string, password: string, token: string | undefined, context: RequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());

    if (!user || !user.isActive) {
      throw errors.unauthorized("Invalid email or password");
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw errors.unauthorized("Invalid email or password");
    }

    const securityUser = await this.repository.findUserForSecurity(user.id);
    if (securityUser?.twoFactorEnabled) {
      if (!token) {
        throw errors.domain(403, "2FA_REQUIRED", "Two-factor authentication code required");
      }
      if (!securityUser.twoFactorSecret) {
        throw errors.unauthorized("Two-factor authentication is improperly configured");
      }
      const isValid = authenticator.verify({ token, secret: securityUser.twoFactorSecret });
      if (!isValid) {
        throw errors.unauthorized("Invalid two-factor code");
      }
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

  public async memberLogin(email: string, password: string, token: string | undefined, context: RequestContext): Promise<AuthResult> {
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

    const securityUser = await this.repository.findUserForSecurity(user.id);
    if (securityUser?.twoFactorEnabled) {
      if (!token) {
        throw errors.domain(403, "2FA_REQUIRED", "Two-factor authentication code required");
      }
      if (!securityUser.twoFactorSecret) {
        throw errors.unauthorized("Two-factor authentication is improperly configured");
      }
      const isValid = authenticator.verify({ token, secret: securityUser.twoFactorSecret });
      if (!isValid) {
        throw errors.unauthorized("Invalid two-factor code");
      }
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

  public async verifyPasswordResetWith2FA(email: string, token: string, context: RequestContext): Promise<{ resetToken: string }> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());

    if (!user || !user.isActive) {
      throw errors.unauthorized("Invalid user");
    }

    const securityUser = await this.repository.findUserForSecurity(user.id);
    if (!securityUser || !securityUser.twoFactorEnabled || !securityUser.twoFactorSecret) {
      throw errors.unauthorized("Invalid user or 2FA not configured");
    }

    const isValid = authenticator.verify({ token, secret: securityUser.twoFactorSecret });
    if (!isValid) {
      throw errors.unauthorized("Invalid two-factor code");
    }

    const resetToken = this.tokenService.signPasswordResetToken(
      user.id,
      passwordFingerprint(user.passwordHash),
      `${this.env.PASSWORD_RESET_TOKEN_TTL_MINUTES}m`
    );

    await this.repository.writeAuditLog({
      userId: user.id,
      action: "PASSWORD_RESET_2FA_VERIFIED",
      entity: "User",
      entityId: user.id,
      ...context
    });

    return { resetToken };
  }

  public async me(actor: RequestActor): Promise<AuthUserDto> {
    const user = await this.repository.findUserById(actor.id);
    if (!user) throw errors.unauthorized();
    return toUserDto(user);
  }

  public async updateProfile(actor: RequestActor, input: { firstName: string; lastName: string; email: string }, context: RequestContext): Promise<AuthUserDto> {
    const user = await this.repository.findUserById(actor.id);
    if (!user) throw errors.unauthorized();

    if (input.email.toLowerCase() !== user.email) {
      const existing = await this.repository.findUserByEmail(input.email.toLowerCase());
      if (existing) throw errors.conflict("A user with that email already exists");
    }

    await this.repository.updateProfile(user.id, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase()
    });

    await this.repository.writeAuditLog({
      userId: user.id,
      action: "PROFILE_UPDATED",
      entity: "User",
      entityId: user.id,
      ...context
    });

    const updatedUser = await this.repository.findUserById(user.id);
    return toUserDto(updatedUser!);
  }

  public async changePassword(actor: RequestActor, currentPassword: string | undefined, newPassword: string, context: RequestContext): Promise<void> {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user) throw errors.unauthorized();

    if (user.passwordHash) {
      if (!currentPassword) throw errors.badRequest("Current password is required");
      const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);
      if (!passwordMatches) throw errors.badRequest("Incorrect current password");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.repository.updatePassword(user.id, passwordHash, false);
    await this.repository.revokeAllUserSessions(user.id);

    await this.repository.writeAuditLog({
      userId: user.id,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
      ...context
    });
  }

  public async generateTwoFactor(actor: RequestActor, context: RequestContext): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user) throw errors.unauthorized();
    if (user.twoFactorEnabled) throw errors.conflict("Two-factor authentication is already enabled");

    const secret = authenticator.generateSecret();
    await this.repository.setTwoFactorSecret(user.id, secret);

    const otpauthUrl = authenticator.keyuri(user.email, "ValorFitness", secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return { secret, qrCodeDataUrl };
  }

  public async verifyTwoFactor(actor: RequestActor, token: string, context: RequestContext): Promise<void> {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user || !user.twoFactorSecret) throw errors.badRequest("Two-factor setup not initiated");

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) throw errors.badRequest("Invalid two-factor code");

    await this.repository.enableTwoFactor(user.id);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "2FA_ENABLED",
      entity: "User",
      entityId: user.id,
      ...context
    });
  }

  public async disableTwoFactor(actor: RequestActor, token: string, context: RequestContext): Promise<void> {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) throw errors.badRequest("Two-factor not enabled");

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) throw errors.badRequest("Invalid two-factor code");

    await this.repository.disableTwoFactor(user.id);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "2FA_DISABLED",
      entity: "User",
      entityId: user.id,
      ...context
    });
  }

  public async getPasskeys(actor: RequestActor) {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user) throw errors.unauthorized();
    return user.passkeys.map(pk => ({
      id: pk.id,
      createdAt: pk.createdAt
    }));
  }

  public async generatePasskeyRegistration(actor: RequestActor) {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user) throw errors.unauthorized();

    const options = await generateRegistrationOptions({
      rpName: this.env.PASSKEY_RP_NAME,
      rpID: this.env.PASSKEY_RP_ID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      attestationType: "none",
      excludeCredentials: user.passkeys.map(pk => ({
        id: pk.credentialId,
        type: "public-key"
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred"
      }
    });

    return options;
  }

  public async verifyPasskeyRegistration(actor: RequestActor, body: RegistrationResponseJSON, expectedChallenge: string, context: RequestContext) {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user) throw errors.unauthorized();

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.env.PASSKEY_EXPECTED_ORIGIN.split(",").map(s => s.trim()),
        expectedRPID: this.env.PASSKEY_RP_ID.split(",").map(s => s.trim()),
      });
    } catch (error: any) {
      throw errors.badRequest(error.message);
    }

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      await this.repository.addPasskey({
        userId: user.id,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        counter: BigInt(credential.counter)
      });
      await this.repository.writeAuditLog({
        userId: user.id,
        action: "PASSKEY_REGISTERED",
        entity: "User",
        entityId: user.id,
        ...context
      });
    } else {
      throw errors.badRequest("Passkey verification failed");
    }
  }

  public async removePasskey(actor: RequestActor, passkeyId: string, context: RequestContext): Promise<void> {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user) throw errors.unauthorized();

    const passkey = user.passkeys.find(pk => pk.id === passkeyId);
    if (!passkey) throw errors.badRequest("Passkey not found");

    await this.repository.removePasskey(passkeyId);
    await this.repository.writeAuditLog({
      userId: user.id,
      action: "PASSKEY_REMOVED",
      entity: "User",
      entityId: user.id,
      ...context
    });
  }

  public async generatePasskeyAuthentication(email: string) {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || !user.isActive) throw errors.unauthorized("Invalid user");

    const userForSecurity = await this.repository.findUserForSecurity(user.id);
    if (!userForSecurity || userForSecurity.passkeys.length === 0) {
      throw errors.unauthorized("No passkeys registered for this user");
    }

    const options = await generateAuthenticationOptions({
      rpID: this.env.PASSKEY_RP_ID,
      allowCredentials: userForSecurity.passkeys.map(pk => ({
        id: pk.credentialId,
        type: "public-key"
      })),
      userVerification: "preferred"
    });

    return options;
  }

  public async verifyPasskeyAuthentication(email: string, body: AuthenticationResponseJSON, expectedChallenge: string, context: RequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || !user.isActive) throw errors.unauthorized("Invalid user");

    const userForSecurity = await this.repository.findUserForSecurity(user.id);
    if (!userForSecurity || userForSecurity.passkeys.length === 0) {
      throw errors.unauthorized("No passkeys registered for this user");
    }

    const passkey = userForSecurity.passkeys.find(pk => pk.credentialId === body.id);
    if (!passkey) {
      throw errors.unauthorized("Passkey not found for this user");
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.env.PASSKEY_EXPECTED_ORIGIN.split(",").map(s => s.trim()),
        expectedRPID: this.env.PASSKEY_RP_ID.split(",").map(s => s.trim()),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
          transports: passkey.transports as any,
        }
      });
    } catch (error: any) {
      throw errors.badRequest(error.message);
    }

    if (verification.verified) {
      // Passkey auth successful
      const tokens = await this.issueTokens(user, context);
      await this.repository.writeAuditLog({
        userId: user.id,
        action: "AUTH_LOGIN_PASSKEY",
        entity: "Session",
        entityId: tokens.refreshToken.slice(0, 8),
        ...context
      });

      return {
        user: toUserDto(user),
        tokens
      };
    } else {
      throw errors.unauthorized("Passkey verification failed");
    }
  }

  public async verifyPasswordResetWithPasskey(email: string, body: AuthenticationResponseJSON, expectedChallenge: string, context: RequestContext): Promise<{ resetToken: string }> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || !user.isActive) throw errors.unauthorized("Invalid user");

    const userForSecurity = await this.repository.findUserForSecurity(user.id);
    if (!userForSecurity || userForSecurity.passkeys.length === 0) {
      throw errors.unauthorized("No passkeys registered for this user");
    }

    const passkey = userForSecurity.passkeys.find(pk => pk.credentialId === body.id);
    if (!passkey) {
      throw errors.unauthorized("Passkey not found for this user");
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.env.PASSKEY_EXPECTED_ORIGIN.split(",").map(s => s.trim()),
        expectedRPID: this.env.PASSKEY_RP_ID.split(",").map(s => s.trim()),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
          transports: passkey.transports as any,
        }
      });
    } catch (error: any) {
      throw errors.badRequest(error.message);
    }

    if (verification.verified) {
      const resetToken = this.tokenService.signPasswordResetToken(
        user.id,
        passwordFingerprint(user.passwordHash),
        `${this.env.PASSWORD_RESET_TOKEN_TTL_MINUTES}m`
      );

      await this.repository.writeAuditLog({
        userId: user.id,
        action: "PASSWORD_RESET_PASSKEY_VERIFIED",
        entity: "User",
        entityId: user.id,
        ...context
      });

      return { resetToken };
    } else {
      throw errors.unauthorized("Passkey verification failed");
    }
  }

  public async requestSecurityDisable(userId: string, actor: RequestActor, context: RequestContext): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw errors.notFound("User not found");
    await this.repository.updateSecurityDisableRequested(userId, true);
    await this.repository.writeAuditLog({
      userId: actor.id,
      action: "SECURITY_DISABLE_REQUESTED",
      entity: "User",
      entityId: userId,
      ...context
    });
  }

  public async acceptSecurityDisable(actor: RequestActor, context: RequestContext): Promise<void> {
    const user = await this.repository.findUserForSecurity(actor.id);
    if (!user || !user.securityDisableRequested) throw errors.badRequest("No security disable request pending");
    
    if (user.twoFactorEnabled) {
      await this.repository.disableTwoFactor(actor.id);
    }
    for (const pk of user.passkeys) {
      await this.repository.removePasskey(pk.id);
    }
    await this.repository.updateSecurityDisableRequested(actor.id, false);

    await this.repository.writeAuditLog({
      userId: actor.id,
      action: "SECURITY_DISABLE_ACCEPTED",
      entity: "User",
      entityId: actor.id,
      ...context
    });
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
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled,
    hasPasskeys: user.hasPasskeys,
    securityDisableRequested: user.securityDisableRequested
  };
}

function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex");
}

function wasRotated(token: { rotatedAt: Date | null; replacedByTokenId: string | null }): boolean {
  return Boolean(token.rotatedAt || token.replacedByTokenId);
}
