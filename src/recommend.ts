import type { Cabinet, SizeTier, Specimen } from "./types";
import { CABINETS, TIER_INDEX } from "./types";

export interface CabinetRank {
  cabinet: Cabinet;
  used: number;
  free: number;
  sameLocation: number;
  closeTier: number;
  score: number;
  isEmpty: boolean;
  isFull: boolean;
}

export interface RecommendTarget {
  location: string;
  sizeTier: SizeTier;
}

/**
 * 柜位打分：同地点每份 +10，同地点且档位接近（相邻档）每份再 +10。
 * 排序：分数高者优先；同分时空柜优先（对应"容量不够就推荐空柜"），再按余位排序。
 */
export function rankCabinets(
  target: RecommendTarget,
  specimens: Specimen[],
  excludeId?: string
): CabinetRank[] {
  const ranks = CABINETS.map((cabinet) => {
    const occupants = specimens.filter(
      (s) => s.cabinetId === cabinet.id && s.id !== excludeId
    );
    const sameLocation = occupants.filter((s) => s.location === target.location).length;
    const closeTier = occupants.filter(
      (s) =>
        s.location === target.location &&
        Math.abs(TIER_INDEX[s.sizeTier] - TIER_INDEX[target.sizeTier]) <= 1
    ).length;
    const used = occupants.length;
    const free = cabinet.capacity - used;
    return {
      cabinet,
      used,
      free,
      sameLocation,
      closeTier,
      score: sameLocation * 10 + closeTier * 10,
      isEmpty: used === 0,
      isFull: free <= 0,
    };
  });
  return ranks.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.isEmpty) - Number(a.isEmpty) ||
      b.free - a.free ||
      a.cabinet.id.localeCompare(b.cabinet.id)
  );
}

/** 推荐有剩余容量的前 N 个柜位 */
export function recommendCabinets(
  target: RecommendTarget,
  specimens: Specimen[],
  excludeId?: string,
  limit = 3
): CabinetRank[] {
  return rankCabinets(target, specimens, excludeId)
    .filter((r) => r.free > 0)
    .slice(0, limit);
}

export function rankReason(r: CabinetRank): string {
  const parts: string[] = [];
  if (r.sameLocation > 0) parts.push(`同地点 ${r.sameLocation} 份`);
  if (r.closeTier > 0) parts.push(`档位接近 ${r.closeTier} 份`);
  if (parts.length === 0) parts.push(r.isEmpty ? "空柜" : "无同地点标本");
  parts.push(`余 ${r.free} 位`);
  return parts.join(" · ");
}
