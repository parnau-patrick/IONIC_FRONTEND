import { useState, useEffect, useCallback } from 'react';
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
  IonRefresherContent,
  IonAlert
} from '@ionic/react';

import { 
  addOutline, 
  logOutOutline, 
  trashOutline,
  wifiOutline,
  cloudOfflineOutline,
  warningOutline,
  cloudUploadOutline
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import api, { setConnectionId } from '../config/api';
import { Item, ItemsResponse, WebSocketMessage } from '../types';
import "./styles/itemList.css";
import { 
  getItems as getLocalItems, 
  setItems as setLocalItems,
  getPendingOperations,
  addPendingOperation,
  removePendingOperation,
  PendingOperation
} from '../utils/storage';

const ItemList = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  const isOnline = useNetworkStatus();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 10;
  
  const [searchText, setSearchText] = useState<string>('');
  const [filterCompleted, setFilterCompleted] = useState<string>('all');
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newItemText, setNewItemText] = useState<string>('');
  
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [showPendingAlert, setShowPendingAlert] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const operations = getPendingOperations();
    setPendingOps(operations);
  }, []);

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
      
      const localItems = getLocalItems();
      setItems(localItems);
      setError('Failed to load items from server. Showing cached data.');
      setLoading(false);
    }
  }, [page, searchText, filterCompleted, isOnline]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (isOnline && pendingOps.length > 0 && !isSyncing) {
      console.log('Back online! Auto-syncing pending operations...');
      syncPendingOperations();
    }
  }, [isOnline, pendingOps.length]);

  const syncPendingOperations = async () => {
    if (pendingOps.length === 0) return;
    
    setIsSyncing(true);
    console.log(`Syncing ${pendingOps.length} pending operations...`);
    
    const createOps = pendingOps.filter(op => op.type === 'create');
    const otherOps = pendingOps.filter(op => op.type !== 'create');
    
    const tempIdMap = new Map<number, number>();
    
    for (const op of createOps) {
      try {
        const response = await api.post('/api/items', {
          text: op.item.text,
          completed: op.item.completed
        });
        
        const newItem = response.data;
        const tempId = op.item.id;
        
        if (tempId) {
          tempIdMap.set(tempId, newItem.id);
        }
        
        console.log(`Synced CREATE: ${op.item.text} (temp: ${tempId} → real: ${newItem.id})`);
        removePendingOperation(op.id);
      } catch (err: any) {
        console.error('Failed to sync CREATE:', op, err);
        
        if (err.response?.status === 404 || err.response?.status === 400) {
          console.log('Removing invalid CREATE operation from pending');
          removePendingOperation(op.id);
        }
      }
    }
  
    for (const op of otherOps) {
      try {
        const itemId = op.item.id;
        
        if (itemId && itemId > 1000000000) {
          console.log(`Skipping ${op.type} on temporary ID: ${itemId}`);
          removePendingOperation(op.id);
          continue;
        }
      
        const realId = tempIdMap.get(itemId!) || itemId;
        
        if (op.type === 'update') {
          await api.put(`/api/items/${realId}`, {
            text: op.item.text,
            completed: op.item.completed,
            version: op.item.version
          });
          console.log(`Synced UPDATE: ${realId}`);
        } else if (op.type === 'delete') {
          await api.delete(`/api/items/${realId}`);
          console.log(`Synced DELETE: ${realId}`);
        }
        
        removePendingOperation(op.id);
      } catch (err: any) {
        console.error(`Failed to sync ${op.type}:`, op, err);
        
        if (err.response?.status === 404) {
          console.log(`Item not found (404), removing from pending: ${op.item.id}`);
          removePendingOperation(op.id);
        }
      }
    }
    
    const remaining = getPendingOperations();
    setPendingOps(remaining);
    setIsSyncing(false);
    
    if (remaining.length === 0) {
      console.log('All operations synced successfully!');
      await fetchItems();
    } else {
      console.log(`${remaining.length} operations still pending`);
    }
  };

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('WebSocket message:', data);
    
    if (data.event === 'created' && data.payload.item) {
      const itemId = data.payload.item!.id;
      
      setItems(prev => {
        const exists = prev.some(item => item.id === itemId);
        if (exists) {
          console.log('Item already exists, skipping');
          return prev;
        }
        console.log('Adding item from WebSocket:', itemId);
        const updated = [data.payload.item!, ...prev];
        return updated.slice(0, limit);
      });
      
      setTotal(prev => {
        const newTotal = prev + 1;
        const newTotalPages = Math.ceil(newTotal / limit);
        setTotalPages(newTotalPages);
        return newTotal;
      });
    } else if (data.event === 'updated' && data.payload.item) {
      console.log('Updating item from WebSocket:', data.payload.item!.id);
      setItems(prev => prev.map(item => 
        item.id === data.payload.item!.id ? data.payload.item! : item
      ));
    } else if (data.event === 'deleted' && data.payload.item) {
      const itemId = data.payload.item!.id;
      console.log('Deleting item from WebSocket:', itemId);
      
      setItems(prev => prev.filter(item => item.id !== itemId));
      
      setTotal(prev => {
        const newTotal = prev - 1;
        const newTotalPages = Math.ceil(newTotal / limit);
        setTotalPages(newTotalPages);
        return newTotal;
      });
    }
  }, [limit]);

  const { isConnected, connectionId } = useWebSocket('ws://localhost:3000', handleWebSocketMessage);

  useEffect(() => {
    if (connectionId) {
      setConnectionId(connectionId);
    }
  }, [connectionId]);

  const handleCreateItem = async (): Promise<void> => {
    if (!newItemText.trim() || newItemText.length < 3) {
      alert('Item text must be at least 3 characters');
      return;
    }

    const newItemData = {
      text: newItemText,
      completed: false
    };

    if (isOnline) {
      try {
        const response = await api.post<Item>('/api/items', newItemData);
        const newItem = response.data;
        
        const newTotal = total + 1;
        setTotal(newTotal);
        
        const newTotalPages = Math.ceil(newTotal / limit);
        setTotalPages(newTotalPages);
        
        setItems(prev => {
          const updated = [newItem, ...prev];
          return updated.slice(0, limit);
        });
        
        setNewItemText('');
        setShowModal(false);
        
        console.log(`Item created online. Total: ${newTotal}, Pages: ${newTotalPages}`);
      } catch (err) {
        console.error('Failed to create item online, saving locally:', err);
        await createItemOffline(newItemData);
      }
    } else {
      await createItemOffline(newItemData);
    }
  };

  const createItemOffline = async (itemData: { text: string; completed: boolean }) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempItem: Item = {
      id: Date.now(),
      text: itemData.text,
      completed: itemData.completed,
      version: 1,
      userId: user?.id || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const pendingOp: PendingOperation = {
      id: tempId,
      type: 'create',
      item: tempItem,
      timestamp: Date.now()
    };
    
    addPendingOperation(pendingOp);
    setPendingOps(prev => [...prev, pendingOp]);
    
    setItems(prev => {
      const updated = [tempItem, ...prev];
      setLocalItems(updated);
      return updated.slice(0, limit);
    });
    
    setTotal(prev => prev + 1);
    setTotalPages(prev => Math.ceil((total + 1) / limit));
    
    setNewItemText('');
    setShowModal(false);
    
    console.log('Item saved offline (pending sync)');
  };

  const handleToggleCompleted = async (item: Item, e: any): Promise<void> => {
    e.stopPropagation();
    
    const updatedData = {
      text: item.text,
      completed: !item.completed,
      version: item.version
    };

    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, completed: !i.completed } : i
    ));

    if (isOnline) {
      try {
        const response = await api.put<Item>(`/api/items/${item.id}`, updatedData);
        const updatedItem = response.data;
        
        setItems(prev => prev.map(i => 
          i.id === updatedItem.id ? updatedItem : i
        ));
      } catch (err: any) {
        console.error('Failed to update item online:', err);
        
        if (err.response?.status === 409) {
          alert('Version conflict! Item was modified by another user. Refreshing...');
          fetchItems();
        } else if (err.response?.status === 404) {
          console.log('Item not found on server, removing from local list');
          setItems(prev => prev.filter(i => i.id !== item.id));
        } else {
          const pendingOp: PendingOperation = {
            id: `update-${item.id}-${Date.now()}`,
            type: 'update',
            item: { ...item, ...updatedData },
            timestamp: Date.now()
          };
          
          addPendingOperation(pendingOp);
          setPendingOps(prev => [...prev, pendingOp]);
          console.log('Update saved offline (pending sync)');
        }
      }
    } else {
      const pendingOp: PendingOperation = {
        id: `update-${item.id}-${Date.now()}`,
        type: 'update',
        item: { ...item, ...updatedData },
        timestamp: Date.now()
      };
      
      addPendingOperation(pendingOp);
      setPendingOps(prev => [...prev, pendingOp]);
      console.log('Update saved offline (pending sync)');
    }
  };

  const handleDeleteItem = async (itemId: number, e: any): Promise<void> => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setItems(prev => prev.filter(item => item.id !== itemId));
    
    const newTotal = total - 1;
    setTotal(newTotal);
    
    const newTotalPages = Math.ceil(newTotal / limit);
    setTotalPages(newTotalPages);
    
    if (page > newTotalPages && newTotalPages > 0) {
      setPage(newTotalPages);
    }

    if (isOnline) {
      try {
        await api.delete(`/api/items/${itemId}`);
        console.log(`Item deleted online: ${itemId}`);
      } catch (err: any) {
        console.error('Failed to delete item online:', err);
        
        if (err.response?.status === 404) {
          console.log('Item already deleted on server');
        } else {
          const pendingOp: PendingOperation = {
            id: `delete-${itemId}-${Date.now()}`,
            type: 'delete',
            item: { id: itemId },
            timestamp: Date.now()
          };
          
          addPendingOperation(pendingOp);
          setPendingOps(prev => [...prev, pendingOp]);
          console.log('Delete saved offline (pending sync)');
        }
      }
    } else {
      const pendingOp: PendingOperation = {
        id: `delete-${itemId}-${Date.now()}`,
        type: 'delete',
        item: { id: itemId },
        timestamp: Date.now()
      };
      
      addPendingOperation(pendingOp);
      setPendingOps(prev => [...prev, pendingOp]);
      console.log('Delete saved offline (pending sync)');
    }
  };

  const handleViewItem = (itemId: number) => {
    history.push(`/items/${itemId}`);
  };

  const handleRefresh = async (event: any) => {
    await fetchItems();
    
    if (isOnline && pendingOps.length > 0) {
      await syncPendingOperations();
    }
    
    event.detail.complete();
  };

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
          <IonTitle>Item Manager</IonTitle>
          <IonButtons slot="end">
            <IonChip>
              <IonIcon icon={isOnline ? wifiOutline : cloudOfflineOutline} />
              <IonLabel>{isOnline ? 'Online' : 'Offline'}</IonLabel>
            </IonChip>
            {isConnected && (
              <IonChip color="success">
                <IonLabel>WS</IonLabel>
              </IonChip>
            )}
            {pendingOps.length > 0 && (
              <IonChip color="warning" onClick={() => setShowPendingAlert(true)}>
                <IonIcon icon={warningOutline} />
                <IonLabel>{pendingOps.length}</IonLabel>
              </IonChip>
            )}
            {isSyncing && (
              <IonChip color="secondary">
                <IonSpinner name="crescent" className="header-chip-spinner" />
              </IonChip>
            )}
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
        
        {pendingOps.length > 0 && (
          <div className="pending-banner">
            <div className="pending-banner-content">
              <IonIcon icon={warningOutline} color="warning" size="small" />
              <IonText color="warning">
                <strong>{pendingOps.length} pending operation(s)</strong> waiting to sync
              </IonText>
            </div>
            
            <div className="pending-banner-actions">
              {isSyncing && (
                <div className="pending-syncing-indicator">
                  <IonSpinner name="crescent" color="warning" style={{ width: '16px', height: '16px' }} />
                  <IonText className="pending-syncing-text">
                    Syncing...
                  </IonText>
                </div>
              )}
              
              {!isOnline && !isSyncing && (
                <IonText className="pending-offline-text">
                  Will sync when online
                </IonText>
              )}
              
              {isOnline && !isSyncing && (
                <IonButton 
                  size="small" 
                  color="warning" 
                  onClick={syncPendingOperations}
                >
                  <IonIcon icon={cloudUploadOutline} slot="start" />
                  Sync Now
                </IonButton>
              )}
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading items...</p>
          </div>
        ) : error ? (
          <IonText color="danger">
            <p className="error-container">{error}</p>
          </IonText>
        ) : items.length === 0 ? (
          <div className="empty-state">
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
                    <h2 className={`item-text ${item.completed ? 'completed' : ''}`}>
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
            
            <div className="pagination-container">
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
                disabled={page === totalPages || totalPages === 0}
                size="small"
              >
                Next
              </IonButton>
            </div>
          </>
        )}
        
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      
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
              className="create-item-modal"
            >
              Create Item
            </IonButton>
          </IonContent>
        </IonModal>
        
        <IonAlert
          isOpen={showPendingAlert}
          onDidDismiss={() => setShowPendingAlert(false)}
          header="Pending Operations"
          message={`You have ${pendingOps.length} operation(s) waiting to be synced to the server. ${isOnline ? 'Click "Sync Now" to sync manually.' : 'They will be automatically synced when you go online.'}`}
          buttons={[
            {
              text: 'OK',
              role: 'cancel'
            },
            isOnline && !isSyncing ? {
              text: 'Sync Now',
              handler: () => {
                syncPendingOperations();
              }
            } : null
          ].filter(Boolean) as any}
        />
      </IonContent>
    </IonPage>
  );
};

export default ItemList;