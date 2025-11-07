import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeRole = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          console.log("🔄 Verificando usuario en Firestore...");
          
          // Verificar si el usuario existe en Firestore
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            // Usuario existe, obtener su rol
            const userData = userDoc.data();
            console.log("✅ Usuario encontrado:", userData);
            setUserRole(userData.role || 'student');
          } else {
            // Usuario nuevo, crear documento
            console.log("🆕 Creando nuevo usuario...");
            await setDoc(userRef, {
              email: user.email,
              name: user.displayName || user.email,
              role: 'student', // Rol por defecto
              createdAt: new Date()
            });
            setUserRole('student');
          }
          
          // Escuchar cambios en tiempo real
          unsubscribeRole = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setUserRole(doc.data().role);
            }
          });
          
        } catch (error) {
          console.error('❌ Error en useUserRole:', error);
          setUserRole('student'); // Rol por defecto en caso de error
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRole();
    };
  }, []);

  const updateUserRole = async (userId, newRole) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        role: newRole
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      return false;
    }
  };

  return {
    userRole,
    loading,
    updateUserRole
  };
};