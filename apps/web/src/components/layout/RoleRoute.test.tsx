import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RoleRoute } from "./RoleRoute";
import { makeAuthState, TestProvider } from "../../test/render";

describe("RoleRoute", () => {
  it("renders the protected route for an allowed role", () => {
    render(
      <TestProvider authState={makeAuthState({ user: { ...makeAuthState().user!, role: "ADMIN" } })}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
              <Route path="/admin" element={<div>Admin workspace</div>} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard fallback</div>} />
          </Routes>
        </MemoryRouter>
      </TestProvider>
    );

    expect(screen.getByText("Admin workspace")).toBeTruthy();
  });

  it("redirects disallowed member sessions away from admin routes", async () => {
    render(
      <TestProvider authState={makeAuthState()}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
              <Route path="/admin" element={<div>Admin workspace</div>} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard fallback</div>} />
          </Routes>
        </MemoryRouter>
      </TestProvider>
    );

    await waitFor(() => expect(screen.getByText("Dashboard fallback")).toBeTruthy());
    expect(screen.queryByText("Admin workspace")).toBeNull();
  });
});
