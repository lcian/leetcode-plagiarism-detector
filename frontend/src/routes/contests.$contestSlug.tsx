import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contests/$contestSlug")({
    loader: ({ params: { contestSlug } }) => contestSlug,
    component: PostComponent,
    errorComponent: () => {
        return <p>Error</p>;
    },
    notFoundComponent: () => {
        return <p>Error</p>;
    },
});

function PostComponent() {
    const contestSlug = Route.useLoaderData();
    return <div className="space-y-2">{contestSlug}</div>;
}
