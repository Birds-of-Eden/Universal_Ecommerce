export type Warehouse = {
  id: number;
  name: string;
  code: string;
  address?: {
    location: string;
  } | null;
  isDefault: boolean;
};

export type WarehouseForm = {
  name: string;
  code: string;
  address: string;
  isDefault: boolean;
};
