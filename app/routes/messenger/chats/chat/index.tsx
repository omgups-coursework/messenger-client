import type {Route} from "../../+types/layout";
import {useNavigate, useParams} from "react-router";
import React, {type ChangeEvent, useCallback, useContext, useEffect, useRef, useState} from "react";
import styled, {useTheme} from "styled-components";
import type {Theme} from "~/common/theme";
import {ChatInput} from "~/routes/messenger/chats/chat/chat-input";
import {IconButton} from "~/components/icon-button.component";
import {useChat} from "~/hooks/use-chat.hook";
import {chatManager} from "~/managers/chat.manager";
import {useChatMessages} from "~/hooks/use-chat-messages.hook";
import {messageManager} from "~/managers/message.manager";
import {ChatMessage} from "~/routes/messenger/chats/chat/message/chat-message";
import {type Message} from "~/common/types";
import {IconEnum} from "~/components/icon.component";
import {MessageContextProvider} from "~/routes/messenger/chats/chat/context-menu/message-context-provider";
import {ChatContext, type ChatContextData} from "~/routes/messenger/chats/chat/context/chat.context";
import {type IVector2, Vector2} from "~/lib/vector2";
import {Button} from "~/components/button.component";
import {ButtonSecondaryText, ButtonText} from "~/components/button-text.component";
import {ButtonGroup} from "~/components/button-group.component";
import {useEscape} from "~/hooks/use-escape";
import {CHAT_BACK_ESCAPE_PRIORITY, CHAT_CLEAR_SELECTED_MESSAGES_ESCAPE_PRIORITY} from "~/common/escpae-priority";
import {findUrlMatches} from "~/lib/url/find-url-matches";
import {useConnection} from "~/hooks/use-connection";

type LinkPreviewResult = {
    url: string;
    title: string;
    description: string;
    jpegThumbnail: string;
};

async function fetchLinkPreview(text: string): Promise<LinkPreviewResult | null> {
    try {
        const response = await fetch("http://localhost:3005/preview", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept-Language": navigator.language || "ru-RU",
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.error("Preview service error:", response.status);
            return null;
        }

        const data = await response.json();

        if (data.message === "no result" || data.message === "error") {
            return null;
        }

        return {
            url: data.url,
            title: data.title,
            description: data.description,
            jpegThumbnail: data.jpegThumbnail,
        };
    } catch (error) {
        console.error("Failed to fetch preview:", error);
        return null;
    }
}

const SELECT_DELTA = 5;
const SELECT_DELTA_SQR = SELECT_DELTA * SELECT_DELTA;

export function meta({params}: Route.MetaArgs) {
    const {chatId} = params;
    const chat = chatManager.get(chatId as string);

    return [
        {title: `Chat - ${chat?.title}`},
    ];
}

