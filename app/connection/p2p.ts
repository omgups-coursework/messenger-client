import type {EventListenerListeners} from "~/helpers/event-listener-base";
import type {Chat, Message} from "~/common/types";
import {EventListenerBase} from "~/helpers/event-listener-base";
import {Resolvable} from "~/lib/promise/resolvable";


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

class MessengerSignaling extends EventListenerBase<ConnectionManagerEventListenerListeners> {

    public relayIce(data: RelayIceCandidateData): void {
        // TODO
    }

    public relaySdp(data: RelaySdpDAta): void {

    }
}

export class ChatConnectionManager {
    public readonly connections = new Map<Chat['id'], Connection>();

    public constructor(
        public readonly messengerSignaling: MessengerSignaling
    ) {
        messengerSignaling.addEventListener('add_peer', this.onAddPeer);
        messengerSignaling.addEventListener('remove_peer', this.onRemovePeer);
        messengerSignaling.addEventListener('session_description', this.onSessionDescription);
        messengerSignaling.addEventListener('ice_candidate', this.onIceCandidate);

    }

    public getConnection(chatId: Chat['id']): Connection | null {
        return null
    }

    private getOrCreateConnection(chatId: Chat['id']): Connection {
        const rtcPeerConnection = new RTCPeerConnection({

        });

        const connection = new Connection(chatId, rtcPeerConnection);
        this.connections.set(chatId, connection);

        return connection;
    }

    public async startForChat(chatId: Chat['id']): Promise<void> {}

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
        const connection = this.getOrCreateConnection(data.chatId);

        const remoteDescription = new RTCSessionDescription(data.sessionDescription);

        await connection.rtcPeerConnection.setRemoteDescription(remoteDescription);

        if (remoteDescription.type !== 'offer') {
            return;
        }

        const answer = await connection.rtcPeerConnection.createAnswer();

        await connection.rtcPeerConnection.setLocalDescription(answer);

        this.messengerSignaling.relaySdp({
            chatId: data.chatId,
            sessionDescription: answer,
        });
    }

    private onIceCandidate = async (data: IceCandidateData): Promise<void> => {
        const connection = this.getOrCreateConnection(data.chatId);
        const rtcIceCandidate = new RTCIceCandidate(data.iceCandidate)

        await connection.rtcPeerConnection.addIceCandidate(rtcIceCandidate);
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

    private onMessage = (event: MessageEvent): void => {}

    private assertGetRtcDataChannel(): RTCDataChannel {
        if (this.rtcDataChannel !== null) {
            return this.rtcDataChannel;
        }

        throw new Error('assertGetRtcDataChannel');
    }
}