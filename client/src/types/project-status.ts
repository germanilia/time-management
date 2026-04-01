export interface ProjectStatusConfig {
  id: string;
  name: string;
  displayOrder: number;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatusConfigCreate {
  name: string;
  displayOrder?: number;
  color?: string;
  isDefault?: boolean;
}

export interface ProjectStatusConfigUpdate {
  name?: string;
  displayOrder?: number;
  color?: string;
  isDefault?: boolean;
}
