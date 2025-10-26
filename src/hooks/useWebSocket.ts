import { useEffect, useState, useRef } from 'react';
import { Item } from '../types/Item';

interface WebSocketMessage {
  event: 'created' | 'updated' | 'deleted';
  payload: {
    item: Item;
  };
}

let globalConnectionId = 0;

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientIdRef = useRef<number>(0);
  const onMessageRef = useRef(onMessage);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref când onMessage se schimbă
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    globalConnectionId++;
    clientIdRef.current = globalConnectionId;
    console.log(`🔌 [Client #${clientIdRef.current}] Mounting WebSocket hook`);
    
    let websocket: WebSocket | null = null;

    const connect = () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log(`⚠️ [Client #${clientIdRef.current}] WebSocket already connected, skipping`);
        return;
      }

      console.log(`🔌 [Client #${clientIdRef.current}] Connecting to WebSocket...`);
      websocket = new WebSocket('ws://localhost:3000');

      websocket.onopen = () => {
        console.log(`✅ [Client #${clientIdRef.current}] Connected`);
        setIsConnected(true);
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log(`📩 [Client #${clientIdRef.current}] Message:`, message.event);
        onMessageRef.current(message);
      };

      websocket.onerror = (error) => {
        console.error(`❌ [Client #${clientIdRef.current}] Error:`, error);
      };

      websocket.onclose = (event) => {
        console.log(`🔴 [Client #${clientIdRef.current}] Disconnected (code: ${event.code})`);
        setIsConnected(false);
        setWs(null);
        
        // Doar reconnect dacă nu e un close normal
        if (event.code !== 1000) {
          console.log(`🔄 [Client #${clientIdRef.current}] Reconnecting in 3s...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    // Cleanup
    return () => {
      console.log(`🧹 [Client #${clientIdRef.current}] Cleaning up`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (websocket) {
        websocket.onclose = null; // Prevent reconnect
        websocket.close(1000, 'Component unmounted');
      }
    };
  }, []); // ← EMPTY DEPENDENCY ARRAY!

  return { ws, isConnected };
};