export default function Chat() {
    const theme = useTheme();
    const {chatId} = useParams();

    if (chatId == null) {
        throw new Error('chatId is null');
    }

    const {
        connection,
        connectionState,
        iceConnectionState,
        iceGatheringState,
        signalingState,
        chatState,
    } = useConnection(chatId);

    const {chat} = useChat(chatId as string);
    const {messages} = useChatMessages(chatId as string);

    const [chatInput, setChatInput] = useState<string>('');

    const handleChatInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setChatInput(event.target.value);
    }, []);

    const handleChatInputSubmit = useCallback(async () => {
        if (chat == null) {
            return;
        }

        if (chatInput.length < 1) {
            setChatInput('');
            return;
        }

        const trimmedText = chatInput.trim();

        if (trimmedText.length < 1) {
            setChatInput('');
            return;
        }

        const urlMatches = findUrlMatches(trimmedText);

        if (urlMatches.length > 0) {
            const extractedLinkPreviewFromText = await fetchLinkPreview(trimmedText);

            if (extractedLinkPreviewFromText) {
                // TODO: оставить только содержимое сообщения
                messageManager.send(chat.id, {
                    id: Date.now().toString(),
                    chatId: chat.id,
                    timestamp: Date.now(),
                    extendedTextMessage: {
                        text: trimmedText,
                        url: extractedLinkPreviewFromText.url,
                        title: extractedLinkPreviewFromText.title,
                        description: extractedLinkPreviewFromText.description,
                        jpegThumbnail: extractedLinkPreviewFromText.jpegThumbnail,
                    },
                })

                setChatInput('');

                return;
            }
        }

        // TODO: оставить только содержимое сообщения
        messageManager.send(chat.id, {
            id: Date.now().toString(),
            chatId: chat.id,
            timestamp: Date.now(),
            textMessage: {
                text: trimmedText,
            },
        })

        setChatInput('');
    }, [chat, chatInput]);

    const chatContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = chatContentRef.current;

        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages]);

    const [selectedMessageId, setSelectedMessageId] = useState<Message['id'] | null>(null);

    const [selectedMessages, setSelectedMessages] = useState<Set<Message['id']>>(new Set<Message['id']>());
    const [selectedMessageCount, setSelectedMessageCount] = useState<number>(0);

    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionAnchorId, setSelectionAnchorId] = useState<Message['id'] | null>(null);
    const [selectionAnchorXY, setSelectionAnchorXY] = useState<IVector2 | null>(null);
    const [selectionBaseline, setSelectionBaseline] = useState<Set<Message['id']>>(new Set());
    const messageRefs = useRef<Map<Message['id'], HTMLDivElement>>(new Map());

    const selectMessage = useCallback((messageId: Message['id']): void => {
        setSelectedMessages(prev => {
            const copy = new Set<Message['id']>(prev);

            copy.add(messageId);

            return copy;
        });
    }, []);

    const deselectMessage = useCallback((messageId: Message['id']): void => {
        setSelectedMessages(prev => {
            const copy = new Set<Message['id']>(prev);

            copy.delete(messageId);

            return copy;
        });
    }, []);

    useEffect(() => {
        if (isSelecting) {
            document.body.classList.add('selecting');
            return;
        }

        document.body.classList.remove('selecting');
        setSelectedMessageCount(selectedMessages.size);
    }, [isSelecting, selectedMessages]);

    useEffect(() => {
        const orderedMessages = [...messages.values()];

        const handleMouseDown = (event: MouseEvent) => {
            if (!chatContentRef.current?.contains(event.target as Node)) {
                return;
            }

            const contentElement = (event.target as HTMLElement).closest('[data-message-content]');

            if (contentElement != null) {
                return;
            }

            const wrapperElement = (event.target as HTMLElement).closest('[data-message-id]');
            const messageId = wrapperElement?.getAttribute('data-message-id');

            if (messageId == null) {
                return;
            }

            if (event.button !== 0) {
                setSelectedMessageId(messageId);
                return;
            }

            setSelectionAnchorId(messageId);
            setSelectionBaseline(new Set(selectedMessages));
            setSelectionAnchorXY(event);
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (selectionAnchorId === null) {
                return;
            }

            if (selectionAnchorXY === null) {
                return;
            }

            const distanceSqr = Vector2.distanceSqr(
                event,
                selectionAnchorXY
            )

            if (distanceSqr < SELECT_DELTA_SQR) {
                return;
            }

            if (!isSelecting) {
                setIsSelecting(true);
            }

            const anchorIndex = orderedMessages.findIndex(message => message.id === selectionAnchorId);

            if (anchorIndex === -1) {
                return;
            }

            let currentIndex: number | null = null;

            for (let i = 0; i < orderedMessages.length; i++) {
                const message = orderedMessages[i];
                const element = messageRefs.current.get(message.id);
                if (!element) {
                    continue;
                }

                const rect = element.getBoundingClientRect();

                if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
                    currentIndex = i;
                    break;
                }
            }

            if (currentIndex === null) {
                return;
            }

            const [from, to] = anchorIndex < currentIndex
                ? [anchorIndex, currentIndex]
                : [currentIndex, anchorIndex];

            const newSelection = new Set(selectionBaseline);

            for (let i = 0; i < orderedMessages.length; i++) {
                const id = orderedMessages[i].id;

                if (i >= from && i <= to) {
                    if (selectionBaseline.has(id)) {
                        newSelection.delete(id);
                    } else {
                        newSelection.add(id);
                    }
                }
            }

            setSelectedMessages(newSelection);
        };

        const handleMouseUp = (event: MouseEvent) => {
            if (selectionAnchorXY) {
                const distanceSqr = Vector2.distanceSqr(
                    event,
                    selectionAnchorXY
                )

                if (distanceSqr < SELECT_DELTA_SQR && selectedMessages.size > 0 && selectionAnchorId) {
                    if (selectedMessages.has(selectionAnchorId)) {
                        deselectMessage(selectionAnchorId);
                    } else {
                        selectMessage(selectionAnchorId);
                    }
                }
            }

            setIsSelecting(false);
            setSelectionAnchorId(null);
        };

        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [selectionAnchorXY, isSelecting, selectionAnchorId, messages, selectedMessages, setSelectedMessageId]);

    const navigate = useNavigate();

    const handleClearSelectedMessagesByEscape = useCallback(() => {
        setSelectedMessages(new Set<Message['id']>());
    }, [setSelectedMessages]);

    const handleBackByEscape = useCallback(() => {
        navigate('/');
    }, [navigate])

    useEscape(handleClearSelectedMessagesByEscape, CHAT_CLEAR_SELECTED_MESSAGES_ESCAPE_PRIORITY, selectedMessages.size > 0);
    useEscape(handleBackByEscape, CHAT_BACK_ESCAPE_PRIORITY);

    if (chat === null) {
        return null;
    }

    const chatContextData: ChatContextData = {
        chat: chat,
        isSelecting: isSelecting,
        selectedMessages: selectedMessages,
        setSelectedMessages: setSelectedMessages,
        selectMessage: selectMessage,
        deselectMessage: deselectMessage,
        selectedMessageId: selectedMessageId,
    }

    return (
        <ChatContext.Provider value={chatContextData}>
            <StyledChat>
                <Header>
                    <AnimatedHeader
                        showButtons={selectedMessageCount > 0}
                        chatTitle={chat.title}
                        // chatSubtitle={`${connectionState} ${signalingState} ${iceConnectionState} ${iceGatheringState}`}
                        chatSubtitle={chatState === null ? 'offline' : chatState.type === 'idle' ? 'online' : chatState.type === 'paused' ? 'last seen recently' : 'unknown'}
                        selectedCount={selectedMessageCount}
                    />
                </Header>
                <ChatContent ref={chatContentRef}>
                    {[...messages.values()].map((message) => (
                        <ChatMessage
                            ref={(element) => {
                                if (element) {
                                    messageRefs.current.set(message.id, element);
                                    return;
                                }

                                messageRefs.current.delete(message.id);
                            }}
                            key={message.id}
                            message={message}
                        />
                    ))}
                </ChatContent>
                <ChatFooter>
                    <IconButton icon={IconEnum.ATTACHMENT_LINE} size={22} />
                    <ChatInputContainer>
                        <ChatInput value={chatInput} onInput={handleChatInputChange} onSubmit={handleChatInputSubmit}
                                   placeholder="Write a message..."/>
                    </ChatInputContainer>
                    <IconButton icon={IconEnum.SEND_FILL} size={22} color={chatInput.length > 0 ? theme.accent_text_color : null} />
                </ChatFooter>
            </StyledChat>
            <MessageContextProvider />
        </ChatContext.Provider>
    );
}

