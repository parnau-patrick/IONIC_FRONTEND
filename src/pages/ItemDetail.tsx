import React, { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonLoading,
  IonAlert,
} from '@ionic/react';
import { create, trash, checkmarkCircle, closeCircle } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { itemApi } from '../api/itemApi';
import { Item } from '../types/Item';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const history = useHistory();

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const data = await itemApi.getItemById(parseInt(id));
      setItem(data);
    } catch (error) {
      console.error('Error loading item:', error);
      history.push('/items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (item) {
      try {
        await itemApi.deleteItem(item.id);
        history.push('/items');
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/items" />
          </IonButtons>
          <IonTitle>Item Details</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push(`/item/edit/${id}`)}>
              <IonIcon icon={create} />
            </IonButton>
            <IonButton color="danger" onClick={() => setShowDeleteAlert(true)}>
              <IonIcon icon={trash} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonLoading isOpen={loading} message="Loading item..." />

        {item && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{item.text}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel>
                  <h3>ID</h3>
                  <p>{item.id}</p>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Status</h3>
                </IonLabel>
                <IonBadge slot="end" color={item.completed ? 'success' : 'warning'}>
                  <IonIcon icon={item.completed ? checkmarkCircle : closeCircle} />
                  {item.completed ? ' Completed' : ' Incomplete'}
                </IonBadge>
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Version</h3>
                  <p>{item.version}</p>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Date Created</h3>
                  <p>{new Date(item.date).toLocaleString()}</p>
                </IonLabel>
              </IonItem>
            </IonCardContent>
          </IonCard>
        )}

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Item"
          message="Are you sure you want to delete this item?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ItemDetail;