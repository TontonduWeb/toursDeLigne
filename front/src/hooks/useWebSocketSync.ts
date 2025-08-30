import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketState {
  socket: WebSocket | null;
  readyState: number;
  connectionStatus: string;
}

interface WebSocketSyncOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  shouldReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocketSync = (url: string, options: WebSocketSyncOptions = {}) => {
  const [wsState, setWsState] = useState<WebSocketState>({
    socket: null,
    readyState: WebSocket.CLOSED,
    connectionStatus: 'Disconnected'
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  const {
    onOpen,
    onClose,
    onError,
    shouldReconnect = true,
    reconnectAttempts: maxReconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  // Fonction pour envoyer des messages
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      socketRef.current.send(messageString);
      return true;
    }
    console.warn('WebSocket non connecté - message non envoyé:', message);
    return false;
  }, []);

  // Fonction pour s'abonner à des types de messages
  const subscribe = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlers.current.set(messageType, handler);
  }, []);

  // Fonction pour se désabonner
  const unsubscribe = useCallback((messageType: string) => {
    messageHandlers.current.delete(messageType);
  }, []);

  // Fonction de connexion
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;
      
      setWsState({
        socket: ws,
        readyState: WebSocket.CONNECTING,
        connectionStatus: 'Connecting...'
      });

      ws.onopen = (event) => {
        setWsState({
          socket: ws,
          readyState: WebSocket.OPEN,
          connectionStatus: 'Connected'
        });
        reconnectAttempts.current = 0;
        onOpen?.();
      };

      ws.onclose = (event) => {
        setWsState({
          socket: null,
          readyState: WebSocket.CLOSED,
          connectionStatus: 'Disconnected'
        });
        
        onClose?.();

        // Logique de reconnexion
        if (shouldReconnect && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          setWsState(prev => ({
            ...prev,
            connectionStatus: `Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Distribuer le message aux handlers appropriés
          const handler = messageHandlers.current.get(message.type);
          if (handler) {
            handler(message.payload);
          }
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      };

      ws.onerror = (event) => {
        setWsState(prev => ({
          ...prev,
          readyState: WebSocket.CLOSED,
          connectionStatus: 'Error'
        }));
        onError?.(event);
      };

    } catch (error) {
      console.error('Erreur création WebSocket:', error);
      setWsState(prev => ({
        ...prev,
        connectionStatus: 'Error'
      }));
    }
  }, [url, onOpen, onClose, onError, shouldReconnect, maxReconnectAttempts, reconnectInterval]);

  // Fonction de déconnexion
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, []);

  // Initialiser la connexion
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    ...wsState,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    isConnected: wsState.readyState === WebSocket.OPEN
  };
};