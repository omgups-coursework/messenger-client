'use client'

import styled from "styled-components";
import type {Theme} from "~/common/theme";

export const View = styled.div<{ theme: Theme }>`
    display: flex;
    flex-direction: row;

    width: 100vw;
    height: 100vh;
    
    color: ${({ theme }) => theme.text_color};
    background: ${({ theme }) => theme.bg_color};
`