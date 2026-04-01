import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { LoginRequest, TokenResponse, User } from "@/types/auth";

export async function login(request: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<ApiResponse<TokenResponse>>("/auth/login", request);
  return response.data.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<ApiResponse<User>>("/auth/me");
  return response.data.data;
}
