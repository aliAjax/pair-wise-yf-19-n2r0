import type { CabinetRank } from "../recommend";
import { rankReason } from "../recommend";
import type { Cabinet, Specimen } from "../types";
import { positionCode, sizeTierLabel } from "../types";
import { formatTime } from "../store";

export interface ConflictInfo {
  positionCode: string;
  occupant: Specimen;
  alternatives: { cabinet: Cabinet; slot: number; rank: CabinetRank }[];
  retry: (cabinetId: string, slot: number) => void;
  onCancel: () => void;
}

/** 保存前发现柜位被占用：提示占用标本，保留其原有分配，并给出可改用的柜位 */
export default function ConflictModal({ info }: { info: ConflictInfo }) {
  const { occupant } = info;
  const assignEvent = [...occupant.history]
    .reverse()
    .find((h) => h.type === "分配柜位" || h.type === "调整柜位");

  return (
    <div className="overlay" onClick={info.onCancel}>
      <div className="dialog conflict-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <div>
            <p className="conflict-title">柜位冲突</p>
            <h2>柜位 {info.positionCode} 刚被占用</h2>
          </div>
          <button className="close" onClick={info.onCancel} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="occupant-card">
          <p>
            以下标本已占用该柜位，<b>其原有分配已保留</b>，本次保存未生效：
          </p>
          <div className="occupant-body">
            <div>
              <span>采集号</span>
              <b className="mono">{occupant.collectionNo}</b>
            </div>
            <div>
              <span>物种名称</span>
              <b>{occupant.speciesName}</b>
            </div>
            <div>
              <span>采集地点</span>
              <b>{occupant.location}</b>
            </div>
            <div>
              <span>尺寸档位</span>
              <b>{sizeTierLabel(occupant.sizeTier)}</b>
            </div>
            <div>
              <span>占用柜位</span>
              <b className="mono">{positionCode(occupant.cabinetId!, occupant.slot!)}</b>
            </div>
            <div>
              <span>放入时间</span>
              <b>{assignEvent ? formatTime(assignEvent.time) : formatTime(occupant.createdAt)}</b>
            </div>
          </div>
        </div>

        {info.alternatives.length > 0 ? (
          <div className="alt-box">
            <p>可改用以下柜位（点击直接保存）：</p>
            <div className="alt-list">
              {info.alternatives.map((a) => (
                <button
                  key={a.cabinet.id}
                  className="alt-item"
                  onClick={() => info.retry(a.cabinet.id, a.slot)}
                >
                  <b className="mono">{positionCode(a.cabinet.id, a.slot)}</b>
                  <small>{rankReason(a.rank)}</small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">暂无其他空闲柜位，请先整理柜位或新增柜。</p>
        )}

        <div className="form-actions">
          <button onClick={info.onCancel}>返回修改</button>
        </div>
      </div>
    </div>
  );
}
