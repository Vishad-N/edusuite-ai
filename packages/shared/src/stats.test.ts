import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCUMENT_PERMISSIONS, DOCUMENT_TYPES } from "./documents.ts";
import { SCREEN_PERMISSIONS } from "./permissions.ts";
import { DOCUMENT_SCREENS, DOCUMENT_TYPE_LABELS, DashboardStatsSchema } from "./stats.ts";

test("each document type opens on a screen that needs the same permission", () => {
  for (const type of DOCUMENT_TYPES) {
    const screen = DOCUMENT_SCREENS[type];
    assert.equal(SCREEN_PERMISSIONS[screen], DOCUMENT_PERMISSIONS[type], `${type} → ${screen}`);
    assert.ok(DOCUMENT_TYPE_LABELS[type], `${type} has a label`);
  }
});

test("stats may leave out types the caller can't use", () => {
  const parsed = DashboardStatsSchema.parse({
    byType: { notice: { total: 3, mine: 1 } },
    totals: { total: 3, mine: 1, last7Days: 2 },
    recent: [],
    recentMine: [],
  });
  assert.equal(parsed.byType.ppt, undefined);
  assert.throws(() => DashboardStatsSchema.parse({ byType: { notice: { total: -1, mine: 0 } }, totals: { total: 0, mine: 0, last7Days: 0 }, recent: [], recentMine: [] }));
});
