import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import styled from "styled-components";
import type {Theme} from "~/common/theme";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ iconLeft, iconRight, ...props }, ref) => {
        return (
            <Wrapper>
                {iconLeft && <IconWrapper>{iconLeft}</IconWrapper>}
                <StyledInput ref={ref} {...props} />
                {iconRight && <IconWrapper>{iconRight}</IconWrapper>}
            </Wrapper>
        );
    }
);

Input.displayName = "Input";

const Wrapper = styled.div`
    box-sizing: border-box;
    
    width: 100%;
    height: 32px;

    padding: 0 16px;
    border-radius: 32px;
    
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    background-color: ${({theme}) => theme.secondary_bg_color};;
`

const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    
    width: 16px;
    height: 100%;

    path {
        fill: ${({theme}) => theme.hint_color};
    }
`;

const StyledInput = styled.input<{ theme: Theme }>`
    width: 100%;
    height: 100%;

    border: none;
    outline: none;
    background: transparent;

    font-size: 16px;

    color: ${({theme}) => theme.text_color};

    &:focus {
        &::placeholder {
            color: ${({theme}) => theme.secondary_hint_color};
        }
    }
    
    &::placeholder {
        color: ${({theme}) => theme.hint_color};
    }
`
