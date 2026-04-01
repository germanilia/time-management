import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { ProjectCreate, ProjectUpdate, ProjectWithPhases } from "@/types/project";

export async function listProjects(
  status?: string,
  fundingSourceId?: string,
): Promise<ProjectWithPhases[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (fundingSourceId) params.set("fundingSourceId", fundingSourceId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get<ApiResponse<ProjectWithPhases[]>>(
    `/projects${query}`,
  );
  return response.data.data;
}

export async function getProject(id: string): Promise<ProjectWithPhases> {
  const response = await api.get<ApiResponse<ProjectWithPhases>>(`/projects/${id}`);
  return response.data.data;
}

export async function createProject(data: ProjectCreate): Promise<ProjectWithPhases> {
  const response = await api.post<ApiResponse<ProjectWithPhases>>("/projects", data);
  return response.data.data;
}

export async function updateProject(id: string, data: ProjectUpdate): Promise<ProjectWithPhases> {
  const response = await api.put<ApiResponse<ProjectWithPhases>>(`/projects/${id}`, data);
  return response.data.data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}
