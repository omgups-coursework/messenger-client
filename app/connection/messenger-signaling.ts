import type {EventListenerListeners} from "~/helpers/event-listener-base";
import {EventListenerBase} from "~/helpers/event-listener-base";
import type {Chat} from "~/common/types";


export interface SessionDescriptionData {
    chatId: Chat['id'];
    sessionDescription: RTCSessionDescriptionInit;
}

export interface IceCandidateData {
    chatId: Chat['id'];
    iceCandidate: RTCIceCandidateInit;
}

export interface RelayIceCandidateData {
    chatId: Chat['id'];
    iceCandidate: RTCIceCandidate;
}

export interface RelaySdpDAta {
    chatId: Chat['id'];
    sessionDescription: RTCSessionDescriptionInit;
}

export interface ConnectionManagerEventListenerListeners extends EventListenerListeners {
    'session_description': (data: SessionDescriptionData) => void;
    'ice_candidate': (data: IceCandidateData) => void;
}

export type SignalingState = { type: 'closed' } | { type: 'open'; userId: string; socket: WebSocket };

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
