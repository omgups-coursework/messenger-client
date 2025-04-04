import styled from 'styled-components';
import React from "react";

import {neverTypeGuard} from "~/lib/never.type-guard";

// @ts-ignore
import AttachmentLineSvg from '../assets/icons/attachment_line.svg?react'
// @ts-ignore
import CheckCircleLineSvg from '../assets/icons/check_circle_line.svg?react'
// @ts-ignore
import CheckLineSvg from '../assets/icons/check_line.svg?react'
// @ts-ignore
import ChecksLineSvg from '../assets/icons/checks_line.svg?react'
// @ts-ignore
import CircleLineSvg from '../assets/icons/circle_line.svg?react'
// @ts-ignore
import CloseLineSvg from '../assets/icons/close_line.svg?react'
// @ts-ignore
import HistoryAnticlockwiseLineSvg from '../assets/icons/history_anticlockwise_line.svg?react'
// @ts-ignore
import MenuLineSvg from '../assets/icons/menu_line.svg?react'
// @ts-ignore
import SearchLineSvg from '../assets/icons/search_line.svg?react'
// @ts-ignore
import SendFillSvg from '../assets/icons/send_fill.svg?react'
// @ts-ignore
import CopyLineSvg from '../assets/icons/copy_line.svg?react'
// @ts-ignore
import DeleteLineSvg from '../assets/icons/delete_line.svg?react'
// @ts-ignore
import ForwardLineSvg from '../assets/icons/forward_line.svg?react'

export enum IconEnum {
    ATTACHMENT_LINE = 'ATTACHMENT_LINE',
    CHECK_CIRCLE_LINE = 'CHECK_CIRCLE_LINE',
    CHECK_LINE = 'CHECK_LINE',
    CHECKS_LINE = 'CHECKS_LINE',
    CIRCLE_LINE = 'CIRCLE_LINE',
    CLOSE_LINE = 'CLOSE_LINE',
    COPY_LINE = 'COPY_LINE',
    DELETE_LINE = 'DELETE_LINE',
    FORWARD_LINE = 'FORWARD_LINE',
    HISTORY_ANTICLOCKWISE_LINE = 'HISTORY_ANTICLOCKWISE_LINE',
    MENU_LINE = 'MENU_LINE',
    SEARCH_LINE = 'SEARCH_LINE',
    SEND_FILL = 'SEND_FILL',
}

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    icon: IconEnum;
    size?: string | number;
    color?: string;
}

export const Icon: React.FC<IconProps> = ({ icon, size, color, ...rest }) => {
    const SvgIcon = getIconSvg(icon)

    return (
        <Wrapper size={size} color={color} {...rest}>
            <SvgIcon />
        </Wrapper>
    );
};

const Wrapper = styled.span<{ size?: string | number; color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ size }) => size ? (typeof size === 'number' ? `${size}px` : size) : '1em'};
  color: ${({ color }) => color ? color : 'currentColor'};

  svg {
    width: 1em;
    height: 1em;
    fill: currentColor;
    flex-shrink: 0;
  }
`;

function getIconSvg(icon: IconEnum) {
    switch (icon) {
        case IconEnum.ATTACHMENT_LINE: {
            return AttachmentLineSvg;
        }
        case IconEnum.CHECK_CIRCLE_LINE: {
            return CheckCircleLineSvg;
        }
        case IconEnum.CHECK_LINE: {
            return CheckLineSvg;
        }
        case IconEnum.CHECKS_LINE: {
            return ChecksLineSvg;
        }
        case IconEnum.CIRCLE_LINE: {
            return CircleLineSvg;
        }
        case IconEnum.CLOSE_LINE: {
            return CloseLineSvg;
        }
        case IconEnum.COPY_LINE: {
            return CopyLineSvg;
        }
        case IconEnum.DELETE_LINE: {
            return DeleteLineSvg;
        }
        case IconEnum.FORWARD_LINE: {
            return ForwardLineSvg;
        }
        case IconEnum.HISTORY_ANTICLOCKWISE_LINE: {
            return HistoryAnticlockwiseLineSvg;
        }
        case IconEnum.MENU_LINE: {
            return MenuLineSvg;
        }
        case IconEnum.SEARCH_LINE: {
            return SearchLineSvg;
        }
        case IconEnum.SEND_FILL: {
            return SendFillSvg;
        }
        default: {
            neverTypeGuard(icon);
        }
    }
}