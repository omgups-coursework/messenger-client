import {View} from "~/components/view.component";
import type {Route} from "../../../.react-router/types/app/+types/root";
import React from 'react'
import {Outlet} from "react-router";
import {Navigation} from "~/routes/messenger/navigation";

export default function MessengerLayout(props: Route.ComponentProps) {
    return (
        <View>
            <Navigation />
            <Outlet />
        </View>
    );
}
