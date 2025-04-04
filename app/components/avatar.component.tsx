import React, {useCallback, useMemo, useState} from "react";
import styled, {css} from "styled-components";
import type {Theme} from "~/common/theme";
import {darkenHex} from "~/lib/color/darken-hex.util";

export enum AvatarSize {
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE",
}

export interface AvatarProps {
    size: AvatarSize;

    src?: string;

    text?: string;
    textColor?: string;

    $backgroundColor?: string;
    gradient?: boolean;
}

export const Avatar: React.FC<AvatarProps> = (props) => {
    const [showImage, setShowImage] = useState<boolean>(props.src != null);

    const toggleShowImage = useCallback(() => {
        setShowImage((value) => !value);
    }, [])

    return (
        <StyledAvatar size={props.size} background={props.$backgroundColor} gradient={props.gradient}>
            <AvatarText size={props.size}>{props.text}</AvatarText>
            {showImage && <AvatarImage src={props.src} onError={toggleShowImage}/>}
        </StyledAvatar>
    )
}

const StyledAvatar = styled.div<{ size: AvatarSize; background?: string; gradient?: boolean }>`
    pointer-events: none;
    user-select: none;
    
    position: relative;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    overflow: hidden;

    ${({ background, gradient }) => {
        if (background) {
            if (gradient) {
                const bottomColor = darkenHex(background, 0.5)

                return css`
                    background: linear-gradient(to top, ${bottomColor}, ${background});
                `
            }
            
            return css`
                background: ${background};
            `
        }

        return css`
            background: ${({theme}) => theme.secondary_bg_color};
        `
    }}

    ${(props) => {
        switch (props.size) {
            case AvatarSize.SMALL: {
                return css`
                    min-width: 42px;
                    max-width: 42px;
                    width: 42px;

                    min-height: 42px;
                    max-height: 42px;
                    height: 42px;
                `
            }
            case AvatarSize.MEDIUM: {
                return css`
                    min-width: 54px;
                    max-width: 54px;
                    width: 54px;

                    min-height: 54px;
                    max-height: 54px;
                    height: 54px;
                `
            }
            case AvatarSize.LARGE: {
                return css`
                    min-width: 120px;
                    max-width: 120px;
                    width: 120px;

                    min-height: 120px;
                    max-height: 120px;
                    height: 120px;
                `
            }
        }

    }}

    min-width: ${({size}) => size}px;
    max-width: ${({size}) => size}px;
    min-height: ${({size}) => size}px;
    max-height: ${({size}) => size}px;

    border-radius: 100%;

    color: ${({theme}) => theme.text_color};
`

const AvatarImage = styled.img<{ theme: Theme }>`
    position: absolute;
    
    width: 100%;
    height: 100%;
    object-fit: cover;
`

const AvatarText = styled.div<{ theme: Theme; size: AvatarSize; textColor?: string }>`
    position: absolute;
    
    ${({size}) => {

        switch (size) {
            case AvatarSize.SMALL: {
                return css`
                    font-size: 1rem;
                `
            }
            case AvatarSize.MEDIUM: {
                return css`
                    font-size: 2rem;
                `
            }
            case AvatarSize.LARGE: {
                return css`
                    font-size: 4rem;
                `
            }
        }

    }}

    color: ${({theme, textColor}) => textColor ? textColor : theme.text_color};
`