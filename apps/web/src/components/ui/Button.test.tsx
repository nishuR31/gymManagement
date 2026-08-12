import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("disables clicks while loading", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>
    );

    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toHaveProperty("disabled", true);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
