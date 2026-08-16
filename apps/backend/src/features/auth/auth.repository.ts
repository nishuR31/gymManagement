import type { PrismaClient, Passkey } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import type { AuthUserDto, RoleName, ProfileUpdateDto } from "@gym/shared";

// twoFactorSecret is now included on AuthUserRecord so that the login path
// does not need a second findUserForSecurity() query.
export interface AuthUserRecord extends AuthUserDto {
  passwordHash: string;
  isActive: boolean;
  memberId: string | null;
  securityDisableRequested: boolean;
  /** Populated by findUserByEmail and findUserForSecurity; null when not loaded. */
  twoFactorSecret: string | null;
  /** Full passkey rows; only populated by findUserForSecurity. */
  passkeyRows: Passkey[];
}

/**
 * Minimal user projection used exclusively by the refresh token path.
 * Does NOT include passwordHash or passkey rows — they are never needed
 * during token rotation and including them would be either wasteful or misleading.
 */
export interface RefreshAuthRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleName;
  memberId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  hasPasskeys: boolean;
  securityDisableRequested: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  sessionId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
  replacedByTokenId: string | null;
  /** Minimal user projection — use AuthUserRecord only when password / passkeys are needed. */
  user: RefreshAuthRecord;
  session: SessionRecord;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleName: RoleName;
  mustChangePassword?: boolean;
}

