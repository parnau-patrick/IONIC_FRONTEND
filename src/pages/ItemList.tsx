import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem,
  IonCheckbox, IonButton, IonButtons, IonIcon, IonFab, IonFabButton,
  IonModal, IonInput, IonText, IonSpinner, IonChip, IonBadge,
  IonRefresher, IonRefresherContent, IonAlert, IonDatetime,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle
} from '@ionic/react';

import { 
  addOutline, logOutOutline, trashOutline, wifiOutline,
  cloudOfflineOutline, warningOutline, cloudUploadOutline,
  calendarOutline, filterOutline, statsChartOutline
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import api, { setConnectionId } from '../config/api';
import { 
  Item, ItemsResponse, WebSocketMessage, 
  DateFilterType, DateStatistics 
} from '../types';
import "./styles/itemList.css";
import { 
  getItems as getLocalItems, setItems as setLocalItems,
  getPendingOperations, addPendingOperation,
  removePendingOperation, PendingOperation
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
  
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDateFilterModal, setShowDateFilterModal] = useState<boolean>(false);
  const [dateStats, setDateStats] = useState<DateStatistics | null>(null);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newItemText, setNewItemText] = useState<string>('');
  const [newItemDueDate, setNewItemDueDate] = useState<string>('');
  
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [showPendingAlert, setShowPendingAlert] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
  };

  const isOverdue = (dueDate: string | null | undefined, completed: boolean): boolean => {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date();
  };

  const getDateBadgeColor = (dueDate: string | null | undefined, completed: boolean): string => {
    if (!dueDate) return 'medium';
    if (completed) return 'success';
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'danger';
    if (diffDays === 0) return 'warning';
    if (diffDays === 1) return 'warning';
    if (diffDays <= 7) return 'primary';
    return 'medium';
  };

  const fetchDateStatistics = async () => {
    if (!isOnline) return;
    try {
      const response = await api.get<DateStatistics>('/api/items/statistics');
      setDateStats(response.data);
    } catch (err) {
      console.error('Failed to fetch date statistics:', err);
    }
  };

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
      
      if (searchText) params.append('text', searchText);
      if (filterCompleted !== 'all') params.append('completed', filterCompleted);
      if (dateFilter !== 'all') {
        params.append('dateFilter', dateFilter);
        if (dateFilter === 'custom') {
          if (customStartDate) params.append('customStart', customStartDate);
          if (customEndDate) params.append('customEnd', customEndDate);
        }
      }
      
      const response = await api.get<ItemsResponse>(`/api/items?${params.toString()}`);
      const data = response.data;
      
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setLocalItems(data.items);
      setLoading(false);
      await fetchDateStatistics();
    } catch (err) {
      console.error('Error fetching items:', err);
      const localItems = getLocalItems();
      setItems(localItems);
      setError('Failed to load items from server. Showing cached data.');
      setLoading(false);
    }
  }, [page, searchText, filterCompleted, dateFilter, customStartDate, customEndDate, isOnline]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (isOnline && pendingOps.length > 0 && !isSyncing) {
      syncPendingOperations();
    }
  }, [isOnline, pendingOps.length]);

  const syncPendingOperations = async () => {
    if (pendingOps.length === 0) return;
    setIsSyncing(true);
    
    const createOps = pendingOps.filter(op => op.type === 'create');
    const otherOps = pendingOps.filter(op => op.type !== 'create');
    const tempIdMap = new Map<number, number>();
    
    for (const op of createOps) {
      try {
        const response = await api.post('/api/items', {
          text: op.item.text,
          completed: op.item.completed,
          dueDate: op.item.dueDate || null
        });
        const newItem = response.data;
        if (op.item.id) tempIdMap.set(op.item.id, newItem.id);
        removePendingOperation(op.id);
      } catch (err: any) {
        if (err.response?.status === 404 || err.response?.status === 400) {
          removePendingOperation(op.id);
        }
      }
    }
  
    for (const op of otherOps) {
      try {
        const itemId = op.item.id;
        if (itemId && itemId > 1000000000) {
          removePendingOperation(op.id);
          continue;
        }
        const realId = tempIdMap.get(itemId!) || itemId;
        if (op.type === 'update') {
          await api.put(`/api/items/${realId}`, {
            text: op.item.text,
            completed: op.item.completed,
            version: op.item.version,
            dueDate: op.item.dueDate || null
          });
        } else if (op.type === 'delete') {
          await api.delete(`/api/items/${realId}`);
        }
        removePendingOperation(op.id);
      } catch (err: any) {
        if (err.response?.status === 404) {
          removePendingOperation(op.id);
        }
      }
    }
    
    const remaining = getPendingOperations();
    setPendingOps(remaining);
    setIsSyncing(false);
    if (remaining.length === 0) await fetchItems();
  };

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    if (data.event === 'created' && data.payload.item) {
      setItems(prev => {
        if (prev.some(item => item.id === data.payload.item!.id)) return prev;
        return [data.payload.item!, ...prev].slice(0, limit);
      });
      setTotal(prev => prev + 1);
    } else if (data.event === 'updated' && data.payload.item) {
      setItems(prev => prev.map(item => 
        item.id === data.payload.item!.id ? data.payload.item! : item
      ));
    } else if (data.event === 'deleted' && data.payload.item) {
      setItems(prev => prev.filter(item => item.id !== data.payload.item!.id));
      setTotal(prev => prev - 1);
    }
  }, [limit]);

  const { isConnected, connectionId } = useWebSocket('ws://localhost:3000', handleWebSocketMessage);

  useEffect(() => {
    if (connectionId) setConnectionId(connectionId);
  }, [connectionId]);

  const handleCreateItem = async (): Promise<void> => {
    if (!newItemText.trim() || newItemText.length < 3) {
      alert('Item text must be at least 3 characters');
      return;
    }

    const newItemData = {
      text: newItemText,
      completed: false,
      dueDate: newItemDueDate || null
    };

    if (isOnline) {
      try {
        const response = await api.post<Item>('/api/items', newItemData);
        setItems(prev => [response.data, ...prev].slice(0, limit));
        setTotal(prev => prev + 1);
        setNewItemText('');
        setNewItemDueDate('');
        setShowModal(false);
      } catch (err) {
        await createItemOffline(newItemData);
      }
    } else {
      await createItemOffline(newItemData);
    }
  };

  const createItemOffline = async (itemData: { text: string; completed: boolean; dueDate: string | null }) => {
    const tempItem: Item = {
      id: Date.now(),
      text: itemData.text,
      completed: itemData.completed,
      version: 1,
      userId: user?.id || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: itemData.dueDate
    };
    
    const pendingOp = {
      id: `temp-${Date.now()}`,
      type: 'create' as const,
      item: tempItem,
      timestamp: Date.now()
    };
    
    addPendingOperation(pendingOp);
    setPendingOps(prev => [...prev, pendingOp]);
    
    setItems(prev => {
      const updated = [tempItem, ...prev].slice(0, limit);
      setLocalItems(updated);
      return updated;
    });
    setNewItemText('');
    setNewItemDueDate('');
    setShowModal(false);
  };

  const handleToggleCompleted = async (item: Item, e: any): Promise<void> => {
    e.stopPropagation();
    
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, completed: !i.completed } : i
    ));

    const updatedData = {
      text: item.text,
      completed: !item.completed,
      version: item.version,
      dueDate: item.dueDate || null
    };

    if (isOnline) {
      try {
        const response = await api.put<Item>(`/api/items/${item.id}`, updatedData);
        setItems(prev => prev.map(i => i.id === response.data.id ? response.data : i));
      } catch (err: any) {
        if (err.response?.status === 409) {
          fetchItems();
        } else {
          const pendingOp = {
            id: `update-${item.id}-${Date.now()}`,
            type: 'update' as const,
            item: { ...item, ...updatedData },
            timestamp: Date.now()
          };
          addPendingOperation(pendingOp);
          setPendingOps(prev => [...prev, pendingOp]);
        }
      }
    } else {
      const pendingOp = {
        id: `update-${item.id}-${Date.now()}`,
        type: 'update' as const,
        item: { ...item, ...updatedData },
        timestamp: Date.now()
      };
      addPendingOperation(pendingOp);
      setPendingOps(prev => [...prev, pendingOp]);
    }
  };

  const handleDeleteItem = async (itemId: number, e: any): Promise<void> => {
    e.stopPropagation();
    if (!confirm('Are you sure?')) return;
    
    setItems(prev => prev.filter(item => item.id !== itemId));
    setTotal(prev => prev - 1);

    if (isOnline) {
      try {
        await api.delete(`/api/items/${itemId}`);
      } catch (err: any) {
        if (err.response?.status !== 404) {
          const pendingOp = {
            id: `delete-${itemId}-${Date.now()}`,
            type: 'delete' as const,
            item: { id: itemId },
            timestamp: Date.now()
          };
          addPendingOperation(pendingOp);
          setPendingOps(prev => [...prev, pendingOp]);
        }
      }
    } else {
      const pendingOp = {
        id: `delete-${itemId}-${Date.now()}`,
        type: 'delete' as const,
        item: { id: itemId },
        timestamp: Date.now()
      };
      addPendingOperation(pendingOp);
      setPendingOps(prev => [...prev, pendingOp]);
    }
  };

  const handleViewItem = (itemId: number) => history.push(`/items/${itemId}`);
  
  const handleRefresh = async (event: any) => {
    await fetchItems();
    if (isOnline && pendingOps.length > 0) await syncPendingOperations();
    event.detail.complete();
  };

  const handleDateFilterChange = (newFilter: DateFilterType) => {
    setDateFilter(newFilter);
    setPage(1);
    if (newFilter !== 'custom') setShowDateFilterModal(false);
  };

  const applyCustomDateFilter = () => {
    if (!customStartDate && !customEndDate) {
      alert('Please select at least a start or end date');
      return;
    }
    setDateFilter('custom');
    setPage(1);
    setShowDateFilterModal(false);
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
            {isConnected && <IonChip color="success"><IonLabel>WS</IonLabel></IonChip>}
            {pendingOps.length > 0 && (
              <IonChip color="warning" onClick={() => setShowPendingAlert(true)}>
                <IonIcon icon={warningOutline} />
                <IonLabel>{pendingOps.length}</IonLabel>
              </IonChip>
            )}
            <IonButton onClick={logout}><IonIcon icon={logOutOutline} /></IonButton>
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
          <IonSegment value={filterCompleted} onIonChange={(e) => {
            setFilterCompleted(e.detail.value as string || 'all');
            setPage(1);
          }}>
            <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="false"><IonLabel>Incomplete</IonLabel></IonSegmentButton>
            <IonSegmentButton value="true"><IonLabel>Completed</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>

        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => setShowDateFilterModal(true)}>
              <IonIcon icon={filterOutline} slot="start" />
              <IonLabel>
                {dateFilter === 'all' && 'All Dates'}
                {dateFilter === 'today' && 'Today'}
                {dateFilter === 'tomorrow' && 'Tomorrow'}
                {dateFilter === 'this-week' && 'This Week'}
                {dateFilter === 'overdue' && 'Overdue'}
                {dateFilter === 'custom' && 'Custom Range'}
              </IonLabel>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        
        {pendingOps.length > 0 && (
          <div className="pending-banner">
            <IonText color="warning">
              <strong>{pendingOps.length} pending operation(s)</strong>
            </IonText>
            {isOnline && !isSyncing && (
              <IonButton size="small" color="warning" onClick={syncPendingOperations}>
                Sync Now
              </IonButton>
            )}
          </div>
        )}

        {dateStats && dateFilter === 'all' && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle><IonIcon icon={statsChartOutline} /> Quick Stats</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="stats-grid">
                <div onClick={() => handleDateFilterChange('overdue')}>
                  <IonBadge color="danger">{dateStats.overdue}</IonBadge>
                  <IonLabel>Overdue</IonLabel>
                </div>
                <div onClick={() => handleDateFilterChange('today')}>
                  <IonBadge color="warning">{dateStats.today}</IonBadge>
                  <IonLabel>Today</IonLabel>
                </div>
                <div onClick={() => handleDateFilterChange('this-week')}>
                  <IonBadge color="primary">{dateStats.thisWeek}</IonBadge>
                  <IonLabel>This Week</IonLabel>
                </div>
                <div onClick={() => handleDateFilterChange('no-date')}>
                  <IonBadge color="medium">{dateStats.noDate}</IonBadge>
                  <IonLabel>No Date</IonLabel>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        )}
        
        {loading ? (
          <div className="loading-container">
            <IonSpinner />
            <p>Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <IonText color="medium"><p>No items found.</p></IonText>
          </div>
        ) : (
          <IonList>
            {items.map(item => (
              <IonItem key={item.id} button onClick={() => handleViewItem(item.id)}>
                <IonCheckbox
                  slot="start"
                  checked={item.completed}
                  onIonChange={(e) => handleToggleCompleted(item, e)}
                />
                <IonLabel>
                  <h2 className={item.completed ? 'completed' : ''}>{item.text}</h2>
                  <p>
                    <IonBadge color="light">v{item.version}</IonBadge>
                    {' • '}
                    {new Date(item.createdAt).toLocaleDateString()}
                    {item.dueDate && (
                      <>
                        {' • '}
                        <IonBadge color={getDateBadgeColor(item.dueDate, item.completed)}>
                          <IonIcon icon={calendarOutline} />
                          {formatDate(item.dueDate)}
                          {isOverdue(item.dueDate, item.completed) && ' (OVERDUE)'}
                        </IonBadge>
                      </>
                    )}
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
        )}
        
        {/* ✨ PAGINARE - Butoane Previous/Next */}
        {!loading && items.length > 0 && (
          <div className="pagination-container">
            <IonButton 
              disabled={page === 1} 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </IonButton>
            
            <IonText>
              <p>
                Page {page} of {totalPages} ({total} total items)
              </p>
            </IonText>
            
            <IonButton 
              disabled={page >= totalPages} 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next
            </IonButton>
          </div>
        )}
        
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      
        {/* Modal Create */}
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
              <IonLabel position="floating">Item Text</IonLabel>
              <IonInput
                value={newItemText}
                onIonChange={(e) => setNewItemText(e.detail.value || '')}
                maxlength={200}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Due Date (Optional)</IonLabel>
              <IonDatetime
                value={newItemDueDate}
                onIonChange={(e) => setNewItemDueDate(e.detail.value as string || '')}
                presentation="date"
                min={new Date().toISOString()}
              />
            </IonItem>
            <IonButton expand="block" onClick={handleCreateItem} style={{marginTop: '20px'}}>
              Create Item
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Modal Date Filter */}
        <IonModal isOpen={showDateFilterModal} onDidDismiss={() => setShowDateFilterModal(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Filter by Date</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDateFilterModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem button onClick={() => handleDateFilterChange('all')}>
                <IonLabel>All Dates</IonLabel>
              </IonItem>
              <IonItem button onClick={() => handleDateFilterChange('today')}>
                <IonLabel>Today</IonLabel>
              </IonItem>
              <IonItem button onClick={() => handleDateFilterChange('tomorrow')}>
                <IonLabel>Tomorrow</IonLabel>
              </IonItem>
              <IonItem button onClick={() => handleDateFilterChange('this-week')}>
                <IonLabel>This Week</IonLabel>
              </IonItem>
              <IonItem button onClick={() => handleDateFilterChange('overdue')}>
                <IonLabel color="danger">Overdue</IonLabel>
              </IonItem>
            </IonList>
            
            <IonCard>
              <IonCardHeader><IonCardTitle>Custom Range</IonCardTitle></IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="stacked">Start Date</IonLabel>
                  <IonDatetime
                    value={customStartDate}
                    onIonChange={(e) => setCustomStartDate(e.detail.value as string || '')}
                    presentation="date"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">End Date</IonLabel>
                  <IonDatetime
                    value={customEndDate}
                    onIonChange={(e) => setCustomEndDate(e.detail.value as string || '')}
                    presentation="date"
                  />
                </IonItem>
                <IonButton expand="block" onClick={applyCustomDateFilter} style={{marginTop: '10px'}}>
                  Apply Custom Filter
                </IonButton>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default ItemList;