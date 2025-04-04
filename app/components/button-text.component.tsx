import styled from "styled-components";
import type {Theme} from "~/common/theme";

export const ButtonText = styled.span<{ theme: Theme }>`
    color: ${({ theme }) => theme.button_text_color};
`

export const ButtonSecondaryText = styled.span<{ theme: Theme }>`
    color: ${({ theme }) => theme.button_text_secondary_color};
    font-weight: normal;
`
