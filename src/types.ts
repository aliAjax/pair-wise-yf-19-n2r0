export type IdentStatus = "pending" | "qualified" | "failed";
export type PressState = "pressed" | "drying" | "moldy";
/** 尺寸档位 1（最小）— 5（最大） */
export type Tier = 1 | 2 | 3 | 4 | 5;

export interface HistoryEntry {
  at: string;
  /** auto = 系统分配 / 推荐；manual = 工作人员手动调整 */
  kind: "auto" | "manual" | "note" | "conflict";
  text: string;
}

export interface Specimen {
  id: string;
  code: string; // 采集号
  species: string; // 鉴定结果（物种名称）
  locality: string; // 采集地点
  altitude: string;
  habitat: string; // 生境描述
  collector: string; // 采集人
  press: PressState;
  status: IdentStatus;
  tier: Tier;
  slotCode: string | null; // 柜位，如 A-03
  createdAt: string;
  history: HistoryEntry[];
  /** 并发演练模拟出的“他人录入”标本，可一键清除 */
  demo?: boolean;
}

export interface Cabinet {
  id: string; // A
  name: string;
  capacity: number; // 格位数
}

export interface AppState {
  specimens: Specimen[];
  cabinets: Cabinet[];
}

export interface SlotInfo {
  cabinet: Cabinet;
  index: number;
  slotCode: string;
  specimen: Specimen | null;
}

export interface SlotSuggestion {
  cabinet: Cabinet;
  slotCode: string;
  index: number;
  reason: string;
}

export const STATUS_LABEL: Record<IdentStatus, string> = {
  pending: "待鉴定",
  qualified: "合格",
  failed: "不合格",
};

export const PRESS_LABEL: Record<PressState, string> = {
  pressed: "已压制",
  drying: "阴干中",
  moldy: "霉损处理",
};

export const TIER_LABEL: Record<Tier, string> = {
  1: "1 档（小）",
  2: "2 档",
  3: "3 档",
  4: "4 档",
  5: "5 档（大）",
};

export const STATUS_KEYS: IdentStatus[] = ["pending", "qualified", "failed"];
export const PRESS_KEYS: PressState[] = ["pressed", "drying", "moldy"];
export const TIER_KEYS: Tier[] = [1, 2, 3, 4, 5];
