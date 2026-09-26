import { Cabinet, Specimen, Tier } from "../src/types";
import { findOccupant, slotCode, suggestSlot } from "../src/store";

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, extra = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${extra}`);
  }
}

const cabinets: Cabinet[] = [
  { id: "A", name: "A 柜", capacity: 2 },
  { id: "B", name: "B 柜", capacity: 2 },
  { id: "C", name: "C 柜", capacity: 2 },
];

function mk(
  id: string,
  locality: string,
  tier: Tier,
  slot: string | null
): Specimen {
  return {
    id,
    code: id,
    species: "sp",
    locality,
    altitude: "",
    habitat: "",
    collector: "",
    press: "pressed",
    status: "qualified",
    tier,
    slotCode: slot,
    createdAt: new Date().toISOString(),
    history: [],
  };
}

console.log("1) 同地点同档位 → 进入同柜的下一格");
{
  const specimens = [mk("a", "沟谷", 2, "A-01")];
  const sug = suggestSlot({ locality: "沟谷", tier: 2 }, cabinets, specimens);
  assert(sug?.slotCode === "A-02", "推荐 A-02", `got ${sug?.slotCode}`);
  assert(/同地点、同档位/.test(sug!.reason), "理由标注同地点同档位");
}

console.log("2) 同地点档位接近 → 优先档位差距最小的柜");
{
  // A 柜：沟谷 1 档；B 柜：沟谷 5 档
  const specimens = [mk("a", "沟谷", 1, "A-01"), mk("b", "沟谷", 5, "B-01")];
  const sug = suggestSlot({ locality: "沟谷", tier: 2 }, cabinets, specimens);
  assert(sug?.cabinet.id === "A", "2 档标本归 A 柜（差 1 档）", `got ${sug?.cabinet.id}`);
  const sug2 = suggestSlot({ locality: "沟谷", tier: 4 }, cabinets, specimens);
  assert(sug2?.cabinet.id === "B", "4 档标本归 B 柜（差 1 档）", `got ${sug2?.cabinet.id}`);
}

console.log("3) 不同地点不参与同组归柜");
{
  const specimens = [mk("a", "山脊", 3, "A-01")];
  const sug = suggestSlot({ locality: "沟谷", tier: 3 }, cabinets, specimens);
  assert(sug?.cabinet.id === "B" || sug?.cabinet.id === "C",
    "不同地点走空柜推荐", `got ${sug?.cabinet.id}`);
}

console.log("4) 同组柜容量不足 → 推荐其他空柜（空位最多者优先）");
{
  // A 柜满（沟谷标本），B 柜占 1，C 柜空
  const specimens = [
    mk("a", "沟谷", 2, "A-01"),
    mk("b", "沟谷", 2, "A-02"),
    mk("c", "山脊", 3, "B-01"),
  ];
  const sug = suggestSlot({ locality: "沟谷", tier: 2 }, cabinets, specimens);
  assert(sug?.cabinet.id === "C", "回退到空位最多的 C 柜", `got ${sug?.cabinet.id}`);
  assert(/已满/.test(sug!.reason), "理由说明同组已满");
}

console.log("5) 全部柜满 → 返回 null");
{
  const specimens = [
    mk("a", "沟谷", 2, "A-01"), mk("b", "沟谷", 2, "A-02"),
    mk("c", "沟谷", 2, "B-01"), mk("d", "沟谷", 2, "B-02"),
    mk("e", "沟谷", 2, "C-01"), mk("f", "沟谷", 2, "C-02"),
  ];
  const sug = suggestSlot({ locality: "沟谷", tier: 2 }, cabinets, specimens);
  assert(sug === null, "无空位时返回 null");
}

console.log("6) 占用检测：能指出占用标本且排除自身");
{
  const me = mk("me", "沟谷", 2, "A-02");
  const other = mk("other", "沟谷", 2, "A-01");
  assert(findOccupant("A-01", [me, other], "me")?.id === "other", "A-01 被 other 占用");
  assert(findOccupant("A-02", [me, other], "me") === null, "自身所在格不算冲突");
  assert(slotCode(cabinets[0], 0) === "A-01", "格位编号格式 A-01");
}

console.log(`\n结果：${passed} 通过，${failed} 失败`);
if (failed > 0) process.exit(1);
