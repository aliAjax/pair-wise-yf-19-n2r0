import { useEffect, useMemo, useRef, useState } from "react";
import type { IdStatus, IntakeDraft, Specimen } from "./types";
import { CABINETS, cabinetById, positionCode, positionOf } from "./types";
import {
  firstFreeSlot,
  loadSpecimens,
  makeEvent,
  nowIso,
  occupantAt,
  saveSpecimens,
  STORAGE_KEY,
  uid,
} from "./store";
import { recommendCabinets } from "./recommend";
import IntakeForm from "./components/IntakeForm";
import QueueTable from "./components/QueueTable";
import CabinetBoard from "./components/CabinetBoard";
import SpecimenDetail from "./components/SpecimenDetail";
import ConflictModal, { type ConflictInfo } from "./components/ConflictModal";
import "./styles.css";

interface AssignRequest {
  /** null 表示新建标本 */
  specimenId: string | null;
  draft?: IntakeDraft;
  cabinetId: string;
  slot: number;
  onSuccess?: () => void;
}

function App() {
  const [specimens, setSpecimens] = useState<Specimen[]>(loadSpecimens);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<"全部" | IdStatus>("全部");
  const [cabinetFilter, setCabinetFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // 持久化：任何变更都写入 localStorage，下次打开仍在
  useEffect(() => {
    saveSpecimens(specimens);
  }, [specimens]);

  // 多标签页同步：另一个页面占用了柜位，这里能立刻看到
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSpecimens(loadSpecimens());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  const buildSpecimen = (
    draft: IntakeDraft,
    cabinetId: string | null,
    slot: number | null
  ): Specimen => {
    const createdAt = nowIso();
    const history = [
      makeEvent(
        "录入",
        `雨季采集批次录入，进入入库队列（采集人：${draft.collector || "未填"}）`,
        createdAt
      ),
    ];
    if (cabinetId && slot != null) {
      const cap = cabinetById(cabinetId)?.capacity ?? 0;
      history.push(
        makeEvent(
          "分配柜位",
          `分配至柜位 ${positionCode(cabinetId, slot)}（${cabinetId} 柜，容量 ${cap}）`,
          createdAt
        )
      );
    }
    return {
      id: uid(),
      ...draft,
      cabinetId,
      slot: cabinetId ? slot : null,
      createdAt,
      history,
    };
  };

  /**
   * 分配柜位。保存前重新读取最新持久化数据做占用检查：
   * 若柜位刚被其他标本占用，弹出冲突提示并保住占用方的原有分配。
   */
  const attemptAssign = (req: AssignRequest): boolean => {
    const fresh = loadSpecimens();
    const occupant = occupantAt(fresh, req.cabinetId, req.slot, req.specimenId ?? undefined);

    if (occupant) {
      const target = req.specimenId
        ? fresh.find((s) => s.id === req.specimenId)
        : req.draft
          ? { location: req.draft.location, sizeTier: req.draft.sizeTier }
          : null;
      const alternatives = target
        ? recommendCabinets(target, fresh, req.specimenId ?? undefined, 3)
            .flatMap((rank) => {
              const slot = firstFreeSlot(rank.cabinet, fresh, req.specimenId ?? undefined);
              return slot == null ? [] : [{ rank, cabinet: rank.cabinet, slot }];
            })
        : [];

      // 已有标本的冲突尝试也记入其调整经过
      if (req.specimenId) {
        const next = fresh.map((s) =>
          s.id === req.specimenId
            ? {
                ...s,
                history: [
                  ...s.history,
                  makeEvent(
                    "冲突拦截",
                    `尝试分配 ${positionCode(req.cabinetId, req.slot)} 失败：已被 ${occupant.collectionNo}（${occupant.speciesName}）占用，对方原有分配保留`
                  ),
                ],
              }
            : s
        );
        setSpecimens(next);
      }

      setConflict({
        positionCode: positionCode(req.cabinetId, req.slot),
        occupant,
        alternatives,
        retry: (cabinetId, slot) => attemptAssign({ ...req, cabinetId, slot }),
        onCancel: () => setConflict(null),
      });
      return false;
    }

    if (req.specimenId) {
      const next = fresh.map((s) => {
        if (s.id !== req.specimenId) return s;
        const from = positionOf(s);
        const to = positionCode(req.cabinetId, req.slot);
        const event = s.cabinetId
          ? makeEvent("调整柜位", `柜位由 ${from} 调整为 ${to}`)
          : makeEvent(
              "分配柜位",
              `分配至柜位 ${to}（${req.cabinetId} 柜，容量 ${cabinetById(req.cabinetId)?.capacity ?? 0}）`
            );
        return { ...s, cabinetId: req.cabinetId, slot: req.slot, history: [...s.history, event] };
      });
      setSpecimens(next);
      showToast(`已保存柜位 ${positionCode(req.cabinetId, req.slot)}`);
    } else if (req.draft) {
      const sp = buildSpecimen(req.draft, req.cabinetId, req.slot);
      setSpecimens([sp, ...fresh]);
      showToast(`已录入 ${sp.collectionNo} 并分配至 ${positionCode(req.cabinetId, req.slot)}`);
    }
    setConflict(null);
    req.onSuccess?.();
    return true;
  };

  /** 录入提交：可带柜位，也可先入队列 */
  const handleIntake = (
    draft: IntakeDraft,
    cabinetId: string | null,
    slot: number | null
  ): boolean => {
    const fresh = loadSpecimens();
    if (fresh.some((s) => s.collectionNo === draft.collectionNo)) {
      showToast(`采集号 ${draft.collectionNo} 已存在，请更换`);
      return false;
    }
    if (cabinetId && slot != null) {
      return attemptAssign({ specimenId: null, draft, cabinetId, slot });
    }
    const sp = buildSpecimen(draft, null, null);
    setSpecimens([sp, ...fresh]);
    showToast(`已录入 ${sp.collectionNo}，进入入库队列`);
    return true;
  };

  const handleReassign = (id: string, cabinetId: string, slot: number): boolean =>
    attemptAssign({ specimenId: id, cabinetId, slot });

  const handleUnassign = (id: string) => {
    const fresh = loadSpecimens();
    const next = fresh.map((s) =>
      s.id === id
        ? {
            ...s,
            cabinetId: null,
            slot: null,
            history: [
              ...s.history,
              makeEvent("移出柜位", `由 ${positionOf(s)} 移出，退回入库队列`),
            ],
          }
        : s
    );
    setSpecimens(next);
    showToast("已移出柜位，退回入库队列");
  };

  const handleUpdateIdentification = (id: string, status: IdStatus, result: string) => {
    const fresh = loadSpecimens();
    const next = fresh.map((s) =>
      s.id === id
        ? {
            ...s,
            idStatus: status,
            idResult: result,
            history: [
              ...s.history,
              makeEvent(
                "鉴定",
                `鉴定状态更新为「${status}」${result ? `，鉴定结果：${result}` : ""}`
              ),
            ],
          }
        : s
    );
    setSpecimens(next);
    showToast("鉴定信息已保存");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specimens.filter((s) => {
      if (statusFilter !== "全部" && s.idStatus !== statusFilter) return false;
      if (cabinetFilter === "未分配" && s.cabinetId) return false;
      if (
        cabinetFilter !== "全部" &&
        cabinetFilter !== "未分配" &&
        s.cabinetId !== cabinetFilter
      )
        return false;
      if (
        q &&
        ![s.collectionNo, s.speciesName, s.location].some((t) =>
          t.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [specimens, statusFilter, cabinetFilter, query]);

  const metrics = useMemo(() => {
    const pending = specimens.filter((s) => !s.cabinetId).length;
    const unidentified = specimens.filter((s) => s.idStatus === "待鉴定").length;
    const shelved = specimens.filter((s) => s.cabinetId).length;
    const locations = new Set(specimens.map((s) => s.location)).size;
    const totalSlots = CABINETS.reduce((sum, c) => sum + c.capacity, 0);
    return { pending, unidentified, shelved, locations, totalSlots };
  }, [specimens]);

  const selected = specimens.find((s) => s.id === selectedId) ?? null;

  return (
    <main className="app">
      <section className="hero">
        <p>植物标本馆 · 雨季采集批次入库工作台</p>
        <h1>压制标本入库与柜位分配</h1>
        <span>
          录入采集地点、尺寸档位、鉴定结果与柜位；系统按“同地点、档位接近”优先同柜推荐，
          容量不足时推荐空柜。保存前若柜位刚被占用，会提示占用标本并保留其原有分配。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>入库队列（待上柜）</small>
          <strong>{metrics.pending}</strong>
        </article>
        <article>
          <small>待鉴定</small>
          <strong>{metrics.unidentified}</strong>
        </article>
        <article>
          <small>已上柜</small>
          <strong>{metrics.shelved}</strong>
        </article>
        <article>
          <small>柜位占用</small>
          <strong>
            {metrics.shelved}
            <em>/ {metrics.totalSlots}</em>
          </strong>
        </article>
      </section>

      <div className="layout">
        <div className="col-main">
          <QueueTable
            specimens={filtered}
            statusFilter={statusFilter}
            cabinetFilter={cabinetFilter}
            query={query}
            onStatusFilter={setStatusFilter}
            onCabinetFilter={setCabinetFilter}
            onQuery={setQuery}
            onSelect={setSelectedId}
          />
          <CabinetBoard specimens={specimens} onSelect={setSelectedId} />
        </div>
        <aside className="col-side">
          <IntakeForm specimens={specimens} onSubmit={handleIntake} />
        </aside>
      </div>

      {selected && (
        <SpecimenDetail
          specimen={selected}
          specimens={specimens}
          onClose={() => setSelectedId(null)}
          onReassign={handleReassign}
          onUnassign={handleUnassign}
          onUpdateIdentification={handleUpdateIdentification}
        />
      )}

      {conflict && <ConflictModal info={conflict} />}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
