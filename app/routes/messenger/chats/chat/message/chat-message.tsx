import React, {type BaseHTMLAttributes, forwardRef, useContext, useEffect, useMemo} from "react";
import Prism from "prismjs";
import styled, {css} from "styled-components";

import type {ChatMessageProps} from "~/routes/messenger/chats/chat/message/common";
import type {Theme} from "~/common/theme";
import {TextChatMessage} from "~/routes/messenger/chats/chat/message/components/text-message.component";
import {
    ExtendedTextChatMessage
} from "~/routes/messenger/chats/chat/message/components/extended-text-message.component";
import {type Message, OutgoingMessageStatusEnum} from "~/common/types";
import {Icon, IconEnum} from "~/components/icon.component";
import {ChatContext} from "~/routes/messenger/chats/chat/context/chat.context";

export const ChatMessageImpl = forwardRef<HTMLDivElement, BaseHTMLAttributes<HTMLDivElement> & ChatMessageProps>((props, ref) => {
    const { message, ...commonProps } = props;
    const chatContext = useContext(ChatContext);

    useEffect(() => {
        Prism.highlightAll(false);
    }, []);

    const {messageContent, messageStatusIcon, time} = useMemo(() => {
        const messageContent = getMessageContent(props.message);
        const messageStatusIcon = getMessageStatusIcon(props.message);
        const time = formatDateToHHMM(props.message.timestamp);

        return {
            messageContent: messageContent,
            messageStatusIcon: messageStatusIcon,
            time: time,
        }
    }, [props.message])

    return (
        <StyledMessage {...commonProps} ref={ref} data-chat-id={props.message.chatId} data-message-id={props.message.id} onContextMenu={(e) => e.preventDefault()}>
            <MessageWrapper>
                <MessageContainer data-message-content={true} $fromMe={props.message.fromMe} $selected={chatContext.selectedMessages.has(props.message.id)}>
                    {messageContent}
                    &nbsp;
                    &nbsp;
                    <InfoWrapper>
                        <InfoContainer>
                            <MessageTime>{time}</MessageTime>
                            <MessageStatusIcon $messageStatus={props.message.fromMe ? props.message.status : null}>
                                {messageStatusIcon}
                            </MessageStatusIcon>
                        </InfoContainer>
                    </InfoWrapper>
                </MessageContainer>
            </MessageWrapper>
            {(chatContext.isSelecting || chatContext.selectedMessages.size > 0) && (
                <MessageSelectIcon $messageSelected={chatContext.selectedMessages.has(props.message.id)}>
                    {chatContext.selectedMessages.has(props.message.id) ? <Icon icon={IconEnum.CHECK_CIRCLE_LINE} size={18} /> : <Icon icon={IconEnum.CIRCLE_LINE} size={18} />}
                </MessageSelectIcon>
            )}
        </StyledMessage>
    )
})

export const ChatMessage = React.memo(ChatMessageImpl, (prevProps, nextProps) => {
    return prevProps.message.id === nextProps.message.id;
});
ChatMessage.displayName = "ChatMessage";

/**********************************************************************
 * utils
 ***********************************************************************/
function getMessageContent(message: Message) {
    if (message.textMessage) {
        return (
            <TextChatMessage message={message} textMessage={message.textMessage}/>
        )
    }

    if (message.extendedTextMessage) {
        return (
            <ExtendedTextChatMessage message={message} extendedTextMessage={message.extendedTextMessage}/>
        )
    }

    return null;
}

function formatDateToHHMM(timestamp: number) {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function getMessageStatusIcon(message: Message) {
    if (!message.fromMe) {
        return null;
    }

    switch (message.status) {
        case OutgoingMessageStatusEnum.FAILED: {
            return <Icon icon={IconEnum.CHECK_LINE} size={14}/>
        }
        case OutgoingMessageStatusEnum.CLOCK: {
            return <Icon icon={IconEnum.HISTORY_ANTICLOCKWISE_LINE} size={14}/>
        }
        case OutgoingMessageStatusEnum.SENT: {
            return <Icon icon={IconEnum.CHECK_LINE} size={14}/>
        }
        case OutgoingMessageStatusEnum.RECEIVED: {
            return <Icon icon={IconEnum.CHECKS_LINE} size={14}/>
        }
        case OutgoingMessageStatusEnum.READ: {
            return <Icon icon={IconEnum.CHECKS_LINE} size={14}/>
        }
    }
}

/**********************************************************************
 * styled
 ***********************************************************************/
const StyledMessage = styled.div<{ theme: Theme; }>`
    user-select: none;
    
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-end;
    
    width: 100%;
    padding: 4px 0;
    
    gap: 32px;
`

const MessageWrapper = styled.div`
    box-sizing: border-box;
    width: 480px;
    max-width: 480px;
    overflow: hidden;
`

const MessageContainer = styled.div<{ theme: Theme; $fromMe: boolean; $selected: boolean }>`
    user-select: text;
    
    box-sizing: border-box;

    padding: 4px 8px;

    max-width: fit-content;

    border-radius: 12px;

    ${({$selected, $fromMe, theme}) => {
        if ($selected) {
            return css`
                background: ${theme.selected_message_bg_color}
            `
        }

        if ($fromMe) {
            return css`
                background: ${theme.outgoing_message_bg_color}
            `
        }

        return css`
            background: ${theme.incoming_message_bg_color};
        `
    }}
`

const InfoWrapper = styled.span`
    float: right;
    white-space: nowrap;

    position: relative;
    top: 2px;
`

const InfoContainer = styled.div`
    display: inline-flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;

    gap: 6px;

    font-size: 12px;
    color: ${({theme}) => theme.subtitle_text_color};
`

const MessageTime = styled.span`
    user-select: none;
`

const MessageStatusIcon = styled.span<{ $messageStatus: OutgoingMessageStatusEnum | null }>`
    display: flex;
    justify-content: center;
    align-items: center;

    ${({$messageStatus}) => {
        if ($messageStatus === null) {
            return;
        }
        
        switch ($messageStatus) {
            case OutgoingMessageStatusEnum.READ: {
                return css`
                    color: ${({theme}) => theme.accent_text_color};
                `
            }
            default: {
                return css`
                    color: ${({theme}) => theme.subtitle_text_color};
                `
            }
        }


    }}
`

const MessageSelectIcon = styled.span<{ $messageSelected: boolean }>`
    display: flex;
    justify-content: center;
    align-items: center;

    ${({$messageSelected}) => {
        if ($messageSelected) {
            return css`
                color: ${({theme}) => theme.accent_text_color};
            `
        }

        return css`
            color: ${({theme}) => theme.text_color};
        `
    }}
`