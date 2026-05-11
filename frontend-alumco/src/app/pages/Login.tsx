import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BACKEND_URL } from '../config/api.config';
import SignUp from './SignUp';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

function AlumcoLogo({ variant }: { variant: 'light' | 'dark' }) {
  const [imageOk, setImageOk] = useState(true);
  const textClass =
    variant === 'light'
      ? 'text-white text-3xl font-semibold tracking-wide'
      : 'text-[#1a2840] text-3xl font-semibold tracking-wide';

  if (!imageOk) {
    return <div className={textClass}>ALUMCO</div>;
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Logo de Alumco"
      className={variant === 'light' ? 'w-32 h-auto' : 'w-44 h-auto'}
      onError={() => setImageOk(false)}
    />
  );
}

type ViewMode = 'login' | 'register';

export default function Login() {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Registration form states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Por favor complete todos los campos');
      setIsLoading(false);
      return;
    }

    try {
      // Usamos el método login del AuthContext que conecta con el API
      const result = await login(email, password);

      if (result.success) {
        const roles = (result.user as any)?.rol;
        const isAdminUser = Array.isArray(roles) && roles.includes('admin');

        if (isAdminUser) {
          navigate('/admin');
        } else {
          navigate('/panel');
        }
      } else {
        // Mostrar error de forma amable
        setError(result.error || 'Error al iniciar sesión. Por favor intente de nuevo.');
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setError('Error inesperado. Por favor intente de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToRegister = () => {
    setError('');
    setViewMode('register');
  };

  const switchToLogin = () => {
    setError('');
    setViewMode('login');
  };

  const transition = {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2840] via-[#2d4263] to-[#1a2840] p-4 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500 to-red-500 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
            opacity: [0.25, 0.4, 0.25],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/3 left-0 w-80 h-80 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            y: [0, 30, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 45, 0],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-20 right-1/4 w-72 h-72 bg-gradient-to-tl from-red-500 to-orange-500 rounded-full blur-3xl"
        />
      </div>

      <div className="w-full md:h-auto md:min-h-[640px] md:max-w-5xl flex relative z-10">
        <div className="w-full flex rounded-xl md:rounded-2xl shadow-2xl overflow-hidden">
          
          {/* MOBILE ONLY - Single Panel */}
          <div className="w-full md:hidden min-h-[760px] relative overflow-hidden bg-gradient-to-br from-[#1a2840] to-[#2d4263] rounded-xl">
            <AnimatePresence mode="wait">
              {viewMode === 'login' ? (
                <motion.div
                  key="mobile-login"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="h-full p-6 flex flex-col justify-center"
                >
                  <div className="max-w-md mx-auto w-full">
                    <div className="flex justify-center mb-6">
                      <AlumcoLogo variant="light" />
                    </div>

                    <div className="mb-6">
                      <h2 className="text-2xl text-white mb-2">Iniciar Sesión</h2>
                      <p className="text-base text-blue-200">Ingrese sus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="email-mobile" className="text-base mb-1.5 block text-white">
                          Correo Electrónico
                        </Label>
                        <Input
                          id="email-mobile"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 text-base border-2 bg-white"
                          placeholder="tu@correo.cl"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password-mobile" className="text-base mb-1.5 block text-white">
                          Contraseña
                        </Label>
                        <Input
                          id="password-mobile"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 text-base border-2 bg-white"
                          placeholder="••••••••"
                        />
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-50 border-2 border-red-300 text-red-800 px-3 py-2.5 rounded-lg text-base"
                        >
                          {error}
                        </motion.div>
                      )}

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 text-base bg-white text-[#1a2840] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Ingresando...' : 'Entrar'}
                      </Button>

                      <div className="text-center space-y-3">
                        <button
                          type="button"
                          className="text-base text-white hover:underline block w-full"
                          onClick={() => alert('Por favor contacte al administrador para recuperar su contraseña')}
                        >
                          ¿Olvidó su contraseña?
                        </button>

                        <div className="pt-3 border-t border-white/20">
                          <p className="text-base text-blue-200 mb-2">¿No tiene una cuenta?</p>
                          <Button
                            type="button"
                            onClick={switchToRegister}
                            variant="outline"
                            className="w-full h-11 text-base border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#1a2840]"
                          >
                            Crear Cuenta Nueva
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-register"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="h-full p-6 flex flex-col justify-center"
                >
                  <div className="max-w-md mx-auto w-full">
                    <div className="flex justify-center mb-6">
                      <AlumcoLogo variant="light" />
                    </div>

                    <div className="mb-6">
                      <h2 className="text-2xl text-white mb-2">Crear Cuenta</h2>
                      <p className="text-base text-blue-200">Complete sus datos para registrarse</p>
                    </div>

                    <SignUp
                      theme="dark"
                      onBackToLogin={switchToLogin}
                      onRegistered={() => setShowSuccessMessage(true)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DESKTOP ONLY - Split Screen */}
          <div className="hidden md:flex md:w-full bg-white">
            <motion.div
              layout
              className="md:w-1/2 relative overflow-hidden"
              initial={false}
              animate={{
                order: viewMode === 'login' ? 0 : 1,
              }}
              transition={transition}
            >
              <AnimatePresence mode="wait">
                {viewMode === 'login' ? (
                  <motion.div
                    key="info-left"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4 }}
                    className="h-full bg-white p-6 md:p-8 flex flex-col justify-center"
                  >
                    <div>
                      <div className="mb-6">
                        <AlumcoLogo variant="dark" />
                      </div>
                      <h1 className="text-3xl md:text-4xl mb-3 text-[#1a2840]">
                        Bienvenido a Portal Alumco
                      </h1>
                      <p className="text-lg md:text-xl text-gray-600">
                        Plataforma de Capacitación Interna
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form-left"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.4 }}
                    className="h-full p-6 md:p-10 flex flex-col justify-center bg-gradient-to-br from-[#1a2840] to-[#2d4263]"
                  >
                    <div className="max-w-md mx-auto w-full">
                      <button
                        onClick={switchToLogin}
                        className="mb-5 text-base text-white hover:underline flex items-center"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Login
                      </button>

                      <SignUp
                        theme="dark"
                        onBackToLogin={switchToLogin}
                        onRegistered={() => setShowSuccessMessage(true)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              layout
              className="md:w-1/2 relative overflow-hidden"
              initial={false}
              animate={{
                order: viewMode === 'login' ? 1 : 0,
              }}
              transition={transition}
            >
              <AnimatePresence mode="wait">
                {viewMode === 'login' ? (
                  <motion.div
                    key="form-right"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.4 }}
                    className="h-full p-6 md:p-10 flex flex-col justify-center bg-gradient-to-br from-[#1a2840] to-[#2d4263]"
                  >
                    <div className="max-w-md mx-auto w-full">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="email" className="text-base mb-1.5 block text-white">
                            Correo Electrónico
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 text-base border-2 bg-white"
                            placeholder="tu@correo.cl"
                          />
                        </div>

                        <div>
                          <Label htmlFor="password" className="text-base mb-1.5 block text-white">
                            Contraseña
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 text-base border-2 bg-white"
                            placeholder="••••••••"
                          />
                        </div>

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border-2 border-red-300 text-red-800 px-3 py-2.5 rounded-lg text-base"
                          >
                            {error}
                          </motion.div>
                        )}

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-11 text-base bg-white text-[#1a2840] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Ingresando...' : 'Entrar'}
                        </Button>

                        <div className="text-center space-y-3">
                          <button
                            type="button"
                            className="text-base text-white hover:underline block w-full"
                            onClick={() => alert('Por favor contacte al administrador para recuperar su contraseña')}
                          >
                            ¿Olvidó su contraseña?
                          </button>

                          <div className="pt-3 border-t border-white/20">
                            <p className="text-base text-blue-200 mb-2">¿No tiene una cuenta?</p>
                            <Button
                              type="button"
                              onClick={switchToRegister}
                              variant="outline"
                              className="w-full h-11 text-base border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#1a2840]"
                            >
                              Crear Cuenta Nueva
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="info-right"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4 }}
                    className="h-full bg-white p-6 md:p-10 flex flex-col justify-center"
                  >
                    <div>
                      <div className="mb-6">
                        <AlumcoLogo variant="dark" />
                      </div>
                      <h1 className="text-3xl md:text-4xl mb-3 text-[#1a2840]">
                        Únase a Alumco
                      </h1>
                      <p className="text-lg md:text-xl text-gray-600">
                        Comience su capacitación hoy
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Success Message Dialog */}
      <Dialog
        open={showSuccessMessage}
        onOpenChange={(open) => {
          setShowSuccessMessage(open);
          if (!open) setViewMode('login');
        }}
      >
        <DialogContent className="max-w-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center py-5"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-xl text-[#1a2840] mb-3">
              ¡Registro recibido!
            </DialogTitle>
            <p className="text-lg text-gray-700 mb-5 leading-relaxed">
              Por seguridad, un administrador debe activar tu cuenta. Te avisaremos pronto.
            </p>
            <Button
              onClick={() => {
                setShowSuccessMessage(false);
                setViewMode('login');
              }}
              className="h-11 px-6 text-base bg-[#1a2840] hover:bg-[#2a3850]"
            >
              Entendido
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
