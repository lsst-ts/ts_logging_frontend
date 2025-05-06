import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App Component", () => {
  it("renders without crashing", () => {
    render(<App />);
    // If the element is not found, this will throw an error and fail the test
    screen.getByText(/Vite \+ React/i);
  });

  it("renders Vite and React logos", () => {
    render(<App />);
    screen.getByAltText(/Vite logo/i);
    screen.getByAltText(/React logo/i);
  });

  it("renders the button and updates count on click", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /count is 0/i });
    expect(button).toBeTruthy(); // Simple truthy check

    fireEvent.click(button);
    expect(button.textContent).toBe("count is 1");
  });

  it("renders the instructional text", () => {
    render(<App />);
    screen.getByText(/Click on the Vite and React logos to learn more/i);
  });
});
