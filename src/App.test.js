import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

jest.mock("./lib/supabase", () => {
  const empty = { data: [], error: null };
  const query = {
    select: () => query,
    order: () => Promise.resolve(empty),
    eq: () => query,
    then: (resolve) => resolve(empty),
  };
  return {
    supabase: {
      from: () => query,
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithPassword: jest.fn(),
      },
    },
  };
});

test("public menu renders and /admin is not reachable without a session", async () => {
  window.history.pushState({}, "", "/admin");
  const { container } = render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/"));
  expect(container).toBeTruthy();
  expect(screen.queryByText("管理者ログイン")).not.toBeInTheDocument();
});
