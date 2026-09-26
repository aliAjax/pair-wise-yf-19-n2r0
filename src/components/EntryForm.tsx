import { useMemo, useState } from "react";
import {
  Cabinet,
  IdentStatus,
  PRESS_KEYS,
  PRESS_LABEL,
  PressState,
  SlotSuggestion,
  Specimen,
  STATUS_KEYS,
  STATUS_LABEL,
  TIER_KEYS,
  TIER_LABEL,
  Tier,
} from "../types";
import { allSlots, suggestSlot } from "../store";

export interface Draft {
  code: string;
  species: string;
  locality: string;
  altitude: string;
  habitat: string;
  collector: string;
  press: PressState;
  status: IdentStatus;
  tier: Tier;
}

export interface CommitResult {
  ok: boolean;
  occupant?: Specimen;
  suggestion?: SlotSuggestion | null;
}

const EMPTY: Draft = {
  code: "",
  species: "",
  locality: "",
  altitude: "",
  habitat: "",
  collector: "",
  press: "pressed",
  status: "pending",
  tier: 3,
};

interface Props {
  cabinets: Cabinet[];
  specimens: Specimen[];
  onCommit: (draft: Draft, targetCode: string | null) => CommitResult;
  onSimulateRace: (targetCode: string) => Specimen;
}

interface ConflictState {
  occupant: Specimen;
  suggestion: SlotSuggestion | null;
}

export default function EntryForm({
  cabinets,
  specimens,
  onCommit,
  onSimulateRace,
}: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [target, setTarget] = useState<string>(""); // "" = 跟随推荐
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [error, setError] = useState<string>("");
  const [justSaved, setJustSaved] = useState<string>("");

  const suggestion = useMemo(() => {
    if (draft.status !== "qualified" || !draft.locality.trim()) return null;
    return suggestSlot(draft, cabinets, specimens);
  }, [draft, cabinets, specimens]);

  const slots = useMemo(() => allSlots(cabinets, specimens), [cabinets, specimens]);
  const effectiveTarget =
    draft.status === "qualified"
      ? target || suggestion?.slotCode || ""
      : "";

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setConflict(null);
    setError("");
  };

  const validate = (): string => {
    if (!draft.code.trim()) return "请填写采集号";
    if (!draft.species.trim()) return "请填写鉴定结果（物种名称）";
    if (!draft.locality.trim()) return "请填写采集地点";
    if (specimens.some((s) => s.code === draft.code.trim()))
      return `采集号 ${draft.code} 已存在`;
    if (draft.status === "qualified" && !effectiveTarget)
      return "鉴定合格但所有柜位已满，请先扩容或调整柜位";
    return "";
  };

  const doCommit = (code: string | null) => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    const result = onCommit(draft, code);
    if (!result.ok && result.occupant) {
      setConflict({
        occupant: result.occupant,
        suggestion: result.suggestion ?? null,
      });
      return;
    }
    setJustSaved(draft.code);
    setDraft(EMPTY);
    setTarget("");
    setConflict(null);
    setError("");
    window.setTimeout(() => setJustSaved(""), 2600);
  };

  const simulateRace = () => {
    if (!effectiveTarget) {
      setError("当前没有可被占用的柜位");
      return;
    }
    const occupant = onSimulateRace(effectiveTarget);
    setConflict({
      occupant,
      suggestion: suggestSlot(draft, cabinets, specimens),
    });
  };

  return (
    <section className="panel entry-panel">
      <div className="heading">
        <div>
          <p>雨季采集批次</p>
          <h2>标本录入与上柜</h2>
        </div>
        <span className="hint">合格标本按「同地点、档位接近」归柜</span>
      </div>

      <div className="field-grid">
        <label>
          <span>采集号 *</span>
          <input
            value={draft.code}
            placeholder="如 HX-240618-05"
            onChange={(e) => set("code", e.target.value)}
          />
        </label>
        <label>
          <span>鉴定结果（物种名称）*</span>
          <input
            value={draft.species}
            placeholder="如 青榨槭 Acer davidii"
            onChange={(e) => set("species", e.target.value)}
          />
        </label>
        <label>
          <span>采集地点 *</span>
          <input
            value={draft.locality}
            placeholder="如 阴坡·常绿阔叶林缘"
            onChange={(e) => set("locality", e.target.value)}
          />
        </label>
        <label>
          <span>尺寸档位</span>
          <select
            value={draft.tier}
            onChange={(e) => set("tier", Number(e.target.value) as Tier)}
          >
            {TIER_KEYS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>海拔</span>
          <input
            value={draft.altitude}
            placeholder="如 1420 m"
            onChange={(e) => set("altitude", e.target.value)}
          />
        </label>
        <label>
          <span>采集人</span>
          <input
            value={draft.collector}
            placeholder="采集人姓名"
            onChange={(e) => set("collector", e.target.value)}
          />
        </label>
        <label className="wide">
          <span>生境描述</span>
          <input
            value={draft.habitat}
            placeholder="坡向、郁闭度、伴生种等"
            onChange={(e) => set("habitat", e.target.value)}
          />
        </label>
        <label>
          <span>压制状态</span>
          <select
            value={draft.press}
            onChange={(e) => set("press", e.target.value as PressState)}
          >
            {PRESS_KEYS.map((p) => (
              <option key={p} value={p}>
                {PRESS_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>鉴定状态</span>
          <select
            value={draft.status}
            onChange={(e) => set("status", e.target.value as IdentStatus)}
          >
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {draft.status === "qualified" && (
        <div className="slot-picker">
          <div className="suggestion">
            {suggestion ? (
              <>
                <span className="tag tag-auto">智能推荐</span>
                <strong>{suggestion.slotCode}</strong>
                <em>{suggestion.reason}</em>
              </>
            ) : (
              <span className="tag tag-full">馆藏柜已全部占满</span>
            )}
          </div>
          <label className="manual-slot">
            <span>手动指定柜位（可选）</span>
            <select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setConflict(null);
              }}
            >
              <option value="">跟随推荐{suggestion ? `：${suggestion.slotCode}` : ""}</option>
              {slots.map((sl) => (
                <option key={sl.slotCode} value={sl.slotCode}>
                  {sl.slotCode}
                  {sl.specimen ? `（被 ${sl.specimen.code} 占用）` : "（空）"}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {conflict && (
        <div className="conflict" role="alert">
          <div className="conflict-title">⚠ 保存失败：柜位刚被占用</div>
          <p>
            柜位 <b>{conflict.occupant.slotCode}</b> 在保存前已被标本{" "}
            <b>{conflict.occupant.code}</b>
            （{conflict.occupant.species}）占用。
            <br />
            已保留该标本的原有分配，不会将其挤出。
          </p>
          <div className="conflict-actions">
            {conflict.suggestion ? (
              <button
                className="primary"
                onClick={() => doCommit(conflict.suggestion!.slotCode)}
              >
                改用推荐空柜 {conflict.suggestion.slotCode}
              </button>
            ) : (
              <span className="tag tag-full">已无其他空柜</span>
            )}
            <button onClick={() => setConflict(null)}>返回重新选择</button>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {justSaved && <p className="form-ok">✓ 标本 {justSaved} 已入库</p>}

      <div className="form-actions">
        <button className="primary" onClick={() => doCommit(effectiveTarget || null)}>
          保存并入库
        </button>
        <button onClick={simulateRace} title="模拟另一终端在保存瞬间抢先占用目标柜位">
          并发演练：模拟该柜位刚被占用
        </button>
      </div>
    </section>
  );
}
