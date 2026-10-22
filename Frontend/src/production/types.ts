export type PicCard = {
  id: number;
  card_uid: string;
  employee_no: string;
  full_name: string;
  department: string;
  shift_id: number;
  shift: string;
  is_active: boolean;
  last_scanned_at?: string | null;
  created_at: string;
};

export type PicCardPayload = {
  card_uid: string;
  employee_no: string;
  full_name: string;
  department: string;
  shift_id: number;
  is_active: boolean;
};

export type ShiftMaster = {
  id: number;
  shift_code: string;
  shift_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};
