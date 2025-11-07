import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const { 
    loginWithGoogle, 
    registerWithEmail, 
    loginWithEmail, 
    resetPassword, 
    loading 
  } = useAuth();

  const [activeTab, setActiveTab] = useState('landing');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingShapes, setFloatingShapes] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSymbol: false
  });
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);


  const siteConfig = {
    name: 'TRUSTIFY', 
    description: 'SISTEMA DE CERTIFICACIÓN INTELIGENTE', 
    features: [
      '🔒 Certificación Segura',
      '⚡ Validación Instantánea',
    ],
    logo: '🔒', 
    backgroundImage: '', 
    primaryColor: '#1d3763',
    secondaryColor: '#2d4d85'
  };

  useEffect(() => {
    const shapes = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      type: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'square' : 'triangle',
      size: Math.random() * 30 + 10,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5
    }));
    setFloatingShapes(shapes);
  }, []);


  const validatePasswordStrength = (password) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    setPasswordStrength({
      hasMinLength,
      hasUpperCase,
      hasNumber,
      hasSymbol
    });

    return hasMinLength && hasUpperCase && hasNumber && hasSymbol;
  };


  const handleInputChange = (field, value) => {
    let processedValue = value;
    

    if (field === 'email' || field === 'displayName') {
      processedValue = value.toUpperCase();
    }
    
 
    if (field === 'password') {
      validatePasswordStrength(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const handleTabChange = (tab) => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      if (tab !== 'reset') {
        setResetEmailSent(false);
      }
      clearForm();
      setTimeout(() => setIsAnimating(false), 300);
    }, 200);
  };

  const handleGoogleLogin = async () => {
    try {
      setMessage({ type: 'info', text: 'CONECTANDO CON GOOGLE...' });
      await loginWithGoogle();
      setMessage({ type: 'success', text: '¡BIENVENIDO!' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error.code) });
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setMessage({ type: 'info', text: 'INICIANDO SESIÓN...' });
      await loginWithEmail(formData.email, formData.password);
      setMessage({ type: 'success', text: '¡BIENVENIDO DE VUELTA!' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error.code) });
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();

    if (!validatePasswordStrength(formData.password)) {
      setMessage({ type: 'error', text: 'LA CONTRASEÑA NO CUMPLE CON LOS REQUISITOS DE SEGURIDAD' });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'LAS CONTRASEÑAS NO COINCIDEN' });
      return;
    }

    if (!formData.displayName.trim()) {
      setMessage({ type: 'error', text: 'EL NOMBRE COMPLETO ES REQUERIDO' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'CREANDO TU CUENTA...' });
      await registerWithEmail(formData.email, formData.password, formData.displayName);
      setMessage({ type: 'success', text: '¡CUENTA CREADA EXITOSAMENTE!' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error.code) });
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      setMessage({ type: 'info', text: 'ENVIANDO EMAIL DE RECUPERACIÓN...' });
      await resetPassword(formData.email);
      
  
      setMessage({ 
        type: 'success', 
        text: 'EMAIL DE RECUPERACIÓN ENVIADO EXITOSAMENTE' 
      });
      setResetEmailSent(true);
      
      setTimeout(() => {
        handleTabChange('login');
        setResetEmailSent(false);
      }, 5000);
      
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error.code) });
    }
  };

  const getErrorMessage = (errorCode) => {
    const errors = {
      'auth/invalid-email': 'EMAIL INVÁLIDO',
      'auth/user-disabled': 'CUENTA DESHABILITADA',
      'auth/user-not-found': 'USUARIO NO ENCONTRADO',
      'auth/wrong-password': 'CONTRASEÑA INCORRECTA',
      'auth/email-already-in-use': 'ESTE EMAIL YA ESTÁ REGISTRADO',
      'auth/weak-password': 'LA CONTRASEÑA NO CUMPLE LOS REQUISITOS DE SEGURIDAD',
      'auth/network-request-failed': 'ERROR DE CONEXIÓN',
      'auth/too-many-requests': 'DEMASIADOS INTENTOS. INTENTA MÁS TARDE.',
      'default': 'ERROR DESCONOCIDO. INTENTA DE NUEVO.'
    };
    return errors[errorCode] || errors.default;
  };

  const clearForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
    setPasswordStrength({
      hasMinLength: false,
      hasUpperCase: false,
      hasNumber: false,
      hasSymbol: false
    });
    setMessage({ type: '', text: '' });
  };


  const PasswordTooltip = () => (
    <div className="absolute z-50 bg-white border-2 border-trustify-blue rounded-2xl p-4 shadow-2xl max-w-xs transform -translate-y-2">
      <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-trustify-blue rotate-45"></div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-trustify-blue font-nunito mb-2">REQUISITOS DE CONTRASEÑA:</p>
        <div className="flex items-center text-xs">
          <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
            passwordStrength.hasMinLength ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {passwordStrength.hasMinLength ? '✓' : '•'}
          </span>
          <span className={`font-nunito ${passwordStrength.hasMinLength ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
            Mínimo 8 caracteres
          </span>
        </div>
        <div className="flex items-center text-xs">
          <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
            passwordStrength.hasUpperCase ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {passwordStrength.hasUpperCase ? '✓' : '•'}
          </span>
          <span className={`font-nunito ${passwordStrength.hasUpperCase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
            Al menos una mayúscula (A-Z)
          </span>
        </div>
        <div className="flex items-center text-xs">
          <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
            passwordStrength.hasNumber ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {passwordStrength.hasNumber ? '✓' : '•'}
          </span>
          <span className={`font-nunito ${passwordStrength.hasNumber ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
            Al menos un número (0-9)
          </span>
        </div>
        <div className="flex items-center text-xs">
          <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
            passwordStrength.hasSymbol ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {passwordStrength.hasSymbol ? '✓' : '•'}
          </span>
          <span className={`font-nunito ${passwordStrength.hasSymbol ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
            Al menos un símbolo (!@#$%^&*)
          </span>
        </div>
        
        {formData.password && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  Object.values(passwordStrength).filter(Boolean).length === 4 ? 'bg-green-500' :
                  Object.values(passwordStrength).filter(Boolean).length === 3 ? 'bg-yellow-500' :
                  Object.values(passwordStrength).filter(Boolean).length === 2 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ 
                  width: `${(Object.values(passwordStrength).filter(Boolean).length / 4) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center font-nunito">
              {Object.values(passwordStrength).filter(Boolean).length === 4 ? '🟢 CONTRASEÑA SEGURA' :
               Object.values(passwordStrength).filter(Boolean).length === 3 ? '🟡 CONTRASEÑA MEDIA' :
               Object.values(passwordStrength).filter(Boolean).length === 2 ? '🟠 CONTRASEÑA DÉBIL' :
               '🔴 CONTRASEÑA MUY DÉBIL'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
  const ResetSuccessMessage = () => (
    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-xl shadow-lg animate-bounceIn">
      <div className="flex items-start">
        <div className="flex-shrink-0">
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-green-800 font-nunito">
            ¡EMAIL ENVIADO EXITOSAMENTE!
          </h3>
          <div className="mt-2 text-sm text-green-700 font-nunito">
            <p className="font-medium">Hemos enviado un enlace de recuperación a:</p>
            <p className="bg-white/50 p-2 rounded-lg mt-1 font-mono">{formData.email}</p>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-xs font-semibold font-nunito">
                <span className="underline">CONSEJO IMPORTANTE:</span> Si no encuentras el email en tu bandeja de entrada, 
                <span className="font-bold"> revisa la carpeta de SPAM o CORREO NO DESEADO</span>. 
                A veces nuestros emails pueden llegar allí por error.
              </p>
            </div>
            <p className="mt-2 text-xs text-green-600">
              Serás redirigido automáticamente al login en 5 segundos...
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const FloatingShape = ({ shape }) => (
    <div
      className={`absolute opacity-5 ${
        shape.type === 'circle' ? 'rounded-full bg-trustify-blue' :
        shape.type === 'square' ? 'bg-trustify-light rotate-45' :
        'bg-trustify-dark triangle'
      }`}
      style={{
        width: shape.size,
        height: shape.size,
        left: `${shape.left}%`,
        top: `${shape.top}%`,
        animation: `float ${shape.duration}s ease-in-out ${shape.delay}s infinite alternate`
      }}
    />
  );


  const renderLogo = () => {
    if (siteConfig.logo.startsWith('http') || siteConfig.logo.startsWith('/')) {
      return (
        <img 
          src={siteConfig.logo} 
          alt={`${siteConfig.name} Logo`}
          className="w-24 h-24 object-contain mx-auto mb-4"
        />
      );
    } else {
      return (
        <div className="w-24 h-24 bg-gradient-to-r from-trustify-blue to-trustify-light rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <span className="text-3xl text-white">{siteConfig.logo}</span>
        </div>
      );
    }
  };


  const LandingPage = () => (
    <div className="text-center space-y-8">
 
      <div className="relative">
        {renderLogo()}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full animate-ping"></div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full"></div>
      </div>
 
      <h1 className="text-5xl font-bold bg-gradient-to-r from-trustify-blue to-trustify-light bg-clip-text text-transparent mb-4 font-nunito font-bold">
        {siteConfig.name}
      </h1>
      

      <p className="text-2xl text-gray-700 font-light mb-2 font-nunito">
        {siteConfig.slogan}
      </p>
      
      <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-nunito">
        {siteConfig.description}
      </p>

    
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {siteConfig.features.map((feature, index) => (
          <div key={index} className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 transform hover:scale-105 transition-all duration-300">
            <p className="text-sm font-semibold text-gray-800 font-nunito">{feature}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
        <button
          onClick={() => handleTabChange('login')}
          className="bg-gradient-to-r from-trustify-blue to-trustify-light text-white px-8 py-4 rounded-2xl hover:from-trustify-dark hover:to-trustify-blue transform transition-all duration-300 hover:scale-105 hover:shadow-2xl font-semibold text-lg font-nunito font-bold min-w-[200px]"
        >
          🔑 INICIAR SESIÓN
        </button>
        
        <button
          onClick={() => handleTabChange('register')}
          className="bg-white text-trustify-blue border-2 border-trustify-blue px-8 py-4 rounded-2xl hover:bg-trustify-blue hover:text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl font-semibold text-lg font-nunito font-bold min-w-[200px]"
        >
          👤 CREAR CUENTA
        </button>
      </div>

      <div className="pt-4">
        <button
          onClick={handleGoogleLogin}
          className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-2xl hover:shadow-xl hover:border-trustify-blue/30 transform transition-all duration-300 hover:scale-105 font-medium flex items-center justify-center space-x-3 mx-auto font-nunito"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continuar con Google</span>
        </button>
      </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-trustify-blue via-trustify-light to-trustify-dark relative overflow-hidden"
      style={siteConfig.backgroundImage ? {
        backgroundImage: `url(${siteConfig.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
    
      {siteConfig.backgroundImage && (
        <div className="absolute inset-0 bg-trustify-blue/80 backdrop-blur-sm"></div>
      )}

      <div className="absolute inset-0">
        {floatingShapes.map(shape => (
          <FloatingShape key={shape.id} shape={shape} />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className={`bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 transform transition-all duration-500 hover:shadow-3xl border border-white/20 ${
          activeTab === 'landing' ? 'max-w-4xl w-full' : 'max-w-md w-full'
        }`}>
          
      
          {activeTab !== 'landing' && (
            <button
              onClick={() => handleTabChange('landing')}
              className="mb-6 flex items-center space-x-2 text-trustify-blue hover:text-trustify-dark transition-all duration-300 font-semibold font-nunito"
            >
              <span>←</span>
              <span>VOLVER AL INICIO</span>
            </button>
          )}

          {activeTab === 'landing' ? (
            <LandingPage />
          ) : (
            <>
           
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  {renderLogo()}
                </div>
                <h2 className="text-2xl font-bold text-trustify-blue mb-2 font-nunito font-bold">
                  {activeTab === 'login' ? 'INICIAR SESIÓN' : 
                   activeTab === 'register' ? 'CREAR CUENTA' : 
                   'RECUPERAR CONTRASEÑA'}
                </h2>
              </div>

         
              {resetEmailSent && <ResetSuccessMessage />}

              {message.text && !resetEmailSent && (
                <div className={`mb-6 p-4 rounded-xl border-l-4 transform transition-all duration-500 font-nunito ${
                  message.type === 'error' 
                    ? 'bg-red-50 text-red-700 border-red-400 shadow-lg animate-shake' 
                    : message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border-green-400 shadow-lg animate-bounceIn'
                    : 'bg-blue-50 text-blue-700 border-blue-400 shadow-lg animate-pulse'
                }`}>
                  <div className="flex items-center">
                    <span className="text-lg mr-2">
                      {message.type === 'error' ? '' : message.type === 'success' ? '' : ''}
                    </span>
                    <span className="font-medium">{message.text}</span>
                  </div>
                </div>
              )}

              {activeTab !== 'reset' && (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white border-2 border-gray-200 rounded-2xl px-6 py-4 flex items-center justify-center space-x-4 hover:shadow-2xl hover:border-trustify-blue/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 mb-6 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center space-x-3">
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-trustify-blue border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="text-gray-700 font-semibold text-base font-nunito">CONTINUAR CON GOOGLE</span>
                      </>
                    )}
                  </div>
                </button>
              )}

              {activeTab !== 'reset' && (
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium font-nunito">O CONTINUAR CON EMAIL</span>
                  </div>
                </div>
              )}

            
              <div className={`transition-all duration-500 transform ${
                isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}>
                
                
                {activeTab === 'login' && (
                  <form onSubmit={handleEmailLogin} className="space-y-5">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                        EMAIL
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm uppercase placeholder-normal font-nunito"
                        placeholder="TU@EMAIL.COM"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                      CONTRASEÑA
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm font-nunito"
                        placeholder="INGRESA TU CONTRASEÑA"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-trustify-blue to-trustify-light text-white py-4 rounded-2xl hover:from-trustify-dark hover:to-trustify-blue transform transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 font-semibold text-lg group relative overflow-hidden font-nunito font-bold"
                    >
                      <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-all duration-300"></div>
                      <span className="relative">
                        {loading ? 'INICIANDO SESIÓN...' : 'INICIAR SESIÓN'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('reset')}
                      className="w-full text-center text-sm text-trustify-blue hover:text-trustify-dark transition-all duration-300 hover:scale-105 font-medium font-nunito"
                    >
                      ¿OLVIDASTE TU CONTRASEÑA? 
                    </button>
                  </form>
                )}

                
                {activeTab === 'register' && (
                  <form onSubmit={handleEmailRegister} className="space-y-5">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                        NOMBRE COMPLETO
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm uppercase placeholder-normal font-nunito"
                        placeholder="TU NOMBRE COMPLETO"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                        EMAIL
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm uppercase placeholder-normal font-nunito"
                        placeholder="TU@EMAIL.COM"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="group relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                        CONTRASEÑA
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        onFocus={() => setShowPasswordTooltip(true)}
                        onBlur={() => setTimeout(() => setShowPasswordTooltip(false), 200)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm font-nunito"
                        placeholder="CREA UNA CONTRASEÑA SEGURA"
                        minLength="8"
                      />
                      {showPasswordTooltip && <PasswordTooltip />}
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                        CONFIRMAR CONTRASEÑA
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm font-nunito"
                        placeholder="CONFIRMA TU CONTRASEÑA"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !Object.values(passwordStrength).every(Boolean)}
                      className="w-full bg-gradient-to-r from-trustify-blue to-trustify-light text-white py-4 rounded-2xl hover:from-trustify-dark hover:to-trustify-blue transform transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 font-semibold text-lg group relative overflow-hidden font-nunito font-bold"
                    >
                      <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-all duration-300"></div>
                      <span className="relative">
                        {loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
                      </span>
                    </button>
                  </form>
                )}

                {activeTab === 'reset' && !resetEmailSent && (
                  <form onSubmit={handlePasswordReset} className="space-y-5">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <svg className="w-8 h-8 text-trustify-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 font-nunito font-bold">RECUPERAR CONTRASEÑA</h3>
                      <p className="text-sm text-gray-600 mt-2 font-nunito">
                        TE ENVIAREMOS UN ENLACE PARA RESTABLECER TU CONTRASEÑA
                      </p>
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1 font-nunito">
                       EMAIL
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-trustify-blue focus:border-trustify-blue transition-all duration-300 hover:border-trustify-blue/50 focus:scale-105 bg-white/50 backdrop-blur-sm uppercase placeholder-normal font-nunito"
                        placeholder="TU@EMAIL.COM"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => handleTabChange('login')}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transform transition-all duration-300 hover:scale-105 font-medium font-nunito"
                      >
                      VOLVER
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-trustify-blue to-trustify-light text-white py-3 rounded-2xl hover:from-trustify-dark hover:to-trustify-blue transform transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 font-semibold font-nunito font-bold"
                      >
                        {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200/50">
            <p className="text-xs text-gray-500 text-center font-nunito">
              AL CONTINUAR, ACEPTAS NUESTROS{' '}
              <a href="#" className="text-trustify-blue hover:text-trustify-dark transition-colors duration-300 font-semibold">
                TÉRMINOS
              </a>{' '}
              Y{' '}
              <a href="#" className="text-trustify-blue hover:text-trustify-dark transition-colors duration-300 font-semibold">
                PRIVACIDAD
              </a>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-bounceIn { animation: bounceIn 0.6s ease-out; }
        .triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default Login;