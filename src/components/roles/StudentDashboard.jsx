import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Configuración de colores exactos según especificaciones
const COLOR_PALETTE = {
  primary: {
    hex: '#1d3763',
    rgb: '29, 55, 99',
    cmyk: '98, 81, 33, 24',
    lab: '23, 2, -30'
  },
  secondary: '#2d4d85',
  accent: '#3a5da8',
  light: '#f8fafc',
  dark: '#1a1a1a',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Componente para la tarjeta de aplicación
const ApplicationCard = React.memo(({ application, onViewCertificate, onDownloadPDF }) => {
  const statusInfo = useMemo(() => {
    switch (application.status) {
      case 'approved':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          text: 'APROBADA',
          icon: '✅'
        };
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          text: 'RECHAZADA',
          icon: '❌'
        };
      case 'under_review':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          text: 'EN REVISIÓN',
          icon: '🔍'
        };
      default:
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          text: 'PENDIENTE',
          icon: '⏳'
        };
    }
  }, [application.status]);

  const formatTextToUpperCase = useCallback((text) => {
    return text ? text.toUpperCase() : '';
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  }, []);

  const calculateDuration = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(0, months);
    } catch {
      return 0;
    }
  }, []);

  const duration = calculateDuration(application.startDate, application.endDate);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-300 bg-white w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-gray-900 truncate">
            {formatTextToUpperCase(application.firstName)} {formatTextToUpperCase(application.lastName)}
          </h4>
          <p className="text-sm text-gray-600 truncate">
            {formatTextToUpperCase(application.institution)} - {formatTextToUpperCase(application.program)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Creado: {formatDate(application.createdAt)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} flex items-center space-x-1 w-fit`}>
          <span>{statusInfo.icon}</span>
          <span>{statusInfo.text}</span>
        </span>
      </div>

      <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: `${COLOR_PALETTE.primary.hex}15` }}>
        <p className="text-xs font-semibold mb-1" style={{ color: COLOR_PALETTE.primary.hex }}>
          CÓDIGO DE VERIFICACIÓN:
        </p>
        <p className="text-base font-bold font-mono tracking-wide break-all" style={{ color: COLOR_PALETTE.primary.hex }}>
          {application.verificationCode || application.id}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
        <div className="space-y-1">
          <p className="break-words">
            <strong>PERÍODO:</strong> {formatDate(application.startDate)} - {formatDate(application.endDate)}
          </p>
          <p className="break-words">
            <strong>DOCUMENTO:</strong> {formatTextToUpperCase(application.documentNumber)}
          </p>
        </div>
        <div className="space-y-1">
          <p>
            <strong>DURACIÓN:</strong> {duration} MESES
          </p>
          <p className="break-words">
            <strong>UBICACIÓN:</strong> {formatTextToUpperCase(application.plantLocation)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onViewCertificate(application)}
          disabled={application.status !== 'approved'}
          className={`px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 text-sm flex-1 min-w-[140px] justify-center ${
            application.status === 'approved' 
              ? 'text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          style={application.status === 'approved' ? {
            background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
          } : {}}
        >
          <span>VER CERTIFICADO</span>
        </button>
        
      </div>
    </div>
  );
});

