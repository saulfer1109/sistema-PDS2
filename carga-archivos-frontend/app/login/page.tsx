"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

const USER_STORAGE_KEY = "userData"; // clave de localStorage compartida

type LoginResponse = {
  message: string;
  user: {
    id: number;
    profesorId: number | null;
    email: string;
    nombre: string;
    roles: string[];
    appRoles: string[]; // ADMINISTRADOR / COORDINADOR válidos para este front
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!email || !password) {
    setError("Por favor ingresa correo y contraseña.");
    return;
  }

  setLoading(true);
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data: LoginResponse | { error?: string } = await res.json();

    if (!res.ok) {
      const msg =
        "error" in data && data.error
          ? data.error
          : "Error al iniciar sesión.";
      setError(msg);
      setLoading(false);
      return;
    }

    const { user } = data as LoginResponse;

    // Guardar usuario en localStorage
    if (typeof window !== "undefined") {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }

    // Redirigir al dashboard principal (MainApplication en "/")
    router.push("/");
  } catch (err) {
    console.error("Error en login:", err);
    setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
  } finally {
    setLoading(false);
  }
};


  const goToRecover = () => {
    router.push("/recuperar-contrasena");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-3xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#16469B]">
            Sistema de Carga de Archivos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Inicia sesión con tu cuenta institucional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16469B]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={goToRecover}
            className="text-[#16469B] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}