export interface CreateSessionInput {
  /** Optional pre-generated ID — supply this to parallelise session + refresh-token writes. */
  id?: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionAndTokenInput {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  tokenHash: string;
}

export interface CreateRefreshTokenInput {
  tokenHash: string;
  userId: string;
  sessionId: string;
  expiresAt: Date;
}

export interface AuditLogInput {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}



export interface PasskeyInput {
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: bigint;
  transports?: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  createUser(input: CreateUserInput): Promise<AuthUserRecord>;
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<{ id: string }>;
  createSessionAndToken(input: CreateSessionAndTokenInput): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  findRefreshTokenForLogout(tokenHash: string): Promise<{ id: string; userId: string; sessionId: string; } | null>;
  findRefreshTokenForRefresh(tokenHash: string): Promise<RefreshTokenRecord | null>;
  rotateRefreshToken(oldTokenId: string, newTokenHash: string, userId: string, sessionId: string, expiresAt: Date): Promise<{ id: string }>;
  revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void>;
  revokeRefreshTokensForSession(sessionId: string): Promise<void>;
  revokeSession(id: string): Promise<void>;
  /** Revokes a refresh token and its session in a single database transaction. */
  revokeTokenAndSession(tokenId: string, sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string, mustChangePassword?: boolean): Promise<void>;
  updateProfile(userId: string, input: ProfileUpdateDto): Promise<void>;
  setTwoFactorSecret(userId: string, secret: string): Promise<void>;
  enableTwoFactor(userId: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  addPasskey(input: PasskeyInput): Promise<void>;
  removePasskey(id: string): Promise<void>;
  findUserForSecurity(userId: string): Promise<AuthUserRecord | null>;
  /** Loads full passkey rows. Use only for WebAuthn paths (generate/verify auth, passkey reset). */
  findUserForPasskey(email: string): Promise<AuthUserRecord | null>;
  updateSecurityDisableRequested(userId: string, value: boolean): Promise<void>;
  writeAuditLog(input: AuditLogInput): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  public constructor(private readonly prisma: PrismaClient) { }

  public async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      // Fetch twoFactorSecret here so login() doesn't need a second query.
      // Use _count for passkeys to avoid fetching binary blobs on the hot login path.
      include: { role: true, memberProfile: { select: { id: true } }, _count: { select: { passkeys: true } } }
    });
    return user ? toAuthUserRecord(user) : null;
  }

  /**
   * Dedicated query for WebAuthn paths. Loads full passkey rows (credentialId, publicKey, counter)
   * which are required for verifyAuthenticationResponse. Not used on the password-login path.
   */
  public async findUserForPasskey(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        memberProfile: { select: { id: true } },
        passkeys: true
      }
    });
    return user ? toAuthUserRecord(user) : null;
  }

  public async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, memberProfile: { select: { id: true } }, _count: { select: { passkeys: true } } }
    });
    return user ? toAuthUserRecord(user) : null;
  }

  public async createUser(input: CreateUserInput): Promise<AuthUserRecord> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.mustChangePassword !== undefined ? { mustChangePassword: input.mustChangePassword } : {}),
        role: {
          connect: {
            name: input.roleName
          }
        }
      },
      include: { role: true, memberProfile: { select: { id: true } }, passkeys: true }
    });
    return toAuthUserRecord(user);
  }

  public async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const session = await this.prisma.session.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        userId: input.userId,
        expiresAt: input.expiresAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {})
      }
    });
    return session;
  }

  public async createRefreshToken(input: CreateRefreshTokenInput): Promise<{ id: string }> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: input,
      select: { id: true }
    });
    return refreshToken;
  }

  public async createSessionAndToken(input: CreateSessionAndTokenInput): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: input.sessionId,
        userId: input.userId,
        expiresAt: input.expiresAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        refreshTokens: {
          create: {
            tokenHash: input.tokenHash,
            userId: input.userId,
            expiresAt: input.expiresAt
          }
        }
      }
    });
  }

  public async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { role: true, memberProfile: { select: { id: true } }, passkeys: true } },
        session: true
      }
    });
    return refreshToken ? toRefreshTokenRecord(refreshToken) : null;
  }

  public async findRefreshTokenForLogout(tokenHash: string): Promise<{ id: string; userId: string; sessionId: string; } | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, sessionId: true }
    });
  }

  public async findRefreshTokenForRefresh(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true, userId: true, sessionId: true, expiresAt: true, revokedAt: true, rotatedAt: true, replacedByTokenId: true, tokenHash: true,
        session: { select: { id: true, userId: true, expiresAt: true, revokedAt: true } },
        user: {
          select: {
            id: true, email: true, firstName: true, lastName: true,
            isActive: true, mustChangePassword: true, twoFactorEnabled: true, securityDisableRequested: true,
            role: { select: { name: true } },
            memberProfile: { select: { id: true } },
            _count: { select: { passkeys: true } }
          }
        }
      }
    });

    if (!refreshToken) return null;

    const { user } = refreshToken;
    const refreshUser: RefreshAuthRecord = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name as RoleName,
      memberId: user.memberProfile?.id ?? null,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      hasPasskeys: user._count.passkeys > 0,
      securityDisableRequested: user.securityDisableRequested
    };

    return {
      id: refreshToken.id,
      tokenHash: refreshToken.tokenHash,
      userId: refreshToken.userId,
      sessionId: refreshToken.sessionId,
      expiresAt: refreshToken.expiresAt,
      revokedAt: refreshToken.revokedAt,
      rotatedAt: refreshToken.rotatedAt,
      replacedByTokenId: refreshToken.replacedByTokenId,
      user: refreshUser,
      session: refreshToken.session
    };
  }

  public async rotateRefreshToken(oldTokenId: string, newTokenHash: string, userId: string, sessionId: string, expiresAt: Date): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const oldTokens = await tx.$queryRaw<{ id: string; revokedAt: Date | null }[]>`SELECT "id", "revokedAt" FROM "RefreshToken" WHERE "id" = ${oldTokenId} FOR UPDATE`;
      
      if (oldTokens.length === 0) {
        throw new Error("TOKEN_NOT_FOUND");
      }
      const existingToken = oldTokens[0]!;
      if (existingToken.revokedAt) {
        throw new Error("TOKEN_ALREADY_REVOKED");
      }

      const newToken = await tx.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId,
          sessionId,
          expiresAt
        },
        select: { id: true }
      });

      await tx.refreshToken.update({
        where: { id: oldTokenId },
        data: {
          revokedAt: new Date(),
          rotatedAt: new Date(),
          replacedByTokenId: newToken.id
        }
      });

      return newToken;
    });
  }

  public async revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        rotatedAt: replacedByTokenId ? new Date() : null,
        ...(replacedByTokenId ? { replacedByTokenId } : {})
      }
    });
  }

  public async revokeRefreshTokensForSession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  public async revokeSession(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Revokes both the refresh token and its session in a single Prisma transaction,
   * halving the number of Postgres round-trips for logout.
   */
  public async revokeTokenAndSession(tokenId: string, sessionId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: now }
      }),
      this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: now }
      })
    ]);
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now }
      })
    ]);
  }

  public async updatePassword(userId: string, passwordHash: string, mustChangePassword?: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        ...(mustChangePassword !== undefined ? { mustChangePassword } : {})
      }
    });
  }

  public async updateProfile(userId: string, input: ProfileUpdateDto): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email
      }
    });
  }

  public async setTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });
  }

  public async enableTwoFactor(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });
  }

  public async disableTwoFactor(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
  }

  public async addPasskey(input: PasskeyInput): Promise<void> {
    await this.prisma.passkey.create({
      data: {
        userId: input.userId,
        credentialId: input.credentialId,
        publicKey: Buffer.from(input.publicKey),
        counter: input.counter,
        transports: input.transports ?? null
      }
    });
  }

  public async removePasskey(id: string): Promise<void> {
    await this.prisma.passkey.delete({
      where: { id }
    });
  }

  public async updateSecurityDisableRequested(userId: string, value: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { securityDisableRequested: value }
    });
  }

  /**
   * Fetches the full security record for a user, including twoFactorSecret and
   * full passkey rows. Used for 2FA management, passkey operations, etc.
   * NOT needed during ordinary password login — findUserByEmail already returns
   * the fields required for 2FA verification.
   */
  public async findUserForSecurity(userId: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, memberProfile: { select: { id: true } }, passkeys: true }
    });
    if (!user) return null;
    return toAuthUserRecord(user);
  }

  public async writeAuditLog(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
        ...(input.entity ? { entity: input.entity } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {})
      }
    });
  }
}

function toAuthUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  securityDisableRequested: boolean;
  memberProfile?: { id: string } | null;
  passkeys?: Passkey[] | { id: string }[];
  _count?: { passkeys: number };
  role: { name: string };
}): AuthUserRecord {
  const passkeys = (user.passkeys ?? []) as Passkey[];
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    role: user.role.name as RoleName,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorSecret: user.twoFactorSecret ?? null,
    hasPasskeys: user._count?.passkeys !== undefined ? user._count.passkeys > 0 : passkeys.length > 0,
    passkeyRows: passkeys,
    memberId: user.memberProfile?.id ?? null,
    securityDisableRequested: user.securityDisableRequested
  };
}

function toRefreshTokenRecord(refreshToken: {
  id: string;
  tokenHash: string;
  userId: string;
  sessionId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
  replacedByTokenId: string | null;
  user: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    mustChangePassword: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string | null;
    securityDisableRequested: boolean;
    memberProfile?: { id: string } | null;
    passkeys?: Passkey[];
    _count?: { passkeys: number };
    role: { name: string };
  };
  session: SessionRecord;
}): RefreshTokenRecord {
  return {
    id: refreshToken.id,
    tokenHash: refreshToken.tokenHash,
    userId: refreshToken.userId,
    sessionId: refreshToken.sessionId,
    expiresAt: refreshToken.expiresAt,
    revokedAt: refreshToken.revokedAt,
    rotatedAt: refreshToken.rotatedAt,
    replacedByTokenId: refreshToken.replacedByTokenId,
    user: toAuthUserRecord(refreshToken.user),
    session: refreshToken.session
  };
}
