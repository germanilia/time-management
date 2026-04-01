import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { Role, RoleCreate } from "@/types/employee";

export async function listRoles(): Promise<Role[]> {
  const response = await api.get<ApiResponse<Role[]>>("/roles");
  return response.data.data;
}

export async function getRole(id: string): Promise<Role> {
  const response = await api.get<ApiResponse<Role>>(`/roles/${id}`);
  return response.data.data;
}

export async function createRole(data: RoleCreate): Promise<Role> {
  const response = await api.post<ApiResponse<Role>>("/roles", data);
  return response.data.data;
}

export async function updateRole(id: string, data: RoleCreate): Promise<Role> {
  const response = await api.put<ApiResponse<Role>>(`/roles/${id}`, data);
  return response.data.data;
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/roles/${id}`);
}
