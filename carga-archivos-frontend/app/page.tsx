"use client";

import { MainApplication } from "@/components/MainApplication";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function HomePage() {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <p className="text-sm text-gray-600">
          Verificando sesión, por favor espera...
        </p>
      </main>
    );
  }

  // aquí podrías pasar user a MainApplication si lo necesitas
  // <MainApplication user={user} /> — por ahora no es necesario
  return <MainApplication />;
}
