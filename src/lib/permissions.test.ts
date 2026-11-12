import type { Action } from "@/lib/api";
import {
  canOpenDuplicateRow,
  canProgressAction,
  canRetryTranscription,
  nextMilestoneId,
  roleLabel,
} from "./permissions";

const worker = { id: "w1", role: "WORKER" as const };
const sup = { id: "s1", role: "SUPERVISOR" as const };
const act = (status: Action["status"], assignee: string | null) => ({
  status,
  assignee: assignee ? { id: assignee, fullName: "x" } : null,
});

describe("permissions", () => {
  it("names every role", () =>
    expect(Object.keys(roleLabel).sort()).toEqual(["MANAGER", "SUPERVISOR", "WORKER"]));
  it("only the assignee or staff can progress an open action", () => {
    expect(canProgressAction(worker, act("OPEN", "w1"))).toBe(true);
    expect(canProgressAction(worker, act("OPEN", "w2"))).toBe(false);
    expect(canProgressAction(worker, act("OPEN", null))).toBe(false);
    expect(canProgressAction(sup, act("IN_PROGRESS", "w2"))).toBe(true);
    expect(canProgressAction(sup, act("DONE", "s1"))).toBe(false);
    expect(canProgressAction(null, act("OPEN", "w1"))).toBe(false);
  });
  it("next milestone is the lowest incomplete seq", () => {
    const ms = (seq: number, done: boolean) => ({
      id: `m${seq}`,
      seq,
      title: "",
      dueAt: null,
      completedAt: done ? "t" : null,
      isOverdue: false,
    });
    expect(nextMilestoneId({ milestones: [ms(2, false), ms(1, true), ms(3, false)] })).toBe("m2");
    expect(nextMilestoneId({ milestones: [ms(1, true)] })).toBeNull();
  });
  it("retry transcription: failed + audio + (staff or reporter)", () => {
    const i = { processing: { transcription: "FAILED" }, audio: {}, reporter: { id: "w1" } };
    expect(canRetryTranscription(worker, i)).toBe(true);
    expect(canRetryTranscription({ id: "w9", role: "WORKER" }, i)).toBe(false);
    expect(canRetryTranscription(sup, i)).toBe(true);
    expect(canRetryTranscription(sup, { ...i, audio: null })).toBe(false);
  });
  it("workers open only duplicate rows they reported", () => {
    expect(canOpenDuplicateRow(worker, { reporter: { id: "w1", fullName: "" } })).toBe(true);
    expect(canOpenDuplicateRow(worker, { reporter: { id: "w2", fullName: "" } })).toBe(false);
    expect(canOpenDuplicateRow(sup, { reporter: { id: "w2", fullName: "" } })).toBe(true);
  });
});
