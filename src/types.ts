export type SizeTier = "S" | "M" | "L" | "XL";
export type PressingStatus = "待压制" | "压制中" | "已压制";
export type IdStatus = "待鉴定" | "已鉴定" | "需复核";

export interface Cabinet {
  id: string;
  room: string;
  capacity: number;
}

export type HistoryType = "录入" | "鉴定" | "分配柜位" | "调整柜位" | "移出柜位" | "冲突拦截";

export interface HistoryEvent {
  id: string;
  time: string;
  type: HistoryType;
  detail: string;
}

export interface Specimen {
  id: string;
  collectionNo: string;
  speciesName: string;
  location: string;
  altitude: string;
  habitat: string;
  collector: string;
  sizeTier: SizeTier;
  pressingStatus: PressingStatus;
  idStatus: IdStatus;
  idResult: string;
  cabinetId: string | null;
  slot: number | null;
  createdAt: string;
  history: HistoryEvent[];
}

/** 录入表单草稿（尚未分配 id 与柜位的标本数据） */
export interface IntakeDraft {
  collectionNo: string;
  speciesName: string;
  location: string;
  altitude: string;
  habitat: string;
  collector: string;
  sizeTier: SizeTier;
  pressingStatus: PressingStatus;
  idStatus: IdStatus;
  idResult: string;
}

export const SIZE_TIERS: { value: SizeTier; label: string; hint: string }[] = [
  { value: "S", label: "S · 小型", hint: "30cm 以下" },
  { value: "M", label: "M · 中型", hint: "30–60cm" },
  { value: "L", label: "L · 大型", hint: "60–100cm" },
  { value: "XL", label: "XL · 特大", hint: "100cm 以上" },
];

export const TIER_INDEX: Record<SizeTier, number> = { S: 0, M: 1, L: 2, XL: 3 };

export const ID_STATUSES: IdStatus[] = ["待鉴定", "已鉴定", "需复核"];
export const PRESSING_STATUSES: PressingStatus[] = ["待压制", "压制中", "已压制"];

export const CABINETS: Cabinet[] = [
  { id: "A-01", room: "一号库房", capacity: 8 },
  { id: "A-02", room: "一号库房", capacity: 8 },
  { id: "B-01", room: "一号库房", capacity: 6 },
  { id: "B-02", room: "二号库房", capacity: 6 },
  { id: "C-01", room: "二号库房", capacity: 4 },
  { id: "C-02", room: "二号库房", capacity: 4 },
];

export function cabinetById(id: string | null): Cabinet | null {
  if (!id) return null;
  return CABINETS.find((c) => c.id === id) ?? null;
}

/** 柜位编号，如 A-01-03 */
export function positionCode(cabinetId: string, slot: number): string {
  return `${cabinetId}-${String(slot).padStart(2, "0")}`;
}

export function positionOf(s: Specimen): string {
  return s.cabinetId && s.slot != null ? positionCode(s.cabinetId, s.slot) : "未分配";
}

export function sizeTierLabel(t: SizeTier): string {
  return SIZE_TIERS.find((x) => x.value === t)?.label ?? t;
}
