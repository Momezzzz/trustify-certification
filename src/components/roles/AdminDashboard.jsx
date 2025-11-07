import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useUserRole } from '../../hooks/useUserRole';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { updateUserRole } = useUserRole();

  // =============================================
  // 🔧 ZONA DE PERSONALIZACIÓN - CAMBIAR AQUÍ
  // =============================================
  const siteConfig = {
    name: 'TRUSTIFY',
    description: 'SISTEMA DE CERTIFICACIÓN INTELIGENTE',
    logo: '🔒',
    primaryColor: '#1d3763',
    secondaryColor: '#2d4d85'
  };
  // =============================================
  // FIN ZONA DE PERSONALIZACIÓN
  // =============================================

  useEffect(() => {
    loadUsers();
    loadApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchTerm, applications]);

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadApplications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'internshipApplications'));
      const appsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      appsList.sort((a, b) => new Date(b.createdAt?.toDate?.()) - new Date(a.createdAt?.toDate?.()));
      setApplications(appsList);
      setFilteredApplications(appsList);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const filterApplications = () => {
    if (!searchTerm.trim()) {
      setFilteredApplications(applications);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = applications.filter(app => 
      app.studentName?.toLowerCase().includes(term) ||
      app.documentNumber?.toLowerCase().includes(term) ||
      app.institution?.toLowerCase().includes(term) ||
      app.program?.toLowerCase().includes(term) ||
      app.plantLocation?.toLowerCase().includes(term) ||
      app.status?.toLowerCase().includes(term) ||
      generateVerificationCode(app).toLowerCase().includes(term)
    );
    
    setFilteredApplications(filtered);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      loadUsers();
      showMessage('success', '✅ ROL ACTUALIZADO CORRECTAMENTE');
    } catch (error) {
      showMessage('error', '❌ ERROR AL ACTUALIZAR ROL');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`¿ESTÁS SEGURO DE QUE DESEAS ELIMINAR AL USUARIO ${userName}?`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        loadUsers();
        showMessage('success', '✅ USUARIO ELIMINADO CORRECTAMENTE');
      } catch (error) {
        showMessage('error', '❌ ERROR AL ELIMINAR USUARIO');
      }
    }
  };

  const handleStatusChange = async (appId, newStatus, comments = '') => {
    setLoading(true);
    try {
      const updateData = {
        status: newStatus,
        adminComments: comments,
        updatedAt: new Date()
      };

      switch (newStatus) {
        case 'approved':
          updateData.approvedAt = new Date();
          updateData.approvedBy = 'ADMINISTRADOR';
          updateData.adminComments = comments || 'CERTIFICADO APROBADO SATISFACTORIAMENTE';
          break;
        case 'rejected':
          updateData.rejectedAt = new Date();
          updateData.rejectedBy = 'ADMINISTRADOR';
          updateData.rejectionReason = comments;
          break;
        case 'under_review':
          updateData.underReviewAt = new Date();
          updateData.adminComments = comments || 'SOLICITUD EN PROCESO DE REVISIÓN';
          break;
        case 'pending':
          updateData.adminComments = comments || 'SOLICITUD PENDIENTE DE REVISIÓN';
          break;
      }

      await updateDoc(doc(db, 'internshipApplications', appId), updateData);
      loadApplications();
      
      const statusMessages = {
        approved: '✅ SOLICITUD APROBADA CORRECTAMENTE',
        rejected: '✅ SOLICITUD RECHAZADA CORRECTAMENTE',
        under_review: '✅ SOLICITUD MARCADA COMO "EN REVISIÓN"',
        pending: '✅ SOLICITUD MARCADA COMO "PENDIENTE"'
      };
      
      showMessage('success', statusMessages[newStatus]);
    } catch (error) {
      showMessage('error', '❌ ERROR AL ACTUALIZAR SOLICITUD');
    } finally {
      setLoading(false);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedApplication(null);
    }
  };

  const openRejectModal = (application) => {
    setSelectedApplication(application);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedApplication(null);
  };

  const handleRejectWithReason = () => {
    if (!rejectionReason.trim()) {
      showMessage('error', '❌ DEBES INGRESAR UN MOTIVO DE RECHAZO');
      return;
    }
    handleStatusChange(selectedApplication.id, 'rejected', rejectionReason);
  };

  const openCertificateModal = (application) => {
    setSelectedApplication(application);
    setShowCertificateModal(true);
  };

  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedApplication(null);
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

  const generateVerificationCode = (application) => {
    const baseCode = application.id.slice(-8).toUpperCase();
    const dateCode = new Date().getFullYear().toString().slice(-2);
    return `TRF-${baseCode}-${dateCode}`;
  };

  const downloadPDF = async () => {
    if (!selectedApplication) return;

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
    pdf.save(`CERTIFICADO-${selectedApplication.studentName}-${generateVerificationCode(selectedApplication)}.pdf`);
    showMessage('success', '📄 CERTIFICADO DESCARGADO EXITOSAMENTE');
  };

  const showMessage = (type, text) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-2xl border-l-4 transform transition-all duration-500 font-nunito ${
      type === 'error' 
        ? 'bg-red-50 text-red-700 border-red-400 shadow-lg animate-shake' 
        : 'bg-green-50 text-green-700 border-green-400 shadow-lg animate-bounceIn'
    }`;
    messageDiv.innerHTML = `
      <div class="flex items-center">
        <span class="text-lg mr-2">${type === 'error' ? '❌' : '✅'}</span>
        <span class="font-medium font-nunito">${text}</span>
      </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          text: '✅ APROBADA', 
          icon: '✅'
        };
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          text: '❌ RECHAZADA', 
          icon: '❌'
        };
      case 'under_review':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          text: '🔍 EN REVISIÓN', 
          icon: '🔍'
        };
      default:
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          text: '⏳ PENDIENTE', 
          icon: '⏳'
        };
    }
  };

  const getApplicationCounts = () => {
    return {
      total: applications.length,
      pending: applications.filter(app => !app.status || app.status === 'pending').length,
      approved: applications.filter(app => app.status === 'approved').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      underReview: applications.filter(app => app.status === 'under_review').length
    };
  };

  const formatTextToUpperCase = (text) => {
    return text ? text.toUpperCase() : '';
  };

  const counts = getApplicationCounts();

  // Componente de Certificado - AHORA RESPONSIVE
  const CertificatePreview = ({ application }) => (
    <div id="certificate-preview" className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto scale-90 sm:scale-95 md:scale-100">
      {/* Encabezado con gradiente */}
      <div className={`bg-gradient-to-r from-trustify-blue to-trustify-light rounded-t-xl sm:rounded-t-2xl p-3 sm:p-4 md:p-6 text-center text-white mb-4 sm:mb-6 md:mb-8`}>
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold font-nunito mb-1 sm:mb-2">CERTIFICADO DE PASANTÍA</h1>
        <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-light font-nunito">SISTEMA DE CERTIFICACIÓN INTELIGENTE</p>
      </div>

      {/* Código de verificación */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 mb-4 sm:mb-6 text-center">
        <p className="text-xs font-semibold text-yellow-800 font-nunito mb-1">CÓDIGO DE VERIFICACIÓN ÚNICO</p>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-trustify-blue font-mono tracking-wider">
          {generateVerificationCode(application)}
        </p>
        <p className="text-xs text-yellow-600 mt-1 sm:mt-2 font-nunito">
          CÓDIGO PARA VERIFICAR AUTENTICIDAD
        </p>
      </div>

      {/* Contenido del certificado */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8">
        <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 md:mb-6 font-nunito">
          SE CERTIFICA QUE
        </p>
        <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-full flex items-center justify-center mr-2 sm:mr-3 md:mr-4">
            <span className="text-white text-sm sm:text-base md:text-lg lg:text-xl">👤</span>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-trustify-blue font-nunito font-bold leading-tight">
            {formatTextToUpperCase(application.studentName)}
          </h2>
        </div>
        <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 md:mb-4 font-nunito">
          IDENTIFICADO CON DOCUMENTO
        </p>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-trustify-light mb-3 sm:mb-4 font-nunito">
          {formatTextToUpperCase(application.documentNumber)}
        </p>
      </div>

      {/* Detalles de la pasantía */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4">
          <h3 className="font-semibold text-trustify-blue mb-2 font-nunito text-xs sm:text-sm">📋 INFORMACIÓN ACADÉMICA</h3>
          <p className="text-xs mb-1 font-nunito"><strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(application.institution)}</p>
          <p className="text-xs mb-1 font-nunito"><strong>PROGRAMA:</strong> {formatTextToUpperCase(application.program)}</p>
          <p className="text-xs font-nunito"><strong>HORAS:</strong> {application.totalHours} H</p>
        </div>
        
        <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4">
          <h3 className="font-semibold text-trustify-blue mb-2 font-nunito text-xs sm:text-sm">📅 PERIODO</h3>
          <p className="text-xs mb-1 font-nunito"><strong>INICIO:</strong> {application.startDate}</p>
          <p className="text-xs mb-1 font-nunito"><strong>FIN:</strong> {application.endDate}</p>
          <p className="text-xs mb-1 font-nunito"><strong>PLANTA:</strong> {formatTextToUpperCase(application.plantType)}</p>
          <p className="text-xs font-nunito"><strong>UBICACIÓN:</strong> {formatTextToUpperCase(application.plantLocation)}</p>
        </div>
      </div>

      {/* Funciones realizadas */}
      {application.functions && (
        <div className="bg-blue-50 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 mb-4 sm:mb-6 md:mb-8">
          <h3 className="font-semibold text-trustify-blue mb-2 font-nunito text-xs sm:text-sm">🎯 FUNCIONES REALIZADAS</h3>
          <p className="text-xs text-gray-700 leading-relaxed font-nunito">{formatTextToUpperCase(application.functions)}</p>
        </div>
      )}

      {/* Firmas y fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 md:pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="border-t border-gray-300 mt-2 sm:mt-3 md:mt-4 pt-1 sm:pt-2 mx-auto w-32 sm:w-40 md:w-48">
            <p className="text-xs font-semibold text-gray-700 font-nunito">TUTOR ACADÉMICO</p>
            <p className="text-xs text-gray-600 font-nunito">{formatTextToUpperCase(application.tutorName)}</p>
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

      {/* Sello de verificación */}
      <div className="text-center mt-3 sm:mt-4 md:mt-6">
        <div className="inline-block border-2 border-trustify-blue rounded-full p-2 sm:p-3 md:p-4">
          <p className="text-xs font-semibold text-trustify-blue font-nunito">CERTIFICADO VERIFICADO</p>
          <p className="text-xs text-gray-600 font-nunito">TRUSTIFY SYSTEM</p>
        </div>
      </div>
    </div>
  );

  // Función para renderizar el logo (imagen o emoji)
  const renderLogo = () => {
    if (siteConfig.logo.startsWith('http') || siteConfig.logo.startsWith('/')) {
      return (
        <img 
          src={siteConfig.logo} 
          alt={`${siteConfig.name} Logo`}
          className="w-10 h-10 object-contain"
        />
      );
    } else {
      return (
        <div className="w-10 h-10 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-lg text-white">{siteConfig.logo}</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20"> {/* Añadido padding-top para la navbar fija */}
      {/* Header FIJADO */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {renderLogo()}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-trustify-blue to-trustify-light bg-clip-text text-transparent font-nunito font-bold">
                  {siteConfig.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-nunito">{siteConfig.description}</p>
              </div>
            </div>
            
            {/* BUSCADOR CON EMOJI */}
            <div className="w-full sm:w-64 lg:w-80 relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="BUSCAR SOLICITUDES..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all font-nunito text-sm bg-white/80 backdrop-blur-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <span className="text-gray-400 hover:text-gray-600 text-lg">✕</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-2xl px-3 sm:px-4 py-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm">👤</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 font-nunito">
                  ADMIN
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

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
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

        {/* Indicador de búsqueda */}
        {searchTerm && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-sm text-blue-700 font-nunito flex items-center">
              <span className="mr-2">🔍</span>
              MOSTRANDO {filteredApplications.length} DE {applications.length} SOLICITUDES PARA: "{searchTerm}"
              <button 
                onClick={() => setSearchTerm('')}
                className="ml-2 text-blue-500 hover:text-blue-700 font-semibold"
              >
                [LIMPIAR]
              </button>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Gestión de Usuarios */}
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white text-sm sm:text-lg">👥</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-trustify-blue font-nunito font-bold">GESTIÓN DE USUARIOS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase font-nunito">USUARIO</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase font-nunito">EMAIL</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase font-nunito">ROL</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase font-nunito">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm font-nunito">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">👤</span>
                          </div>
                          <span className="truncate max-w-[80px] sm:max-w-none">{formatTextToUpperCase(user.name)}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm font-nunito truncate max-w-[100px] sm:max-w-none">{formatTextToUpperCase(user.email)}</td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold font-nunito ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800 border border-red-200' :
                          user.role === 'tutor' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {formatTextToUpperCase(user.role)}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                        <div className="flex space-x-1 sm:space-x-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="border border-gray-300 rounded-xl sm:rounded-2xl px-2 py-1 sm:px-3 sm:py-2 text-xs focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all font-nunito"
                          >
                            <option value="student">PASANTE</option>
                            <option value="tutor">TUTOR</option>
                            <option value="admin">ADMIN</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold"
                            title="Eliminar usuario"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Solicitudes de Certificación */}
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-white text-sm sm:text-lg">📋</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-trustify-blue font-nunito font-bold">SOLICITUDES</h3>
              </div>
              <div className="text-xs text-gray-500 font-nunito">
                {filteredApplications.length} {filteredApplications.length === 1 ? 'SOLICITUD' : 'SOLICITUDES'}
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 font-nunito text-sm sm:text-base">
                  {searchTerm ? 'NO SE ENCONTRARON SOLICITUDES' : 'NO HAY SOLICITUDES'}
                </div>
              ) : (
                filteredApplications.map(app => {
                  const statusInfo = getStatusInfo(app.status);
                  return (
                    <div key={app.id} className="border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all duration-300 bg-white">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">👤</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 font-nunito text-sm sm:text-base truncate">{formatTextToUpperCase(app.studentName)}</h4>
                          </div>
                          <p className="text-xs text-gray-600 font-nunito truncate">{formatTextToUpperCase(app.institution)} - {formatTextToUpperCase(app.program)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} font-nunito flex-shrink-0 ml-2`}>
                          {statusInfo.text}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs mb-2 sm:mb-3">
                        <div>
                          <p className="font-nunito"><strong>PERÍODO:</strong> {app.startDate} - {app.endDate}</p>
                          <p className="font-nunito"><strong>HORAS:</strong> {app.totalHours}</p>
                        </div>
                        <div>
                          <p className="font-nunito"><strong>DOC:</strong> {formatTextToUpperCase(app.documentNumber)}</p>
                          <p className="font-nunito"><strong>ENVIADA:</strong> {app.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Código de verificación */}
                      <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 mb-2 sm:mb-3">
                        <p className="text-xs font-semibold text-gray-700 font-nunito mb-1">CÓDIGO:</p>
                        <p className="text-xs sm:text-sm font-bold text-trustify-blue font-mono truncate">{generateVerificationCode(app)}</p>
                      </div>

                      {/* Acciones - SIEMPRE VISIBLES */}
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <button
                          onClick={() => handleStatusChange(app.id, 'approved')}
                          disabled={loading}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 font-nunito font-semibold"
                        >
                          ✅ APROBAR
                        </button>
                        <button
                          onClick={() => openRejectModal(app)}
                          disabled={loading}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 font-nunito font-semibold"
                        >
                          ❌ RECHAZAR
                        </button>
                        <button
                          onClick={() => handleStatusChange(app.id, 'under_review')}
                          disabled={loading}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 font-nunito font-semibold"
                        >
                          🔍 REVISIÓN
                        </button>
                        
                        {/* Botón para ver certificado (solo para aprobadas) */}
                        {app.status === 'approved' && (
                          <button
                            onClick={() => openCertificateModal(app)}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold"
                          >
                            📄 CERT
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

        {/* Modal de Rechazo - NUEVO */}
        {showRejectModal && selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-xs sm:max-w-md w-full border border-white/20 shadow-2xl">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-white text-sm sm:text-lg">❌</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-red-600 font-nunito font-bold">RECHAZAR SOLICITUD</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2 font-nunito">
                  <strong>SOLICITANTE:</strong> {formatTextToUpperCase(selectedApplication.studentName)}
                </p>
                <p className="text-sm text-gray-700 mb-4 font-nunito">
                  <strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(selectedApplication.institution)}
                </p>
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2 font-nunito">
                  MOTIVO DE RECHAZO *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="INGRESA EL MOTIVO POR EL CUAL RECHAZAS ESTA SOLICITUD..."
                  className="w-full h-24 sm:h-32 p-3 border border-gray-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none font-nunito text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1 font-nunito">
                  ESTE MOTIVO SERÁ ENVIADO AL ESTUDIANTE
                </p>
              </div>

              <div className="flex space-x-3 sm:space-x-4 justify-end">
                <button
                  onClick={closeRejectModal}
                  className="px-4 py-2 sm:px-6 sm:py-3 border-2 border-gray-300 rounded-xl sm:rounded-2xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs sm:text-sm"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleRejectWithReason}
                  disabled={!rejectionReason.trim() || loading}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl sm:rounded-2xl hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-nunito font-semibold transition-all text-xs sm:text-sm"
                >
                  {loading ? 'PROCESANDO...' : 'CONFIRMAR RECHAZO'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Certificado - AHORA RESPONSIVE */}
        {showCertificateModal && selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl mx-auto my-4 border border-white/20 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3">
                    <span className="text-white text-sm sm:text-lg">📄</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-trustify-blue font-nunito font-bold">VISTA PREVIA</h3>
                </div>
                <div className="flex space-x-2 sm:space-x-3 justify-end">
                  <button
                    onClick={downloadPDF}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-xl sm:rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold text-xs sm:text-sm"
                  >
                    📥 PDF
                  </button>
                  <button
                    onClick={closeCertificateModal}
                    className="px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 border-2 border-gray-300 rounded-xl sm:rounded-2xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs sm:text-sm"
                  >
                    CERRAR
                  </button>
                </div>
              </div>
              
              <div className="overflow-auto max-h-[60vh] sm:max-h-[70vh]">
                <CertificatePreview application={selectedApplication} />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cerrar Sesión */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-xs sm:max-w-md w-full border border-white/20 shadow-2xl">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-white text-sm sm:text-lg">🔒</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-nunito font-bold">CERRAR SESIÓN</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 sm:mb-6 font-nunito">
                ¿ESTÁS SEGURO DE QUE DESEAS CERRAR LA SESIÓN?
              </p>

              <div className="flex space-x-3 sm:space-x-4 justify-end">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 sm:px-6 sm:py-3 border-2 border-gray-300 rounded-xl sm:rounded-2xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs sm:text-sm"
                >
                  NO, CANCELAR
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl sm:rounded-2xl hover:shadow-lg transform hover:scale-105 font-nunito font-semibold transition-all text-xs sm:text-sm"
                >
                  SÍ, CERRAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;