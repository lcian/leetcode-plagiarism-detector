import { ContestList } from "@/components/ContestList";
import "@/index.css";
import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
    component: Root,
});

function Root() {
    const routerState = useRouterState();
    return (
        <>
            {routerState.location.pathname === "/" ? (
                <div>
                    <ContestList />
                </div>
            ) : (
                <Outlet />
            )}
            {process.env.NODE_ENV === "development" && <TanStackRouterDevtools />}
        </>
    );
}
