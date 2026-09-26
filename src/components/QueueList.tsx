import { useMemo, useState } from "react";
import {
  Cabinet,
  IdentStatus,
  Specimen,
  STATUS_KEYS,
  STATUS_LABEL,
} from "../types";

interface Props {
  specimens: Specimen[];
  cabinets: Cabinet[];
  onOpen: (id: string) => void;
}

export default function QueueList({ specimens, cabinets, onOpen }: Props) {
  const [status, setStatus] = useState<IdentStatus | "all">("all");
  const [cabinet, setCabinet] = useState<string>("all");

  const filtered = useMemo(() => {
    return specimens
      .filter((s) => (status === "all" ? true : s.status === status))
      .filter((s) => {
        if (cabinet === "all") return true;
        if (cabinet === "none") return !s.slotCode;
        return s.slotCode?.startsWith(cabinet + "-") ?? false;
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [specimens, status, cabinet]);

  const count = (key: IdentStatus | "all") =>
    key === "all" ? specimens.length : specimens.filter((s) => s.status === key).length;

  return (
    <section className="panel queue-panel">
      <div className="heading">
        <div>
          <p>入库队列</p>
          <h2>待处理标本</h2>
        </div>
        <span className="hint">共 {filtered.length} 份</span>
      </div>

      <div className="filters">
        <div className="filter-group" role="tablist" aria-label="鉴定状态">
          <button
            className={status === "all" ? "active" : ""}
            onClick={() => setStatus("all")}
          >
            全部 ({count("all")})
          </button>
          {STATUS_KEYS.map((k) => (
            <button
              key={k}
              className={`status-${k} ${status === k ? "active" : ""}`}
              onClick={() => setStatus(k)}
            >
              {STATUS_LABEL[k]} ({count(k)})
            </button>
          ))}
        </div>
        <select
          aria-label="按柜位筛选"
          value={cabinet}
          onChange={(e) => setCabinet(e.target.value)}
        >
          <option value="all">全部柜位</option>
          {cabinets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">尚未分配柜位</option>
        </select>
      </div>

      <div className="queue">
        {filtered.length === 0 && (
          <p className="empty">当前筛选条件下没有标本。</p>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            className={`queue-card status-badge-${s.status}`}
            onClick={() => onOpen(s.id)}
          >
            <div className="queue-main">
              <h3>
                {s.code}
                {s.demo && <span className="demo-flag">他人录入</span>}
              </h3>
              <p className="queue-species">{s.species}</p>
              <p className="queue-meta">
                <span>📍 {s.locality}</span>
                <span>📏 {s.tier} 档</span>
                <span>🧑 {s.collector || "—"}</span>
              </p>
            </div>
            <div className="queue-side">
              <span className={`badge badge-${s.status}`}>
                {STATUS_LABEL[s.status]}
              </span>
              <span className={`slot ${s.slotCode ? "" : "slot-empty"}`}>
                {s.slotCode ?? "未上柜"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
