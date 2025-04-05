import type {EventListenerListeners} from "~/helpers/event-listener-base";
import type {Chat, Message} from "~/common/types";
import {EventListenerBase} from "~/helpers/event-listener-base";
import {Resolvable} from "~/lib/promise/resolvable";
import {TransactionManager} from "~/lib/thread/transaction-manager";
import {messageManager} from "~/managers/message.manager";


interface AddPeerData {
    chatId: Chat['id'];
    createOffer: boolean;
}
interface RemovePeerData {
    chatId: Chat['id'];
}

interface SessionDescriptionData {
    chatId: Chat['id'];
    sessionDescription: RTCSessionDescriptionInit;
}

interface IceCandidateData {
    chatId: Chat['id'];
    iceCandidate: RTCIceCandidateInit;
}

interface RelayIceCandidateData {
    chatId: Chat['id'];
    iceCandidate: RTCIceCandidate;
}

interface RelaySdpDAta {
    chatId: Chat['id'];
    sessionDescription: RTCSessionDescriptionInit;
}

export interface ConnectionManagerEventListenerListeners extends EventListenerListeners {
    'session_description': (data: SessionDescriptionData) => void;
    'ice_candidate': (data: IceCandidateData) => void;
}

type SignalingState = { type: 'closed' } | { type: 'open'; userId: string; socket: WebSocket };

export const SIGNALING_SERVER = 'signaling@messenger.net'

export interface SocketMessage<T = any> {
    from: Chat['id'];
    to: Chat['id'];
    payload: T;
}

export class MessengerSignaling extends EventListenerBase<ConnectionManagerEventListenerListeners> {
    private state: SignalingState = { type: 'closed' };

    public constructor() {
        super(true);
    }

    public open(userId: string, wsUrl: string): void {
        const socket = new WebSocket(wsUrl);
        socket.binaryType = 'arraybuffer';
        socket.onopen = this.onSocketOpen;
        socket.onmessage = this.onSocketMessage;
        socket.onerror = this.onSocketError;
        socket.onclose = this.onSocketClose;

        this.state = {
            type: 'open',
            userId: userId,
            socket: socket,
        }
    }

    public assertGetOpenState() {
        if (this.state.type !== 'open') {
            throw new Error('assertGetOpenState');
        }

        return this.state;
    }

    private onSocketOpen = (event: Event): void => {
        const payload = {
            handshake: {
                clientPayload: {}
            }
        }

        this.sendRawTo(SIGNALING_SERVER, payload);
    };

    private onSocketMessage = (event: MessageEvent): void => {
        const state = this.assertGetOpenState();

        let message: SocketMessage;

        try {
            const decoder = new TextDecoder("utf-8");
            const jsonString = decoder.decode(event.data);
            message = JSON.parse(jsonString);
        } catch (error) {
            console.error("Failed to parse signaling message", error);
            return;
        }

        console.log("Received message:", message);

        if (message.to !== state.userId) {
            console.error('Received from unknown');
            return;
        }

        if (message.payload.sessionDescription) {
            this.dispatchEvent('session_description', {
                chatId: message.from,
                sessionDescription: message.payload.sessionDescription,
            });

            return;
        }

        if (message.payload.iceCandidate) {
            this.dispatchEvent('ice_candidate', {
                chatId: message.from,
                iceCandidate: message.payload.iceCandidate,
            });

            return;
        }
    };

    private onSocketError = (event: Event): void => {
        console.error("Signaling socket error", event);
    };

    private onSocketClose = (event: CloseEvent): void => {
        console.log("Signaling socket closed", event);
    };

    public sendRawTo(to: Chat['id'], payload: any) {
        const state = this.assertGetOpenState();

        const socketMessage: SocketMessage = {
            from: state.userId,
            to: to,
            payload: payload,
        }

        const jsonString = JSON.stringify(socketMessage);
        const encoder = new TextEncoder();
        const arrayBuffer = encoder.encode(jsonString);

        state.socket.send(arrayBuffer);
    }

    public relaySdp(data: RelaySdpDAta): void {
        this.sendRawTo(data.chatId, {
            sessionDescription: data.sessionDescription,
        });
    }

    public relayIce(data: RelayIceCandidateData): void {
        this.sendRawTo(data.chatId, {
            iceCandidate: data.iceCandidate,
        });
    }
}

export const messengerSignaling = new MessengerSignaling();

export interface ChatConnectionManagerEventListenerListeners extends EventListenerListeners {
    'upsert': (data: Connection[]) => void;
}

