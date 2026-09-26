import { useState } from "react";
import type { IntakeDraft, Specimen } from "../types";
import { ID_STATUSES, PRESSING_STATUSES, SIZE_TIERS } from "../types";
import AssignCabinet from "./AssignCabinet";

interface Props {
  specimens: Specimen[];
  onSubmit: (
    draft: IntakeDraft,
    cabinetId: string | null,
    slot: number | null
  ) => boolean;
}

function genCollectionNo(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  return `HX-${ymd}-${String(Math.floor(Math.random() * 90) + 10)}`;
}

function emptyDraft(): IntakeDraft {
  return {
    collectionNo: genCollectionNo(),
    speciesName: "",
    location: "",
    altitude: "",
    habitat: "",
    collector: "",
    sizeTier: "M",
    pressingStatus: "已压制",
    idStatus: "待鉴定",
    idResult: "",
  };
}

export default function IntakeForm({ specimens, onSubmit }: Props) {
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft);
  const [assignNow, setAssignNow] = useState(true);
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [error, setError] = useState("");

  const set = <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = () => {
    if (!draft.collectionNo.trim()) return setError("请填写采集号");
    if (!draft.speciesName.trim()) return setError("请填写物种名称");
    if (!draft.location.trim()) return setError("请填写采集地点");
    if (assignNow && (!cabinetId || slot == null))
      return setError("请选择柜位与槽位，或勾选“暂不分配柜位”");
    const ok = onSubmit(
      { ...draft, collectionNo: draft.collectionNo.trim() },
      assignNow ? cabinetId : null,
      assignNow ? slot : null
    );
    if (ok) {
      setDraft(emptyDraft());
      setCabinetId(null);
      setSlot(null);
      setError("");
    }
  };

  return (
    <section className="panel intake-panel">
      <div className="heading">
        <div>
          <p>雨季批次 · 合格标本入库</p>
          <h2>录入标本</h2>
        </div>
      </div>

      <div className="field-grid">
        <label>
          <span>采集号 *</span>
          <input
            value={draft.collectionNo}
            onChange={(e) => set("collectionNo", e.target.value)}
            placeholder="如 HX-260926-01"
          />
        </label>
        <label>
          <span>物种名称 *</span>
          <input
            value={draft.speciesName}
            onChange={(e) => set("speciesName", e.target.value)}
            placeholder="如 槭属 Acer sp."
          />
        </label>
        <label>
          <span>采集地点 *</span>
          <input
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="如 云南·高黎贡山"
          />
        </label>
        <label>
          <span>海拔</span>
          <input
            value={draft.altitude}
            onChange={(e) => set("altitude", e.target.value)}
            placeholder="如 2180m"
          />
        </label>
        <label>
          <span>采集人</span>
          <input
            value={draft.collector}
            onChange={(e) => set("collector", e.target.value)}
            placeholder="采集人姓名"
          />
        </label>
        <label>
          <span>尺寸档位</span>
          <select
            value={draft.sizeTier}
            onChange={(e) => set("sizeTier", e.target.value as IntakeDraft["sizeTier"])}
          >
            {SIZE_TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}（{t.hint}）
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>压制状态</span>
          <select
            value={draft.pressingStatus}
            onChange={(e) =>
              set("pressingStatus", e.target.value as IntakeDraft["pressingStatus"])
            }
          >
            {PRESSING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span>鉴定状态</span>
          <select
            value={draft.idStatus}
            onChange={(e) => set("idStatus", e.target.value as IntakeDraft["idStatus"])}
          >
            {ID_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>鉴定结果</span>
          <input
            value={draft.idResult}
            onChange={(e) => set("idResult", e.target.value)}
            placeholder="鉴定结论，可留空待鉴定"
          />
        </label>
        <label className="span-2">
          <span>生境描述</span>
          <input
            value={draft.habitat}
            onChange={(e) => set("habitat", e.target.value)}
            placeholder="如 常绿阔叶林缘、溪谷阴湿处"
          />
        </label>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={!assignNow}
          onChange={(e) => setAssignNow(!e.target.checked)}
        />
        <span>暂不分配柜位，先进入入库队列</span>
      </label>

      {assignNow && (
        <AssignCabinet
          location={draft.location}
          sizeTier={draft.sizeTier}
          specimens={specimens}
          cabinetId={cabinetId}
          slot={slot}
          onChange={(cid, sl) => {
            setCabinetId(cid);
            setSlot(sl);
          }}
        />
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button className="primary" onClick={handleSubmit}>
          保存并入柜
        </button>
        <button
          onClick={() => {
            setDraft(emptyDraft());
            setCabinetId(null);
            setSlot(null);
            setError("");
          }}
        >
          清空
        </button>
      </div>
    </section>
  );
}
