import { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider 
} from '../services/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Función para normalizar emails (convertir a mayúsculas)
  const normalizeEmail = (email) => {
    return email.trim().toUpperCase();
  };

  // Login con Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Registro con email y contraseña (acepta cualquier email)
  const registerWithEmail = async (email, password, displayName) => {
    try {
      setLoading(true);
      
      // Normalizar email a mayúsculas
      const normalizedEmail = normalizeEmail(email);
      const normalizedDisplayName = displayName ? displayName.toUpperCase() : '';
      
      console.log('📧 Registrando con email:', normalizedEmail);
      
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      
      // Actualizar perfil con nombre en mayúsculas
      if (normalizedDisplayName) {
        await updateProfile(result.user, {
          displayName: normalizedDisplayName
        });
      }
      
      return result.user;
    } catch (error) {
      console.error('Error al registrar:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login con email y contraseña (acepta cualquier email)
  const loginWithEmail = async (email, password) => {
    try {
      setLoading(true);
      
      // Normalizar email a mayúsculas
      const normalizedEmail = normalizeEmail(email);
      console.log('🔐 Iniciando sesión con email:', normalizedEmail);
      
      const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Recuperar contraseña
  const resetPassword = async (email) => {
    try {
      // Normalizar email a mayúsculas
      const normalizedEmail = normalizeEmail(email);
      console.log('📨 Enviando recuperación a:', normalizedEmail);
      
      await sendPasswordResetEmail(auth, normalizedEmail);
      return true;
    } catch (error) {
      console.error('Error al enviar email de recuperación:', error);
      throw error;
    }
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    logout
  };
};