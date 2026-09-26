import { useEffect, useState } from "react";
import type { IdStatus, Specimen } from "../types";
import { cabinetById, ID_STATUSES, positionOf, sizeTierLabel } from "../types";
import { cabinetOccupants, formatTime } from "../store";
import AssignCabinet from "./AssignCabinet";
import { idStatusClass } from "./QueueTable";

interface Props {
  specimen: Specimen;
  specimens: Specimen[];
  onClose: () => void;
  onReassign: (id: string, cabinetId: string, slot: number) => boolean;
  onUnassign: (id: string) => void;
  onUpdateIdentification: (id: string, status: IdStatus, result: string) => void;
}

export default function SpecimenDetail(props: Props) {
  const { specimen, specimens, onClose, onReassign, onUnassign, onUpdateIdentification } =
    props;

  const [idStatus, setIdStatus] = useState<IdStatus>(specimen.idStatus);
  const [idResult, setIdResult] = useState(specimen.idResult);
  const [adjusting, setAdjusting] = useState(false);
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

  // 切换标本时同步鉴定编辑区
  useEffect(() => {
    setIdStatus(specimen.idStatus);
    setIdResult(specimen.idResult);
    setAdjusting(false);
    setCabinetId(null);
    setSlot(null);
  }, [specimen.id, specimen.idStatus, specimen.idResult]);

  const cabinet = cabinetById(specimen.cabinetId);
  const occupants = cabinet ? cabinetOccupants(specimens, cabinet.id) : [];
  const history = [...specimen.history].reverse();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <div>
            <p className="mono">{specimen.collectionNo}</p>
            <h2>{specimen.speciesName}</h2>
            <div className="badge-row">
              <i className={idStatusClass(specimen.idStatus)}>{specimen.idStatus}</i>
              <i className="badge gray">{specimen.pressingStatus}</i>
              <i className={specimen.cabinetId ? "badge teal" : "badge gray"}>
                {specimen.cabinetId ? `已上柜 ${positionOf(specimen)}` : "待入库"}
              </i>
            </div>
          </div>
          <button className="close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <section className="detail-section">
          <h3>采集记录</h3>
          <div className="detail-grid">
            <div>
              <span>采集地点</span>
              <b>{specimen.location}</b>
            </div>
            <div>
              <span>海拔</span>
              <b>{specimen.altitude || "—"}</b>
            </div>
            <div>
              <span>采集人</span>
              <b>{specimen.collector || "—"}</b>
            </div>
            <div>
              <span>尺寸档位</span>
              <b>{sizeTierLabel(specimen.sizeTier)}</b>
            </div>
            <div>
              <span>压制状态</span>
              <b>{specimen.pressingStatus}</b>
            </div>
            <div>
              <span>录入时间</span>
              <b>{formatTime(specimen.createdAt)}</b>
            </div>
            <div className="span-2">
              <span>生境描述</span>
              <b>{specimen.habitat || "—"}</b>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3>鉴定信息</h3>
          <div className="id-edit">
            <select
              value={idStatus}
              onChange={(e) => setIdStatus(e.target.value as IdStatus)}
            >
              {ID_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              value={idResult}
              onChange={(e) => setIdResult(e.target.value)}
              placeholder="鉴定结果"
            />
            <button
              className="primary"
              disabled={idStatus === specimen.idStatus && idResult === specimen.idResult}
              onClick={() => onUpdateIdentification(specimen.id, idStatus, idResult.trim())}
            >
              保存鉴定
            </button>
          </div>
        </section>

        <section className="detail-section">
          <h3>柜位</h3>
          {cabinet ? (
            <p className="cabinet-now">
              当前柜位 <b className="mono">{positionOf(specimen)}</b>（{cabinet.room}，容量{" "}
              {cabinet.capacity}，柜内已放 {occupants.length} 份）
            </p>
          ) : (
            <p className="cabinet-now">尚未分配柜位，在入库队列中等待上柜。</p>
          )}

          {!adjusting ? (
            <div className="form-actions">
              <button onClick={() => setAdjusting(true)}>
                {cabinet ? "调整柜位" : "分配柜位"}
              </button>
              {cabinet && (
                <button className="danger-link" onClick={() => onUnassign(specimen.id)}>
                  移出柜位，退回队列
                </button>
              )}
            </div>
          ) : (
            <div className="adjust-box">
              <AssignCabinet
                location={specimen.location}
                sizeTier={specimen.sizeTier}
                specimens={specimens}
                excludeId={specimen.id}
                cabinetId={cabinetId}
                slot={slot}
                onChange={(cid, sl) => {
                  setCabinetId(cid);
                  setSlot(sl);
                }}
              />
              <div className="form-actions">
                <button
                  className="primary"
                  disabled={!cabinetId || slot == null}
                  onClick={() => {
                    if (!cabinetId || slot == null) return;
                    if (onReassign(specimen.id, cabinetId, slot)) setAdjusting(false);
                  }}
                >
                  保存柜位调整
                </button>
                <button onClick={() => setAdjusting(false)}>取消</button>
              </div>
            </div>
          )}
        </section>

        <section className="detail-section">
          <h3>柜位调整经过</h3>
          <ul className="timeline">
            {history.map((h) => (
              <li key={h.id}>
                <i className={"dot dot-" + h.type} />
                <div>
                  <div className="timeline-head">
                    <b>{h.type}</b>
                    <time>{formatTime(h.time)}</time>
                  </div>
                  <p>{h.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
