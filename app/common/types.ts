export interface MessageBase {
    id: string;
    chatId: string;
    timestamp: number;
    textMessage?: TextMessage;
    extendedTextMessage?: ExtendedTextMessage;
}

export interface IncomingMessage extends MessageBase {
    fromMe: false;
    senderId: string;
    readTimestamp: number | null;
}

export enum OutgoingMessageStatusEnum {
    FAILED = -1,
    CLOCK = 0,
    SENT = 1,
    RECEIVED = 2,
    READ = 3,
}

export interface OutgoingMessage extends MessageBase {
    fromMe: true;
    status: OutgoingMessageStatusEnum;
    readTimestamp: number | null;
}

export type Message = IncomingMessage | OutgoingMessage;

export interface TextMessage {
    text: string;
}

export interface ExtendedTextMessage {
    text: string;
    url: string;
    title: string;
    description: string;
    jpegThumbnail: string;
}

export interface ChatPreview {
    id: Chat["id"];
    title: string;
    message: Message | null;

    upsertTimestamp: number;
}

export interface Chat {
    id: string;
    title: string;
    photo: ChatPhoto;
    version: number;
}

export type ChatPhoto = ChatPhotoEmpty | ChatPhotoAvatar

export interface ChatPhotoEmpty {
    type: 'empty';
}

export interface ChatPhotoAvatar {
    type: 'avatar';
    url: string;
}