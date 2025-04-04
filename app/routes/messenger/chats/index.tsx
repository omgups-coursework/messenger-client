import type { Route } from "../+types/layout";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Chats" },
    ];
}

export default function Index(props: Route.ComponentProps) {
    return <>chats</>;
}

