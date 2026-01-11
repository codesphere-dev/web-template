import { lazy } from "react";
import type { RouteObject } from "react-router";

import { AppErrorBoundary } from "@/pages/errors";

const Home = lazy(() => import("@/pages/index.tsx"));

const rootRoutes: RouteObject = {
  path: "/",
  ErrorBoundary: AppErrorBoundary,
  children: [
    {
      index: true,
      Component: Home,
    },
  ],
};

export default rootRoutes;
