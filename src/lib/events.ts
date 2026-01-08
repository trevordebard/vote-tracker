import { EventEmitter } from "events";

type GlobalEvents = typeof globalThis & {
  __voteTrackerEvents?: EventEmitter;
};

const globalEvents = globalThis as GlobalEvents;

export const voteEvents = globalEvents.__voteTrackerEvents ?? new EventEmitter();

if (!globalEvents.__voteTrackerEvents) {
  globalEvents.__voteTrackerEvents = voteEvents;
}
