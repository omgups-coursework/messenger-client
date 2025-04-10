import {Resolvable} from "~/lib/promise/resolvable";
import {EventListenerBase, type EventListenerListeners} from "~/helpers/event-listener-base";
import type {Chat, Message} from "~/common/types";
import {messageManager} from "~/managers/message.manager";
import {messengerSignaling} from "~/connection/messenger-signaling";

interface HandshakeData {
    publicKey: ArrayBuffer; // 32-byte curve key
}

interface MessageData {
    messageId: Message['id'];
    enc: ArrayBuffer;
}

interface PendingMessage {
    id: string;
    resolvable: Resolvable<any>;
}

export type ChatStateData = { type: 'idle' } | { type: 'composing'; } | { type: 'paused'; timestamp: number; };

export interface ConnectionEventListenerListeners extends EventListenerListeners {
    'open': () => void;
    'close': () => void;
    'closing': () => void;
    'handshake': (data: HandshakeData) => void;
    'incoming_message': (data: MessageData) => void;
    'chat_state': (data: ChatStateData) => void;

    'connection_state_change': (data: RTCPeerConnectionState) => void;
    'ice_connection_state_change': (data: RTCIceConnectionState) => void;
    'ice_gathering_state_change': (data: RTCIceGatheringState) => void;
    'ice_signaling_state_change': (data: RTCSignalingState) => void;
}

const CONNECTION_TIMEOUT_MS = 60_000;
const CONNECTION_PING_INTERVAL = 15_000;

export class Connection extends EventListenerBase<ConnectionEventListenerListeners> {
    private rtcDataChannel: RTCDataChannel | null = null;
    private openResolvable = new Resolvable<void>();

    private pingMessageId: PendingMessage['id'] | null = null;
    private pending = new Map<PendingMessage['id'], PendingMessage>();
    private pingIntervalId: NodeJS.Timeout | null = null;

    private chatState: ChatStateData = {type: 'paused', timestamp: Date.now()};

    private connectionTimeoutId: NodeJS.Timeout | null = null;

