import { useState, FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon
} from '@ionic/react';
import { personAddOutline, personOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { RegisterFormData } from '../types';

const Register = () => {
  const history = useHistory();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    // Validare client-side
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register(
      formData.username,
      formData.email,
      formData.password
    );
    
    setLoading(false);

    if (result.success) {
      history.push('/items');
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Register</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '80vh' 
        }}>
          <IonCard style={{ width: '100%', maxWidth: '500px' }}>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={personAddOutline} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                Create Account
              </IonCardTitle>
              <IonCardSubtitle>Sign up to get started</IonCardSubtitle>
            </IonCardHeader>
            
            <IonCardContent>
              {error && (
                <IonText color="danger">
                  <p style={{ 
                    padding: '10px', 
                    backgroundColor: 'rgba(255, 0, 0, 0.1)', 
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    {error}
                  </p>
                </IonText>
              )}
              
              <form onSubmit={handleSubmit}>
                <IonItem>
                  <IonLabel position="floating">
                    <IonIcon icon={personOutline} style={{ marginRight: '5px' }} />
                    Username
                  </IonLabel>
                  <IonInput
                    type="text"
                    value={formData.username}
                    onIonChange={(e) => setFormData({...formData, username: e.detail.value!})}
                    required
                    minlength={3}
                    maxlength={50}
                  />
                </IonItem>
                
                <IonItem>
                  <IonLabel position="floating">
                    <IonIcon icon={mailOutline} style={{ marginRight: '5px' }} />
                    Email
                  </IonLabel>
                  <IonInput
                    type="email"
                    value={formData.email}
                    onIonChange={(e) => setFormData({...formData, email: e.detail.value!})}
                    required
                  />
                </IonItem>
                
                <IonItem>
                  <IonLabel position="floating">
                    <IonIcon icon={lockClosedOutline} style={{ marginRight: '5px' }} />
                    Password
                  </IonLabel>
                  <IonInput
                    type="password"
                    value={formData.password}
                    onIonChange={(e) => setFormData({...formData, password: e.detail.value!})}
                    required
                    minlength={6}
                  />
                </IonItem>
                
                <IonItem>
                  <IonLabel position="floating">
                    <IonIcon icon={lockClosedOutline} style={{ marginRight: '5px' }} />
                    Confirm Password
                  </IonLabel>
                  <IonInput
                    type="password"
                    value={formData.confirmPassword}
                    onIonChange={(e) => setFormData({...formData, confirmPassword: e.detail.value!})}
                    required
                  />
                </IonItem>
                
                <IonButton 
                  expand="block" 
                  type="submit" 
                  disabled={loading}
                  style={{ marginTop: '20px' }}
                >
                  {loading ? <IonSpinner name="crescent" /> : 'Register'}
                </IonButton>
              </form>
              
              <IonText color="medium" style={{ textAlign: 'center', display: 'block', marginTop: '20px' }}>
                Already have an account? <a href="/login" style={{ color: 'var(--ion-color-primary)' }}>Login here</a>
              </IonText>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;