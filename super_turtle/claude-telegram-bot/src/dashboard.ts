import {
  DASHBOARD_AUTH_TOKEN,
  DASHBOARD_ENABLED,
  DASHBOARD_PORT,
  DASHBOARD_PUBLIC_BASE_URL,
} from "./config";
import { logger } from "./logger";
import {
  buildCurrentJobDetail,
  buildProcessDetail,
  buildSubturtleDetail,
  buildSubturtleLogs,
} from "./dashboard/details";
import {
  computeProgressPct,
  isAuthorized,
  jsonResponse,
  notFoundResponse,
  parseMetaFile,
  readFileOr,
  safeSubstring,
  unauthorizedResponse,
  validateSubturtleName,
} from "./dashboard/helpers";
import { createDashboardRoutes } from "./dashboard/routes";
import {
  buildSessionDetail,
  buildSessionListResponse,
  buildSessionTurns,
  getDashboardOverviewResponse,
  resetDashboardSessionCachesForTests,
  validateSessionId,
} from "./dashboard/sessions";

export {
  computeProgressPct,
  isAuthorized,
  jsonResponse,
  notFoundResponse,
  parseMetaFile,
  readFileOr,
  resetDashboardSessionCachesForTests,
  safeSubstring,
  validateSubturtleName,
};
export type { MetaFileData } from "./dashboard/helpers";

// Thin dashboard entrypoint: auth/bootstrap stays here, data/rendering lives under src/dashboard/.
const dashboardLog = logger.child({ module: "dashboard" });

export const routes = createDashboardRoutes({
  buildCurrentJobDetail,
  buildProcessDetail,
  buildSessionDetail,
  buildSessionListResponse,
  buildSessionTurns,
  buildSubturtleDetail,
  buildSubturtleLogs,
  getDashboardOverviewResponse,
  validateSessionId,
});

export function startDashboardServer(): void {
  if (!DASHBOARD_ENABLED) {
    return;
  }

  const publicDashboardUrl = `${DASHBOARD_PUBLIC_BASE_URL}/dashboard`;
  const openDashboardUrl = DASHBOARD_AUTH_TOKEN
    ? `${publicDashboardUrl}?token=${encodeURIComponent(DASHBOARD_AUTH_TOKEN)}`
    : publicDashboardUrl;

  if (!DASHBOARD_AUTH_TOKEN) {
    dashboardLog.info(
      {
        bindHost: "127.0.0.1",
        port: DASHBOARD_PORT,
        publicUrl: publicDashboardUrl,
        openUrl: openDashboardUrl,
        authEnabled: false,
      },
      `Starting dashboard on ${openDashboardUrl}`
    );
  } else {
    dashboardLog.info(
      {
        bindHost: "127.0.0.1",
        port: DASHBOARD_PORT,
        publicUrl: publicDashboardUrl,
        openUrl: openDashboardUrl,
        authEnabled: true,
      },
      `Starting dashboard on ${openDashboardUrl}`
    );
  }

  Bun.serve({
    port: DASHBOARD_PORT,
    hostname: "127.0.0.1",
    async fetch(req) {
      if (!isAuthorized(req)) return unauthorizedResponse();

      const url = new URL(req.url);
      for (const route of routes) {
        const match = url.pathname.match(route.pattern);
        if (match) return route.handler(req, url, match);
      }

      return notFoundResponse();
    },
  });
}