const CertificateModal = ({ application, onClose, onDownload }) => {
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

  const duration = calculateDuration(application.startDate, application.endDate);

  if (!application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl my-4 mx-auto">
      
        <div 
          className="border-b p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 rounded-t-xl text-white"
          style={{ 
            background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
          }}
        >
          <h3 className="text-lg font-bold">VISTA PREVIA DEL CERTIFICADO</h3>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={onDownload}
              className="bg-white text-green-700 px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center space-x-2 text-sm flex-1 sm:flex-none justify-center"
            >

              <span>DESCARGAR PDF</span>
            </button>
            <button
              onClick={onClose}
              className="bg-white text-red-700 px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center space-x-2 text-sm flex-1 sm:flex-none justify-center"
            >
              <span>✕</span>
              <span>CERRAR</span>
            </button>
          </div>
        </div>
        
        {/* Contenido del certificado */}
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          <div id="certificate-preview" className="bg-white p-4 rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-auto">
            
            {/* Encabezado del certificado */}
            <div 
              className="rounded-lg p-4 text-center text-white mb-4"
              style={{ 
                background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
              }}
            >
              <h1 className="text-xl font-bold mb-2">
                CERTIFICADO DE PASANTÍA
              </h1>
              <p className="text-sm font-light">
                SISTEMA DE CERTIFICACIÓN
              </p>
            </div>

            {/* Código de verificación */}
            <div 
              className="border rounded-lg p-3 mb-4 text-center"
              style={{ 
                backgroundColor: `${COLOR_PALETTE.primary.hex}10`,
                borderColor: `${COLOR_PALETTE.primary.hex}30`
              }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: COLOR_PALETTE.primary.hex }}>
                CÓDIGO DE VERIFICACIÓN ÚNICO
              </p>
              <p className="text-lg font-bold font-mono tracking-wider break-all" style={{ color: COLOR_PALETTE.primary.hex }}>
                {application.verificationCode || application.id}
              </p>
              <p className="text-xs mt-2" style={{ color: COLOR_PALETTE.primary.hex }}>
                CÓDIGO PARA VERIFICAR AUTENTICIDAD
              </p>
            </div>

            {/* Información del estudiante */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-3">
                SE CERTIFICA QUE
              </p>
              <h2 className="text-lg font-bold leading-tight break-words mb-2" style={{ color: COLOR_PALETTE.primary.hex }}>
                {formatTextToUpperCase(application.firstName)} {formatTextToUpperCase(application.lastName)}
              </h2>
              <p className="text-sm text-gray-700 mb-2">
                IDENTIFICADO CON DOCUMENTO NÚMERO
              </p>
              <p className="text-base font-semibold mb-3 break-all" style={{ color: COLOR_PALETTE.accent }}>
                {formatTextToUpperCase(application.documentNumber)}
              </p>
            </div>

            {/* Información académica */}
            <div className="space-y-4 mb-4">
              <div 
                className="rounded-lg p-3"
                style={{ backgroundColor: `${COLOR_PALETTE.primary.hex}08` }}
              >
                <h3 className="font-semibold mb-2 text-sm" style={{ color: COLOR_PALETTE.primary.hex }}>
                  INFORMACIÓN ACADÉMICA
                </h3>
                <div className="space-y-1">
                  <p className="text-sm break-words">
                    <strong>INSTITUCIÓN:</strong> {formatTextToUpperCase(application.institution)}
                  </p>
                  <p className="text-sm break-words">
                    <strong>PROGRAMA:</strong> {formatTextToUpperCase(application.program)}
                  </p>
                  <p className="text-sm">
                    <strong>DURACIÓN:</strong> {duration} MESES
                  </p>
                </div>
              </div>
              
              <div 
                className="rounded-lg p-3"
                style={{ backgroundColor: `${COLOR_PALETTE.primary.hex}08` }}
              >
                <h3 className="font-semibold mb-2 text-sm" style={{ color: COLOR_PALETTE.primary.hex }}>
                  PERIODO DE PASANTÍA
                </h3>
                <div className="space-y-1">
                  <p className="text-sm">
                    <strong>INICIO:</strong> {formatDate(application.startDate)}
                  </p>
                  <p className="text-sm">
                    <strong>FIN:</strong> {formatDate(application.endDate)}
                  </p>
                  <p className="text-sm break-words">
                    <strong>TIPO DE PLANTA:</strong> {formatTextToUpperCase(application.plantType)}
                  </p>
                  <p className="text-sm break-words">
                    <strong>UBICACIÓN:</strong> {formatTextToUpperCase(application.plantLocation)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actividades */}
            {application.activities && (
              <div 
                className="rounded-lg p-3 mb-4"
                style={{ backgroundColor: `${COLOR_PALETTE.primary.hex}10` }}
              >
                <h3 className="font-semibold mb-2 text-sm" style={{ color: COLOR_PALETTE.primary.hex }}>
                  ACTIVIDADES REALIZADAS
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed break-words">
                  {formatTextToUpperCase(application.activities)}
                </p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600 text-center italic mb-3">
                Por lo tanto, se certifica que el/la estudiante mencionado(a) cumplió satisfactoriamente 
                con el programa de pasantías en el periodo establecido.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-300">
              <div className="text-center">
                <div className="border-t border-gray-400 mt-2 pt-2 mx-auto w-32">
                  <p className="text-sm font-semibold text-gray-700 mb-1">TUTOR</p>
                  <p className="text-sm text-gray-600 break-words">
                    {formatTextToUpperCase(application.tutorName)}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 mt-2 pt-2 mx-auto w-32">
                  <p className="text-sm font-semibold text-gray-700 mb-1">COORDINADOR</p>
                  <p className="text-sm text-gray-600"></p>
                  <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>
          
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const ApplicationSkeleton = () => (
  <div className="border border-gray-200 rounded-lg p-4 animate-pulse w-full">
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <div className="h-3 bg-gray-300 rounded"></div>
          <div className="h-3 bg-gray-300 rounded"></div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="h-8 bg-gray-300 rounded w-24 flex-1 min-w-[140px]"></div>
          <div className="h-8 bg-gray-300 rounded w-24 flex-1 min-w-[140px]"></div>
        </div>
      </div>
      <div className="w-20 h-6 bg-gray-300 rounded-full"></div>
    </div>
  </div>
);

const ApplicationFormModal = ({ show, onClose, onSubmit, formData, setFormData, loading }) => {
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

  const plantLocationOptions = getPlantLocationOptions(formData.plantType);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div 
          className="border-b p-4 flex justify-between items-center rounded-t-xl text-white"
          style={{ 
            background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
          }}
        >
          <h3 className="text-lg font-bold">NUEVA SOLICITUD DE PASANTÍA</h3>
          <button
            onClick={onClose}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-all duration-300"
          >
            <span>✕</span>
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NÚMERO DE DOCUMENTO *
              </label>
              <input
                type="text"
                required
                value={formData.documentNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm"
                placeholder="Ingresa tu número de documento"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                INSTITUCIÓN EDUCATIVA *
              </label>
              <input
                type="text"
                required
                value={formData.institution}
                onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm"
                placeholder="Nombre de tu institución"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PROGRAMA ACADÉMICO *
              </label>
              <input
                type="text"
                required
                value={formData.program}
                onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm"
                placeholder="Tu programa de estudios"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                FECHA DE INICIO *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                FECHA DE FIN *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                TIPO DE PLANTA *
              </label>
              <select
                required
                value={formData.plantType}
                onChange={(e) => setFormData(prev => ({ ...prev, plantType: e.target.value, plantLocation: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm"
              >
                <option value="">Selecciona el tipo</option>
                <option value="INTERNA">INTERNA</option>
                <option value="EXTERNA">EXTERNA</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                UBICACIÓN DE PLANTA *
              </label>
              <select
                required
                value={formData.plantLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, plantLocation: e.target.value }))}
                disabled={!formData.plantType}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona ubicación</option>
                {plantLocationOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ACTIVIDADES A REALIZAR *
              </label>
              <textarea
                required
                value={formData.activities}
                onChange={(e) => setFormData(prev => ({ ...prev, activities: e.target.value }))}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-300 text-sm resize-none"
                placeholder="Describe las actividades que realizarás durante tu pasantía..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 text-sm flex-1 sm:flex-none order-2 sm:order-1"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm flex-1 sm:flex-none order-1 sm:order-2"
              style={{
                background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>ENVIANDO...</span>
                </>
              ) : (
                <>
                  <span>📨</span>
                  <span>ENVIAR SOLICITUD</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de confirmación de logout
const LogoutModal = ({ show, onClose, onConfirm }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div 
          className="rounded-t-xl p-6 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
          }}
        >
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-xl font-bold mb-2">CERRAR SESIÓN</h3>
          <p className="opacity-90">¿Estás seguro de que quieres cerrar tu sesión?</p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 text-sm flex-1 sm:flex-none order-2 sm:order-1"
            >
              CANCELAR
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white text-sm flex-1 sm:flex-none order-1 sm:order-2"
              style={{
                background: `linear-gradient(135deg, #ef4444, #dc2626)`
              }}
            >
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
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

  const siteConfig = useMemo(() => ({
    name: 'TRUSTIFY',
    description: 'SISTEMA DE CERTIFICACIÓN',
    logo: '🔒',
    primaryColor: COLOR_PALETTE.primary.hex,
    secondaryColor: COLOR_PALETTE.secondary
  }), []);

  // Configuración de paginación
  const applicationsPerPage = 5;
  const indexOfLastApp = currentPage * applicationsPerPage;
  const indexOfFirstApp = indexOfLastApp - applicationsPerPage;
  const currentApplications = myApplications.slice(indexOfFirstApp, indexOfLastApp);
  const totalPages = Math.ceil(myApplications.length / applicationsPerPage);

  // Listener de Firestore
  useEffect(() => {
    const loadApplications = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log('No hay usuario autenticado');
        setLoadingApplications(false);
        return;
      }

      try {
        setLoadingApplications(true);
        
        const q = query(
          collection(db, 'internshipApplications'), 
          where('studentId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            if (snapshot.empty) {
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

            applications.sort((a, b) => {
              const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
              const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
              return dateB - dateA;
            });
            
            setMyApplications(applications);
            setLoadingApplications(false);
          },
          (error) => {
            console.error('Error en listener de Firestore:', error);
            setError('Error al cargar solicitudes');
            setLoadingApplications(false);
          }
        );

        return () => unsubscribe();

      } catch (error) {
        console.error('Error configurando listener:', error);
        setError('Error de conexión');
        setLoadingApplications(false);
      }
    };

    loadApplications();
  }, []);

  // Efecto para mostrar errores
  useEffect(() => {
    if (error) {
      showMessage('error', error);
      setError(null);
    }
  }, [error]);

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
        createdAt: new Date(),
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
      console.error('Error al enviar solicitud:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TRF-${timestamp}-${random}`.toUpperCase();
  };

  const showMessage = (type, text) => {
    const existingMessages = document.querySelectorAll('.custom-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `custom-message fixed top-20 right-4 z-50 p-4 rounded-lg border-l-4 max-w-md ${
      type === 'error' 
        ? 'bg-red-50 text-red-700 border-red-400 shadow-lg' 
        : 'bg-green-50 text-green-700 border-green-400 shadow-lg'
    }`;
    messageDiv.innerHTML = `
      <div class="flex items-center">
        <span class="text-lg mr-2">${type === 'error' ? '❌' : '✅'}</span>
        <span class="font-medium text-sm">${text}</span>
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

  const downloadPDF = async () => {
    if (!selectedApplication) return;

    try {
      setLoading(true);
      const element = document.getElementById('certificate-preview');
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CERTIFICADO-${selectedApplication.verificationCode}.pdf`);
      showMessage('success', '📄 CERTIFICADO DESCARGADO EXITOSAMENTE');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      setError('Error al descargar certificado');
    } finally {
      setLoading(false);
    }
  };

  const openCertificateModal = (application) => {
    if (application.status === 'approved') {
      setSelectedApplication(application);
      setShowCertificateModal(true);
    } else {
      setError('❌ SOLO PUEDES VER CERTIFICADOS APROBADOS');
    }
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
      setError('❌ ERROR AL CERRAR SESIÓN');
    }
  };

  const renderLogo = () => {
    return (
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
        }}
      >
        <span className="text-lg text-white">{siteConfig.logo}</span>
      </div>
    );
  };

  const counts = getApplicationCounts();

  // Pagination controls
  const paginationControls = totalPages > 1 && (
    <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex-1 sm:flex-none min-w-[100px]"
      >
        ‹ Anterior
      </button>
      
      <span className="px-3 py-2 text-sm text-gray-600 text-center flex-1 sm:flex-none">
        Página {currentPage} de {totalPages}
      </span>
      
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex-1 sm:flex-none min-w-[100px]"
      >
        Siguiente ›
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-lg border-b z-40"
        style={{ borderColor: COLOR_PALETTE.primary.hex + '20' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-3">
              {renderLogo()}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {siteConfig.name}
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  {siteConfig.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center space-x-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: COLOR_PALETTE.primary.hex + '10' }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                  }}
                >
                  <span className="text-white text-sm">👤</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                  {auth.currentUser?.displayName || 'ADMIN'}
                </span>
              </div>
              
              <button
                onClick={() => setShowLogoutModal(true)}
                className="text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all flex items-center space-x-2 text-xs flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, #ef4444, #dc2626)`
                }}
              >
                <span>CERRAR SESIÓN</span>
                <span className="hidden xs:inline">CERRAR SESIÓN</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto p-4">
          {/* Estado de carga */}
          {loadingApplications && (
            <div 
              className="border rounded-xl p-4 mb-6 text-center"
              style={{ 
                backgroundColor: COLOR_PALETTE.primary.hex + '10',
                borderColor: COLOR_PALETTE.primary.hex + '20'
              }}
            >
              <div className="flex items-center justify-center space-x-3">
                <div 
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: COLOR_PALETTE.primary.hex }}
                ></div>
                <p className="font-bold text-sm" style={{ color: COLOR_PALETTE.primary.hex }}>
                  CARGANDO SOLICITUDES...
                </p>
              </div>
            </div>
          )}

          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {[
              { count: counts.total, label: 'TOTAL', color: 'from-gray-500 to-gray-600', icon: '📊' },
              { count: counts.pending, label: 'PENDIENTES', color: 'from-yellow-500 to-yellow-600', icon: '⏳' },
              { count: counts.underReview, label: 'EN REVISIÓN', color: 'from-blue-500 to-blue-600', icon: '🔍' },
              { count: counts.approved, label: 'APROBADAS', color: 'from-green-500 to-green-600', icon: '✅' },
              { count: counts.rejected, label: 'RECHAZADAS', color: 'from-red-500 to-red-600', icon: '❌' }
            ].map((stat, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg shadow-lg p-3 transform hover:scale-105 transition-all duration-300 border border-white/20"
              >
                <div className={`bg-gradient-to-r ${stat.color} w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-white text-base">{stat.icon}</span>
                </div>
                <p className="text-xl font-bold text-center text-gray-800">{stat.count}</p>
                <p className="text-xs text-gray-600 text-center font-bold">{stat.label}</p>
              </div>
            ))}
          </div>

      
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowForm(true)}
              disabled={loading}
              className="text-white px-6 py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 text-sm w-full sm:w-auto justify-center"
              style={{
                background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
              }}
            >
              <span className="text-lg">+</span>
              <span>NUEVA SOLICITUD</span>
            </button>
          </div>


          <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl p-4 border border-white/20">
            <div className="flex items-center mb-4">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                style={{
                  background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
                }}
              >
                <span className="text-white text-base">📋</span>
              </div>
              <h3 className="text-lg font-bold" style={{ color: COLOR_PALETTE.primary.hex }}>
                MIS SOLICITUDES
              </h3>
              <span className="ml-2 text-xs text-gray-500 hidden sm:inline">(Más recientes primero)</span>
            </div>

            <div className="space-y-4">
              {loadingApplications ? (
                <>
                  <ApplicationSkeleton />
                  <ApplicationSkeleton />
                  <ApplicationSkeleton />
                </>
              ) : myApplications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-300 text-4xl mb-3">📝</div>
                  <h3 className="text-lg font-bold text-gray-700 mb-2">NO HAY SOLICITUDES</h3>
                  <p className="text-gray-500 mb-4">COMIENZA CREANDO TU PRIMERA SOLICITUD</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-white px-6 py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-sm w-full sm:w-auto"
                    style={{
                      background: `linear-gradient(135deg, ${COLOR_PALETTE.primary.hex}, ${COLOR_PALETTE.secondary})`
                    }}
                  >
                    CREAR PRIMERA SOLICITUD
                  </button>
                </div>
              ) : (
                <>
                  {currentApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      onViewCertificate={openCertificateModal}
                      onDownloadPDF={downloadPDF}
                    />
                  ))}
                  
                  {paginationControls}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ApplicationFormModal
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
      />

      {showCertificateModal && selectedApplication && (
        <CertificateModal
          application={selectedApplication}
          onClose={closeCertificateModal}
          onDownload={downloadPDF}
        />
      )}

      <LogoutModal
        show={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default StudentDashboard;