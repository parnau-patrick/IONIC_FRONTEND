import { useState, useEffect, FormEvent } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonButtons,
  IonBackButton,
  IonCheckbox,
  IonText,
  IonSpinner,
  IonIcon,
  IonBadge
} from '@ionic/react';
import { trashOutline, createOutline, saveOutline, closeOutline } from 'ionicons/icons';
import api from '../config/api';
import { Item } from '../types';

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');

  // Fetch item
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const response = await api.get<Item>(`/api/items/${id}`);
        setItem(response.data);
        setEditText(response.data.text);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching item:', err);
        setError('Failed to load item');
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  // Update item
  const handleUpdate = async (): Promise<void> => {
    if (!editText.trim() || editText.length < 3) {
      alert('Item text must be at least 3 characters');
      return;
    }

    if (!item) return;

    try {
      const response = await api.put<Item>(`/api/items/${id}`, {
        text: editText,
        completed: item.completed,
        version: item.version
      });
      
      setItem(response.data);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating item:', err);
      
      if (err.response?.status === 409) {
        alert('Version conflict! Item was modified. Refreshing...');
        window.location.reload();
      } else {
        alert('Failed to update item');
      }
    }
  };

  // Toggle completed
  const handleToggleCompleted = async (): Promise<void> => {
    if (!item) return;

    try {
      const response = await api.put<Item>(`/api/items/${id}`, {
        text: item.text,
        completed: !item.completed,
        version: item.version
      });
      
      setItem(response.data);
    } catch (err: any) {
      console.error('Error updating item:', err);
      
      if (err.response?.status === 409) {
        alert('Version conflict! Item was modified. Refreshing...');
        window.location.reload();
      } else {
        alert('Failed to update item');
      }
    }
  };

  // Delete item
  const handleDelete = async (): Promise<void> => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await api.delete(`/api/items/${id}`);
      history.push('/items');
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/items" />
            </IonButtons>
            <IonTitle>Item Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <IonSpinner name="crescent" />
            <p>Loading item...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !item) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/items" />
            </IonButtons>
            <IonTitle>Item Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText color="danger">
            <p style={{ textAlign: 'center', marginTop: '50px' }}>
              {error || 'Item not found'}
            </p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/items" />
          </IonButtons>
          <IonTitle>Item Details</IonTitle>
          <IonButtons slot="end">
            {isEditing ? (
              <>
                <IonButton onClick={handleUpdate}>
                  <IonIcon icon={saveOutline} />
                </IonButton>
                <IonButton onClick={() => {
                  setIsEditing(false);
                  setEditText(item.text);
                }}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </>
            ) : (
              <>
                <IonButton onClick={() => setIsEditing(true)}>
                  <IonIcon icon={createOutline} />
                </IonButton>
                <IonButton onClick={handleDelete} color="danger">
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              {item.completed ? '✅' : '⏳'} {isEditing ? 'Edit Item' : 'Item Information'}
            </IonCardTitle>
          </IonCardHeader>
          
          <IonCardContent>
            {isEditing ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Item Text</IonLabel>
                  <IonTextarea
                    value={editText}
                    onIonChange={(e) => setEditText(e.detail.value!)}
                    rows={3}
                    minlength={3}
                    maxlength={200}
                    autoGrow
                  />
                </IonItem>
              </>
            ) : (
              <>
                <IonItem lines="none">
                  <IonCheckbox
                    checked={item.completed}
                    onIonChange={handleToggleCompleted}
                    slot="start"
                  />
                  <IonLabel>
                    <h2>Status</h2>
                    <p>{item.completed ? '✅ Completed' : '⏳ Incomplete'}</p>
                  </IonLabel>
                </IonItem>
                
                <IonItem>
                  <IonLabel>
                    <h2>Text</h2>
                    <p style={{ 
                      whiteSpace: 'pre-wrap',
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? 'var(--ion-color-medium)' : 'inherit'
                    }}>
                      {item.text}
                    </p>
                  </IonLabel>
                </IonItem>
                
                <IonItem>
                  <IonLabel>
                    <h2>Version</h2>
                    <p><IonBadge color="primary">v{item.version}</IonBadge></p>
                  </IonLabel>
                </IonItem>
                
                <IonItem>
                  <IonLabel>
                    <h2>Created</h2>
                    <p>{new Date(item.createdAt).toLocaleString()}</p>
                  </IonLabel>
                </IonItem>
                
                <IonItem>
                  <IonLabel>
                    <h2>Last Updated</h2>
                    <p>{new Date(item.updatedAt).toLocaleString()}</p>
                  </IonLabel>
                </IonItem>
              </>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default ItemDetail;