import test from "node:test";
import assert from "node:assert/strict";
import * as c from "../core.js";
import { seedData } from "../seed-data.js";

test("суми зберігаються цілими грошами", () => {
  assert.equal(c.toGrosz("100"), 10000);
  assert.equal(c.toGrosz("12,5"), 1250);
  assert.equal(c.toGrosz(" 1 234.05 "), 123405);
  assert.throws(() => c.toGrosz("0"));
  assert.throws(() => c.toGrosz("abc"));
  assert.throws(() => c.toGrosz("1.234"));
});

test("від'ємний баланс показується зі знаком −", () => {
  const b = c.calculateBalance([{ type: "income", amountGrosz: 10000 }, { type: "purchase", amountGrosz: 15000 }]);
  assert.equal(b, -5000);
  assert.equal(c.formatPln(b), "−50,00 zł");
  assert.equal(c.formatPln(123456), "+1\u00a0234,56 zł");
  assert.equal(c.formatPln(0), "0,00 zł");
});

test("початкові дані: баланс 319 zł, продукти за жовтень 382 zł", { skip: "чекає на стартові дані" }, () => {
  assert.equal(c.calculateBalance(seedData.entries), 31900);
  const s = c.summarizeMonth(seedData.entries, "2026-10");
  assert.equal(s.byCategory.groceries, 38200);
  assert.equal(s.income, 101300);
  assert.equal(seedData.categories.length, 6);
});

test("закуп заднім числом входить лише у свій місяць, але і в загальний баланс", { skip: "чекає на стартові дані" }, () => {
  const d = c.applyOp(seedData, { kind: "addEntry", entry: { id: "x", type: "purchase", amountGrosz: 5000, date: "2026-09-30", categoryId: "groceries", note: "" } });
  assert.equal(c.summarizeMonth(d.entries, "2026-10").byCategory.groceries, 38200);
  assert.equal(c.summarizeMonth(d.entries, "2026-09").byCategory.groceries, 5000);
  assert.equal(c.calculateBalance(d.entries), 26900);
});

test("закуп без категорії або з нульовою сумою відхиляється", () => {
  assert.throws(() => c.applyOp(seedData, { kind: "addEntry", entry: { id: "y", type: "purchase", amountGrosz: 100, date: "2026-10-01", categoryId: "nope" } }));
  assert.throws(() => c.applyOp(seedData, { kind: "addEntry", entry: { id: "y", type: "income", amountGrosz: 0, date: "2026-10-01" } }));
});

test("прихована категорія лишається у підсумках місяця зі старими закупами", { skip: "чекає на стартові дані" }, () => {
  const d = c.applyOp(seedData, { kind: "saveCategory", category: { id: "home", hidden: true, name: "Товари для дому" } });
  const s = c.summarizeMonth(d.entries, "2026-10");
  assert.ok(c.categoriesForMonth(d.categories, s.byCategory).some((x) => x.id === "home"));
  const empty = c.summarizeMonth(d.entries, "2026-11");
  assert.ok(!c.categoriesForMonth(d.categories, empty.byCategory).some((x) => x.id === "home"));
});

test("редагування, видалення, порядок категорій", { skip: "чекає на стартові дані" }, () => {
  let d = c.applyOp(seedData, { kind: "updateEntry", entry: { ...seedData.entries[1], amountGrosz: 100 } });
  assert.equal(d.entries[1].amountGrosz, 100);
  d = c.applyOp(d, { kind: "deleteEntry", id: seedData.entries[1].id });
  assert.equal(d.entries.length, seedData.entries.length - 1);
  d = c.applyOp(d, { kind: "moveCategory", id: "other", delta: -1 });
  assert.deepEqual(d.categories.sort((a, b) => a.order - b.order).map((x) => x.id).slice(0, 4), ["groceries", "home", "other", "peach-food"]);
  d = c.applyOp(d, { kind: "saveCategory", category: { id: "new1", name: "  Аптека " } });
  assert.equal(d.categories.find((x) => x.id === "new1").name, "Аптека");
});

test("шифрування: правильний ключ відкриває, чужий — ні", async () => {
  const k = c.generateKeyString();
  const file = await c.encryptData(seedData, k);
  assert.ok(!file.includes("Продукти"));
  assert.deepEqual(await c.decryptData(file, k), seedData);
  await assert.rejects(c.decryptData(file, c.generateKeyString()), /не підходить/);
});

test("збереження перечитує дані й повторює при конфлікті версій", { skip: "чекає на стартові дані" }, async () => {
  const k = c.generateKeyString();
  let stored = { text: await c.encryptData(seedData, k), sha: "s1" };
  let conflicts = 1;
  const fake = async (url, opts = {}) => {
    if (!opts.method) return { ok: true, json: async () => ({ content: c.utf8b64.from(stored.text), sha: stored.sha }) };
    const body = JSON.parse(opts.body);
    if (conflicts-- > 0) return { ok: false, status: 409 };
    assert.equal(body.sha, stored.sha);
    stored = { text: c.utf8b64.to(body.content), sha: "s2" };
    return { ok: true, json: async () => ({ content: { sha: "s2" } }) };
  };
  const r = await c.commitOp({ kind: "deleteEntry", id: "opening-balance" }, k, "t", fake);
  assert.equal(r.sha, "s2");
  assert.equal((await c.decryptData(stored.text, k)).entries.length, 7);
});

test("прихід ділиться за джерелами, витрати не змішуються з ним", () => {
  const categories = [
    { id: "groceries", name: "Продукти", kind: undefined, order: 1, hidden: false },
    { id: "income-ai", name: "АІ-проєкти", kind: "income", order: 2, hidden: false },
  ];
  let d = { categories, entries: [] };
  d = c.applyOp(d, { kind: "addEntry", entry: { id: "i1", type: "income", amountGrosz: 50000, date: "2026-10-03", categoryId: "income-ai", note: "" } });
  d = c.applyOp(d, { kind: "addEntry", entry: { id: "i2", type: "income", amountGrosz: 10000, date: "2026-10-04", categoryId: null, note: "" } });
  d = c.applyOp(d, { kind: "addEntry", entry: { id: "p1", type: "purchase", amountGrosz: 2000, date: "2026-10-05", categoryId: "groceries", note: "" } });
  const s = c.summarizeMonth(d.entries, "2026-10");
  assert.equal(s.income, 60000);
  assert.equal(s.incomeByCategory["income-ai"], 50000);
  assert.equal(s.purchases, 2000);
  assert.equal(s.byCategory["income-ai"], undefined);
  assert.throws(() => c.applyOp(d, { kind: "addEntry", entry: { id: "x", type: "income", amountGrosz: 100, date: "2026-10-06", categoryId: "nope" } }));
});

test("перший запуск створює файл, а якщо він уже є — не перезаписує", async () => {
  const k = c.generateKeyString();
  const empty = { version: 1, categories: [], entries: [] };
  const puts = [];
  const created = async (url, opts = {}) => {
    if (!opts.method) return { ok: false, status: 404 };
    puts.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ content: { sha: "s1" } }) };
  };
  await c.createLedger(empty, k, "t", created);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].sha, undefined);
  assert.deepEqual(await c.decryptData(c.utf8b64.to(puts[0].content), k), empty);

  const exists = async () => ({ ok: true, json: async () => ({}) });
  await assert.rejects(c.createLedger(empty, k, "t", exists), /вже створено/);
});
