import React from "react"

import Prism from "prismjs"
import "prismjs/themes/prism-tomorrow.min.css"
import "prismjs/plugins/autoloader/prism-autoloader"
import styled from "styled-components";
import type {Theme} from "~/common/theme";
import {findUrlMatches} from "~/lib/url/find-url-matches";

(Prism as any).plugins.autoloader.languages_path = "/prism-langs/"

export function renderText(text: string): React.ReactNode[] {
    const result: React.ReactNode[] = []

    const blockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = blockRegex.exec(text)) !== null) {
        const [full, lang, code] = match
        const index = match.index

        const before = text.slice(lastIndex, index)
        result.push(...renderInlineAndLinks(before))

        const language = lang.toLowerCase()
        const grammar = Prism.languages[language] || Prism.languages.plain
        const highlighted = Prism.highlight(code.trim(), grammar, language)

        result.push(
            <pre
                key={`block-${index}`}
                style={{
                    background: "#1e1e1e",
                    color: "#dcdcdc",
                    padding: "12px",
                    borderRadius: "8px",
                    overflowX: "auto",
                    fontSize: "12px",
                }}
            >
                <code
                    className={`language-${language}`}
                    dangerouslySetInnerHTML={{__html: highlighted}}
                />
            </pre>
        )

        lastIndex = index + full.length
    }

    const remaining = text.slice(lastIndex)
    result.push(...renderInlineAndLinks(remaining))

    return result
}

function renderInlineAndLinks(text: string): React.ReactNode[] {
    const result: React.ReactNode[] = []
    const inlineCodeRegex = /(`[^`]+`)/g
    const parts = text.split(inlineCodeRegex)

    parts.forEach((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
            result.push(
                <code key={`inline-${i}`} style={{
                    background: "#f0f0f0",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    wordBreak: "break-word"
                }}>
                    {part.slice(1, -1)}
                </code>
            )
        } else {
            result.push(...renderLinks(part, `text-${i}`))
        }
    })

    return result
}

export function renderLinks(text: string, keyPrefix: string): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    const matches = findUrlMatches(text);

    matches.forEach((match, i) => {
        const { url, index } = match;

        if (lastIndex < index) {
            const chunk = text.slice(lastIndex, index);
            result.push(...renderTextWithLineBreaks(chunk, `${keyPrefix}-chunk-${i}`));
        }

        result.push(
            <Link
                key={`${keyPrefix}-link-${i}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
            >
                {url}
            </Link>
        );

        lastIndex = index + url.length;
    });

    if (lastIndex < text.length) {
        const remaining = text.slice(lastIndex);
        result.push(...renderTextWithLineBreaks(remaining, `${keyPrefix}-end`));
    }

    return result;
}

function renderTextWithLineBreaks(text: string, keyPrefix: string): React.ReactNode[] {
    const lines = text.split('\n');
    return lines.flatMap((line, i) => {
        const nodes: React.ReactNode[] = [<React.Fragment key={`${keyPrefix}-line-${i}`}>{line}</React.Fragment>];
        if (i < lines.length - 1) {
            nodes.push(<br key={`${keyPrefix}-br-${i}`} />);
        }
        return nodes;
    });
}

const Link = styled.a<{ theme: Theme }>`
    color: ${({ theme }) => theme.link_color};

    text-decoration: none;
    word-break: break-word;
    
    &:hover {
        text-decoration: underline;
    }
`