import { useMemo } from "react";
import { Specimen, TIER_KEYS } from "../types";

interface Props {
  specimens: Specimen[];
  onOpen: (id: string) => void;
}

interface Group {
  locality: string;
  total: number;
  qualified: number;
  tiers: Set<number>;
  cabinets: Set<string>;
  latest: Specimen;
  samples: Specimen[];
}

export default function LocalityCards({ specimens, onOpen }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    specimens.forEach((s) => {
      const key = s.locality.trim() || "（未填地点）";
      let g = map.get(key);
      if (!g) {
        g = {
          locality: key,
          total: 0,
          qualified: 0,
          tiers: new Set(),
          cabinets: new Set(),
          latest: s,
          samples: [],
        };
        map.set(key, g);
      }
      g.total += 1;
      if (s.status === "qualified") g.qualified += 1;
      g.tiers.add(s.tier);
      if (s.slotCode) g.cabinets.add(s.slotCode.split("-")[0]);
      if (s.createdAt > g.latest.createdAt) g.latest = s;
      if (g.samples.length < 3) g.samples.push(s);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [specimens]);

  return (
    <section className="panel locality-panel">
      <div className="heading">
        <div>
          <p>采集地点信息卡</p>
          <h2>按地点归组</h2>
        </div>
      </div>
      <div className="locality-grid">
        {groups.map((g) => (
          <article key={g.locality} className="locality-card">
            <h3>📍 {g.locality}</h3>
            <p className="loc-stat">
              {g.total} 份 · 合格 {g.qualified} · 柜 {[...g.cabinets].join("、") || "—"}
            </p>
            <div className="tier-dots">
              {TIER_KEYS.map((t) => (
                <span
                  key={t}
                  className={`tier-dot ${g.tiers.has(t) ? "on" : ""}`}
                  title={`${t} 档`}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="loc-samples">
              {g.samples.map((s) => (
                <button key={s.id} onClick={() => onOpen(s.id)}>
                  {s.code}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
