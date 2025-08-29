import React, { useState, useEffect, useRef, useCallback } from 'react';

// Hook personnalisé pour gérer les WebSockets (intégré directement)
const useWebSocket = (url, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    shouldReconnect = true,
    reconnectAttempts: maxReconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  // Fonction pour envoyer des messages
  const sendMessage = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
      socketRef.current.send(messageToSend);
      return true;
    }
    console.warn('WebSocket n\'est pas connecté');
    return false;
  }, []);

  // Fonction pour fermer la connexion
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, []);

  // Fonction de connexion/reconnexion
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;
      setSocket(ws);

      ws.onopen = (event) => {
        setReadyState(WebSocket.OPEN);
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
        onOpen?.(event);
      };

      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        setConnectionStatus('Disconnected');
        onClose?.(event);

        // Logique de reconnexion
        if (shouldReconnect && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          setConnectionStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(event.data);
        } catch {
          parsedMessage = event.data;
        }
        
        setLastMessage(parsedMessage);
        onMessage?.(parsedMessage, event);
      };

      ws.onerror = (event) => {
        setReadyState(WebSocket.CLOSED);
        setConnectionStatus('Error');
        onError?.(event);
      };

    } catch (error) {
      console.error('Erreur lors de la création du WebSocket:', error);
      setConnectionStatus('Error');
    }
  }, [url, onOpen, onClose, onMessage, onError, shouldReconnect, maxReconnectAttempts, reconnectInterval]);

  // Effet pour initialiser la connexion
  useEffect(() => {
    connect();

    // Cleanup lors du démontage du composant
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
    socket,
    lastMessage,
    readyState,
    connectionStatus,
    sendMessage,
    disconnect,
    connect,
  };
};

const WebSocketExample = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Utilisation du hook WebSocket
  const {
    lastMessage,
    readyState,
    connectionStatus,
    sendMessage,
    disconnect,
    connect
  } = useWebSocket('wss://echo.websocket.org/', {
    onOpen: () => {
      console.log('WebSocket connecté !');
    },
    onClose: () => {
      console.log('WebSocket fermé');
    },
    onMessage: (message) => {
      console.log('Message reçu:', message);
    },
    onError: (error) => {
      console.error('Erreur WebSocket:', error);
    },
    shouldReconnect: true,
    reconnectAttempts: 3,
    reconnectInterval: 2000
  });

  // Ajouter les nouveaux messages à la liste
  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage),
        timestamp: new Date().toLocaleTimeString(),
        type: 'received'
      }]);
    }
  }, [lastMessage]);

  // Fonction pour envoyer un message
  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const success = sendMessage(messageInput);
      if (success) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          content: messageInput,
          timestamp: new Date().toLocaleTimeString(),
          type: 'sent'
        }]);
        setMessageInput('');
      }
    }
  };

  // Gérer l'appui sur Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Obtenir la couleur du statut
  const getStatusColor = () => {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'text-yellow-600';
      case WebSocket.OPEN: return 'text-green-600';
      case WebSocket.CLOSING: return 'text-orange-600';
      case WebSocket.CLOSED: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">WebSocket Demo</h2>
        
        {/* Status de connexion */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded">
          <div>
            <span className="font-medium">Status: </span>
            <span className={`font-semibold ${getStatusColor()}`}>
              {connectionStatus}
            </span>
          </div>
          <div className="space-x-2">
            <button
              onClick={connect}
              disabled={readyState === WebSocket.OPEN}
              className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
            >
              Connecter
            </button>
            <button
              onClick={disconnect}
              disabled={readyState !== WebSocket.OPEN}
              className="px-3 py-1 bg-red-500 text-white rounded disabled:bg-gray-400 hover:bg-red-600 transition-colors"
            >
              Déconnecter
            </button>
          </div>
        </div>
      </div>

      {/* Zone de messages */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Messages ({messages.length})</h3>
        <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic text-center">Aucun message...</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 p-2 rounded max-w-xs ${
                  message.type === 'sent'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-white border'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Vider les messages
          </button>
        )}
      </div>

      {/* Zone d'envoi */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Tapez votre message..."
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={readyState !== WebSocket.OPEN}
        />
        <button
          onClick={handleSendMessage}
          disabled={readyState !== WebSocket.OPEN || !messageInput.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
        >
          Envoyer
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Cet exemple utilise wss://echo.websocket.org/ qui renvoie tous les messages envoyés.</p>
        <p>Remplace l'URL par ton serveur WebSocket.</p>
      </div>
    </div>
  );
};

export default WebSocketExample;