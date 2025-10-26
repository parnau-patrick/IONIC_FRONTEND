import React, { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCheckbox,
  IonLoading,
  IonToast,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { itemApi } from '../api/itemApi';

const ItemForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new';
  const [text, setText] = useState('');
  const [completed, setCompleted] = useState(false);
  const [version, setVersion] = useState(1);
  const [itemId, setItemId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useHistory();

  useEffect(() => {
    if (isEdit) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const data = await itemApi.getItemById(parseInt(id));
      setText(data.text);
      setCompleted(data.completed);
      setVersion(data.version);
      setItemId(data.id);
    } catch (err) {
      console.error('Error loading item:', err);
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Text is required');
      return;
    }

    if (text.length < 3) {
      setError('Text must be at least 3 characters');
      return;
    }

    try {
      setLoading(true);
      if (isEdit) {
        await itemApi.updateItem(itemId, {
          id: itemId,
          text,
          completed,
          version,
          date: new Date(),
        });
      } else {
        await itemApi.createItem({
          text,
          completed,
        });
      }
      history.push('/items');
    } catch (err: any) {
      console.error('Error saving item:', err);
      if (err.response?.status === 409) {
        setError('Version conflict! Item was modified by another user. Refreshing...');
        await loadItem();
      } else {
        setError('Failed to save item');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/items" />
          </IonButtons>
          <IonTitle>{isEdit ? 'Edit Item' : 'New Item'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonLoading isOpen={loading} message={isEdit ? 'Loading...' : 'Saving...'} />

        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError(null)}
          message={error || ''}
          duration={3000}
          color="danger"
        />

        <IonItem>
          <IonLabel position="stacked">Text *</IonLabel>
          <IonInput
            value={text}
            onIonInput={(e) => setText(e.detail.value!)}
            placeholder="Enter item text"
            required
          />
        </IonItem>

        <IonItem>
          <IonLabel>Completed</IonLabel>
          <IonCheckbox
            slot="start"
            checked={completed}
            onIonChange={(e) => setCompleted(e.detail.checked)}
          />
        </IonItem>

        <div style={{ padding: '20px' }}>
          <IonButton expand="block" onClick={handleSubmit}>
            {isEdit ? 'Update Item' : 'Create Item'}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ItemForm;