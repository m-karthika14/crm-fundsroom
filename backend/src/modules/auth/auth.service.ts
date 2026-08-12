// auth.service.ts: the actual business logic for logging in and
// registering users. Kept separate from the controller so the "what
// happens" (this file) is not tangled up with the "how HTTP works"
// (auth.controller.ts).

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

// How many rounds bcrypt uses to hash passwords. 10 is a solid default:
// fast enough for a login request, slow enough to resist brute force.
const SALT_ROUNDS = 10;

// The plan asks for an "expiry ~8h" JWT.
const TOKEN_EXPIRY = "8h";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // We deliberately use the SAME error message whether the email
  // doesn't exist or the password is wrong. This stops an attacker
  // from using the login form to discover which emails are registered.
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  // The token only carries userId + role -- everything else (name,
  // email) can be looked up later, so we keep the token small.
  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function register(name: string, email: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  // Never send the password hash back to the client, even on create.
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
