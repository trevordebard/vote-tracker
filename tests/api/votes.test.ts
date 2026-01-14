import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as submitVote } from "@/app/api/rooms/[code]/votes/route";
import { GET as getSummary } from "@/app/api/rooms/[code]/summary/route";
import { POST as closeRoom } from "@/app/api/rooms/[code]/close/route";
import { POST as mergeCandidates } from "@/app/api/rooms/[code]/merge/route";
import { cleanupTestDb, useTestDb } from "../helpers/db";

let dataDir = "";

beforeEach(() => {
  dataDir = useTestDb();
});

afterEach(() => {
  cleanupTestDb(dataDir);
});

describe("votes API", () => {
  it("rejects write-ins when disabled", async () => {
    const createResponse = await createRoom(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: ["Alex", "Sam"],
          allowWriteIns: false,
        }),
      })
    );
    const { code } = await createResponse.json();

    const response = await submitVote(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: "Jamie", candidateName: "Taylor" }),
      }),
      { params: Promise.resolve({ code }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Write-in/);
  });

  it("accepts valid votes and returns a tally", async () => {
    const createResponse = await createRoom(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: ["Alex"], allowWriteIns: false }),
      })
    );
    const { code } = await createResponse.json();

    const voteResponse = await submitVote(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: "Jamie", candidateName: "Alex" }),
      }),
      { params: Promise.resolve({ code }) }
    );

    expect(voteResponse.status).toBe(200);

    const summaryResponse = await getSummary(new Request("http://localhost"), {
      params: Promise.resolve({ code }),
    });
    const summaryBody = await summaryResponse.json();

    expect(summaryBody.totalVotes).toBe(1);
    expect(summaryBody.winner.candidate).toBe("Alex");
  });

  it("allows optional voter names and records anonymous votes", async () => {
    const createResponse = await createRoom(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: ["Alex"], allowWriteIns: false }),
      })
    );
    const { code } = await createResponse.json();

    const voteResponse = await submitVote(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: "", candidateName: "Alex" }),
      }),
      { params: Promise.resolve({ code }) }
    );

    expect(voteResponse.status).toBe(200);
    const voteBody = await voteResponse.json();
    expect(voteBody.voterName).toBe("Anonymous");

    const summaryResponse = await getSummary(new Request("http://localhost"), {
      params: Promise.resolve({ code }),
    });
    const summaryBody = await summaryResponse.json();

    expect(summaryBody.tally[0].voters).toContain("Anonymous");
  });

  it("blocks votes after a room is closed", async () => {
    const createResponse = await createRoom(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: ["Alex"], allowWriteIns: true }),
      })
    );
    const { code } = await createResponse.json();

    await closeRoom(new Request("http://localhost"), {
      params: Promise.resolve({ code }),
    });

    const response = await submitVote(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: "Jamie", candidateName: "Alex" }),
      }),
      { params: Promise.resolve({ code }) }
    );

    expect(response.status).toBe(403);
  });

  it("merges candidates into a new name", async () => {
    const createResponse = await createRoom(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: ["Alpha", "Beta"],
          allowWriteIns: true,
        }),
      })
    );
    const { code } = await createResponse.json();

    await submitVote(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: "Jamie", candidateName: "Alpha" }),
      }),
      { params: Promise.resolve({ code }) }
    );

    await submitVote(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: "Sky", candidateName: "Beta" }),
      }),
      { params: Promise.resolve({ code }) }
    );

    const mergeResponse = await mergeCandidates(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCandidates: ["Alpha", "Beta"],
          targetCandidate: "Gamma",
        }),
      }),
      { params: Promise.resolve({ code }) }
    );

    expect(mergeResponse.status).toBe(200);

    const summaryResponse = await getSummary(new Request("http://localhost"), {
      params: Promise.resolve({ code }),
    });
    const summaryBody = await summaryResponse.json();

    expect(summaryBody.totalVotes).toBe(2);
    expect(summaryBody.tally[0].candidate).toBe("Gamma");
  });
});
