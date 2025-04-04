import React, {forwardRef, type ButtonHTMLAttributes, type ReactNode} from "react";
import styled, {css} from "styled-components";
import {Icon, type IconEnum} from "~/components/icon.component";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconEnum;
    size?: number | string;
    color?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({icon, size, color, ...props}, ref) => {
        return (
            <StyledIconButton ref={ref} color={color} {...props}>
                {icon && <Icon icon={icon} size={size} color={color} />}
            </StyledIconButton>
        );
    }
);

IconButton.displayName = "IconButton";

const StyledIconButton = styled.button<{ color?: string }>`
    border: none;
    background: transparent;
    
    position: relative;
    
    box-sizing: border-box;

    border-radius: 32px;

    display: flex;
    justify-content: center;
    align-items: center;
    
    &:hover {
        cursor: pointer;
    }
    
    ${({ theme, color }) => !color && css`
        color: ${theme.hint_color};

        &:hover {
            color: ${theme.text_color};
        }
    `}
`

