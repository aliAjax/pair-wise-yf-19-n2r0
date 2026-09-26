import {
  AppState,
  Cabinet,
  SlotInfo,
  SlotSuggestion,
  Specimen,
} from "./types";

const STORAGE_KEY = "herbarium-intake-v1";

export function slotCode(cabinet: Cabinet, index: number): string {
  return `${cabinet.id}-${String(index + 1).padStart(2, "0")}`;
}

const DEFAULT_CABINETS: Cabinet[] = [
  { id: "A", name: "A 柜 · 常绿阔叶林组", capacity: 6 },
  { id: "B", name: "B 柜 · 沟谷蕨类组", capacity: 6 },
  { id: "C", name: "C 柜 · 高海拔灌丛组", capacity: 5 },
  { id: "D", name: "D 柜 · 综合备用柜", capacity: 8 },
];

function isoDaysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

const seedSpecimens: Specimen[] = [
  {
    id: "s-seed-1",
    code: "HX-240615-01",
    species: "青榨槭 Acer davidii",
    locality: "阴坡·常绿阔叶林缘",
    altitude: "1420 m",
    habitat: "林缘沟旁，土壤湿润，伴生绣线菊",
    collector: "陆苓",
    press: "pressed",
    status: "qualified",
    tier: 3,
    slotCode: "A-01",
    createdAt: isoDaysAgo(3),
    history: [
      { at: isoDaysAgo(3), kind: "note", text: "雨季批次录入，压制完成。" },
      { at: isoDaysAgo(2), kind: "auto", text: "鉴定合格，系统分配至 A-01（同地点、同档位）。" },
    ],
  },
  {
    id: "s-seed-2",
    code: "HX-240615-08",
    species: "鳞毛蕨属 Dryopteris sp.",
    locality: "阴湿沟谷",
    altitude: "1180 m",
    habitat: "沟谷石缝，郁闭度 0.8",
    collector: "陆苓",
    press: "pressed",
    status: "qualified",
    tier: 2,
    slotCode: "B-01",
    createdAt: isoDaysAgo(3),
    history: [
      { at: isoDaysAgo(3), kind: "note", text: "雨季批次录入。" },
      { at: isoDaysAgo(1), kind: "auto", text: "鉴定合格，系统分配至 B-01（同地点、同档位）。" },
    ],
  },
  {
    id: "s-seed-3",
    code: "HX-240616-03",
    species: "三脉紫菀 Aster ageratoides",
    locality: "阴坡·常绿阔叶林缘",
    altitude: "1390 m",
    habitat: "路边草丛",
    collector: "沈砚",
    press: "drying",
    status: "pending",
    tier: 3,
    slotCode: null,
    createdAt: isoDaysAgo(2),
    history: [{ at: isoDaysAgo(2), kind: "note", text: "雨季批次录入，等待复检。" }],
  },
  {
    id: "s-seed-4",
    code: "HX-240616-11",
    species: "杜鹃属 Rhododendron sp.",
    locality: "高海拔灌丛",
    altitude: "2260 m",
    habitat: "山脊矮灌丛，风大",
    collector: "沈砚",
    press: "pressed",
    status: "qualified",
    tier: 4,
    slotCode: "C-01",
    createdAt: isoDaysAgo(1),
    history: [
      { at: isoDaysAgo(1), kind: "auto", text: "鉴定合格，系统分配至 C-01。" },
    ],
  },
  {
    id: "s-seed-5",
    code: "HX-240617-02",
    species: "待鉴定（禾本科疑似）",
    locality: "阴湿沟谷",
    altitude: "1210 m",
    habitat: "溪边湿地",
    collector: "陆苓",
    press: "drying",
    status: "pending",
    tier: 2,
    slotCode: null,
    createdAt: isoDaysAgo(0, 8),
    history: [{ at: isoDaysAgo(0, 8), kind: "note", text: "雨季批次录入，尚未鉴定。" }],
  },
];

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.specimens) && Array.isArray(parsed.cabinets)) {
        return parsed;
      }
    }
  } catch {
    // 损坏数据回退到种子
  }
  return { specimens: seedSpecimens, cabinets: DEFAULT_CABINETS };
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): AppState {
  const fresh = { specimens: seedSpecimens, cabinets: DEFAULT_CABINETS };
  saveState(fresh);
  return fresh;
}

