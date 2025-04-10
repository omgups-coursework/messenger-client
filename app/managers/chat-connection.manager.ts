import {EventListenerBase, type EventListenerListeners} from "~/helpers/event-listener-base";
import {Connection} from "~/connection/connection";
import type {Chat} from "~/common/types";
import {TransactionManager} from "~/lib/thread/transaction-manager";
import {
    type IceCandidateData,
    messengerSignaling,
    type MessengerSignaling,
    type SessionDescriptionData
} from "~/connection/messenger-signaling";


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
