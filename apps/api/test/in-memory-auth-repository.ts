import type {
  AuditLogInput,
  AuthRepository,
  AuthUserRecord,
  CreateRefreshTokenInput,
  CreateSessionInput,
  CreateUserInput,
  RefreshTokenRecord,
  SessionRecord
} from "../src/repositories/auth.repository.js";

interface StoredRefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  sessionId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
  replacedByTokenId: string | null;
}

export class InMemoryAuthRepository implements AuthRepository {
  public readonly users = new Map<string, AuthUserRecord>();
  public readonly sessions = new Map<string, SessionRecord>();
  public readonly refreshTokens = new Map<string, StoredRefreshToken>();
  public readonly auditLogs: AuditLogInput[] = [];

  private sequence = 0;

  public async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  public async findUserById(id: string): Promise<AuthUserRecord | null> {
    return this.users.get(id) ?? null;
  }

  public async createUser(input: CreateUserInput): Promise<AuthUserRecord> {
    const user: AuthUserRecord = {
      id: this.nextId("user"),
      email: input.email,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.roleName,
      isActive: true,
      mustChangePassword: input.mustChangePassword ?? false,
      memberId: null
    };
    this.users.set(user.id, user);
    return user;
  }

  public async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const session: SessionRecord = {
      id: this.nextId("session"),
      userId: input.userId,
      expiresAt: input.expiresAt,
      revokedAt: null
    };
    this.sessions.set(session.id, session);
    return session;
  }

  public async createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const token: StoredRefreshToken = {
      id: this.nextId("refresh"),
      tokenHash: input.tokenHash,
      userId: input.userId,
      sessionId: input.sessionId,
      expiresAt: input.expiresAt,
      revokedAt: null,
      rotatedAt: null,
      replacedByTokenId: null
    };
    this.refreshTokens.set(token.id, token);
    return this.hydrateRefreshToken(token);
  }

  public async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = [...this.refreshTokens.values()].find((candidate) => candidate.tokenHash === tokenHash);
    return token ? this.hydrateRefreshToken(token) : null;
  }

  public async revokeRefreshToken(id: string, replacedByTokenId?: string): Promise<void> {
    const token = this.refreshTokens.get(id);
    if (!token) {
      return;
    }

    token.revokedAt = new Date();
    if (replacedByTokenId) {
      token.rotatedAt = new Date();
      token.replacedByTokenId = replacedByTokenId;
    }
  }

  public async revokeRefreshTokensForSession(sessionId: string): Promise<void> {
    for (const token of this.refreshTokens.values()) {
      if (token.sessionId === sessionId && !token.revokedAt) {
        token.revokedAt = new Date();
      }
    }
  }

  public async revokeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.revokedAt = new Date();
      }
    }

    for (const token of this.refreshTokens.values()) {
      if (token.userId === userId) {
        token.revokedAt = new Date();
      }
    }
  }

  public async updatePassword(userId: string, passwordHash: string, mustChangePassword?: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
      if (mustChangePassword !== undefined) {
        user.mustChangePassword = mustChangePassword;
      }
    }
  }

  public async writeAuditLog(input: AuditLogInput): Promise<void> {
    this.auditLogs.push(input);
  }

  private hydrateRefreshToken(token: StoredRefreshToken): RefreshTokenRecord {
    const user = this.users.get(token.userId);
    const session = this.sessions.get(token.sessionId);

    if (!user || !session) {
      throw new Error("Invalid in-memory repository state");
    }

    return {
      ...token,
      user,
      session
    };
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}
