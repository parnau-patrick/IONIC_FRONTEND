import { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonCheckbox,
  IonButton,
  IonButtons,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonText,
  IonSpinner,
  IonChip,
  IonBadge,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import { 
  addOutline, 
  logOutOutline, 
  trashOutline,
  wifiOutline,
  cloudOfflineOutline
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import api from '../config/api';
import { Item, ItemsResponse, WebSocketMessage } from '../types';
import { getItems as getLocalItems, setItems as setLocalItems } from '../utils/storage';

const ItemList = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  const isOnline = useNetworkStatus();
  
  // Track local operations to prevent WebSocket duplicates
  const localOperationsRef = useRef<Set<number>>(new Set());
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 10;
  
  // Search & Filter state
  const [searchText, setSearchText] = useState<string>('');
  const [filterCompleted, setFilterCompleted] = useState<string>('all');
  
  // New item form
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newItemText, setNewItemText] = useState<string>('');

  // Fetch items from server
  const fetchItems = useCallback(async () => {
    if (!isOnline) {
      const localItems = getLocalItems();
      setItems(localItems);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (searchText) {
        params.append('text', searchText);
      }
      
      if (filterCompleted !== 'all') {
        params.append('completed', filterCompleted);
      }
      
      const response = await api.get<ItemsResponse>(`/api/items?${params.toString()}`);
      const data = response.data;
      
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      
      setLocalItems(data.items);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items');
      setLoading(false);
    }
  }, [page, searchText, filterCompleted, isOnline]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // WebSocket - real-time updates
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('📨 WebSocket message:', data);
    
    if (data.event === 'created' && data.payload.item) {
      const itemId = data.payload.item!.id;
      
      // Ignore if it's our own local operation
      if (localOperationsRef.current.has(itemId)) {
        console.log('🚫 Ignoring own WebSocket event for item:', itemId);
        return;
      }
      
      // Check if item already exists to prevent duplicates
      setItems(prev => {
        const exists = prev.some(item => item.id === itemId);
        if (exists) {
          console.log('⚠️ Item already exists, skipping');
          return prev;
        }
        console.log('✅ Adding item from WebSocket:', itemId);
        return [data.payload.item!, ...prev.slice(0, limit - 1)];
      });
      setTotal(prev => prev + 1);
    } else if (data.event === 'updated' && data.payload.item) {
      const itemId = data.payload.item!.id;
      
      // Ignore if it's our own local operation
      if (localOperationsRef.current.has(itemId)) {
        console.log('🚫 Ignoring own update WebSocket event for item:', itemId);
        return;
      }
      
      console.log('🔄 Updating item from WebSocket:', itemId);
      setItems(prev => prev.map(item => 
        item.id === data.payload.item!.id ? data.payload.item! : item
      ));
    } else if (data.event === 'deleted' && data.payload.item) {
      const itemId = data.payload.item!.id;
      
      // Ignore if it's our own local operation
      if (localOperationsRef.current.has(itemId)) {
        console.log('🚫 Ignoring own delete WebSocket event for item:', itemId);
        return;
      }
      
      console.log('🗑️ Deleting item from WebSocket:', itemId);
      setItems(prev => prev.filter(item => item.id !== data.payload.item!.id));
      setTotal(prev => prev - 1);
    }
  }, []);

  useWebSocket('ws://localhost:3000', handleWebSocketMessage);

  // Create item
  const handleCreateItem = async (): Promise<void> => {
    if (!newItemText.trim() || newItemText.length < 3) {
      alert('Item text must be at least 3 characters');
      return;
    }

    try {
      const response = await api.post<Item>('/api/items', {
        text: newItemText,
        completed: false
      });
      
      const newItem = response.data;
      
      // Mark as local operation to ignore WebSocket duplicate
      localOperationsRef.current.add(newItem.id);
      console.log('➕ Created item locally:', newItem.id);
      
      setItems(prev => [newItem, ...prev]);
      setTotal(prev => prev + 1);
      
      setNewItemText('');
      setShowModal(false);
      
      // Clean up after 2 seconds
      setTimeout(() => {
        localOperationsRef.current.delete(newItem.id);
        console.log('🧹 Cleaned up local operation tracking for:', newItem.id);
      }, 2000);
    } catch (err) {
      console.error('Error creating item:', err);
      alert('Failed to create item');
    }
  };

  // Toggle completed
  const handleToggleCompleted = async (item: Item, e: any): Promise<void> => {
    e.stopPropagation();
    
    try {
      // Mark as local operation
      localOperationsRef.current.add(item.id);
      
      const response = await api.put<Item>(`/api/items/${item.id}`, {
        text: item.text,
        completed: !item.completed,
        version: item.version
      });
      
      const updatedItem = response.data;
      setItems(prev => prev.map(i => 
        i.id === updatedItem.id ? updatedItem : i
      ));
      
      // Clean up after 2 seconds
      setTimeout(() => {
        localOperationsRef.current.delete(item.id);
      }, 2000);
    } catch (err: any) {
      console.error('Error updating item:', err);
      
      // Remove from tracking on error
      localOperationsRef.current.delete(item.id);
      
      if (err.response?.status === 409) {
        alert('Version conflict! Item was modified by another user. Refreshing...');
        fetchItems();
      } else {
        alert('Failed to update item');
      }
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: number, e: any): Promise<void> => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      // Mark as local operation
      localOperationsRef.current.add(itemId);
      
      await api.delete(`/api/items/${itemId}`);
      setItems(prev => prev.filter(item => item.id !== itemId));
      setTotal(prev => prev - 1);
      
      // Clean up after 2 seconds
      setTimeout(() => {
        localOperationsRef.current.delete(itemId);
      }, 2000);
    } catch (err) {
      console.error('Error deleting item:', err);
      
      // Remove from tracking on error
      localOperationsRef.current.delete(itemId);
      
      alert('Failed to delete item');
    }
  };

  // View item details
  const handleViewItem = (itemId: number) => {
    history.push(`/items/${itemId}`);
  };

  // Pull to refresh
  const handleRefresh = async (event: any) => {
    await fetchItems();
    event.detail.complete();
  };

  // Pagination
  const handlePrevPage = (): void => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = (): void => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>📝 Item Manager</IonTitle>
          <IonButtons slot="end">
            <IonChip>
              <IonIcon icon={isOnline ? wifiOutline : cloudOfflineOutline} />
              <IonLabel>{isOnline ? 'Online' : 'Offline'}</IonLabel>
            </IonChip>
            <IonButton onClick={logout}>
              <IonIcon icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value || '')}
            placeholder="Search items..."
            debounce={500}
          />
        </IonToolbar>
        
        <IonToolbar>
          <IonSegment
            value={filterCompleted}
            onIonChange={(e) => {
              const value = e.detail.value as string;
              setFilterCompleted(value || 'all');
              setPage(1);
            }}
          >
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="false">
              <IonLabel>Incomplete</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="true">
              <IonLabel>Completed</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <IonSpinner name="crescent" />
            <p>Loading items...</p>
          </div>
        ) : error ? (
          <IonText color="danger">
            <p style={{ textAlign: 'center', marginTop: '50px' }}>{error}</p>
          </IonText>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <IonText color="medium">
              <p>No items found. Create your first item!</p>
            </IonText>
          </div>
        ) : (
          <>
            <IonList>
              {items.map(item => (
                <IonItem key={item.id} button onClick={() => handleViewItem(item.id)}>
                  <IonCheckbox
                    slot="start"
                    checked={item.completed}
                    onIonChange={(e) => handleToggleCompleted(item, e)}
                  />
                  <IonLabel>
                    <h2 style={{ 
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? 'var(--ion-color-medium)' : 'inherit'
                    }}>
                      {item.text}
                    </h2>
                    <p>
                      <IonBadge color="light">v{item.version}</IonBadge>
                      {' • '}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </IonLabel>
                  <IonButtons slot="end">
                    <IonButton onClick={(e) => handleDeleteItem(item.id, e)} color="danger">
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonButtons>
                </IonItem>
              ))}
            </IonList>
            
            {/* Pagination */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px'
            }}>
              <IonButton 
                onClick={handlePrevPage} 
                disabled={page === 1}
                size="small"
              >
                Previous
              </IonButton>
              
              <IonText>
                Page {page} of {totalPages} ({total} items)
              </IonText>
              
              <IonButton 
                onClick={handleNextPage} 
                disabled={page === totalPages}
                size="small"
              >
                Next
              </IonButton>
            </div>
          </>
        )}
        
        {/* FAB Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
        
        {/* Create Item Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>New Item</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Cancel</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="floating">Item Text (min 3 characters)</IonLabel>
              <IonInput
                value={newItemText}
                onIonChange={(e) => setNewItemText(e.detail.value || '')}
                maxlength={200}
              />
            </IonItem>
            <IonButton 
              expand="block" 
              onClick={handleCreateItem}
              style={{ marginTop: '20px' }}
            >
              Create Item
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default ItemList;