import type { PrismaClient, Passkey } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import type { AuthUserDto, RoleName, ProfileUpdateDto } from "@gym/shared";

export interface AuthUserRecord extends AuthUserDto {
  passwordHash: string;
  isActive: boolean;
  memberId: string | null;
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
  user: AuthUserRecord;
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
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
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
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void>;
  revokeRefreshTokensForSession(sessionId: string): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string, mustChangePassword?: boolean): Promise<void>;
  updateProfile(userId: string, input: ProfileUpdateDto): Promise<void>;
  setTwoFactorSecret(userId: string, secret: string): Promise<void>;
  enableTwoFactor(userId: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  addPasskey(input: PasskeyInput): Promise<void>;
  removePasskey(id: string): Promise<void>;
  findUserForSecurity(userId: string): Promise<(AuthUserRecord & { twoFactorSecret: string | null; passkeys: Passkey[] }) | null>;
  writeAuditLog(input: AuditLogInput): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  public constructor(private readonly prisma: PrismaClient) { }

  public async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, memberProfile: { select: { id: true } }, passkeys: { select: { id: true } } }
    });
    return user ? toAuthUserRecord(user) : null;
  }

  public async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, memberProfile: { select: { id: true } }, passkeys: { select: { id: true } } }
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
      include: { role: true, memberProfile: { select: { id: true } }, passkeys: { select: { id: true } } }
    });
    return toAuthUserRecord(user);
  }

  public async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const session = await this.prisma.session.create({
      data: {
        userId: input.userId,
        expiresAt: input.expiresAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {})
      }
    });
    return session;
  }

  public async createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: input,
      include: {
        user: { include: { role: true, memberProfile: { select: { id: true } }, passkeys: { select: { id: true } } } },
        session: true
      }
    });
    return toRefreshTokenRecord(refreshToken);
  }

  public async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { role: true, memberProfile: { select: { id: true } }, passkeys: { select: { id: true } } } },
        session: true
      }
    });
    return refreshToken ? toRefreshTokenRecord(refreshToken) : null;
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

  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
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

  public async findUserForSecurity(userId: string): Promise<(AuthUserRecord & { twoFactorSecret: string | null; passkeys: Passkey[] }) | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, memberProfile: { select: { id: true } }, passkeys: true }
    });
    if (!user) return null;
    return {
      ...toAuthUserRecord(user),
      twoFactorSecret: user.twoFactorSecret,
      passkeys: user.passkeys
    };
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
  memberProfile?: { id: string } | null;
  passkeys?: { id: string }[];
  role: { name: string };
}): AuthUserRecord {
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
    hasPasskeys: (user.passkeys?.length ?? 0) > 0,
    memberId: user.memberProfile?.id ?? null
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
    memberProfile?: { id: string } | null;
    passkeys?: { id: string }[];
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