/** 展开全部柜位（含占用标本） */
export function allSlots(
  cabinets: Cabinet[],
  specimens: Specimen[]
): SlotInfo[] {
  const byCode = new Map<string, Specimen>();
  specimens.forEach((s) => {
    if (s.slotCode) byCode.set(s.slotCode, s);
  });
  return cabinets.flatMap((cabinet) =>
    Array.from({ length: cabinet.capacity }, (_, index) => {
      const code = slotCode(cabinet, index);
      return { cabinet, index, slotCode: code, specimen: byCode.get(code) ?? null };
    })
  );
}

export function cabinetUsage(
  cabinets: Cabinet[],
  specimens: Specimen[]
): Map<string, { used: number; free: number }> {
  const used = new Map<string, number>();
  specimens.forEach((s) => {
    if (!s.slotCode) return;
    const cabId = s.slotCode.split("-")[0];
    used.set(cabId, (used.get(cabId) ?? 0) + 1);
  });
  const result = new Map<string, { used: number; free: number }>();
  cabinets.forEach((c) => {
    const u = used.get(c.id) ?? 0;
    result.set(c.id, { used: u, free: c.capacity - u });
  });
  return result;
}

export function localityOf(s: Specimen): string {
  return s.locality.trim();
}

/**
 * 推荐柜位：
 * 1. 同采集地点且档位接近（|Δtier| 最小）的标本所在柜优先；
 * 2. 该柜仍有空位；
 * 3. 否则推荐任一空柜；
 * 4. 全满返回 null。
 */
export function suggestSlot(
  specimen: Pick<Specimen, "locality" | "tier">,
  cabinets: Cabinet[],
  specimens: Specimen[],
  excludeId?: string
): SlotSuggestion | null {
  const placed = specimens.filter(
    (s) => s.id !== excludeId && s.slotCode && s.status === "qualified"
  );
  const sameLoc = placed.filter(
    (s) => localityOf(s) === specimen.locality.trim()
  );

  const scored = sameLoc
    .map((s) => ({
      cabinetId: s.slotCode!.split("-")[0],
      tierGap: Math.abs(s.tier - specimen.tier),
    }))
    .sort((a, b) => a.tierGap - b.tierGap);

  const usage = cabinetUsage(cabinets, specimens);
  const occupiedCodes = new Set(
    specimens
      .filter((s) => s.id !== excludeId && s.slotCode)
      .map((s) => s.slotCode!)
  );

  const firstFreeIn = (cabinet: Cabinet): number | null => {
    for (let i = 0; i < cabinet.capacity; i++) {
      const code = slotCode(cabinet, i);
      if (!occupiedCodes.has(code)) return i;
    }
    return null;
  };

  // 1) 同地点 + 档位最接近的柜
  for (const score of scored) {
    const cabinet = cabinets.find((c) => c.id === score.cabinetId);
    if (!cabinet) continue;
    const idx = firstFreeIn(cabinet);
    if (idx !== null) {
      return {
        cabinet,
        slotCode: slotCode(cabinet, idx),
        index: idx,
        reason:
          score.tierGap === 0
            ? `与「${cabinet.name}」内同地点、同档位标本归柜`
            : `与「${cabinet.name}」内同地点标本归柜（档位相差 ${score.tierGap} 档，最近）`,
      };
    }
  }

  // 2) 任意空柜（空位多的优先）
  const empties = cabinets
    .map((c) => ({ c, u: usage.get(c.id)! }))
    .filter((x) => x.u.free > 0)
    .sort((a, b) => b.u.free - a.u.free);
  if (empties.length > 0) {
    const cabinet = empties[0].c;
    const idx = firstFreeIn(cabinet)!;
    return {
      cabinet,
      slotCode: slotCode(cabinet, idx),
      index: idx,
      reason: `同组柜位已满，推荐空位最多的「${cabinet.name}」`,
    };
  }

  return null;
}

/** 保存时校验目标柜位是否被占用，返回占用者（不含自身） */
export function findOccupant(
  targetCode: string,
  specimens: Specimen[],
  selfId: string
): Specimen | null {
  return (
    specimens.find(
      (s) => s.id !== selfId && s.slotCode === targetCode
    ) ?? null
  );
}

export function makeId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