const AnimatedHeader: React.FC<{
    showButtons: boolean;
    chatTitle: string;
    chatSubtitle: string;
    selectedCount: number;
}> = ({ showButtons, chatTitle, chatSubtitle, selectedCount }) => {
    const chatContext = useContext(ChatContext);

    const handleDelete = useCallback(() => {
        console.log('handleDelete', selectedCount);

        for (const messageId of chatContext.selectedMessages) {
            messageManager.delete(chatContext.chat.id, messageId)
        }

        chatContext.setSelectedMessages(new Set<Message['id']>());
    }, [chatContext.selectedMessages, chatContext.setSelectedMessages])

    return (
        <SwitcherContainer>
            <InnerContainer style={{ transform: showButtons ? 'translateY(-40px)' : 'translateY(0)' }}>
                <View>
                    <ChatInfo>
                        <Title>{chatTitle}</Title>
                        <Subtitle>{chatSubtitle}</Subtitle>
                    </ChatInfo>
                </View>
                <View>
                    <ButtonGroup>
                        <Button>
                            <ButtonText>FORWARD</ButtonText>
                            <ButtonSecondaryText>{selectedCount}</ButtonSecondaryText>
                        </Button>
                        <Button onClick={handleDelete}>
                            <ButtonText>DELETE</ButtonText>
                            <ButtonSecondaryText>{selectedCount}</ButtonSecondaryText>
                        </Button>
                    </ButtonGroup>
                </View>
            </InnerContainer>
        </SwitcherContainer>
    );
};

const SwitcherContainer = styled.div`
    width: 100%;
    height: 40px;
    overflow: hidden;
    position: relative;
    
    pointer-events: auto;
`;

const InnerContainer = styled.div`
    transition: transform 0.1s ease-in-out;
    position: relative;
`;

const View = styled.div`
    height: 40px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
`;

const StyledChat = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`

const Header = styled.div`
    box-sizing: border-box;

    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;

    width: 100%;
    height: 54px;

    padding: 8px;

    background: ${({theme}) => theme.section_bg_color};
`

const ChatInfo = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: column;
`

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

const ChatContent = styled.div<{ theme: Theme }>`
    flex-grow: 1;
    
    height: 100%;
    
    padding: 10px;
    overflow-y: scroll;

    display: flex;
    flex-direction: column;
`

const ChatFooter = styled.div<{ theme: Theme }>`
    flex-shrink: 0;

    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    gap: 8px;

    padding: 12px 8px;

    background: ${({theme}) => theme.section_bg_color};
`

const ChatInputContainer = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 8px;

    width: 100%;
    height: 100%;
`
