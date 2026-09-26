import { useMemo } from "react";
import type { SizeTier, Specimen } from "../types";
import { CABINETS, positionCode } from "../types";
import { occupantAt } from "../store";
import { rankReason, recommendCabinets } from "../recommend";

interface Props {
  location: string;
  sizeTier: SizeTier;
  specimens: Specimen[];
  excludeId?: string;
  cabinetId: string | null;
  slot: number | null;
  onChange: (cabinetId: string | null, slot: number | null) => void;
}

/** 柜位选择器：推荐柜位 + 柜位下拉 + 槽位网格（占用槽位禁用并提示占用标本） */
export default function AssignCabinet(props: Props) {
  const { location, sizeTier, specimens, excludeId, cabinetId, slot, onChange } = props;

  const recommendations = useMemo(() => {
    if (!location.trim()) return [];
    return recommendCabinets({ location: location.trim(), sizeTier }, specimens, excludeId, 3);
  }, [location, sizeTier, specimens, excludeId]);

  const cabinet = CABINETS.find((c) => c.id === cabinetId) ?? null;

  return (
    <div className="assign">
      <div className="assign-reco">
        <span className="assign-reco-label">推荐柜位</span>
        {location.trim() === "" ? (
          <span className="muted">先填写采集地点，系统按“同地点 + 档位接近”推荐</span>
        ) : recommendations.length === 0 ? (
          <span className="muted">所有柜位已满</span>
        ) : (
          <div className="reco-chips">
            {recommendations.map((r, i) => (
              <button
                type="button"
                key={r.cabinet.id}
                className={
                  "reco-chip" +
                  (cabinetId === r.cabinet.id ? " active" : "") +
                  (r.isEmpty ? " empty" : "")
                }
                title={rankReason(r)}
                onClick={() => {
                  const first = Array.from(
                    { length: r.cabinet.capacity },
                    (_, k) => k + 1
                  ).find((n) => !occupantAt(specimens, r.cabinet.id, n, excludeId));
                  onChange(r.cabinet.id, first ?? null);
                }}
              >
                <b>{r.cabinet.id}</b>
                <small>
                  {i === 0 && r.score > 0 ? "优先 · " : r.isEmpty ? "空柜 · " : ""}
                  {rankReason(r)}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="assign-row">
        <label>
          <span>柜位</span>
          <select
            value={cabinetId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              if (!id) {
                onChange(null, null);
                return;
              }
              const cab = CABINETS.find((c) => c.id === id)!;
              const first = Array.from({ length: cab.capacity }, (_, k) => k + 1).find(
                (n) => !occupantAt(specimens, id, n, excludeId)
              );
              onChange(id, first ?? null);
            }}
          >
            <option value="">选择柜位…</option>
            {CABINETS.map((c) => {
              const used = specimens.filter(
                (s) => s.cabinetId === c.id && s.id !== excludeId
              ).length;
              return (
                <option key={c.id} value={c.id} disabled={used >= c.capacity}>
                  {c.id}（{c.room}）余 {c.capacity - used}/{c.capacity}
                </option>
              );
            })}
          </select>
        </label>
        {cabinet && (
          <div className="slot-preview">
            当前位置：<b>{slot != null ? positionCode(cabinet.id, slot) : "未选槽位"}</b>
          </div>
        )}
      </div>

      {cabinet && (
        <div className="slot-grid" role="group" aria-label="槽位选择">
          {Array.from({ length: cabinet.capacity }, (_, k) => k + 1).map((n) => {
            const occ = occupantAt(specimens, cabinet.id, n, excludeId);
            const selected = slot === n;
            return (
              <button
                type="button"
                key={n}
                disabled={!!occ}
                className={
                  "slot" + (occ ? " occupied" : "") + (selected ? " selected" : "")
                }
                title={
                  occ
                    ? `已被 ${occ.collectionNo}（${occ.speciesName}）占用`
                    : `槽位 ${positionCode(cabinet.id, n)} 空闲`
                }
                onClick={() => onChange(cabinet.id, n)}
              >
                {String(n).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
