import { useEffect, useRef, useState } from 'react';
import { WebSocketMessage, WebSocketAuthMessage } from '../types';
import { getToken } from '../utils/storage';

interface UseWebSocketReturn {
  isConnected: boolean;
  ws: WebSocket | null;
  connectionId: string | null;
}

export const useWebSocket = (
  url: string, 
  onMessage?: (data: WebSocketMessage) => void
): UseWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionId, setConnectionId] = useState<string | null>(null); 

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      const authMessage: WebSocketAuthMessage = {
        type: 'auth',
        token: token
      };
      ws.send(JSON.stringify(authMessage));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        if (data.event === 'authenticated') {
          console.log('WebSocket authenticated');
          if (data.payload.connectionId) {
            setConnectionId(data.payload.connectionId);
            console.log('Connection ID:', data.payload.connectionId);
          }
        } else if (onMessage) {
          onMessage(data);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setConnectionId(null); 
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [url, onMessage]);

  return { isConnected, ws: wsRef.current, connectionId };
};

export default useWebSocket;