    public constructor(
        public readonly chatId: Chat['id'],
        public readonly rtcPeerConnection: RTCPeerConnection,
    ) {
        super(false);

        rtcPeerConnection.onconnectionstatechange = (ev: Event) => {
            this.dispatchEvent('connection_state_change', rtcPeerConnection.connectionState)
        }

        rtcPeerConnection.oniceconnectionstatechange = (ev: Event) => {
            this.dispatchEvent('ice_connection_state_change', rtcPeerConnection.iceConnectionState)
        }

        rtcPeerConnection.onicegatheringstatechange = (ev: Event) => {
            this.dispatchEvent('ice_gathering_state_change', rtcPeerConnection.iceGatheringState)

        }

        rtcPeerConnection.onsignalingstatechange = (ev: Event) => {
            this.dispatchEvent('ice_signaling_state_change', rtcPeerConnection.signalingState)
        }

        rtcPeerConnection.ondatachannel = (event) => {
            event.channel.onopen = this.onOpen;
            event.channel.onclose = this.onClose;
            event.channel.onclosing = this.onClosing;
            event.channel.onerror = this.onError;
            event.channel.onmessage = this.onMessage;

            this.rtcDataChannel = event.channel;
        }

        rtcPeerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate != null) {
                messengerSignaling.relayIce({
                    chatId: chatId,
                    iceCandidate: event.candidate,
                });
            }
        }

        rtcPeerConnection.onicecandidateerror = (ev: RTCPeerConnectionIceErrorEvent) => {
        }

        rtcPeerConnection.onnegotiationneeded = (ev: Event) => {
        }

        rtcPeerConnection.ontrack = (ev: RTCTrackEvent) => {
        }
    }

    public setup() {
        const rtcDataChannel = this.rtcPeerConnection.createDataChannel("chat");
        rtcDataChannel.onopen = this.onOpen;
        rtcDataChannel.onclose = this.onClose;
        rtcDataChannel.onclosing = this.onClosing;
        rtcDataChannel.onerror = this.onError;
        rtcDataChannel.onmessage = this.onMessage;
        this.rtcDataChannel = rtcDataChannel;
    }

    public waitOpen(): Promise<void> {
        return this.openResolvable.promise;
    }

    public isOpen(): boolean {
        return this.rtcDataChannel?.readyState === 'open'
    }

    public close() {
        const rtcDataChannel = this.assertGetRtcDataChannel();
        rtcDataChannel.close();
        this.rtcPeerConnection.close();
    }

    public async sendPendingMessage(message: any & { id: string }): Promise<void> {
        const resolvable = new Resolvable<any>();

        this.pending.set(message.id, {
            id: message.id,
            resolvable: resolvable,
        });

        this.sendRawMessage(message);
    }

    public getChatState(): Readonly<ChatStateData> {
        return this.chatState;
    }

    public startPingLoop(): void {
        if (this.pingIntervalId !== null) {
            return;
        }

        this.pingIntervalId = setInterval(() => {
            this.sendPing();
        }, CONNECTION_PING_INTERVAL);
    }

    public stopPingLoop(): void {
        if (this.pingIntervalId === null) {
            return;
        }

        clearInterval(this.pingIntervalId);
        this.pingIntervalId = null;
    }

    public setChatState(chatState: ChatStateData) {
        this.sendRawMessage({
            chatState: chatState,
        });
    }

    public sendRead(chatId: Chat['id'], messageId: Message['id'], timestamp: number): void {
        this.sendRawMessage({
            read: {
                chatId: chatId,
                messageId: messageId,
                timestamp: timestamp,
            }
        })
    }

    public deleteMessage(messageId: Message['id']): void {
        this.sendRawMessage({
            deleteMessage: {
                messageId: messageId,
            }
        })
    }

    private async sendPing(): Promise<void> {
        if (this.pingMessageId !== null) {
            return;
        }

        const timestamp = Date.now();
        const pingMessageId = timestamp.toString();
        this.pingMessageId = pingMessageId;

        console.log('send ping ->')

        await this.sendPendingMessage({
            id: pingMessageId,
            ping: {
                timestamp: timestamp,
            }
        });

        console.log('handle pong <-')

        this.pingMessageId = null;
    }

    private sendPong(pingMessageId: string): void {
        const timestamp = Date.now();

        this.sendRawMessage({
            id: pingMessageId,
            pong: {
                timestamp: timestamp,
            }
        });

        this.scheduleConnectionTimeout();
    }

    private clearConnectionTimeout() {
        if (this.connectionTimeoutId !== null) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
        }
    }

    private scheduleConnectionTimeout() {
        this.clearConnectionTimeout();

        this.connectionTimeoutId = setTimeout(() => {
            this.close();
        }, CONNECTION_TIMEOUT_MS);
    }

    private onOpen = (event: Event): void => {
        this.openResolvable.resolve();
        this.dispatchEvent('open');

        this.scheduleConnectionTimeout();
    }

    private onClose = (event: Event): void => {
        this.dispatchEvent('close');
    }

    private onClosing = (event: Event): void => {
        this.dispatchEvent('closing');
        console.log(`[closing]:`, event);

        this.stopPingLoop();
    }

    private onError = (event: RTCErrorEvent): void => {
        console.log(`[onError]:`, event);
    }

    private onMessage = (event: MessageEvent): void => {
        let payload;

        try {
            const decoder = new TextDecoder("utf-8");
            const jsonString = decoder.decode(event.data);
            payload = JSON.parse(jsonString);
        } catch (error) {
            console.error("Failed to parse p2p message", error);
            return;
        }

        if (payload.id) {
            const pendingMessage = this.pending.get(payload.id);

            if (pendingMessage) {
                this.pending.delete(payload.id);

                pendingMessage.resolvable.resolve(payload);
                return;
            }
        }

        if (payload.ping) {
            this.sendPong(payload.id);
            return;
        }

        if (payload.message) {
            messageManager.add({
                ...payload.message,
                chatId: this.chatId,
                fromMe: false,
                senderId: payload.message.chatId,
                readTimestamp: null,
            });

            this.sendRawMessage({
                id: payload.id,
            })

            return;
        }

        if (payload.deleteMessage) {
            const messageId = payload.deleteMessage.messageId;
            messageManager.delete(this.chatId, messageId, false);
            return;
        }

        if (payload.chatState) {
            this.chatState = payload.chatState;
            this.dispatchEvent('chat_state', this.chatState);

            return;
        }

        if (payload.read) {
            const message = messageManager.get(payload.read.chatId, payload.read.messageId);

            if (message) {
                message.readTimestamp = payload.read.timestamp;

                messageManager.update(message);
            }
        }
    }

    private sendRawMessage(message: any): void {
        const jsonString = JSON.stringify(message);
        const encoder = new TextEncoder();
        const arrayBuffer = encoder.encode(jsonString);

        const rtcDataChannel = this.assertGetRtcDataChannel();
        rtcDataChannel.send(arrayBuffer)
    }

    private assertGetRtcDataChannel(): RTCDataChannel {
        if (this.rtcDataChannel !== null) {
            return this.rtcDataChannel;
        }

        throw new Error('assertGetRtcDataChannel');
    }
}