import React, {type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import styled from "styled-components";
import type {Theme} from "~/common/theme";
import {Input} from "~/components/input.component";
import {IconButton} from "~/components/icon-button.component";
import {DRAGGABLE_CORNER_Z_INDEX} from "~/common/z-index";
import {useChatsPreview} from "~/hooks/use-chats-preview.hook";
import {ChatList} from "~/routes/messenger/chat-list";
import {Icon, IconEnum} from "~/components/icon.component";
import {useEscape} from "~/hooks/use-escape";
import {NAVIGATION_CLEAR_FOCUSED_INPUT_ESCAPE_PRIORITY} from "~/common/escpae-priority";
import type {ChatPreview} from "~/common/types";

export const Navigation: React.FC = () => {
    const {chatsPreview} = useChatsPreview();
    const chatsPreviewArray = useMemo(() => {
        const items: ChatPreview[] = [];

        for (const item of chatsPreview.values()) {
            items.push(item);
        }

        items.sort((a, b) => b.message ? a.message ? b.message.timestamp - a.message.timestamp : -1 : -1);

        return items;
    }, [chatsPreview]);
    const [filteredChatsPreview, setFilteredChatsPreview] = useState(chatsPreviewArray);


    const inputRef = useRef<HTMLInputElement>(null);
    const [searchValue, setSearchValue] = useState<string>("");
    const [inputFocused, setInputFocused] = useState<boolean>(false);

    useEffect(() => {
        if (searchValue.length > 0) {
            return;
        }

        setFilteredChatsPreview(chatsPreviewArray);
    }, [chatsPreviewArray, searchValue]);

    useEffect(() => {
        if (inputFocused) {
            if (searchValue.length < 1) {
                setFilteredChatsPreview([]);
                return;
            }

            const filtered = chatsPreviewArray.filter(user => user.title.toLowerCase().includes(searchValue.toLowerCase()));

            setFilteredChatsPreview(filtered);

            return;
        }

        setFilteredChatsPreview(chatsPreviewArray);
    }, [searchValue, inputFocused]);

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.currentTarget.value);

    }, []);

    const handleInputFocused = useCallback(() => {
        setInputFocused(true);
    }, []);

    const handleInputBlur = useCallback(() => {
        if (searchValue.length > 0) {
            return;
        }

        setInputFocused(false);
    }, [searchValue]);

    const handleClearInput = useCallback(() => {
        if (inputRef.current == null) {
            return;
        }

        inputRef.current.blur();
        setSearchValue('');
        setInputFocused(false);
        setFilteredChatsPreview(chatsPreviewArray);
    }, [inputRef]);

    useEscape(handleClearInput, NAVIGATION_CLEAR_FOCUSED_INPUT_ESCAPE_PRIORITY, inputFocused);

    useEffect(() => {
        if (inputRef.current == null) {
            return;
        }

        if (!inputFocused) {
            return;
        }

        const handleKeypress = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'Backspace': {
                    if (searchValue.length < 1) {
                        handleClearInput();
                    }

                    break
                }
            }
        }

        inputRef.current.addEventListener("keydown", handleKeypress);

        return () => {
            if (inputRef.current) {
                inputRef.current.removeEventListener("keydown", handleKeypress);
            }
        }

    }, [inputRef, inputFocused, searchValue, handleClearInput]);

    ///////////////////////
    const containerRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    const pointer = useRef({x: 0, y: 0});
    const frame = useRef<number | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            pointer.current = {x: e.clientX, y: e.clientY};
        };

        const handleMouseUp = () => {
            isDragging.current = false;

            document.body.classList.remove('resizing');

            if (frame.current) {
                cancelAnimationFrame(frame.current);
                frame.current = null;
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (frame.current) cancelAnimationFrame(frame.current);
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current || !boxRef.current) return;

        document.body.classList.add('resizing');

        startX.current = e.clientX;
        startWidth.current = containerRef.current.getBoundingClientRect().width;
        isDragging.current = true;

        if (!frame.current) {
            frame.current = requestAnimationFrame(function update() {
                if (isDragging.current && containerRef.current) {
                    const delta = pointer.current.x - startX.current;
                    const newWidth = Math.max(250, startWidth.current + delta);
                    containerRef.current.style.minWidth = `${newWidth}px`;
                    frame.current = requestAnimationFrame(update);
                }
            });
        }
    }, []);

    return (
        <StyledNavigation ref={containerRef}>
            <DraggableCorner ref={boxRef} onMouseDown={handleMouseDown} className="resizer"/>
            <Header>
                <IconButton icon={IconEnum.MENU_LINE} size={24} />
                <Input
                    ref={inputRef}
                    value={searchValue}
                    placeholder={'Поиск'}
                    iconRight={inputFocused ? <IconButton icon={IconEnum.CLOSE_LINE} onClick={handleClearInput}/> : null}
                    onFocus={handleInputFocused}
                    onBlur={handleInputBlur}
                    onChange={handleInputChange}
                />
            </Header>
            {filteredChatsPreview.length > 0 ?
                <ChatList list={filteredChatsPreview} />
                :
                <EmptyChatList>
                    <Icon icon={IconEnum.SEARCH_LINE} size={48} />
                    Результатов поиска нет
                </EmptyChatList>
            }
        </StyledNavigation>
    )
}

const StyledNavigation = styled.nav<{ theme: Theme }>`
    position: relative;

    display: flex;
    flex-direction: column;

    width: 250px;
    min-width: 250px;
    max-width: 70vw;

    background: ${({theme}) => theme.section_bg_color};
`

const DraggableCorner = styled.div`
    position: absolute;
    top: 0;
    right: 0;

    width: 10px;
    height: 100%;

    z-index: ${DRAGGABLE_CORNER_Z_INDEX};

    &:hover {
        cursor: w-resize;
    }
`

const Header = styled.div<{ theme: Theme }>`
    box-sizing: border-box;
    padding: 8px 8px;
    
    display: flex;
    justify-content: center;
    align-items: center;
    
    height: 52px;
`

const EmptyChatList = styled.div`
    user-select: none;

    flex: 1;

    overflow: hidden;
    overflow-y: auto;

    padding: 0 16px;

    display: flex;
    justify-content: center;
    align-items: center;

    flex-direction: column;
    gap: 16px;

    text-align: center;

    color: ${({theme}) => theme.secondary_hint_color};
`