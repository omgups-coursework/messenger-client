import React, {
    type ReactNode,
    type TextareaHTMLAttributes,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent, useCallback
} from "react";
import styled from "styled-components";

interface ChatInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    onSubmit?: () => void;
}

const StyledTextarea = styled.textarea<{ height: number }>`
    box-sizing: border-box;
    outline: none;
    background: transparent;
    border: none;
    padding: 0;

    width: 100%;
    height: ${({height}) => height}px;
    min-height: 0;
    max-height: 200px;

    resize: none;
    overflow-y: auto;

    font-size: 16px;
    font-weight: lighter;

    color: ${({theme}) => theme.text_color};

    &:focus {
        &::placeholder {
            color: ${({theme}) => theme.secondary_hint_color};
        }
    }

    &::placeholder {
        color: ${({theme}) => theme.hint_color};
    }

    &::-webkit-scrollbar {
        display: none;
    }
`;

export const ChatInput: React.FC<ChatInputProps> = (props) => {
    const {
        value,
        onKeyDown,
        onSubmit,
        ...commonProps
    } = props;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [height, setHeight] = useState<number>(0);

    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = '0px';
            el.style.height = el.scrollHeight + 'px';
            setHeight(el.scrollHeight);
        }
    }, [value]);

    useEffect(() => {
        if (textareaRef.current) {
            setHeight(textareaRef.current.scrollHeight);
        }
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.();
        } else {
            onKeyDown?.(e);
        }
    }, [onSubmit, onKeyDown]);

    return (
        <StyledTextarea
            ref={textareaRef}
            value={value}
            height={height}
            rows={1}
            onKeyDown={handleKeyDown}
            {...commonProps}
        />
    );
};
