import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const StudentDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  
  const [formData, setFormData] = useState({
    documentNumber: '',
    institution: '',
    program: '',
    startDate: '',
    endDate: '',
    plantType: '',
    plantLocation: '',
    activities: ''
  });

  const siteConfig = {
    name: 'TRUSTIFY',
    description: 'SISTEMA DE CERTIFICACIÓN',
    logo: '🔒',
    primaryColor: '#1d3763',
    secondaryColor: '#2d4d85'
  };

  // Listener SIMPLIFICADO - sin orderBy que cause error
  useEffect(() => {
    const loadApplications = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No hay usuario autenticado');
        setLoadingApplications(false);
        return;
      }

      console.log('👤 Usuario actual:', user.uid);
      
      try {
        setLoadingApplications(true);
        
        // Query SIMPLIFICADA - solo el where, sin orderBy
        const q = query(
          collection(db, 'internshipApplications'), 
          where('studentId', '==', user.uid)
          // Removido: orderBy('createdAt', 'desc') - esto causa el error
        );

        console.log('🔍 Query creada (sin orderBy)...');

        // Configurar listener en tiempo real
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            console.log('✅ Datos recibidos de Firestore');
            console.log('📊 Número de documentos:', snapshot.size);
            
            if (snapshot.empty) {
              console.log('📭 No se encontraron solicitudes');
              setMyApplications([]);
              setLoadingApplications(false);
              return;
            }

            const applications = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              
              applications.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date()
              });
            });

            // ORDENAR MANUALMENTE por fecha de creación (más reciente primero)
            applications.sort((a, b) => {
              const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
              const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
              return dateB - dateA; // Orden descendente (más reciente primero)
            });
            
            console.log('🎯 Solicitudes procesadas y ordenadas:', applications.length);
            setMyApplications(applications);
            setLoadingApplications(false);
          },
          (error) => {
            console.error('❌ Error en listener de Firestore:', error);
            showMessage('error', 'Error al cargar solicitudes');
            setLoadingApplications(false);
          }
        );

        return () => unsubscribe();

      } catch (error) {
        console.error('❌ Error configurando listener:', error);
        showMessage('error', 'Error de conexión');
        setLoadingApplications(false);
      }
    };

    loadApplications();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      // Validaciones básicas
      if (!formData.documentNumber || !formData.institution || !formData.program || 
          !formData.startDate || !formData.endDate || !formData.plantType || 
          !formData.plantLocation || !formData.activities) {
        throw new Error('POR FAVOR COMPLETA TODOS LOS CAMPOS REQUERIDOS');
      }

      // Validación de fechas
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('FECHAS INVÁLIDAS');
      }
      
      const monthsDiff = (end - start) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsDiff < 6) {
        throw new Error('LA DURACIÓN MÍNIMA DEBE SER DE 6 MESES');
      }
      
      if (monthsDiff > 9) {
        throw new Error('LA DURACIÓN MÁXIMA DEBE SER DE 9 MESES');
      }

      // Preparar datos
      const userName = user.displayName || 'Usuario';
      const nameParts = userName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const applicationData = {
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        documentNumber: formData.documentNumber.toUpperCase(),
        institution: formData.institution.toUpperCase(),
        program: formData.program.toUpperCase(),
        studentName: userName.toUpperCase(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        plantType: formData.plantType.toUpperCase(),
        plantLocation: formData.plantLocation.toUpperCase(),
        activities: formData.activities.toUpperCase(),
        studentId: user.uid,
        studentEmail: user.email,
        status: 'pending',
        verificationCode: generateVerificationCode(),
        createdAt: new Date(), // Fecha actual para ordenamiento
        updatedAt: new Date()
      };

      // Guardar en Firestore
      await addDoc(collection(db, 'internshipApplications'), applicationData);

      // Limpiar formulario
      setFormData({
        documentNumber: '',
        institution: '',
        program: '',
        startDate: '',
        endDate: '',
        plantType: '',
        plantLocation: '',
        activities: ''
      });
      
      setShowForm(false);
      showMessage('success', '✅ SOLICITUD ENVIADA CORRECTAMENTE');
      
    } catch (error) {
      console.error('❌ Error al enviar solicitud:', error);
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TRF-${timestamp}-${random}`.toUpperCase();
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          text: 'APROBADA',
        };
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          text: 'RECHAZADA', 
        };
      case 'under_review':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          text: 'EN REVISIÓN', 
        };
      default:
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          text: 'PENDIENTE', 
        };
    }
  };

  const showMessage = (type, text) => {
    const existingMessages = document.querySelectorAll('.custom-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `custom-message fixed top-20 right-4 z-50 p-4 rounded-2xl border-l-4 transform transition-all duration-500 font-nunito ${
      type === 'error' 
        ? 'bg-red-50 text-red-700 border-red-400 shadow-lg' 
        : 'bg-green-50 text-green-700 border-green-400 shadow-lg'
    }`;
    messageDiv.innerHTML = `
      <div class="flex items-center">
        <span class="text-lg mr-2">${type === 'error' ? '❌' : '✅'}</span>
        <span class="font-medium font-nunito">${text}</span>
      </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  };

  const getApplicationCounts = () => {
    return {
      total: myApplications.length,
      pending: myApplications.filter(app => !app.status || app.status === 'pending').length,
      approved: myApplications.filter(app => app.status === 'approved').length,
      rejected: myApplications.filter(app => app.status === 'rejected').length,
      underReview: myApplications.filter(app => app.status === 'under_review').length
    };
  };

  const formatTextToUpperCase = (text) => {
    return text ? text.toUpperCase() : '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  const getPlantLocationOptions = (plantType) => {
    if (plantType === 'INTERNA') {
      return [
        'GIT ADMINISTRACIÓN DE PERSONAL',
        'GIT PRESTACIONES SOCIALES',
        'GIT DE REFUGIO'
      ];
    } else if (plantType === 'EXTERNA') {
      return [
        'CONSULADO DE BARCELONA',
        'EMBAJADA DE BERLIN (ALEMANIA)',
        'MISIÓN DE LA ONU EN WASHINGTON D.C'
      ];
    }
    return [];
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(0, months);
    } catch {
      return 0;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showMessage('success', '👋 SESIÓN CERRADA CORRECTAMENTE');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      showMessage('error', '❌ ERROR AL CERRAR SESIÓN');
    }
  };

  const CertificatePreview = ({ application }) => {
    const duration = calculateDuration(application.startDate, application.endDate);
    
    return (
      <div id="certificate-preview" className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto scale-90 sm:scale-95 md:scale-100">
        <div className={`bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4 md:p-6 text-center text-white mb-4 sm:mb-6 md:mb-8`}>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold font-nunito mb-1 sm:mb-2">CERTIFICADO DE PASANTÍA</h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-light font-nunito">SISTEMA DE CERTIFICACIÓN INTELIGENTE</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 mb-4 sm:mb-6 text-center">
          <p className="text-xs font-semibold text-yellow-800 font-nunito mb-1">CÓDIGO DE VERIFICACIÓN ÚNICO</p>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-blue-600 font-mono tracking-wider">
            {application.verificationCode || application.id}
          </p>
          <p className="text-xs text-yellow-600 mt-1 sm:mt-2 font-nunito">CÓDIGO PARA VERIFICAR AUTENTICIDAD</p>
        </div>

        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 md:mb-6 font-nunito">SE CERTIFICA QUE</p>
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-600 font-nunito leading-tight">
            {formatTextToUpperCase(application.firstName)} {formatTextToUpperCase(application.lastName)}
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 md:mb-4 font-nunito">IDENTIFICADO CON DOCUMENTO NÚMERO</p>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-blue-500 mb-3 sm:mb-4 font-nunito">
            {formatTextToUpperCase(application.documentNumber)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4">
            <h3 className="font-semibold text-blue-600 mb-2 font-nunito text-xs sm:text-sm">INFORMACIÓN ACADÉMICA</h3>
            <p className="text-xs mb-1 font-nunito"><strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(application.institution)}</p>
            <p className="text-xs mb-1 font-nunito"><strong>PROGRAMA:</strong> {formatTextToUpperCase(application.program)}</p>
            <p className="text-xs font-nunito"><strong>DURACIÓN:</strong> {duration} MESES</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4">
            <h3 className="font-semibold text-blue-600 mb-2 font-nunito text-xs sm:text-sm">📅 PERIODO</h3>
            <p className="text-xs mb-1 font-nunito"><strong>INICIO:</strong> {formatDate(application.startDate)}</p>
            <p className="text-xs mb-1 font-nunito"><strong>FIN:</strong> {formatDate(application.endDate)}</p>
            <p className="text-xs mb-1 font-nunito"><strong>PLANTA:</strong> {formatTextToUpperCase(application.plantType)}</p>
            <p className="text-xs font-nunito"><strong>UBICACIÓN:</strong> {formatTextToUpperCase(application.plantLocation)}</p>
          </div>
        </div>

        {application.activities && (
          <div className="bg-blue-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 mb-4 sm:mb-6 md:mb-8">
            <h3 className="font-semibold text-blue-600 mb-2 font-nunito text-xs sm:text-sm">🎯 ACTIVIDADES REALIZADAS</h3>
            <p className="text-xs text-gray-700 leading-relaxed font-nunito">{formatTextToUpperCase(application.activities)}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 md:pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="border-t border-gray-300 mt-2 sm:mt-3 md:mt-4 pt-1 sm:pt-2 mx-auto w-32 sm:w-40 md:w-48">
              <p className="text-xs font-semibold text-gray-700 font-nunito">TUTOR ACADÉMICO</p>
              <p className="text-xs text-gray-600 font-nunito">{formatTextToUpperCase(application.tutorName || 'TUTOR ASIGNADO')}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-300 mt-2 sm:mt-3 md:mt-4 pt-1 sm:pt-2 mx-auto w-32 sm:w-40 md:w-48">
              <p className="text-xs font-semibold text-gray-700 font-nunito">COORDINADOR</p>
              <p className="text-xs text-gray-600 font-nunito">ADMIN TRUSTIFY</p>
              <p className="text-xs text-gray-500 font-nunito">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-3 sm:mt-4 md:mt-6">
          <div className="inline-block border-2 border-blue-600 rounded-full p-2 sm:p-3 md:p-4">
            <p className="text-xs font-semibold text-blue-600 font-nunito">CERTIFICADO VERIFICADO</p>
            <p className="text-xs text-gray-600 font-nunito">TRUSTIFY SYSTEM</p>
          </div>
        </div>
      </div>
    );
  };

  const downloadPDF = async () => {
    if (!selectedApplication) return;

    try {
      const element = document.getElementById('certificate-preview');
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CERTIFICADO-${selectedApplication.verificationCode}.pdf`);
      showMessage('success', '📄 CERTIFICADO DESCARGADO EXITOSAMENTE');
    } catch (error) {
      console.error('❌ Error al descargar PDF:', error);
      showMessage('error', 'Error al descargar certificado');
    }
  };

  const openCertificateModal = (application) => {
    if (application.status === 'approved') {
      setSelectedApplication(application);
      setShowCertificateModal(true);
    } else {
      showMessage('error', '❌ SOLO PUEDES VER CERTIFICADOS APROBADOS');
    }
  };

  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedApplication(null);
  };

  const renderLogo = () => {
    return (
      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
        <span className="text-lg text-white">{siteConfig.logo}</span>
      </div>
    );
  };

  const counts = getApplicationCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header FIJO */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {renderLogo()}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent font-nunito">
                  {siteConfig.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-nunito">{siteConfig.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-2xl px-3 sm:px-4 py-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm">👤</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 font-nunito">
                  {auth.currentUser?.displayName || 'PASANTE'}
                </span>
              </div>
              
              <button
                onClick={() => setShowLogoutModal(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold flex items-center space-x-2 text-xs sm:text-sm"
              >
                <span>🔒</span>
                <span className="hidden sm:inline">CERRAR SESIÓN</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="pt-20">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Estado de carga */}
          {loadingApplications && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-700 font-nunito font-semibold">CARGANDO SOLICITUDES...</p>
              </div>
            </div>
          )}

          {/* Estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { count: counts.total, label: 'TOTAL', color: 'from-gray-500 to-gray-600' },
              { count: counts.pending, label: 'PENDIENTES', color: 'from-yellow-500 to-yellow-600' },
              { count: counts.underReview, label: 'EN REVISIÓN', color: 'from-blue-500 to-blue-600' },
              { count: counts.approved, label: 'APROBADAS', color: 'from-green-500 to-green-600' },
              { count: counts.rejected, label: 'RECHAZADAS', color: 'from-red-500 to-red-600' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 transform hover:scale-105 transition-all duration-300 border border-white/20">
                <div className={`bg-gradient-to-r ${stat.color} w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                  <span className="text-white text-sm sm:text-xl">
                    {index === 0 ? '📊' : index === 1 ? '⏳' : index === 2 ? '🔍' : index === 3 ? '✅' : '❌'}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 font-nunito">{stat.count}</p>
                <p className="text-xs text-gray-600 text-center font-nunito font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Botón Nueva Solicitud */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowForm(true)}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-nunito font-bold flex items-center space-x-2 text-sm sm:text-base"
            >
              <span className="text-lg">+</span>
              <span>NUEVA SOLICITUD</span>
            </button>
          </div>

          {/* Lista de Solicitudes - AHORA ORDENADAS CORRECTAMENTE */}
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white text-sm sm:text-lg">📋</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-blue-600 font-nunito">MIS SOLICITUDES</h3>
              <span className="ml-2 text-sm text-gray-500">(Más recientes primero)</span>
            </div>

            <div className="space-y-4">
              {loadingApplications ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-nunito">CARGANDO SOLICITUDES...</p>
                  </div>
                </div>
              ) : myApplications.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-gray-300 text-4xl sm:text-6xl mb-3 sm:mb-4">📝</div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-2 sm:mb-3 font-nunito">NO HAY SOLICITUDES</h3>
                  <p className="text-gray-500 mb-4 sm:mb-6 font-nunito text-sm sm:text-base">COMIENZA CREANDO TU PRIMERA SOLICITUD</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-nunito font-bold text-sm sm:text-base"
                  >
                    CREAR PRIMERA SOLICITUD
                  </button>
                </div>
              ) : (
                myApplications.map((application) => {
                  const statusInfo = getStatusInfo(application.status);
                  const duration = calculateDuration(application.startDate, application.endDate);
                  
                  return (
                    <div key={application.id} className="border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 bg-white">
                      <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 font-nunito truncate">
                            {formatTextToUpperCase(application.firstName)} {formatTextToUpperCase(application.lastName)}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600 font-nunito truncate">
                            {formatTextToUpperCase(application.institution)} - {formatTextToUpperCase(application.program)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Creado: {formatDate(application.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border ${statusInfo.color} font-nunito flex-shrink-0 ml-2`}>
                          {statusInfo.text}
                        </span>
                      </div>

                      {/* Código de verificación */}
                      <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-4 mb-3 sm:mb-4">
                        <p className="text-xs font-semibold text-gray-700 font-nunito mb-1">CÓDIGO DE VERIFICACIÓN:</p>
                        <p className="text-sm sm:text-lg font-bold text-blue-600 font-mono tracking-wide truncate">
                          {application.verificationCode || application.id}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                        <div>
                          <p className="font-nunito"><strong>PERÍODO:</strong> {formatDate(application.startDate)} - {formatDate(application.endDate)}</p>
                          <p className="font-nunito"><strong>DOCUMENTO:</strong> {formatTextToUpperCase(application.documentNumber)}</p>
                        </div>
                        <div>
                          <p className="font-nunito"><strong>DURACIÓN:</strong> {duration} MESES</p>
                          <p className="font-nunito"><strong>UBICACIÓN:</strong> {formatTextToUpperCase(application.plantLocation)}</p>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button
                          onClick={() => openCertificateModal(application)}
                          disabled={application.status !== 'approved'}
                          className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-nunito font-semibold flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm ${
                            application.status === 'approved' 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <span>👁️</span>
                          <span>VER CERTIFICADO</span>
                        </button>
                        
                        {application.status === 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedApplication(application);
                              setTimeout(downloadPDF, 100);
                            }}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-nunito font-semibold flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                          >
                            <span>📥</span>
                            <span>DESCARGAR PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Los modales restantes se mantienen igual */}
      {/* ... (mantener los mismos modales del código anterior) */}
    </div>
  );
};

export default StudentDashboard;