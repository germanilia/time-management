import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { Employee, EmployeeCreate, EmployeeUpdate } from "@/types/employee";

export async function listEmployees(
  status?: string,
  search?: string,
): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const query = params.toString();
  const url = query ? `/employees?${query}` : "/employees";
  const response = await api.get<ApiResponse<Employee[]>>(url);
  return response.data.data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const response = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
  return response.data.data;
}

export async function createEmployee(data: EmployeeCreate): Promise<Employee> {
  const response = await api.post<ApiResponse<Employee>>("/employees", data);
  return response.data.data;
}

export async function updateEmployee(
  id: string,
  data: EmployeeUpdate,
): Promise<Employee> {
  const response = await api.put<ApiResponse<Employee>>(`/employees/${id}`, data);
  return response.data.data;
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}
