import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  AppState,
  HistoryEntry,
  Specimen,
} from "./types";
import {
  loadState,
  makeId,
  nowIso,
  resetState,
  saveState,
  suggestSlot,
} from "./store";
import EntryForm, { CommitResult, Draft } from "./components/EntryForm";
import QueueList from "./components/QueueList";
import CabinetBoard from "./components/CabinetBoard";
import LocalityCards from "./components/LocalityCards";
import SpecimenDetail, { MoveResult } from "./components/SpecimenDetail";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [openId, setOpenId] = useState<string | null>(null);
  const [hlSlot, setHlSlot] = useState<string | null>(null);

  // 所有数据持久化到 localStorage，下次打开仍在
  useEffect(() => {
    saveState(state);
  }, [state]);

  const openSpecimen = useMemo(
    () => state.specimens.find((s) => s.id === openId) ?? null,
    [state.specimens, openId]
  );

  const metrics = useMemo(() => {
    const total = state.specimens.length;
    const pending = state.specimens.filter((s) => s.status === "pending").length;
    const shelved = state.specimens.filter((s) => s.slotCode).length;
    const sites = new Set(state.specimens.map((s) => s.locality.trim())).size;
    return [
      { label: "入库队列", value: total },
      { label: "待鉴定", value: pending },
      { label: "已上柜", value: shelved },
      { label: "采集点", value: sites },
    ];
  }, [state.specimens]);

  /** 保存新标本：保存瞬间再次校验柜位占用，冲突时保住占用者原分配 */
  const commitSpecimen = (draft: Draft, targetCode: string | null): CommitResult => {
    let slot = targetCode;
    if (draft.status === "qualified" && slot) {
      const occupant = state.specimens.find((s) => s.slotCode === slot) ?? null;
      if (occupant) {
        // 不移动、不覆盖占用者，直接给出占用者与新推荐
        return {
          ok: false,
          occupant,
          suggestion: suggestSlot(draft, state.cabinets, state.specimens),
        };
      }
    }
    if (draft.status !== "qualified") slot = null;

    const history: HistoryEntry[] = [
      { at: nowIso(), kind: "note", text: "雨季批次录入。" },
    ];
    if (slot) {
      const sug = suggestSlot(draft, state.cabinets, state.specimens);
      history.push({
        at: nowIso(),
        kind: "auto",
        text:
          sug && sug.slotCode === slot
            ? `鉴定合格，系统分配至 ${slot}（${sug.reason}）。`
            : `鉴定合格，手动指定柜位 ${slot}。`,
      });
    }

    const specimen: Specimen = {
      id: makeId(),
      code: draft.code.trim(),
      species: draft.species.trim(),
      locality: draft.locality.trim(),
      altitude: draft.altitude.trim(),
      habitat: draft.habitat.trim(),
      collector: draft.collector.trim(),
      press: draft.press,
      status: draft.status,
      tier: draft.tier,
      slotCode: slot,
      createdAt: nowIso(),
      history,
    };
    setState((prev) => ({ ...prev, specimens: [...prev.specimens, specimen] }));
    return { ok: true };
  };

  /** 调整柜位：同样在写入瞬间校验占用 */
  const moveSpecimen = (id: string, targetCode: string): MoveResult => {
    const current = state.specimens.find((s) => s.id === id);
    if (!current) return { ok: false };
    const occupant = state.specimens.find(
      (s) => s.id !== id && s.slotCode === targetCode
    );
    if (occupant) {
      // 保留占用者原分配；在被移动标本上记录这次未遂调整
      setState((prev) => ({
        ...prev,
        specimens: prev.specimens.map((s) =>
          s.id === id
            ? {
                ...s,
                history: [
                  ...s.history,
                  {
                    at: nowIso(),
                    kind: "conflict" as const,
                    text: `尝试调整至 ${targetCode}，但该柜位已被 ${occupant.code} 占用，已保留对方分配，本次未移动。`,
                  },
                ],
              }
            : s
        ),
      }));
      return { ok: false, occupant };
    }
    const from = current.slotCode ?? "未上柜";
    setState((prev) => ({
      ...prev,
      specimens: prev.specimens.map((s) =>
        s.id === id
          ? {
              ...s,
              slotCode: targetCode,
              history: [
                ...s.history,
                {
                  at: nowIso(),
                  kind: "manual" as const,
                  text: `柜位调整：${from} → ${targetCode}。`,
                },
              ],
            }
          : s
      ),
    }));
    return { ok: true };
  };

  /** 并发演练：模拟另一终端在目标空柜抢先放入一份标本 */
  const simulateRace = (targetCode: string): Specimen => {
    const existing = state.specimens.find((s) => s.slotCode === targetCode);
    if (existing) return existing;

    const demo: Specimen = {
      id: makeId(),
      code: `HX-RACE-${Math.floor(Math.random() * 900 + 100)}`,
      species: "并发录入标本（演练数据）",
      locality: "外站采集点",
      altitude: "—",
      habitat: "另一终端保存瞬间抢先上柜",
      collector: "其他鉴定员",
      press: "pressed",
      status: "qualified",
      tier: 3,
      slotCode: targetCode,
      createdAt: nowIso(),
      demo: true,
      history: [
        {
          at: nowIso(),
          kind: "auto",
          text: `其他终端在保存前一刻占用 ${targetCode}，原分配保留。`,
        },
      ],
    };
    setState((prev) => {
      // 幂等：若目标已有标本则不覆盖
      if (prev.specimens.some((s) => s.slotCode === targetCode)) return prev;
      return { ...prev, specimens: [...prev.specimens, demo] };
    });
    return demo;
  };

  const removeDemo = (id: string) => {
    setState((prev) => ({
      ...prev,
      specimens: prev.specimens.filter((s) => s.id !== id),
    }));
    setOpenId(null);
  };

  return (
    <main className="app">
      <section className="hero">
        <p>植物标本馆 · 雨季采集批次 · 端口 62007</p>
        <h1>压制标本入库工作台</h1>
        <span>
          录入采集地点、尺寸档位与鉴定结果；合格标本优先与同地点、档位接近者归入同一柜，
          容量不足时推荐空柜；保存瞬间若柜位被占用，将提示占用标本并保留其原有分配。
          所有记录与调整经过保存在本机，下次打开仍然可见。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <EntryForm
        cabinets={state.cabinets}
        specimens={state.specimens}
        onCommit={commitSpecimen}
        onSimulateRace={simulateRace}
      />

      <div className="two-col">
        <QueueList
          specimens={state.specimens}
          cabinets={state.cabinets}
          onOpen={setOpenId}
        />
        <CabinetBoard
          cabinets={state.cabinets}
          specimens={state.specimens}
          selectedCode={hlSlot}
          onSelect={setHlSlot}
          onOpenSpecimen={setOpenId}
        />
      </div>

      <LocalityCards specimens={state.specimens} onOpen={setOpenId} />

      <footer className="app-foot">
        <button
          className="ghost"
          onClick={() => {
            if (window.confirm("恢复演示数据？当前录入将被清空。")) {
              setState(resetState());
              setOpenId(null);
            }
          }}
        >
          重置为演示数据
        </button>
        <span>数据保存在浏览器 localStorage（key: herbarium-intake-v1）</span>
      </footer>

      {openSpecimen && (
        <SpecimenDetail
          specimen={openSpecimen}
          cabinets={state.cabinets}
          specimens={state.specimens}
          onClose={() => setOpenId(null)}
          onMove={moveSpecimen}
          onSimulateRace={simulateRace}
          onRemoveDemo={removeDemo}
        />
      )}
    </main>
  );
}
