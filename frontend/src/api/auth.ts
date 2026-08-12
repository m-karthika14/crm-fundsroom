import { apiClient } from "./client";
import type { User } from "../types";

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>("/auth/login", { email, password });
  return res.data;
}
