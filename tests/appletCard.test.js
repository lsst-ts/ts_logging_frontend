import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AppletCard, { useAppletState } from "@/components/AppletCard";
import { SOURCE } from "@/constants/DATA_SOURCES";

const h = React.createElement;
function Body() {
  const { state, message } = useAppletState();
  return h("p", null, `Body: ${state} ${message}`);
}
function card(overrides = {}) {
  return h(
    AppletCard,
    {
      title: "Test applet",
      required: [SOURCE.EXPOSURES],
      sources: { [SOURCE.EXPOSURES]: { ok: true } },
      skeleton: h("p", null, "Loading test data"),
      ...overrides,
    },
    h(Body),
  );
}
afterEach(cleanup);

describe("AppletCard display-state integration", () => {
  it("moves from loading to ready as data arrives", () => {
    const view = render(card({ loading: true }));
    expect(screen.getByText("Loading test data")).toBeTruthy();
    expect(screen.queryByText(/Body:/)).toBeNull();
    view.rerender(card());
    expect(screen.queryByText("Loading test data")).toBeNull();
    expect(screen.getByText("Body: ready")).toBeTruthy();
  });

  it("gates children on required-source errors and recovers on the next render", () => {
    const view = render(
      card({ sources: { [SOURCE.EXPOSURES]: { ok: false } } }),
    );
    expect(
      screen.getByText("Exposure data could not be fetched."),
    ).toBeTruthy();
    expect(screen.queryByText(/Body:/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /availability warning/ }),
    ).toBeNull();
    view.rerender(card());
    expect(screen.getByText("Body: ready")).toBeTruthy();
  });

  it("passes required-source no-data to children so they can retain their shell", () => {
    render(
      card({ sources: { [SOURCE.EXPOSURES]: { ok: true, noData: true } } }),
    );
    expect(
      screen.getByText("Body: noData No exposures found in ConsDB."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /availability warning/ }),
    ).toBeNull();
  });

  it("keeps content and a named warning for optional-source failures", () => {
    render(
      card({
        sources: {
          [SOURCE.EXPOSURES]: { ok: true },
          [SOURCE.ALMANAC]: { ok: false },
        },
        badgeAriaLabel: "Test data availability warning",
      }),
    );
    expect(
      screen.getByText("Body: ready Almanac data could not be fetched."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Test data availability warning" }),
    ).toBeTruthy();
  });

  it("unmounts closed content and restores the current display state when reopened", () => {
    const sources = { [SOURCE.EXPOSURES]: { ok: true, noData: true } };
    const view = render(card({ open: false, sources }));
    expect(screen.getByText("Test applet")).toBeTruthy();
    expect(screen.queryByText(/Body:/)).toBeNull();
    view.rerender(card({ open: true, sources }));
    expect(
      screen.getByText("Body: noData No exposures found in ConsDB."),
    ).toBeTruthy();
  });
});
