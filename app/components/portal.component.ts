import ReactDOM from 'react-dom';
import React from "react";

export const Portal: React.FC<React.PropsWithChildren> = (props) => {
    const root = document.getElementById('root');

    if (root == null) {
        throw new Error('Root is undefined');
    }

    return ReactDOM.createPortal(props.children, root);
};