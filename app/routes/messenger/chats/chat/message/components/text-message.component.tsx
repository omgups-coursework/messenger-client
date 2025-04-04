import React from "react";
import {
    type ChatMessageProps,
} from "~/routes/messenger/chats/chat/message/common";
import type {TextMessage} from "~/common/types";
import styled from "styled-components";
import type {Theme} from "~/common/theme";
import {renderText} from "~/routes/messenger/chats/chat/message/utils/render-text";

export interface TextChatMessageProps extends ChatMessageProps {
    textMessage: TextMessage;
}

export const TextChatMessage: React.FC<TextChatMessageProps> = (props) => {
    return (
        <TextContainer>
            {renderText(props.textMessage.text)}
        </TextContainer>
    )
}

const TextContainer = styled.span<{ theme: Theme; }>`
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    font-size: 14px;
    color: ${({theme}) => theme.text_color};
`
