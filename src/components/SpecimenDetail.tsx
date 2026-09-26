import { useMemo, useState } from "react";
import { Cabinet, SlotSuggestion, Specimen, STATUS_LABEL, PRESS_LABEL, TIER_LABEL } from "../types";
import {
  allSlots,
  formatTime,
  suggestSlot,
} from "../store";

export interface MoveResult {
  ok: boolean;
  occupant?: Specimen;
}

interface Props {
  specimen: Specimen;
  cabinets: Cabinet[];
  specimens: Specimen[];
  onClose: () => void;
  onMove: (id: string, targetCode: string) => MoveResult;
  onSimulateRace: (targetCode: string) => Specimen;
  onRemoveDemo?: (id: string) => void;
}

export default function SpecimenDetail({
  specimen,
  cabinets,
  specimens,
  onClose,
  onMove,
  onSimulateRace,
  onRemoveDemo,
}: Props) {
  const [target, setTarget] = useState("");
  const [conflict, setConflict] = useState<Specimen | null>(null);
  const [msg, setMsg] = useState("");

  const slots = useMemo(() => allSlots(cabinets, specimens), [cabinets, specimens]);
  const suggestion: SlotSuggestion | null = useMemo(
    () => suggestSlot(specimen, cabinets, specimens, specimen.id),
    [specimen, cabinets, specimens]
  );
  const effective = target || suggestion?.slotCode || "";

  const doMove = (code: string) => {
    if (!code) {
      setMsg("没有可移动的空柜位");
      return;
    }
    const res = onMove(specimen.id, code);
    if (!res.ok && res.occupant) {
      setConflict(res.occupant);
      setMsg("");
      return;
    }
    setConflict(null);
    setTarget("");
    setMsg(`已调整至 ${code}`);
    window.setTimeout(() => setMsg(""), 2600);
  };

  return (
    <div className="drawer-mask" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p>标本详情</p>
            <h2>
              {specimen.code}
              {specimen.demo && <span className="demo-flag">他人录入</span>}
            </h2>
          </div>
          <button className="ghost" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          <section>
            <h3>采集记录</h3>
            <dl className="record">
              <dt>鉴定结果</dt>
              <dd>{specimen.species}</dd>
              <dt>鉴定状态</dt>
              <dd>
                <span className={`badge badge-${specimen.status}`}>
                  {STATUS_LABEL[specimen.status]}
                </span>
              </dd>
              <dt>采集地点</dt>
              <dd>{specimen.locality}</dd>
              <dt>海拔</dt>
              <dd>{specimen.altitude || "—"}</dd>
              <dt>生境描述</dt>
              <dd>{specimen.habitat || "—"}</dd>
              <dt>采集人</dt>
              <dd>{specimen.collector || "—"}</dd>
              <dt>压制状态</dt>
              <dd>{PRESS_LABEL[specimen.press]}</dd>
              <dt>尺寸档位</dt>
              <dd>{TIER_LABEL[specimen.tier]}</dd>
              <dt>录入时间</dt>
              <dd>{formatTime(specimen.createdAt)}</dd>
            </dl>
          </section>

          <section>
            <h3>柜位调整</h3>
            <p className="current-slot">
              当前柜位：
              <b>{specimen.slotCode ?? "尚未上柜"}</b>
            </p>
            {suggestion ? (
              <p className="suggest-line">
                <span className="tag tag-auto">推荐</span>
                <b>{suggestion.slotCode}</b> — {suggestion.reason}
              </p>
            ) : (
              <p className="suggest-line">
                <span className="tag tag-full">已无空柜</span>
              </p>
            )}
            <div className="move-row">
              <select value={target} onChange={(e) => { setTarget(e.target.value); setConflict(null); }}>
                <option value="">跟随推荐{suggestion ? `：${suggestion.slotCode}` : ""}</option>
                {slots.map((sl) => (
                  <option key={sl.slotCode} value={sl.slotCode}>
                    {sl.slotCode}
                    {sl.specimen
                      ? sl.specimen.id === specimen.id
                        ? "（当前位置）"
                        : `（被 ${sl.specimen.code} 占用）`
                      : "（空）"}
                  </option>
                ))}
              </select>
              <button className="primary" onClick={() => doMove(effective)}>
                调整柜位
              </button>
              <button
                className="ghost"
                title="并发演练：让另一终端抢先占用目标柜位"
                onClick={() => {
                  if (!effective) return;
                  setConflict(onSimulateRace(effective));
                }}
              >
                模拟刚被占用
              </button>
            </div>

            {conflict && (
              <div className="conflict" role="alert">
                <div className="conflict-title">⚠ 柜位已被占用，原分配已保留</div>
                <p>
                  柜位 <b>{conflict.slotCode}</b> 现由标本 <b>{conflict.code}</b>
                  （{conflict.species}）占用，未受本次操作影响。
                </p>
                <div className="conflict-actions">
                  {suggestion && suggestion.slotCode !== conflict.slotCode && (
                    <button
                      className="primary"
                      onClick={() => doMove(suggestion.slotCode)}
                    >
                      改用 {suggestion.slotCode}
                    </button>
                  )}
                  <button onClick={() => setConflict(null)}>知道了</button>
                </div>
              </div>
            )}
            {msg && <p className="form-ok">{msg}</p>}
          </section>

          <section>
            <h3>柜位调整经过</h3>
            <ol className="timeline">
              {specimen.history.map((h, i) => (
                <li key={i} className={`tl tl-${h.kind}`}>
                  <span className="tl-time">{formatTime(h.at)}</span>
                  <span className={`tl-tag tag-${h.kind}`}>
                    {h.kind === "auto"
                      ? "系统分配"
                      : h.kind === "manual"
                        ? "手动调整"
                        : h.kind === "conflict"
                          ? "占用冲突"
                          : "记录"}
                  </span>
                  <span className="tl-text">{h.text}</span>
                </li>
              ))}
            </ol>
          </section>

          {specimen.demo && onRemoveDemo && (
            <button className="ghost danger" onClick={() => onRemoveDemo(specimen.id)}>
              清除并发演练产生的占位标本
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
