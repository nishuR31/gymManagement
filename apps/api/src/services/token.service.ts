import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";
import type { AuthUserDto } from "@gym/shared";
import type { AccessTokenClaims } from "../types/auth.js";

type JwtExpiresIn = Exclude<SignOptions["expiresIn"], undefined>;

export interface PasswordResetClaims extends JwtPayload {
  sub: string;
  purpose: "password_reset";
  fingerprint: string;
}

export class TokenService {
  private readonly secret: Secret;
  private readonly expiresIn: JwtExpiresIn;

  public constructor(secret: string, expiresIn: string) {
    this.secret = secret;
    this.expiresIn = expiresIn as JwtExpiresIn;
  }

  public signAccessToken(user: AuthUserDto): string {
    const payload: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      role: user.role
    };
    const options: SignOptions = { expiresIn: this.expiresIn };
    return jwt.sign(payload, this.secret, options);
  }

  public verifyAccessToken(token: string): AccessTokenClaims {
    const payload = jwt.verify(token, this.secret);

    if (!isAccessTokenClaims(payload)) {
      throw new Error("Invalid access token payload");
    }

    return payload;
  }

  public signPasswordResetToken(userId: string, fingerprint: string, expiresIn: string): string {
    const payload: PasswordResetClaims = {
      sub: userId,
      purpose: "password_reset",
      fingerprint
    };
    const options: SignOptions = { expiresIn: expiresIn as JwtExpiresIn };
    return jwt.sign(payload, this.secret, options);
  }

  public verifyPasswordResetToken(token: string): PasswordResetClaims {
    const payload = jwt.verify(token, this.secret);

    if (!isPasswordResetClaims(payload)) {
      throw new Error("Invalid password reset token payload");
    }

    return payload;
  }
}

function isAccessTokenClaims(payload: string | JwtPayload): payload is AccessTokenClaims {
  return (
    typeof payload !== "string" &&
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    isRoleName(payload.role)
  );
}

function isRoleName(value: unknown): value is AccessTokenClaims["role"] {
  return (
    value === "SUPER_ADMIN" ||
    value === "GYM_OWNER" ||
    value === "ADMIN" ||
    value === "STAFF" ||
    value === "MEMBER"
  );
}

function isPasswordResetClaims(payload: string | JwtPayload): payload is PasswordResetClaims {
  return (
    typeof payload !== "string" &&
    typeof payload.sub === "string" &&
    payload.purpose === "password_reset" &&
    typeof payload.fingerprint === "string"
  );
}
