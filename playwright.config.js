import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    workers: 2,
    timeout: 30000,
    outputDir: ".cache/playwright-results",
    reporter: "list",
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
        browserName: "chromium",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        launchOptions: {
            ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
        },
    },
    webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
        command: "npm run dev -- --host 0.0.0.0 --port 4173 --strictPort",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        env: { VITE_SUPABASE_URL: "https://aptfindr-room-tests.supabase.co", VITE_SUPABASE_ANON_KEY: "test-only-anon-key" },
    },
});
