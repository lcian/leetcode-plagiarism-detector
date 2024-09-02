import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { ThemeProvider } from "./components/theme-provider";
import { ThemeSelectionDropdown } from "./components/theme-selection-dropdown";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <ThemeProvider defaultTheme="light" storageKey="theme">
                <ThemeSelectionDropdown />
                <RouterProvider router={router} />
            </ThemeProvider>
        </StrictMode>,
    );
}
