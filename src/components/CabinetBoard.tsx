import type { Specimen } from "../types";
import { CABINETS, positionCode, sizeTierLabel } from "../types";
import { cabinetOccupants } from "../store";

interface Props {
  specimens: Specimen[];
  onSelect: (id: string) => void;
}

export default function CabinetBoard({ specimens, onSelect }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>馆藏柜位记录</p>
          <h2>柜位看板</h2>
        </div>
      </div>
      <div className="cabinet-grid">
        {CABINETS.map((c) => {
          const occupants = cabinetOccupants(specimens, c.id);
          const used = occupants.length;
          const pct = Math.round((used / c.capacity) * 100);
          const state = used === 0 ? "空柜" : used >= c.capacity ? "已满" : `余 ${c.capacity - used} 位`;
          return (
            <article key={c.id} className="cabinet-card">
              <header>
                <div>
                  <b>{c.id}</b>
                  <small>
                    {c.room} · 容量 {c.capacity}
                  </small>
                </div>
                <i
                  className={
                    "badge " + (used === 0 ? "gray" : used >= c.capacity ? "red" : "teal")
                  }
                >
                  {state}
                </i>
              </header>
              <div className="occ-bar">
                <div
                  className="occ-fill"
                  style={{
                    width: `${pct}%`,
                    background:
                      used >= c.capacity
                        ? "var(--danger)"
                        : "linear-gradient(90deg, var(--primary), var(--secondary))",
                  }}
                />
              </div>
              <p className="occ-text">
                已放 {used}/{c.capacity} 份
              </p>
              {occupants.length > 0 && (
                <ul className="occ-list">
                  {occupants.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => onSelect(s.id)} title="查看标本详情">
                        <span className="mono">{positionCode(c.id, s.slot ?? 0)}</span>
                        <span className="strong">{s.collectionNo}</span>
                        <span className="muted">
                          {s.location} · {sizeTierLabel(s.sizeTier)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {occupants.length === 0 && <p className="muted">空柜，可整柜规划</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
