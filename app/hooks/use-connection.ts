import {useCallback, useEffect, useState} from "react";
import {useEventListener} from "~/hooks/use-event-listener.hook";
import type {Chat} from "~/common/types";
import {Mutex} from "~/lib/thread/mutex";
import {type ChatStateData, Connection, type ConnectionEventListenerListeners} from "~/connection/connection";
import {
    chatConnectionManager,
    type ChatConnectionManagerEventListenerListeners
} from "~/managers/chat-connection.manager";

const useConnectionMutex = new Mutex('useConnection');

export function useConnection(chatId: Chat['id']) {
    const [connection, setConnection] = useState<Connection | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);
    const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState | null>(null);
    const [iceGatheringState, setIceGatheringState] = useState<RTCIceGatheringState | null>(null);
    const [signalingState, setSignalingState] = useState<RTCSignalingState | null>(null);

    const [chatState, setChatState] = useState<Readonly<ChatStateData> | null>(null);


    const handleChatIdUpdated = useCallback(async (chatId: Chat['id']) => {
        const unlock = await useConnectionMutex.lock();

        const existConnection = chatConnectionManager.getConnection(chatId);

        if (existConnection) {
            console.log(`[useConnection] use exist for chatId=${chatId}`);

            setConnection(existConnection);

            await unlock();
            return
        }

        console.log(`[useConnection] use new for chatId=${chatId}`);

        const connection = await chatConnectionManager.startForChat(chatId);

        setConnection(connection);

        await unlock();
    }, [])

    useEffect(() => {
        handleChatIdUpdated(chatId);
    }, [chatId]);

    useEffect(() => {
        if (connection) {
            setConnectionState(connection.rtcPeerConnection.connectionState);
            setIceConnectionState(connection.rtcPeerConnection.iceConnectionState);
            setIceGatheringState(connection.rtcPeerConnection.iceGatheringState);
            setSignalingState(connection.rtcPeerConnection.signalingState);

            const chatState = connection.getChatState();
            setChatState(chatState);

            connection.startPingLoop();

            if (connection.isOpen()) {
                connection.setChatState({
                    type: 'idle',
                })
            }

            return () => {
                connection.stopPingLoop();

                if (connection.isOpen()) {
                    connection.setChatState({
                        type: 'paused',
                        timestamp: Date.now(),
                    })
                }
            }
        }

        setConnectionState(null);
        setIceConnectionState(null);
        setIceGatheringState(null);
        setSignalingState(null);
        setChatState(null);
    }, [connection]);

    useEventListener<ChatConnectionManagerEventListenerListeners, 'upsert'>(chatConnectionManager, 'upsert', (connections) => {
        for (const connection of connections) {
            if (connection.chatId === chatId) {
                setConnection(connection);
                break;
            }
        }
    });

    useEventListener<ConnectionEventListenerListeners, 'open'>(connection, 'open', () => {
        connection!.setChatState({
            type: 'idle',
        })
    });

    useEventListener<ConnectionEventListenerListeners, 'connection_state_change'>(connection, 'connection_state_change', (state) => {
        setConnectionState(state);
    });

    useEventListener<ConnectionEventListenerListeners, 'ice_connection_state_change'>(connection, 'ice_connection_state_change', (state) => {
        setIceConnectionState(state);
    });

    useEventListener<ConnectionEventListenerListeners, 'ice_gathering_state_change'>(connection, 'ice_gathering_state_change', (state) => {
        setIceGatheringState(state);
    });

    useEventListener<ConnectionEventListenerListeners, 'ice_signaling_state_change'>(connection, 'ice_signaling_state_change', (state) => {
        setSignalingState(state);
    });

    useEventListener<ConnectionEventListenerListeners, 'chat_state'>(connection, 'chat_state', (state) => {
        setChatState(state);
    });

    return {
        connection: connection,
        connectionState: connectionState,
        iceConnectionState: iceConnectionState,
        iceGatheringState: iceGatheringState,
        signalingState: signalingState,
        chatState: chatState,
    }
}