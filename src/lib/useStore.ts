"use client";

import { useSyncExternalStore } from "react";
import { getState, subscribe, type AppState } from "./store";

const SERVER_SNAPSHOT: AppState = {
  user: null,
  accessProfile: {
    wheelchairSpaces: 0,
    companionSeat: false,
    transferSeat: false,
    assistanceDog: false,
    hearingLoop: false,
    captionsRequired: false,
    interpreterRequired: false,
    stepFree: false,
    noStrobe: false,
    maxWalkToWcM: null,
    notes: "",
  },
  holds: null,
  bookings: [],
};

/**
 * Subscribe to application state.
 *
 * The server snapshot is a signed-out, empty state so that the server-rendered
 * HTML and the first client render agree. Session state only exists in the
 * browser, and a hydration mismatch here would put the announced page and the
 * rendered page out of step — which matters more than usual when the announced
 * version is the one a screen-reader user is relying on.
 */
export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_SNAPSHOT);
}
