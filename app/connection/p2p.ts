import type {EventListenerListeners} from "~/helpers/event-listener-base";
import type {Chat, Message} from "~/common/types";
import {EventListenerBase} from "~/helpers/event-listener-base";
import {Resolvable} from "~/lib/promise/resolvable";
import {TransactionManager} from "~/lib/thread/transaction-manager";


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
    'add_peer': (data: AddPeerData) => void;
    'remove_peer': (data: RemovePeerData) => void;
    'session_description': (data: SessionDescriptionData) => void;
    'ice_candidate': (data: IceCandidateData) => void;
}

export class MessengerSignaling extends EventListenerBase<ConnectionManagerEventListenerListeners> {
    private readonly userId: string;
    private readonly socket: WebSocket;

    public constructor(userId: string, wsUrl: string) {
        super();

        this.userId = userId;

        this.socket = new WebSocket(wsUrl);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = this.onSocketOpen;
        this.socket.onmessage = this.onSocketMessage;
        this.socket.onerror = this.onSocketError;
        this.socket.onclose = this.onSocketClose;
    }

    private onSocketOpen = (event: Event): void => {
        console.log("Signaling socket connected");

        const payload = {
            handshake: {
                clientPayload: {
                    userId: this.userId,
                }
            }
        }

        this.sendRaw(payload);
    };

    private onSocketMessage = (event: MessageEvent): void => {
        try {
            const decoder = new TextDecoder("utf-8");
            const jsonString = decoder.decode(event.data);
            const message = JSON.parse(jsonString);
            console.log("Received message:", message);

            if (message.sessionDescription) {
                this.dispatchEvent('session_description', {
                    chatId: message.from,
                    sessionDescription: message.sessionDescription,
                });

                return;
            }

            if (message.iceCandidate) {
                this.dispatchEvent('ice_candidate', {
                    chatId: message.from,
                    iceCandidate: message.iceCandidate,
                });

                return;
            }

        } catch (error) {
            console.error("Failed to parse signaling message", error);
        }
    };

    private onSocketError = (event: Event): void => {
        console.error("Signaling socket error", event);
    };

    private onSocketClose = (event: CloseEvent): void => {
        console.log("Signaling socket closed", event);
    };

    public sendRaw(message: any) {
        const jsonString = JSON.stringify(message);

        const encoder = new TextEncoder();
        const arrayBuffer = encoder.encode(jsonString);

        this.socket.send(arrayBuffer);
    }

    public relaySdp(data: RelaySdpDAta): void {
        this.sendRaw({
            from: this.userId,
            to: data.chatId,
            sessionDescription: data.sessionDescription,
        });
    }

    public relayIce(data: RelayIceCandidateData): void {
        this.sendRaw({
            from: this.userId,
            to: data.chatId,
            iceCandidate: data.iceCandidate,
        });
    }
}

export class ChatConnectionManager {
    public readonly connections = new Map<Chat['id'], Connection>();
    private readonly transactionManager = new TransactionManager();

    public constructor(
        public readonly messengerSignaling: MessengerSignaling
    ) {
        messengerSignaling.addEventListener('add_peer', this.onAddPeer);
        messengerSignaling.addEventListener('remove_peer', this.onRemovePeer);
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

    private getOrCreateConnection(chatId: Chat['id']): Connection {
        const existConnection = this.getConnection(chatId);

        if (existConnection) {
            return existConnection;
        }

        const rtcPeerConnection = new RTCPeerConnection({

        });

        const connection = new Connection(chatId, rtcPeerConnection);
        this.connections.set(chatId, connection);

        return connection;
    }

    public async startForChat(chatId: Chat['id']): Promise<void> {
        return this.onAddPeer({
            chatId: chatId,
            createOffer: true,
        });
    }

    private onAddPeer = async (data: AddPeerData): Promise<void> => {
        const connection = this.getOrCreateConnection(data.chatId);

        connection.rtcPeerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate != null) {
                this.messengerSignaling.relayIce({
                    chatId: data.chatId,
                    iceCandidate: event.candidate,
                });
            }
        }

        if (data.createOffer) {
            connection.setup();
            const offer = await connection.rtcPeerConnection.createOffer();
            await connection.rtcPeerConnection.setLocalDescription(offer);

            this.messengerSignaling.relaySdp({
                chatId: data.chatId,
                sessionDescription: offer,
            })
        }
    }

    private onRemovePeer = (data: RemovePeerData): void => {
        const connection = this.getConnection(data.chatId);

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

interface HandshakeData {
    publicKey: ArrayBuffer; // 32-byte curve key
}

interface MessageData {
    messageId: Message['id'];
    enc: ArrayBuffer;
}

export interface ConnectionEventListenerListeners extends EventListenerListeners {
    'open': () => void;
    'close': () => void;
    'closing': () => void;
    'handshake': (data: HandshakeData) => void;
    'incoming_message': (data: MessageData) => void;
}

export class Connection extends EventListenerBase<ConnectionEventListenerListeners> {
    private rtcDataChannel: RTCDataChannel | null = null;
    private openResolvable = new Resolvable<void>();

    public constructor(
        public readonly chatId: Chat['id'],
        public readonly rtcPeerConnection: RTCPeerConnection,
    ) {
        super(false);

        rtcPeerConnection.ondatachannel = (event) => {
            event.channel.onopen = this.onOpen;

            event.channel.onclose = this.onClose;
            event.channel.onclosing = this.onClosing;

            event.channel.onerror = this.onError;

            event.channel.onmessage = this.onMessage;

            this.rtcDataChannel = event.channel;
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

    public sendRawMessage(data: string): void {
        const rtcDataChannel = this.assertGetRtcDataChannel();
        rtcDataChannel.send(data)
    }

    public close() {
        const rtcDataChannel = this.assertGetRtcDataChannel();
        rtcDataChannel.close();
        this.rtcPeerConnection.close();
    }

    private onOpen = (event: Event): void => {
        this.openResolvable.resolve();
        this.dispatchEvent('open');
    }

    private onClose = (event: Event): void => {
        this.dispatchEvent('close');
    }

    private onClosing = (event: Event): void => {
        this.dispatchEvent('closing');
    }

    private onError = (event: RTCErrorEvent): void => {}

    private onMessage = (event: MessageEvent): void => {
        console.log(`[onMessage]:`, event);
    }

    private assertGetRtcDataChannel(): RTCDataChannel {
        if (this.rtcDataChannel !== null) {
            return this.rtcDataChannel;
        }

        throw new Error('assertGetRtcDataChannel');
    }
}