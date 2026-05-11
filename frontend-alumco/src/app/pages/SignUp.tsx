import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { authService } from '../services/apiService';
import { formatRutForDisplay, isRutValid, normalizeRutForStorage } from '../utils/rut';

type RegisterGender = 'femenino' | 'masculino' | 'otro';

interface SignUpProps {
  onBackToLogin: () => void;
  onRegistered: () => void;
  theme?: 'dark' | 'light';
}

export default function SignUp({ onBackToLogin, onRegistered, theme = 'dark' }: SignUpProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rut, setRut] = useState('');
  const [genero, setGenero] = useState<RegisterGender | ''>('');
  const [sede, setSede] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rutTouched, setRutTouched] = useState(false);

  const [sedes, setSedes] = useState<string[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const normalizedRut = normalizeRutForStorage(rut);
  const rutInvalid =
    rut.length > 0 && normalizedRut.length >= 2 && !isRutValid(normalizedRut);

  const passwordMismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;

  const labelClass =
    theme === 'dark'
      ? 'text-sm md:text-base mb-1.5 block text-white'
      : 'text-sm md:text-base mb-1.5 block text-[#1a2840]';

  const inputClass =
    theme === 'dark'
      ? 'h-11 text-base border-2 bg-white'
      : 'h-11 text-base border-2 border-slate-300 bg-white';

  useEffect(() => {
    let mounted = true;

    const loadSedes = async () => {
      setLoadingSedes(true);
      try {
        const response = await authService.getRegistrationSedes();
        if (!mounted) return;

        const fromApi = response.success && response.data ? response.data : [];
        setSedes(Array.from(new Set(fromApi)));
      } finally {
        if (!mounted) return;
        setLoadingSedes(false);
      }
    };

    loadSedes();

    return () => {
      mounted = false;
    };
  }, []);

  const isReadyToSubmit = useMemo(() => {
    return Boolean(
      nombreCompleto.trim() &&
      normalizedRut &&
      isRutValid(rut) &&
      genero &&
      sede &&
      email.trim() &&
      password &&
      confirmPassword
    );
  }, [confirmPassword, email, genero, nombreCompleto, normalizedRut, password, rut, sede]);

  const resetForm = () => {
    setNombreCompleto('');
    setRut('');
    setGenero('');
    setSede('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRutTouched(false);
    setFormError('');
  };

  const handleRutChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const raw = e.target.value;

    // Allow typing digits and K while formatting progressively without blocking input.
    const cleaned = raw
      .replace(/[^0-9kK]/g, '')
      .toUpperCase()
      .slice(0, 9);

    if (!cleaned) {
      setRut('');
      return;
    }

    if (cleaned.length === 1) {
      setRut(cleaned);
      return;
    }

    setRut(formatRutForDisplay(cleaned));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');

    if (!normalizedRut || !isRutValid(normalizedRut)) {
      setRutTouched(true);
      setFormError('Ingresa un RUT válido.');
      return;
    }

    if (!nombreCompleto.trim() || !genero || !sede || !email.trim() || !password || !confirmPassword) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (passwordMismatch) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.register({
        nombreCompleto: nombreCompleto.trim(),
        rut: normalizedRut,
        genero,
        sede,
        email: email.trim(),
        password,
        confirmPassword,
      });

      if (!result.success) {
        setFormError(result.error || 'No se pudo completar el registro.');
        return;
      }

      resetForm();
      onRegistered();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signup-nombre" className={labelClass}>Nombre Completo *</Label>
        <Input
          id="signup-nombre"
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          className={inputClass}
          placeholder="Ej: María González"
          autoComplete="name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-rut" className={labelClass}>RUT *</Label>
          <Input
            id="signup-rut"
            value={rut}
            onChange={handleRutChange}
            onBlur={() => setRutTouched(true)}
            className={inputClass}
            placeholder="12.345.678-9"
            autoComplete="off"
          />
          {rutTouched && rutInvalid ? (
            <div className="text-sm text-red-500">El RUT ingresado es inválido.</div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Género *</Label>
          <Select value={genero} onValueChange={(v) => setGenero(v as RegisterGender)}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Selecciona género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="femenino">♀️ Femenino</SelectItem>
              <SelectItem value="masculino">♂️ Masculino</SelectItem>
              <SelectItem value="otro">⚪ Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>Sede *</Label>
          <Select value={sede} onValueChange={setSede} disabled={loadingSedes}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder={loadingSedes ? 'Cargando sedes...' : 'Selecciona sede'} />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className={labelClass}>Correo Electrónico *</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="tu@correo.cl"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className={labelClass}>Contraseña *</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-confirm" className={labelClass}>Confirmar Contraseña *</Label>
          <Input
            id="signup-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
          />
          {passwordMismatch ? (
            <div className="text-sm text-red-500">Las contraseñas no coinciden.</div>
          ) : null}
        </div>
      </div>

      {formError ? (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 px-3 py-2.5 rounded-lg text-sm md:text-base">
          {formError}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || !isReadyToSubmit || passwordMismatch}
        className={
          theme === 'dark'
            ? 'w-full h-11 text-base bg-white text-[#1a2840] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
            : 'w-full h-11 text-base bg-[#1a2840] text-white hover:bg-[#2a3850] disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        {isSubmitting ? 'Registrando...' : 'Registrarse'}
      </Button>

      <div className={theme === 'dark' ? 'pt-3 border-t border-white/20 text-center' : 'pt-3 border-t border-slate-200 text-center'}>
        <Button
          type="button"
          onClick={onBackToLogin}
          variant="outline"
          className={
            theme === 'dark'
              ? 'w-full h-11 text-base border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#1a2840]'
              : 'w-full h-11 text-base border-2 border-slate-300 text-[#1a2840] bg-white hover:bg-slate-50'
          }
        >
          Iniciar Sesión
        </Button>
      </div>
    </form>
  );
}
