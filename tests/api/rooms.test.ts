import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createRoom } from "@/app/api/rooms/route";
import { GET as getRoom } from "@/app/api/rooms/[code]/route";
import { POST as closeRoom } from "@/app/api/rooms/[code]/close/route";
import { cleanupTestDb, useTestDb } from "../helpers/db";

let dataDir = "";

beforeEach(() => {
  dataDir = useTestDb();
});

afterEach(() => {
  cleanupTestDb(dataDir);
});

describe("rooms API", () => {
  it("creates a room and returns sanitized candidates", async () => {
    const request = new Request("http://localhost/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roles: ["Secretary", " Facilitator ", "secretary", ""],
        candidates: ["Alex", "  Sam  ", "alex", ""],
        allowWriteIns: false,
      }),
    });

    const response = await createRoom(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.code).toHaveLength(6);
    expect(body.allowWriteIns).toBe(false);
    expect(body.roles).toEqual(["Secretary", "Facilitator"]);
    expect(body.candidates).toEqual(["Alex", "Sam"]);
  });

  it("returns 404 for unknown rooms", async () => {
    const response = await getRoom(new Request("http://localhost"), {
      params: Promise.resolve({ code: "MISSING" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Room not found");
  });

  it("closes a room and marks it closed", async () => {
    const createResponse = await createRoom(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: ["Taylor"], allowWriteIns: true }),
      })
    );
    const { code } = await createResponse.json();

    const closeResponse = await closeRoom(new Request("http://localhost"), {
      params: Promise.resolve({ code }),
    });

    expect(closeResponse.status).toBe(200);
    const closeBody = await closeResponse.json();
    expect(closeBody.closedAt).toBeTruthy();

    const roomResponse = await getRoom(new Request("http://localhost"), {
      params: Promise.resolve({ code }),
    });
    const roomBody = await roomResponse.json();
    expect(roomBody.closedAt).toBeTruthy();
  });
});
