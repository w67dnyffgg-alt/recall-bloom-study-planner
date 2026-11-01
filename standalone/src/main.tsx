import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createStandaloneRouter } from "../../src/standalone/router";
import "../../src/styles.css";

const queryClient = new QueryClient();
const router = createStandaloneRouter(queryClient);
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
