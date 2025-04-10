import React, {forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Portal} from "~/components/portal.component";
import styled from "styled-components";
import type {Message} from "~/common/types";
import {messageManager} from "~/managers/message.manager";
import {ChatContext} from "~/routes/messenger/chats/chat/context/chat.context";
import type {Theme} from "~/common/theme";
import {Icon, IconEnum} from "~/components/icon.component";
import {useEscape} from "~/hooks/use-escape";
import {CHAT_CLOSE_CONTEXT_MENU_ESCAPE_PRIORITY} from "~/common/escpae-priority";

interface MessageContextProviderProps {}

export const MessageContextProvider: React.FC<MessageContextProviderProps> = () => {
    const chatContext = useContext(ChatContext);

    const menuRef = useRef<HTMLDivElement | null>(null);
    const [contextMenuData, setContextMenuData] = useState<Message | null>(null);

    useEffect(() => {
        if (menuRef.current === null) {
            return;
        }

        const handleMousedown = (event: MouseEvent) => {
            if (event.target == null) {
                return;
            }

            const target = event.target as HTMLDivElement;

            if (menuRef.current!.contains(target)) {
                return;
            }

            setContextMenuData(null);
        };

        const handleClick = (event: MouseEvent) => {
            switch (event.button) {
                case 0: {
                    if (event.target == null) {
                        return;
                    }

                    const target = event.target as HTMLDivElement;

                    if (menuRef.current!.contains(target)) {
                        return;
                    }

                    setContextMenuData(null);

                    break;
                }
                case 2: {
                    const target = event.target as HTMLDivElement;

                    if (target == null) {
                        return;
                    }

                    const parent = target.closest('[data-chat-id][data-message-id]') as HTMLElement | null;

                    if (parent == null) {
                        return;
                    }

                    const messageId = parent.dataset.messageId as string | undefined;

                    if (messageId == null) {
                        return;
                    }

                    const message = messageManager.get(chatContext.chat.id, messageId);

                    if (message == null) {
                        return;
                    }

                    menuRef.current!.style.left = `${event.clientX}px`;
                    menuRef.current!.style.top = `${event.clientY}px`;

                    setContextMenuData(message);

                    break;
                }
            }
        };

        const handleContextmenu = (event: MouseEvent) => {
            event.preventDefault()
        }

        document.addEventListener('contextmenu', handleContextmenu);
        document.addEventListener('mousedown', handleMousedown);
        document.addEventListener('contextmenu', handleClick);

        return () => {
            document.removeEventListener('contextmenu', handleContextmenu);
            document.removeEventListener('mousedown', handleMousedown);
            document.removeEventListener('contextmenu', handleClick);
        };
    }, [chatContext.chat.id, menuRef]);

    const items = useMemo(() => {
        const items: { icon: IconEnum; onClick: () => void; text: string; }[] = []

        if (chatContext.selectedMessageId != null) {
            const isSelected = chatContext.selectedMessages.has(chatContext.selectedMessageId);

            if (isSelected) {
                items.push({
                    text: 'Copy selected as text',
                    icon: IconEnum.COPY_LINE,
                    onClick: () => {
                        setContextMenuData(null);
                        chatContext.setSelectedMessages(new Set<Message['id']>());
                    },
                });

                items.push({
                    text: 'Forward selected',
                    icon: IconEnum.FORWARD_LINE,
                    onClick: () => {
                        setContextMenuData(null);
                        chatContext.setSelectedMessages(new Set<Message['id']>());
                    },
                });

                items.push({
                    text: 'Delete selected',
                    icon: IconEnum.DELETE_LINE,
                    onClick: () => {
                        for (const messageId of chatContext.selectedMessages) {
                            messageManager.delete(chatContext.chat.id, messageId)
                        }

                        setContextMenuData(null);
                        chatContext.setSelectedMessages(new Set<Message['id']>());
                    },
                });

                items.push({
                    text: 'Clear selection',
                    icon: IconEnum.CHECK_CIRCLE_LINE,
                    onClick: () => {
                        setContextMenuData(null);
                        chatContext.setSelectedMessages(new Set<Message['id']>());
                    },
                });
            }
            else {
                items.push({
                    text: 'Select',
                    icon: IconEnum.CHECK_CIRCLE_LINE,
                    onClick: () => {
                        setContextMenuData(null);
                        chatContext.selectMessage(chatContext.selectedMessageId!)
                    },
                });
            }
        }

        return items;
    }, [chatContext])

    const handleCloseByEscape = useCallback(() => {
        setContextMenuData(null);
    }, [setContextMenuData])

    useEscape(handleCloseByEscape, CHAT_CLOSE_CONTEXT_MENU_ESCAPE_PRIORITY, contextMenuData !== null);

    return (
        <Portal>
            <Context ref={menuRef} show={!!contextMenuData}>
                <StyledItemContext>
                    {items.map((item) => (
                        <ContextMenuItem key={item.text} text={item.text} icon={item.icon} onClick={item.onClick} />
                    ))}
                </StyledItemContext>
            </Context>
        </Portal>
    );
};

interface ContextProps {
    show: boolean;
}

const Context = forwardRef<HTMLDivElement, React.PropsWithChildren<ContextProps>>((props, ref) => {
    return (
        <StyledContext
            ref={ref as React.RefObject<HTMLDivElement>}
            style={{
                opacity: props.show ? 1 : 0,
                pointerEvents: props.show ? 'all' : 'none',
            }}
        >
            {props.children}
        </StyledContext>
    );
});

export const StyledContext = styled.div`
  z-index: 1000;

  position: fixed;
  top: 0;
  left: 0;
`;

const StyledItemContext = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    background: ${({ theme }) => theme.context_menu_bg_color};
    padding: 8px 0;
    
    min-width: 140px;
    
    box-shadow:
        0 4px 4px rgba(0, 0, 0, 0.25),
        0 4px 10px rgba(0, 0, 0, 0.25);
    
    border-radius: 4px;
`;

interface ContextMenuItemProps {
    icon: IconEnum;
    text: string;
    onClick: () => void;
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = (props) => {
    return (
        <StyledContextMenuItem onClick={props.onClick}>
            <Icon icon={props.icon} size={18} />
            <ContextMenuItemText>{props.text}</ContextMenuItemText>
        </StyledContextMenuItem>
    )
}

const StyledContextMenuItem = styled.div`
    user-select: none;
    
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 8px;

    font-weight: normal;
    font-size: 14px;
    
    padding: 8px 8px;

    color: ${({ theme }) => theme.button_text_secondary_color};

    &:hover {
        cursor: pointer;
        color: ${({ theme }) => theme.button_text_color};
        background: ${({ theme }) => theme.preview_message_bg_color};
    }
`;

const ContextMenuItemText = styled.span``
