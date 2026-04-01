export interface FundingSource {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FundingSourceCreate {
  name: string;
  description?: string;
}

export interface FundingSourceUpdate {
  name?: string;
  description?: string;
}
