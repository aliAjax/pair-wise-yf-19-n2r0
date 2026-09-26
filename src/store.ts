import type { Cabinet, HistoryEvent, HistoryType, Specimen } from "./types";
import { CABINETS } from "./types";

export const STORAGE_KEY = "hxyfront-62007:specimens:v1";

export function uid(): string {
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeEvent(type: HistoryType, detail: string, time?: string): HistoryEvent {
  return { id: uid(), time: time ?? nowIso(), type, detail };
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { hour12: false });
}

/** 雨季采集批次种子数据（首次打开时写入，之后以本地保存为准） */
function seedSpecimens(): Specimen[] {
  const seed = (
    id: string,
    collectionNo: string,
    speciesName: string,
    location: string,
    altitude: string,
    habitat: string,
    collector: string,
    sizeTier: Specimen["sizeTier"],
    pressingStatus: Specimen["pressingStatus"],
    idStatus: Specimen["idStatus"],
    idResult: string,
    cabinetId: string | null,
    slot: number | null,
    createdAt: string
  ): Specimen => {
    const history: HistoryEvent[] = [
      makeEvent("录入", `雨季采集批次录入，进入入库队列（采集人：${collector}）`, createdAt),
    ];
    if (cabinetId && slot != null) {
      const cap = CABINETS.find((c) => c.id === cabinetId)?.capacity ?? 0;
      history.push(
        makeEvent(
          "分配柜位",
          `分配至柜位 ${cabinetId}-${String(slot).padStart(2, "0")}（${cabinetId} 柜，容量 ${cap}）`,
          createdAt
        )
      );
    }
    return {
      id,
      collectionNo,
      speciesName,
      location,
      altitude,
      habitat,
      collector,
      sizeTier,
      pressingStatus,
      idStatus,
      idResult,
      cabinetId,
      slot,
      createdAt,
      history,
    };
  };

  return [
    seed("sp-seed-01", "HX-260910-01", "槭属 Acer sp.", "云南·高黎贡山", "2180m", "常绿阔叶林缘", "李岚", "M", "已压制", "已鉴定", "槭属 Acer sp.，待复核定种", "A-01", 1, "2026-09-10T09:20:00"),
    seed("sp-seed-02", "HX-260910-02", "凤尾蕨属 Pteris sp.", "云南·高黎贡山", "2050m", "溪谷阴湿处", "李岚", "S", "已压制", "已鉴定", "凤尾蕨属 Pteris sp.", "A-01", 2, "2026-09-10T09:26:00"),
    seed("sp-seed-03", "HX-260912-05", "悬钩子属 Rubus sp.", "云南·高黎贡山", "2300m", "竹林下", "王溯", "M", "压制中", "需复核", "悬钩子属，果实特征不足需复核", "A-01", 3, "2026-09-12T14:05:00"),
    seed("sp-seed-04", "HX-260911-03", "海芋 Alocasia macrorrhiza", "云南·西双版纳勐仑", "620m", "季雨林沟谷", "陈雨", "L", "已压制", "已鉴定", "海芋 Alocasia macrorrhiza", "A-02", 1, "2026-09-11T10:40:00"),
    seed("sp-seed-05", "HX-260911-07", "茜草科待定", "云南·西双版纳勐仑", "580m", "橡胶林缘", "陈雨", "M", "已压制", "待鉴定", "", "A-02", 2, "2026-09-11T10:52:00"),
    seed("sp-seed-06", "HX-260913-02", "报春花属 Primula sp.", "四川·峨眉山", "1450m", "冷杉林下", "周岭", "S", "已压制", "已鉴定", "报春花属 Primula sp.", "B-01", 1, "2026-09-13T08:35:00"),
    seed("sp-seed-07", "HX-260913-04", "苔草属 Carex sp.", "四川·峨眉山", "1520m", "苔藓石壁", "周岭", "S", "压制中", "待鉴定", "", "B-01", 2, "2026-09-13T08:47:00"),
    seed("sp-seed-08", "HX-260914-01", "杜鹃花属 Rhododendron sp.", "贵州·梵净山", "1900m", "山顶灌丛", "吴岚", "XL", "已压制", "需复核", "杜鹃花属，与馆藏标本有出入需复核", "B-02", 1, "2026-09-14T15:12:00"),
    seed("sp-seed-09", "HX-260915-01", "樟属 Cinnamomum sp.", "广西·大明山", "1100m", "常绿林下", "郑谷", "M", "已压制", "已鉴定", "樟属 Cinnamomum sp.", "C-01", 1, "2026-09-15T09:02:00"),
    seed("sp-seed-10", "HX-260915-02", "冬青属 Ilex sp.", "广西·大明山", "1080m", "山脊林缘", "郑谷", "M", "已压制", "已鉴定", "冬青属 Ilex sp.", "C-01", 2, "2026-09-15T09:10:00"),
    seed("sp-seed-11", "HX-260915-03", "薹草属 Carex sp.", "广西·大明山", "1120m", "溪边湿地", "郑谷", "S", "已压制", "待鉴定", "", "C-01", 3, "2026-09-15T09:18:00"),
    seed("sp-seed-12", "HX-260916-01", "猕猴桃属 Actinidia sp.", "广西·大明山", "1150m", "林缘藤本", "郑谷", "L", "压制中", "待鉴定", "", "C-01", 4, "2026-09-16T11:30:00"),
    seed("sp-seed-13", "HX-260918-01", "槭属待定", "云南·高黎贡山", "2400m", "林缘灌丛", "李岚", "M", "已压制", "待鉴定", "", null, null, "2026-09-18T16:20:00"),
    seed("sp-seed-14", "HX-260918-03", "棕榈科待定", "云南·西双版纳勐仑", "590m", "沟谷雨林", "陈雨", "L", "待压制", "待鉴定", "", null, null, "2026-09-18T16:35:00"),
    seed("sp-seed-15", "HX-260919-02", "锥属 Castanopsis sp.", "福建·武夷山", "980m", "针阔混交林", "林涧", "S", "已压制", "已鉴定", "锥属 Castanopsis sp.", null, null, "2026-09-19T10:05:00"),
    seed("sp-seed-16", "HX-260919-05", "蓼属 Persicaria sp.", "四川·峨眉山", "1600m", "溪边湿地", "周岭", "M", "压制中", "需复核", "蓼属待定，花被片特征需复核", null, null, "2026-09-19T10:22:00"),
  ];
}

export function loadSpecimens(): Specimen[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSpecimens();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedSpecimens();
    return parsed as Specimen[];
  } catch {
    return seedSpecimens();
  }
}

export function saveSpecimens(list: Specimen[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 存储不可用时静默失败，页面内状态仍可用
  }
}

/** 查找某柜位的占用者（排除指定标本自身） */
export function occupantAt(
  specimens: Specimen[],
  cabinetId: string,
  slot: number,
  excludeId?: string
): Specimen | null {
  return (
    specimens.find(
      (s) => s.cabinetId === cabinetId && s.slot === slot && s.id !== excludeId
    ) ?? null
  );
}

export function firstFreeSlot(
  cabinet: Cabinet,
  specimens: Specimen[],
  excludeId?: string
): number | null {
  for (let i = 1; i <= cabinet.capacity; i++) {
    if (!occupantAt(specimens, cabinet.id, i, excludeId)) return i;
  }
  return null;
}

export function cabinetOccupants(
  specimens: Specimen[],
  cabinetId: string
): Specimen[] {
  return specimens
    .filter((s) => s.cabinetId === cabinetId)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
}
