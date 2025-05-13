import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import App from "./App";

vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve([]), // Mocked response
    }),
  ),
);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(), // modern API
    removeEventListener: vi.fn(), // modern API
  })),
});

describe("App Component", () => {
  it("renders without crashing", () => {
    render(<App />);
    // If the element is not found, this will throw an error and fail the test
    screen.getByText("Nightly");
  });
});
