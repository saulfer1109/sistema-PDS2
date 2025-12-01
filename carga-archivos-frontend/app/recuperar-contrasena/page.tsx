"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type Step = "request" | "reset" | "success";

export default function RecoverPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Por favor ingresa tu correo institucional.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "No se pudo generar el código.");
      } else {
        setInfo(
          data.message ||
            "Si el correo está registrado, se ha enviado un código de recuperación."
        );
        setStep("reset");
      }
    } catch (err) {
      console.error("Error en forgot-password:", err);
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !codigo || !newPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo, newPassword }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "No se pudo actualizar la contraseña.");
      } else {
        setInfo(data.message || "Contraseña actualizada correctamente.");
        setStep("success");
      }
    } catch (err) {
      console.error("Error en reset-password:", err);
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-3xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#16469B]">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Usa tu correo institucional para restablecer el acceso.
          </p>
        </div>

        {step === "request" && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Correo institucional
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16469B]"
                placeholder="tucorreo@unison.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {info && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                {info}
              </p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading ? "Enviando código..." : "Enviar código de recuperación"}
              </Button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-gray-600">
              Hemos enviado un código de 6 dígitos a tu correo (revisar spam).
              Ingresa el código junto con tu nueva contraseña.
            </p>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Correo institucional
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16469B]"
                placeholder="tucorreo@unison.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Código de verificación
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16469B]"
                placeholder="Código de 6 dígitos"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16469B]"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {info && (
              <p className="text-sm text-green-700 bg-green-50 border-green-200 border rounded-xl px-3 py-2">
                {info}
              </p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading
                  ? "Actualizando contraseña..."
                  : "Actualizar contraseña"}
              </Button>
            </div>
          </form>
        )}

        {step === "success" && (
          <div className="space-y-4">
            {info && (
              <p className="text-sm text-green-700 bg-green-50 border-green-200 border rounded-xl px-3 py-2">
                {info}
              </p>
            )}
            <Button
              type="button"
              onClick={goToLogin}
              className="w-full justify-center"
            >
              Volver al inicio de sesión
            </Button>
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={goToLogin}
            className="text-xs text-gray-500 hover:text-[#16469B] hover:underline"
          >
            Regresar al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
