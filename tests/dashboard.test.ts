import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDashboardApp } from "../src/dashboard/server.ts";

test("the local dashboard serves state and executes its command API", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-era-dashboard-"));
  const app = createDashboardApp({ databasePath: join(directory, "dashboard.sqlite"), seed: 1847 });
  try {
    await new Promise<void>((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Dashboard did not bind a TCP port");
    const base = `http://127.0.0.1:${address.port}`;

    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Open Era/);

    const initialResponse = await fetch(`${base}/api/state`);
    const initial = await initialResponse.json() as {
      tick: number;
      commanderId: string;
      characters: Array<{ id: string; controller: { kind: string }; knowledge: Record<string, { stocksEstimate: Record<string, number> }> }>;
      settlements: Array<{ id: string; stocks: Record<string, number>; fortification: number | null; stability: number | null; intelligence: { exact: boolean } }>;
    };
    assert.equal(initial.tick, 0);
    assert.equal(initial.characters.find((character) => character.id === initial.commanderId)?.controller.kind, "human");
    const commander = initial.characters.find((character) => character.id === initial.commanderId)!;
    const foreign = initial.settlements.find((settlement) => settlement.id === "cinder-key")!;
    assert.deepEqual(foreign.stocks, commander.knowledge["cinder-key"].stocksEstimate);
    assert.equal(foreign.intelligence.exact, false);
    assert.equal(foreign.fortification, null);
    assert.equal(foreign.stability, null);

    const commandResponse = await fetch(`${base}/api/commands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: "prototype-player",
        type: "issue-order",
        characterId: "character-04",
        directive: "protect",
        targetId: "glassport",
        priority: 0.95,
        expiresInTicks: 72,
      }),
    });
    assert.equal(commandResponse.status, 202);

    const advanceResponse = await fetch(`${base}/api/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticks: 1 }),
    });
    assert.equal(advanceResponse.status, 200);

    const final = await (await fetch(`${base}/api/state`)).json() as {
      tick: number;
      pendingCommands: unknown[];
      characters: Array<{ id: string; standingOrders: Array<{ id: string }> }>;
    };
    assert.equal(final.tick, 1);
    assert.equal(final.pendingCommands.length, 0);
    assert.ok(final.characters.find((character) => character.id === "character-04")?.standingOrders.some((order) => order.id === "command-00001:standing-order"));

    const threadResponse = await fetch(`${base}/api/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: "prototype-player", kind: "direct", participantIds: ["character-02"] }),
    });
    assert.equal(threadResponse.status, 201);
    const threadBody = await threadResponse.json() as { thread: { id: string } };
    const messageResponse = await fetch(`${base}/api/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: "prototype-player", threadId: threadBody.thread.id, body: "Urgent: please report." }),
    });
    assert.equal(messageResponse.status, 202);
    const messageBody = await messageResponse.json() as { replies: Array<{ dueTick: number }> };
    assert.equal(messageBody.replies.length, 1);
    const dueTick = messageBody.replies[0].dueTick;
    const chatAdvance = await fetch(`${base}/api/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticks: dueTick - 1 }),
    });
    assert.equal(chatAdvance.status, 200);
    const withReply = await (await fetch(`${base}/api/state`)).json() as { conversations: { messages: Array<{ source: string }> } };
    assert.equal(withReply.conversations.messages.length, 2);
    assert.equal(withReply.conversations.messages.at(-1)?.source, "autonomous");
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
