import { useState, FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonButton, IonText, IonSpinner, IonIcon
} from '@ionic/react';
import { personAddOutline, personOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { RegisterFormData } from '../types';

import "./styles/register.css";

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
        <div className="register-wrapper">
          <IonCard className="register-card">
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={personAddOutline} className="icon-inline" />
                Create Account
              </IonCardTitle>
              <IonCardSubtitle>Sign up to get started</IonCardSubtitle>
            </IonCardHeader>

            <IonCardContent>
              {error && (
                <IonText color="danger">
                  <p className="error-box">{error}</p>
                </IonText>
              )}

              <form onSubmit={handleSubmit}>
                <IonItem>
                  <IonLabel position="stacked">
                    <IonIcon icon={personOutline} className="icon-label" />
                    Username
                  </IonLabel>
                  <IonInput
                    type="text"
                    value={formData.username}
                    onIonChange={(e) => setFormData({ ...formData, username: e.detail.value! })}
                    required
                    minlength={3}
                    maxlength={50}
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">
                    <IonIcon icon={mailOutline} className="icon-label" />
                    Email
                  </IonLabel>
                  <IonInput
                    type="email"
                    value={formData.email}
                    onIonChange={(e) => setFormData({ ...formData, email: e.detail.value! })}
                    required
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">
                    <IonIcon icon={lockClosedOutline} className="icon-label" />
                    Password
                  </IonLabel>
                  <IonInput
                    type="password"
                    value={formData.password}
                    onIonChange={(e) => setFormData({ ...formData, password: e.detail.value! })}
                    required
                    minlength={6}
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">
                    <IonIcon icon={lockClosedOutline} className="icon-label" />
                    Confirm Password
                  </IonLabel>
                  <IonInput
                    type="password"
                    value={formData.confirmPassword}
                    onIonChange={(e) => setFormData({ ...formData, confirmPassword: e.detail.value! })}
                    required
                  />
                </IonItem>

                <IonButton
                  expand="block"
                  type="submit"
                  disabled={loading}
                  className="mt-20"
                >
                  {loading ? <IonSpinner name="crescent" /> : 'Register'}
                </IonButton>
              </form>

              <IonText color="medium" className="text-center" style={{ display: 'block', marginTop: '20px' }}>
                Already have an account? <a href="/login" className="link-primary">Login here</a>
              </IonText>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
