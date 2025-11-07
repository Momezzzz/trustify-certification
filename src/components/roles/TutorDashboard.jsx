import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

const TutorDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [tutorComments, setTutorComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [returnComments, setReturnComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(false);

  const siteConfig = {
    name: 'TRUSTIFY',
    description: 'SISTEMA DE CERTIFICACIÓN',
    logo: '🔒',
    primaryColor: '#1d3763',
    secondaryColor: '#2d4d85'
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'internshipApplications'));
      const appsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      appsList.sort((a, b) => new Date(b.createdAt?.toDate?.()) - new Date(a.createdAt?.toDate?.()));
      setApplications(appsList);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const openReviewModal = (application) => {
    setSelectedApplication(application);
    setTutorComments(application.tutorComments || '');
    setShowReviewModal(true);
  };

  const openRejectModal = (application) => {
    setSelectedApplication(application);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openReturnModal = (application) => {
    setSelectedApplication(application);
    setReturnComments('');
    setShowReturnModal(true);
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
      showMessage('success', 'SESIÓN CERRADA CORRECTAMENTE');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      showMessage('error', 'ERROR AL CERRAR SESIÓN');
    }
  };

  const handleStatusChange = async (appId, newStatus, comments = '') => {
    setLoading(true);
    try {
      const updateData = {
        status: newStatus,
        tutorComments: comments,
        updatedAt: new Date()
      };

      switch (newStatus) {
        case 'tutor_approved':
          updateData.tutorApprovedAt = new Date();
          updateData.tutorComments = comments || 'APROBADO POR EL TUTOR';
          break;
        case 'tutor_rejected':
          updateData.tutorRejectedAt = new Date();
          updateData.tutorComments = comments || 'RECHAZADO POR EL TUTOR';
          break;
        case 'returned_to_student':
          updateData.returnedToStudentAt = new Date();
          updateData.tutorReturnComments = comments || 'DEVUELTO AL ESTUDIANTE PARA CORRECCIONES';
          updateData.requiresStudentAction = true;
          break;
      }

      await updateDoc(doc(db, 'internshipApplications', appId), updateData);
      loadApplications();

      const statusMessages = {
        tutor_approved: 'SOLICITUD APROBADA Y ENVIADA AL ADMINISTRADOR',
        tutor_rejected: 'SOLICITUD RECHAZADA DEFINITIVAMENTE',
        returned_to_student: 'SOLICITUD DEVUELTA AL ESTUDIANTE PARA CORRECCIONES'
      };

      showMessage('success', statusMessages[newStatus]);
    } catch (error) {
      showMessage('error', 'ERROR AL ACTUALIZAR SOLICITUD');
    } finally {
      setLoading(false);
      setShowReviewModal(false);
      setShowRejectModal(false);
      setShowReturnModal(false);
      setSelectedApplication(null);
      setTutorComments('');
      setRejectReason('');
      setReturnComments('');
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
    showMessage('success', 'CERTIFICADO DESCARGADO EXITOSAMENTE');
  };

  const showMessage = (type, text) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 sm:top-6 left-1/2 transform -translate-x-1/2 z-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-l-4 transition-all duration-500 font-nunito max-w-xs sm:max-w-md w-full mx-2 ${type === 'error'
        ? 'bg-red-50 text-red-700 border-red-400 shadow-lg'
        : 'bg-green-50 text-green-700 border-green-400 shadow-lg'
      }`;
    messageDiv.innerHTML = `
      <div class="flex items-center justify-center sm:justify-start">
        <span class="text-base sm:text-lg mr-2">${type === 'error' ? '❌' : '✅'}</span>
        <span class="font-medium font-nunito text-xs sm:text-sm text-center sm:text-left">${text}</span>
      </div>
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'tutor_approved':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          text: '✅ APROBADO',
          icon: '✅'
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          text: 'CERTIFICADO',
        };
      case 'tutor_rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          text: 'RECHAZADO',
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          text: '❌ RECHAZADO',
        };
      case 'changes_requested':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          text: 'CAMBIOS',
          icon: '📝'
        };
      case 'returned_to_student':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: '↩️ DEVUELTO',
          icon: '↩️'
        };
      case 'under_review':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          text: '🔍 REVISIÓN',
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

  const getFilteredApplications = () => {
    if (filter === 'all') return applications;
    return applications.filter(app => app.status === filter || (!app.status && filter === 'pending'));
  };

  const getApplicationCounts = () => {
    return {
      total: applications.length,
      pending: applications.filter(app => !app.status || app.status === 'pending').length,
      tutor_approved: applications.filter(app => app.status === 'tutor_approved').length,
      changes_requested: applications.filter(app => app.status === 'changes_requested').length,
      returned_to_student: applications.filter(app => app.status === 'returned_to_student').length,
      completed: applications.filter(app => app.status === 'approved').length,
      rejected: applications.filter(app => app.status === 'tutor_rejected' || app.status === 'rejected').length
    };
  };

  const formatTextToUpperCase = (text) => {
    return text ? text.toUpperCase() : '';
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months;
  };

  // Componente de Certificado - COMPLETAMENTE RESPONSIVE
  const CertificatePreview = ({ application }) => {
    const duration = calculateDuration(application.startDate, application.endDate);

    return (
      <div id="certificate-preview" className="bg-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200 w-full max-w-xs sm:max-w-sm md:max-w-lg mx-auto scale-90 sm:scale-95 md:scale-100">
        {/* Encabezado con gradiente */}
        <div className={`bg-gradient-to-r from-trustify-blue to-trustify-light rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 text-center text-white mb-4 sm:mb-5 md:mb-6`}>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold font-nunito mb-1 sm:mb-2">CERTIFICADO DE PASANTÍA</h1>
          <p className="text-xs sm:text-sm md:text-base font-light font-nunito">SISTEMA DE CERTIFICACIÓN</p>
        </div>

        {/* Código de verificación */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mb-3 sm:mb-4 md:mb-5 text-center">
          <p className="text-xs font-semibold text-yellow-800 font-nunito mb-1">CÓDIGO DE VERIFICACIÓN</p>
          <p className="text-sm sm:text-base md:text-lg font-bold text-trustify-blue font-mono tracking-wider break-all">
            {generateVerificationCode(application)}
          </p>
          <p className="text-xs text-yellow-600 mt-1 font-nunito">
            PARA VERIFICAR AUTENTICIDAD
          </p>
        </div>

        {/* Contenido del certificado */}
        <div className="text-center mb-4 sm:mb-5 md:mb-6">
          <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 md:mb-4 font-nunito">
            SE CERTIFICA QUE
          </p>
          <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-trustify-blue font-nunito font-bold leading-tight px-2">
            {formatTextToUpperCase(application.studentName)}
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 my-2 sm:my-3 font-nunito">
            IDENTIFICADO(A) CON DOCUMENTO
          </p>
          <p className="text-sm sm:text-base font-semibold text-trustify-light font-nunito">
            {formatTextToUpperCase(application.documentNumber)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
          <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
            <h3 className="font-semibold text-trustify-blue mb-1 sm:mb-2 font-nunito text-xs sm:text-sm">INFORMACIÓN ACADÉMICA</h3>
            <p className="text-xs mb-1 font-nunito"><strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(application.institution)}</p>
            <p className="text-xs mb-1 font-nunito"><strong>CARRERA:</strong> {formatTextToUpperCase(application.program)}</p>
            <p className="text-xs font-nunito"><strong>DURACIÓN:</strong> {duration} MESES</p>
          </div>

          <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
            <h3 className="font-semibold text-trustify-blue mb-1 sm:mb-2 font-nunito text-xs sm:text-sm">PERIODO</h3>
            <p className="text-xs mb-1 font-nunito"><strong>INICIO:</strong> {application.startDate}</p>
            <p className="text-xs mb-1 font-nunito"><strong>FIN:</strong> {application.endDate}</p>
          </div>
        </div>


        {application.activities && (
          <div className="bg-blue-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mb-4 sm:mb-5 md:mb-6">
            <h3 className="font-semibold text-trustify-blue mb-1 sm:mb-2 font-nunito text-xs sm:text-sm">ACTIVIDADES REALIZADAS</h3>
            <p className="text-xs text-gray-700 leading-relaxed font-nunito break-words">{formatTextToUpperCase(application.activities)}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 mt-3 sm:mt-4 md:mt-5 pt-3 sm:pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="border-t border-gray-300 mt-2 sm:mt-3 pt-1 sm:pt-2 mx-auto w-24 sm:w-32 md:w-36">
              <p className="text-xs font-semibold text-gray-700 font-nunito">TUTOR</p>
              <p className="text-xs text-gray-600 font-nunito break-words">{formatTextToUpperCase(application.tutorName)}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-300 mt-2 sm:mt-3 pt-1 sm:pt-2 mx-auto w-24 sm:w-32 md:w-36">
              <p className="text-xs font-semibold text-gray-700 font-nunito">COORDINADOR</p>
              <p className="text-xs text-gray-500 font-nunito">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Función para renderizar el logo
  const renderLogo = () => {
    if (siteConfig.logo.startsWith('http') || siteConfig.logo.startsWith('/')) {
      return (
        <img
          src={siteConfig.logo}
          alt={`${siteConfig.name} Logo`}
          className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
        />
      );
    } else {
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-base sm:text-lg text-white">{siteConfig.logo}</span>
        </div>
      );
    }
  };

  const counts = getApplicationCounts();
  const filteredApplications = getFilteredApplications();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header FIJO */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {renderLogo()}
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-trustify-blue to-trustify-light bg-clip-text text-transparent font-nunito font-bold">
                  {siteConfig.name}
                </h1>
                <p className="text-xs text-gray-600 font-nunito hidden sm:block">{siteConfig.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-50 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1 sm:py-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r  rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">👨‍🏫</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 font-nunito">
                  TUTOR
                </span>
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
              >
                <span>CERRAR SESIÓN</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[
              { count: counts.total, label: 'TOTAL', color: 'from-gray-500 to-gray-600', icon: '📊' },
              { count: counts.pending, label: 'PENDIENTES', color: 'from-yellow-500 to-yellow-600', icon: '⏳' },
              { count: counts.completed, label: 'COMPLETADAS', color: 'from-green-500 to-green-600', icon: '✅' },
              { count: counts.rejected, label: 'RECHAZADAS', color: 'from-red-500 to-red-600', icon: '❌' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 transform hover:scale-105 transition-all duration-300 border border-white/20">
                <div className={`bg-gradient-to-r ${stat.color} w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-1 sm:mb-2`}>
                  <span className="text-white text-xs sm:text-sm">{stat.icon}</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-center text-gray-800 font-nunito">{stat.count}</p>
                <p className="text-xs text-gray-600 text-center font-nunito font-semibold leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-white/20">
            <div className="flex overflow-x-auto pb-2 space-x-2 hide-scrollbar">
              {[
                { key: 'all', label: 'TODAS', count: counts.total, color: 'from-gray-500 to-gray-600' },
                { key: 'pending', label: 'PENDIENTES', count: counts.pending, color: 'from-yellow-500 to-yellow-600' },
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key)}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold font-nunito transition-all transform hover:scale-105 whitespace-nowrap flex-shrink-0 ${filter === filterOption.key
                      ? `bg-gradient-to-r ${filterOption.color} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {filterOption.label} ({filterOption.count})
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl border border-white/20">
            <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-lg sm:rounded-xl flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-white text-xs sm:text-sm">📋</span>
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-trustify-blue font-nunito font-bold">
                  SOLICITUDES DE CERTIFICACIÓN
                </h3>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-6 sm:py-8 lg:py-12 text-gray-500 font-nunito">
                  <div className="text-3xl sm:text-4xl md:text-6xl mb-2 sm:mb-3 md:mb-4">📝</div>
                  <p className="text-sm sm:text-base md:text-lg font-semibold mb-1">NO HAY SOLICITUDES</p>
                  <p className="text-xs text-gray-400">NO SE ENCONTRARON SOLICITUDES CON EL FILTRO SELECCIONADO</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredApplications.map((application) => {
                    const statusInfo = getStatusInfo(application.status);
                    const duration = calculateDuration(application.startDate, application.endDate);

                    return (
                      <div key={application.id} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all duration-300 bg-white">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 sm:mb-3 space-y-2 sm:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-bold text-gray-900 font-nunito break-words">
                              {formatTextToUpperCase(application.studentName)}
                            </h4>
                            <p className="text-xs text-gray-600 font-nunito break-words">
                              {formatTextToUpperCase(application.institution)} - {formatTextToUpperCase(application.program)}
                            </p>
                            <p className="text-xs text-gray-500 font-nunito truncate">EMAIL: {formatTextToUpperCase(application.studentEmail)}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} font-nunito flex-shrink-0 self-start sm:self-auto`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </div>

                        {/* Código de verificación */}
                        <div className="bg-gray-50 rounded-lg p-2 mb-2 sm:mb-3">
                          <p className="text-xs font-semibold text-gray-700 font-nunito mb-1">CÓDIGO:</p>
                          <p className="text-xs font-bold text-trustify-blue font-mono break-all">{generateVerificationCode(application)}</p>
                        </div>

                        {/* Información de la Pasantía */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 sm:mb-3 text-xs">
                          <div>
                            <p className="font-medium text-gray-700 font-nunito">PERÍODO</p>
                            <p className="font-nunito text-xs">{application.startDate} - {application.endDate}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 font-nunito">DURACIÓN</p>
                            <p className="font-nunito text-xs">{duration} MESES</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 font-nunito">DOCUMENTO</p>
                            <p className="font-nunito text-xs break-words">{formatTextToUpperCase(application.documentNumber)}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 font-nunito">INSTITUCIÓN</p>
                            <p className="font-nunito text-xs break-words">{formatTextToUpperCase(application.institution)}</p>
                          </div>
                        </div>

                        {/* CARRERA */}
                        <div className="mb-2 sm:mb-3 text-xs">
                          <p className="font-medium text-gray-700 font-nunito">CARRERA:</p>
                          <p className="font-nunito break-words">{formatTextToUpperCase(application.program)}</p>
                        </div>

                        {/* ACTIVIDADES */}
                        <div className="mb-3 sm:mb-4">
                          <p className="font-medium text-gray-700 mb-1 font-nunito text-xs">ACTIVIDADES:</p>
                          <p className="text-gray-700 bg-gray-50 p-2 rounded-lg font-nunito text-xs line-clamp-2 sm:line-clamp-3 break-words">
                            {formatTextToUpperCase(application.activities)}
                          </p>
                        </div>

                        {/* Comentarios del Tutor */}
                        {application.tutorComments && (
                          <div className="mb-2 sm:mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="font-medium text-blue-900 text-xs font-nunito">TUS COMENTARIOS:</p>
                            <p className="text-blue-800 text-xs font-nunito break-words">{formatTextToUpperCase(application.tutorComments)}</p>
                            {application.tutorApprovedAt && (
                              <p className="text-xs text-blue-600 mt-1 font-nunito">
                                REVISADO: {application.tutorApprovedAt?.toDate?.().toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Acciones del Tutor */}
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {(!application.status || application.status === 'pending' || application.status === 'changes_requested' || application.status === 'returned_to_student') && (
                            <>
                              <button
                                onClick={() => openReviewModal(application)}
                                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold flex items-center text-xs"
                              >
                                ✅ APROBAR
                              </button>

                              <button
                                onClick={() => openReturnModal(application)}
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold flex items-center text-xs"
                              >
                                ↩️ DEVOLVER
                              </button>

                              <button
                                onClick={() => openRejectModal(application)}
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold flex items-center text-xs"
                              >
                                ❌ RECHAZAR
                              </button>
                            </>
                          )}

                          {application.status === 'approved' && (
                            <button
                              onClick={() => openCertificateModal(application)}
                              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-nunito font-semibold text-xs"
                            >
                              VER CERTIFICADO
                            </button>
                          )}
                        </div>

                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 font-nunito">
                            <strong>ESTADO:</strong> {statusInfo.text}
                          </p>
                          <p className="text-xs text-gray-500 font-nunito">
                            ENVIADO: {application.createdAt?.toDate?.().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl mx-2">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white text-sm">✅</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-nunito font-bold">APROBAR SOLICITUD</h3>
            </div>


            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl">
              <h4 className="font-semibold mb-1 sm:mb-2 font-nunito text-sm">SOLICITUD DE: {formatTextToUpperCase(selectedApplication.studentName)}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                <p className="font-nunito"><strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(selectedApplication.institution)}</p>
                <p className="font-nunito"><strong>CARRERA:</strong> {formatTextToUpperCase(selectedApplication.program)}</p>
                <p className="font-nunito"><strong>PERÍODO:</strong> {selectedApplication.startDate} - {selectedApplication.endDate}</p>
                <p className="font-nunito"><strong>DURACIÓN:</strong> {calculateDuration(selectedApplication.startDate, selectedApplication.endDate)} MESES</p>
              </div>
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 font-nunito">
                COMENTARIOS (OPCIONAL)
              </label>
              <textarea
                value={tutorComments}
                onChange={(e) => setTutorComments(e.target.value)}
                rows={3}
                className="w-full px-2 py-1 sm:px-3 sm:py-2 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 font-nunito uppercase text-xs sm:text-sm"
                placeholder="COMENTARIOS PARA EL ADMINISTRADOR..."
              />
            </div>


            <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedApplication(null);
                  setTutorComments('');
                }}
                className="px-3 py-2 sm:px-4 sm:py-2 border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleStatusChange(selectedApplication.id, 'tutor_approved', tutorComments)}
                disabled={loading}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transform hover:scale-105 disabled:opacity-50 font-nunito font-semibold transition-all flex items-center text-xs"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    PROCESANDO...
                  </>
                ) : (
                  '✅ APROBAR Y ENVIAR'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl mx-2">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white text-sm">❌</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-nunito font-bold">RECHAZAR SOLICITUD</h3>
            </div>


            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 rounded-lg sm:rounded-xl border border-red-200">
              <h4 className="font-semibold mb-1 sm:mb-2 font-nunito text-sm text-red-800">¿ESTÁS SEGURO DE RECHAZAR?</h4>
              <p className="text-red-700 text-xs font-nunito mb-1">
                SOLICITUD DE: <strong>{formatTextToUpperCase(selectedApplication.studentName)}</strong>
              </p>
              <div className="text-xs text-red-600 font-nunito">
                <p><strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(selectedApplication.institution)}</p>
                <p><strong>CARRERA:</strong> {formatTextToUpperCase(selectedApplication.program)}</p>
              </div>
            </div>


            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-red-700 mb-1 sm:mb-2 font-nunito">
                RAZÓN DEL RECHAZO (OBLIGATORIO)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-2 py-1 sm:px-3 sm:py-2 border-2 border-red-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 font-nunito uppercase text-xs sm:text-sm"
                placeholder="EXPLICA LAS RAZONES DEL RECHAZO..."
                required
              />
            </div>


            <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedApplication(null);
                  setRejectReason('');
                }}
                className="px-3 py-2 sm:px-4 sm:py-2 border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleStatusChange(selectedApplication.id, 'tutor_rejected', rejectReason)}
                disabled={loading || !rejectReason.trim()}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transform hover:scale-105 disabled:opacity-50 font-nunito font-semibold transition-all flex items-center text-xs"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    PROCESANDO...
                  </>
                ) : (
                  '❌ CONFIRMAR RECHAZO'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {showReturnModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl mx-2">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white text-sm">↩️</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-nunito font-bold">DEVOLVER AL ESTUDIANTE</h3>
            </div>

            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-50 rounded-lg sm:rounded-xl border border-yellow-200">
              <h4 className="font-semibold mb-1 sm:mb-2 font-nunito text-sm text-yellow-800">SOLICITUD REQUIERE CORRECCIONES</h4>
              <p className="text-yellow-700 text-xs font-nunito mb-1">
                SOLICITUD DE: <strong>{formatTextToUpperCase(selectedApplication.studentName)}</strong>
              </p>
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-yellow-700 mb-1 sm:mb-2 font-nunito">
                INSTRUCCIONES (OBLIGATORIO)
              </label>
              <textarea
                value={returnComments}
                onChange={(e) => setReturnComments(e.target.value)}
                rows={3}
                className="w-full px-2 py-1 sm:px-3 sm:py-2 border-2 border-yellow-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-300 font-nunito uppercase text-xs sm:text-sm"
                placeholder="EXPLICA QUÉ CORRECCIONES DEBE REALIZAR..."
                required
              />
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedApplication(null);
                  setReturnComments('');
                }}
                className="px-3 py-2 sm:px-4 sm:py-2 border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleStatusChange(selectedApplication.id, 'returned_to_student', returnComments)}
                disabled={loading || !returnComments.trim()}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transform hover:scale-105 disabled:opacity-50 font-nunito font-semibold transition-all flex items-center text-xs"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    PROCESANDO...
                  </>
                ) : (
                  '↩️ DEVOLVER'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {showCertificateModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 w-full max-w-xs sm:max-w-sm md:max-w-lg mx-auto my-2 border border-white/20 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-lg sm:rounded-xl flex items-center justify-center mr-2">
                  <span className="text-white text-sm">📄</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-trustify-blue font-nunito font-bold">VISTA PREVIA</h3>
              </div>
              <div className="flex space-x-1 sm:space-x-2 justify-end">

                <button
                  onClick={closeCertificateModal}
                  className="px-2 py-1 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs"
                >
                  CERRAR
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[50vh] sm:max-h-[60vh]">
              <CertificatePreview application={selectedApplication} />
            </div>
          </div>
        </div>
      )}


      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 max-w-xs sm:max-w-md w-full border border-white/20 shadow-2xl mx-2">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-lg sm:rounded-xl flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-white text-sm">🔒</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-nunito font-bold">CERRAR SESIÓN</h3>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 font-nunito text-center">
              ¿ESTÁS SEGURO DE CERRAR SESIÓN?
            </p>

            <div className="flex space-x-2 sm:space-x-3 justify-center">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-3 py-2 sm:px-4 sm:py-2 border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-700 hover:bg-gray-50 font-nunito font-semibold transition-all text-xs sm:text-sm"
              >
                CANCELAR
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transform hover:scale-105 font-nunito font-semibold transition-all text-xs sm:text-sm"
              >
                CERRAR SESIÓN
              </button>
            </div>
          </div>
        </div>
      )}


      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default TutorDashboard;