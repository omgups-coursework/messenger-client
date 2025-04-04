import {Avatar, AvatarSize} from "~/components/avatar.component";
import React, {useMemo} from "react";
import styled from "styled-components";
import type {Theme} from "~/common/theme";
import {generatePastelColorFromIdentifier} from "~/lib/color/generate-pastel-color-from-identifier.util";
import type {ChatPreview} from "~/common/types";

//@ts-ignore
import CheckLineSvg from '../../assets/icons/check_line.svg?react'
//@ts-ignore
import CheckLinesSvg from '../../assets/icons/checks_line.svg?react'
import {Link} from "react-router";

interface ChatListProps {
    list: ChatPreview[];
}

export const ChatList: React.FC<ChatListProps> = (props) => {
    return (
        <StyledChatList>
            {props.list.map((chatPreview) => (
                <ChatListItem key={chatPreview.id} chatPreview={chatPreview} />
            ))}
        </StyledChatList>
    )
}

const StyledChatList = styled.div<{ theme: Theme }>`
    flex: 1;

    overflow: hidden;
    overflow-y: auto;

    display: flex;
    flex-direction: column;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background-color: ${({theme}) => theme.scrollbar_track_color};
    }

    &::-webkit-scrollbar-track:hover {
        background-color: ${({theme}) => theme.scrollbar_track_hint_color};
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 2px;
        background-color: ${({theme}) => theme.scrollbar_thumb_color};
    }

    &::-webkit-scrollbar-thumb:hover {
        background-color: ${({theme}) => theme.subtitle_text_color};
    }
`

interface ChatListItemProps {
    chatPreview: ChatPreview;
}

const ONE_DAY_MS = 86400000;

const ChatListItemImpl: React.FC<ChatListItemProps> = ((props) => {
    const {time, status} = useMemo(() => {
        if (props.chatPreview.message === null) {
            return {
                time: null,
                status: null,
            };
        }

        const timestamp = Date.now();
        const date = new Date(props.chatPreview.message.timestamp);

        let time: string;

        if (timestamp - props.chatPreview.message.timestamp > ONE_DAY_MS) {
            const userLocale = navigator.language;
            time = date.toLocaleDateString(userLocale, { weekday: 'short' });
        }
        else {
            time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        }

        return {
            time: time,
            status: 0,
        };

    }, [props.chatPreview.message])

    const subtitle = useMemo(() => {
        if (props.chatPreview.message === null) {
            return null;
        }

        if (props.chatPreview.message.textMessage != null) {
            return props.chatPreview.message.textMessage.text;
        }

        if (props.chatPreview.message.extendedTextMessage != null) {
            return props.chatPreview.message.extendedTextMessage.text;
        }

        return null;

    }, [props.chatPreview.message])

    return (
        <StyledChatPreview key={props.chatPreview.id} to={props.chatPreview.id}>
            <Avatar size={AvatarSize.SMALL} text={props.chatPreview.title[0].toUpperCase()} $backgroundColor={generatePastelColorFromIdentifier(props.chatPreview.id)}/>
            <Container>
                <Section>
                    <Title>{props.chatPreview.title}</Title>
                    <UserDetails>
                        <MessageStatus>
                            {status === 1 && <CheckLinesSvg/>}
                        </MessageStatus>
                        <SendingTime>{time}</SendingTime>
                    </UserDetails>
                </Section>
                <Section>
                    <Subtitle>{subtitle}</Subtitle>
                </Section>
            </Container>
        </StyledChatPreview>
    )
})

const ChatListItem = React.memo(ChatListItemImpl, (prevProps, nextProps) => {
    return prevProps.chatPreview.upsertTimestamp === nextProps.chatPreview.upsertTimestamp;
});
ChatListItem.displayName = "ChatListItem";

const Title = styled.div<{ theme: Theme }>`
    font-size: 1rem;
    color: ${({theme}) => theme.text_color};

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    max-width: 100%;
    flex-shrink: 1;
`

const Subtitle = styled.div<{ theme: Theme }>`
    font-size: 1rem;
    color: ${({theme}) => theme.subtitle_text_color};
`

const StyledChatPreview = styled(Link)<{ theme: Theme }>`
    user-select: none;

    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;

    gap: 8px;

    padding: 8px 8px;

    &:hover {
        background-color: ${({theme}) => theme.secondary_bg_color};
    }
`

const Container = styled.div<{ theme: Theme }>`
    width: 100%;
    height: 100%;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: space-between;
`

const Section = styled.div<{ theme: Theme }>`
    width: 100%;

    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    gap: 8px;
`

const UserDetails = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;

    gap: 2px;
`

const MessageStatus = styled.div<{ theme: Theme }>`
    display: flex;
    align-items: center;

    width: 0.9rem;

    path {
        fill: ${({theme}) => theme.accent_text_color};
    }
`

const SendingTime = styled.div<{ theme: Theme }>`
    text-transform: capitalize;
    font-size: 0.9rem;
    color: ${({theme}) => theme.subtitle_text_color};
`
