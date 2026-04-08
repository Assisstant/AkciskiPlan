import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { CreateUserInput, UpdateUserInput } from "@/lib/schemas/action-plan";
import { SessionUser } from "@/lib/session";

export type UserListItem = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
  createdAt: string;
};

function toUserListItem(user: {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
  createdAt: Date;
}): UserListItem {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString()
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { displayName: "asc" }
    ]
  });

  return users.map((user) => toUserListItem(user));
}

export async function createUser(actor: SessionUser, input: CreateUserInput) {
  if (actor.role !== "admin") {
    throw new ApiError(403, "Само администратор може да креира корисници.");
  }

  const username = input.username.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: {
      username
    }
  });

  if (existing) {
    throw new ApiError(409, "Корисничкото име веќе постои.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      displayName: input.displayName.trim(),
      passwordHash,
      role: input.role
    }
  });

  return toUserListItem(user);
}

export async function updateUser(actor: SessionUser, userId: string, input: UpdateUserInput) {
  if (actor.role !== "admin") {
    throw new ApiError(403, "Само администратор може да уредува корисници.");
  }

  const existing = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!existing) {
    throw new ApiError(404, "Корисникот не е пронајден.");
  }

  const data: {
    displayName?: string;
    role?: "admin" | "editor" | "viewer";
    active?: boolean;
    passwordHash?: string;
  } = {};

  if (input.displayName !== undefined) {
    data.displayName = input.displayName.trim();
  }

  if (input.role !== undefined) {
    data.role = input.role;
  }

  if (input.active !== undefined) {
    data.active = input.active;
  }

  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const updated = await prisma.user.update({
    where: {
      id: userId
    },
    data
  });

  return toUserListItem(updated);
}
