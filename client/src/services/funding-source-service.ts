import api from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type {
  FundingSource,
  FundingSourceCreate,
  FundingSourceUpdate,
} from "@/types/funding-source";

export async function listFundingSources(): Promise<FundingSource[]> {
  const response = await api.get<ApiResponse<FundingSource[]>>(
    "/funding-sources",
  );
  return response.data.data;
}

export async function getFundingSource(id: string): Promise<FundingSource> {
  const response = await api.get<ApiResponse<FundingSource>>(
    `/funding-sources/${id}`,
  );
  return response.data.data;
}

export async function createFundingSource(
  data: FundingSourceCreate,
): Promise<FundingSource> {
  const response = await api.post<ApiResponse<FundingSource>>(
    "/funding-sources",
    data,
  );
  return response.data.data;
}

export async function updateFundingSource(
  id: string,
  data: FundingSourceUpdate,
): Promise<FundingSource> {
  const response = await api.put<ApiResponse<FundingSource>>(
    `/funding-sources/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteFundingSource(id: string): Promise<void> {
  await api.delete(`/funding-sources/${id}`);
}
