import React from "react";
import {type ChatMessageProps} from "~/routes/messenger/chats/chat/message/common";
import type {ExtendedTextMessage} from "~/common/types";
import styled, {css} from "styled-components";
import type {Theme} from "~/common/theme";
import {renderText} from "~/routes/messenger/chats/chat/message/utils/render-text";

export interface ExtendedTextChatMessageProps extends ChatMessageProps {
    extendedTextMessage: ExtendedTextMessage;
}

export const ExtendedTextChatMessage: React.FC<ExtendedTextChatMessageProps> = (props) => {
    return (
        <>
            <TextContainer>
                {renderText(props.extendedTextMessage.text)}
            </TextContainer>
            <PreviewHorizontalContainer href={props.extendedTextMessage.url} target="_blank">
                <PreviewItem>
                    <PreviewTitle>{props.extendedTextMessage.title}</PreviewTitle>
                    <PreviewDescription>{props.extendedTextMessage.description}</PreviewDescription>
                </PreviewItem>
                <PreviewItem>
                    <PreviewImg src={props.extendedTextMessage.jpegThumbnail} />
                </PreviewItem>
            </PreviewHorizontalContainer>
        </>
    )
}

const TextContainer = styled.div<{ theme: Theme; }>`
    box-sizing: border-box;
    
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    font-size: 14px;
    color: ${({theme}) => theme.text_color};
`

const PreviewHorizontalContainer = styled.a<{ theme: Theme }>`
    box-sizing: border-box;
    
    display: flex;
    flex-direction: row;
    
    min-width: 100%;
    min-height: 40px;
    
    border-radius: 8px;
    padding: 8px;

    background: ${({theme}) => theme.preview_message_bg_color};
`

const PreviewItem = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
`

const PreviewImg = styled.img`
    max-width: 128px;
    max-height: 128px;
    height: 100%;
    border-radius: 8px;
`

const PreviewTitle = styled.div<{ theme: Theme }>`
    font-size: 14px;
    font-weight: bolder;
    color: ${({theme}) => theme.link_color};
`

const PreviewDescription = styled.div<{ theme: Theme }>`
    font-size: 14px;
    font-weight: lighter;
    color: ${({theme}) => theme.text_color};
`