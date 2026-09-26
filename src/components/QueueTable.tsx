import type { IdStatus, Specimen } from "../types";
import { CABINETS, positionOf, sizeTierLabel } from "../types";

interface Props {
  specimens: Specimen[];
  statusFilter: "全部" | IdStatus;
  cabinetFilter: string;
  query: string;
  onStatusFilter: (v: "全部" | IdStatus) => void;
  onCabinetFilter: (v: string) => void;
  onQuery: (v: string) => void;
  onSelect: (id: string) => void;
}

const STATUS_CHIPS: ("全部" | IdStatus)[] = ["全部", "待鉴定", "已鉴定", "需复核"];

export function idStatusClass(s: IdStatus): string {
  if (s === "已鉴定") return "badge green";
  if (s === "需复核") return "badge red";
  return "badge amber";
}

export default function QueueTable(props: Props) {
  const {
    specimens,
    statusFilter,
    cabinetFilter,
    query,
    onStatusFilter,
    onCabinetFilter,
    onQuery,
    onSelect,
  } = props;

  return (
    <section className="panel queue-panel">
      <div className="heading">
        <div>
          <p>按鉴定状态与柜位查看</p>
          <h2>入库队列（{specimens.length}）</h2>
        </div>
        <input
          className="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="搜索采集号 / 物种 / 地点"
        />
      </div>

      <div className="filter-row">
        <div className="chips">
          {STATUS_CHIPS.map((s) => (
            <button
              key={s}
              className={statusFilter === s ? "chip active" : "chip"}
              onClick={() => onStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <select value={cabinetFilter} onChange={(e) => onCabinetFilter(e.target.value)}>
          <option value="全部">全部柜位</option>
          <option value="未分配">未分配</option>
          {CABINETS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}（{c.room}）
            </option>
          ))}
        </select>
      </div>

      {specimens.length === 0 ? (
        <p className="empty">没有符合筛选条件的标本</p>
      ) : (
        <div className="queue-table">
          <div className="queue-head">
            <span>采集号</span>
            <span>物种名称</span>
            <span>采集地点</span>
            <span>档位</span>
            <span>鉴定状态</span>
            <span>柜位</span>
            <span>状态</span>
          </div>
          {specimens.map((s) => (
            <button key={s.id} className="queue-row" onClick={() => onSelect(s.id)}>
              <span className="mono">{s.collectionNo}</span>
              <span className="strong">{s.speciesName}</span>
              <span>{s.location}</span>
              <span>{sizeTierLabel(s.sizeTier)}</span>
              <span>
                <i className={idStatusClass(s.idStatus)}>{s.idStatus}</i>
              </span>
              <span className="mono">{positionOf(s)}</span>
              <span>
                <i className={s.cabinetId ? "badge teal" : "badge gray"}>
                  {s.cabinetId ? "已上柜" : "待入库"}
                </i>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