export class ChatConnectionManager extends EventListenerBase<ChatConnectionManagerEventListenerListeners> {
    public readonly connections = new Map<Chat['id'], Connection>();
    private readonly transactionManager = new TransactionManager();

    public constructor(
        public readonly messengerSignaling: MessengerSignaling
    ) {
        super(true);

        messengerSignaling.addEventListener('session_description', this.onSessionDescription);
        messengerSignaling.addEventListener('ice_candidate', this.onIceCandidate);
    }

    public getConnection(chatId: Chat['id']): Connection | null {
        const connection = this.connections.get(chatId);

        if (connection) {
            return connection;
        }

        return null;
    }

    private createConnection(chatId: Chat['id']): Connection {
        const rtcPeerConnection = new RTCPeerConnection({

        });

        const connection = new Connection(chatId, rtcPeerConnection);

        connection.addEventListener('close', () => {
            connection.cleanup();
            this.connections.delete(chatId);
        })

        this.connections.set(chatId, connection);
        this.dispatchEvent('upsert', [connection]);

        return connection;
    }

    public getOrCreateConnection(chatId: Chat['id']): Connection {
        const existConnection = this.getConnection(chatId);

        if (existConnection) {
            return existConnection;
        }

        const connection = this.createConnection(chatId);
        this.connections.set(chatId, connection);

        return connection;
    }

    public async startForChat(chatId: Chat['id']): Promise<Connection> {
        const existConnection = this.getConnection(chatId);

        if (existConnection !== null) {
            console.log('connection already exist');
            throw new Error('Connection already exist');
        }


        const connection = this.createConnection(chatId);
        connection.setup();

        const offer = await connection.rtcPeerConnection.createOffer();
        await connection.rtcPeerConnection.setLocalDescription(offer);

        this.messengerSignaling.relaySdp({
            chatId: chatId,
            sessionDescription: offer,
        });

        return connection;
    }

    public stopForChat(chatId: Chat['id']): void {
        const connection = this.getConnection(chatId);

        if (connection === null) {
            return;
        }

        connection.close();
    }

    private onSessionDescription = async (data: SessionDescriptionData): Promise<void> => {
        return this.transactionManager.transaction(
            [data.chatId],
            () => {},
            async () => {
                const connection = this.getOrCreateConnection(data.chatId);

                const remoteDescription = new RTCSessionDescription(data.sessionDescription);

                console.log(`[onSessionDescription] [${data.chatId}] setRemoteDescription`)
                await connection.rtcPeerConnection.setRemoteDescription(remoteDescription);

                if (remoteDescription.type !== 'offer') {
                    return;
                }

                const answer = await connection.rtcPeerConnection.createAnswer();

                console.log(`[onSessionDescription] [${data.chatId}] setLocalDescription`)
                await connection.rtcPeerConnection.setLocalDescription(answer);

                this.messengerSignaling.relaySdp({
                    chatId: data.chatId,
                    sessionDescription: answer,
                });
            },
            () => {},
        )
    }

    private onIceCandidate = async (data: IceCandidateData): Promise<void> => {
        return this.transactionManager.transaction(
            [data.chatId],
            () => {},
            async () => {
                const connection = this.getOrCreateConnection(data.chatId);
                const rtcIceCandidate = new RTCIceCandidate(data.iceCandidate)

                console.log(`[onIceCandidate] [${data.chatId}] addIceCandidate`)
                await connection.rtcPeerConnection.addIceCandidate(rtcIceCandidate);
            },
            () => {},
        )
    }
}

export const chatConnectionManager = new ChatConnectionManager(messengerSignaling);

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

    private chatState: ChatStateData = { type: 'paused', timestamp: Date.now() };

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
        let message;

        try {
            const decoder = new TextDecoder("utf-8");
            const jsonString = decoder.decode(event.data);
            message = JSON.parse(jsonString);
        } catch (error) {
            console.error("Failed to parse p2p message", error);
            return;
        }

        if (message.id) {
            const pendingMessage = this.pending.get(message.id);

            if (pendingMessage) {
                this.pending.delete(message.id);

                pendingMessage.resolvable.resolve(message);
                return;
            }
        }

        if (message.ping) {
            this.sendPong(message.id);
            return;
        }

        if (message.message) {
            messageManager.add({
                fromMe: false,
                senderId: message.message.chatId,
                ...message.message,
            });

            this.sendRawMessage({
                id: message.id,
            })

            return;
        }

        if (message.chatState) {
            this.chatState = message.chatState;
            this.dispatchEvent('chat_state', this.chatState);

            return;
        }

        // handle message
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