import { useMemo } from "react";
import { Cabinet, Specimen } from "../types";
import { allSlots, cabinetUsage, slotCode } from "../store";

interface Props {
  cabinets: Cabinet[];
  specimens: Specimen[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  onOpenSpecimen: (id: string) => void;
}

export default function CabinetBoard({
  cabinets,
  specimens,
  selectedCode,
  onSelect,
  onOpenSpecimen,
}: Props) {
  const slots = useMemo(() => allSlots(cabinets, specimens), [cabinets, specimens]);
  const usage = useMemo(() => cabinetUsage(cabinets, specimens), [cabinets, specimens]);

  return (
    <section className="panel cabinet-panel">
      <div className="heading">
        <div>
          <p>馆藏柜位记录</p>
          <h2>柜位占用图</h2>
        </div>
        <button className="ghost" onClick={() => onSelect(null)}>
          清除高亮
        </button>
      </div>

      <div className="cabinets">
        {cabinets.map((cab) => {
          const u = usage.get(cab.id)!;
          const cabSlots = slots.filter((sl) => sl.cabinet.id === cab.id);
          return (
            <article
              key={cab.id}
              className={`cabinet ${selectedCode?.startsWith(cab.id + "-") ? "cabinet-hl" : ""}`}
            >
              <header>
                <div>
                  <h3>{cab.name}</h3>
                  <small>
                    容量 {cab.capacity} · 已用 {u.used} · 空 {u.free}
                  </small>
                </div>
                <div className="cap-bar">
                  <span style={{ width: `${(u.used / cab.capacity) * 100}%` }} />
                </div>
              </header>
              <div className="slot-grid">
                {cabSlots.map((sl) => {
                  const isSel = sl.slotCode === selectedCode;
                  return (
                    <button
                      key={sl.slotCode}
                      className={`slot-cell ${sl.specimen ? "occupied" : "free"} ${
                        isSel ? "selected" : ""
                      }`}
                      title={
                        sl.specimen
                          ? `${sl.slotCode}：${sl.specimen.code} ${sl.specimen.species}`
                          : `${sl.slotCode}：空柜`
                      }
                      onClick={() => {
                        if (sl.specimen) {
                          onOpenSpecimen(sl.specimen.id);
                        } else {
                          onSelect(isSel ? null : sl.slotCode);
                        }
                      }}
                    >
                      <span className="slot-no">{slotCode(cab, sl.index)}</span>
                      {sl.specimen ? (
                        <span className="slot-owner">{sl.specimen.code}</span>
                      ) : (
                        <span className="slot-free-label">空</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
