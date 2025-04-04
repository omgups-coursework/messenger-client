export function findUrlMatches(text: string): { url: string; index: number }[] {
    const matches: { url: string; index: number }[] = [];
    const urlRegex = /https?:\/\/[^\s<>"'`\r\n\u2028\u2029]+/g;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
        let url = match[0];
        let index = match.index;

        const trailingChars = ['.', ',', '!', '?', ')', ']', '}', '»', '"', "'"];
        while (url.length > 0 && trailingChars.includes(url.at(-1)!)) {
            url = url.slice(0, -1);
        }

        matches.push({ url, index });
    }

    return matches;
}