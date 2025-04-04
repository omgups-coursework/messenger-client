import React, {forwardRef, type ButtonHTMLAttributes, type ReactNode} from "react";
import styled, {css} from "styled-components";
import {Icon, type IconEnum} from "~/components/icon.component";
import type {Theme} from "~/common/theme";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
}

export const Button = forwardRef<HTMLButtonElement, React.PropsWithChildren<ButtonProps>>(
    ({ children, ...props }, ref) => {
        return (
            <StyledButton ref={ref} {...props}>
                {children}
            </StyledButton>
        );
    }
);

Button.displayName = "Button";

const StyledButton = styled.button<{ theme: Theme }>`
    border: none;
    background: transparent;
    
    position: relative;
    box-sizing: border-box;
    
    user-select: none;

    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;

    border-radius: 8px;
    padding: 12px 18px;

    font-size: 12px;
    font-weight: bold;
    
    color: ${({ theme }) => theme.button_text_color};
    background: ${({ theme }) => theme.button_bg_color};
    
    &:hover {
        cursor: pointer;

        background: ${({ theme }) => theme.button_hint_bg_color};
    }
`

