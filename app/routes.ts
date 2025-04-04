import {type RouteConfig, index, layout, route} from "@react-router/dev/routes";

export default [
    layout('routes/messenger/layout.tsx', [
        route("", "routes/messenger/chats/index.tsx"),
        route(":chatId", "routes/messenger/chats/chat/index.tsx"),
    ])
] satisfies RouteConfig;
