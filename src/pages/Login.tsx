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
  IonSpinner
} from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { LoginFormData } from '../types';

const Login = () => {
  const history = useHistory();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.username, formData.password);
    
    setLoading(false);

    if (result.success) {
      history.push('/items');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Login</IonTitle>
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
              <IonCardTitle>Welcome Back!</IonCardTitle>
              <IonCardSubtitle>Sign in to your account</IonCardSubtitle>
            </IonCardHeader>
            
            <IonCardContent>
              {error && (
                <IonText color="danger">
                  <p>{error}</p>
                </IonText>
              )}
              
              <form onSubmit={handleSubmit}>
                <IonItem>
                  <IonLabel position="floating">Username</IonLabel>
                  <IonInput
                    type="text"
                    value={formData.username}
                    onIonChange={(e) => setFormData({...formData, username: e.detail.value!})}
                    required
                  />
                </IonItem>
                
                <IonItem>
                  <IonLabel position="floating">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={formData.password}
                    onIonChange={(e) => setFormData({...formData, password: e.detail.value!})}
                    required
                  />
                </IonItem>
                
                <IonButton 
                  expand="block" 
                  type="submit" 
                  disabled={loading}
                  style={{ marginTop: '20px' }}
                >
                  {loading ? <IonSpinner name="crescent" /> : 'Login'}
                </IonButton>
              </form>
              
              <IonText color="medium" style={{ textAlign: 'center', display: 'block', marginTop: '20px' }}>
                Don't have an account? <a href="/register">Register here</a>
              </IonText>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;