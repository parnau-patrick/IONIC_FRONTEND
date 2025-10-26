import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonCheckbox,
  IonLoading,
  IonToast,
} from '@ionic/react';
import { add, wifi, wifiOutline, trash, create } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { itemApi } from '../api/itemApi';
import { Item } from '../types/Item';
import { useWebSocket } from '../hooks/useWebSocket';
import './ItemList.css';

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const history = useHistory();
  
  const pendingActionsRef = useRef<Set<string>>(new Set());

  const handleWebSocketMessage = useCallback((message: any) => {
    
    const actionKey = `${message.event}-${message.payload.item.id}`;
    
    if (pendingActionsRef.current.has(actionKey)) {
      pendingActionsRef.current.delete(actionKey);
      return;
    }
    
    if (message.event === 'created') {
      setItems((prevItems) => {
        const exists = prevItems.some(item => item.id === message.payload.item.id);
        if (exists) {
          return prevItems;
        }
        return [message.payload.item, ...prevItems];
      });
    } else if (message.event === 'updated') {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === message.payload.item.id ? message.payload.item : item
        )
      );
    } else if (message.event === 'deleted') {
      setItems((prevItems) =>
        prevItems.filter((item) => item.id !== message.payload.item.id)
      );
    }
  }, []);

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await itemApi.getAllItems();
      setItems(data);
    } catch (err: any) {
      console.error('Error loading items:', err);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRefresh = async (event: CustomEvent) => {
    await loadItems();
    event.detail.complete();
  };

  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (value.trim() === '') {
      loadItems();
    } else {
      try {
        const data = await itemApi.searchItems(value);
        setItems(data);
      } catch (err) {
        console.error('Error searching items:', err);
      }
    }
  };

  const handleToggleComplete = async (item: Item) => {
    try {
      // Marchează acțiunea ca pending
      const actionKey = `updated-${item.id}`;
      pendingActionsRef.current.add(actionKey);
      
      const currentItem = await itemApi.getItemById(item.id);
      
      const updatedItem = await itemApi.updateItem(currentItem.id, {
        ...currentItem,
        completed: !currentItem.completed
      });
      
      setItems((prevItems) =>
        prevItems.map((i) => (i.id === updatedItem.id ? updatedItem : i))
      );
      
      // Șterge din pending după 2 secunde (ca siguranță)
      setTimeout(() => {
        pendingActionsRef.current.delete(actionKey);
      }, 2000);
    } catch (err: any) {
      console.error('Error updating item:', err);
      
      // Șterge din pending dacă e eroare
      const actionKey = `updated-${item.id}`;
      pendingActionsRef.current.delete(actionKey);
      
      setError('Failed to update item');
      await loadItems();
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Marchează acțiunea ca pending
      const actionKey = `deleted-${id}`;
      pendingActionsRef.current.add(actionKey);
      
      await itemApi.deleteItem(id);
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
      
      // Șterge din pending după 2 secunde
      setTimeout(() => {
        pendingActionsRef.current.delete(actionKey);
      }, 2000);
    } catch (err) {
      console.error('Error deleting item:', err);
      
      // Șterge din pending dacă e eroare
      const actionKey = `deleted-${id}`;
      pendingActionsRef.current.delete(actionKey);
      
      setError('Failed to delete item');
    }
  };

  const uniqueItems = items.reduce((acc: Item[], current) => {
    const exists = acc.find(item => item.id === current.id);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Items</IonTitle>
          <IonBadge slot="end" color={isConnected ? 'success' : 'danger'}>
            <IonIcon icon={isConnected ? wifi : wifiOutline} />
          </IonBadge>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => handleSearch(e.detail.value!)}
            placeholder="Search items"
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonLoading isOpen={loading} message="Loading items..." />

        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError(null)}
          message={error || ''}
          duration={3000}
          color="danger"
        />

        <IonList>
          {uniqueItems.map((item) => (
            <IonItem key={item.id}>
              <IonCheckbox
                slot="start"
                checked={item.completed}
                onIonChange={() => handleToggleComplete(item)}
              />
              <IonLabel onClick={() => history.push(`/item/${item.id}`)}>
                <h2 style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                  {item.text}
                </h2>
                <p>
                  ID: {item.id} | Version: {item.version}
                </p>
                <p>{new Date(item.date).toLocaleString()}</p>
              </IonLabel>
              <IonButton
                slot="end"
                fill="clear"
                onClick={() => history.push(`/item/edit/${item.id}`)}
              >
                <IonIcon icon={create} />
              </IonButton>
              <IonButton
                slot="end"
                fill="clear"
                color="danger"
                onClick={() => handleDelete(item.id)}
              >
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        {uniqueItems.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <p>No items found. Add one!</p>
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push('/item/new')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default ItemList;