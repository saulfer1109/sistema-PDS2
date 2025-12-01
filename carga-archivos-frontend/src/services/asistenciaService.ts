const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface AsistenciaResumen {
  ok: boolean;
  periodoEtiqueta: string;
  periodoId: number | null;
  grupoId: number | null;
  alumnosVinculados: number;
  alumnosSinAlumno: number;
  alumnosSinGrupo: number;
  inscripcionesCreadas: number;
  warnings: string[];
}

type UploadResponse = {
  ok: boolean;
  archivoId: number;
};

type ProcessResponse = {
  ok: boolean;
  resumen: AsistenciaResumen;
};

export async function uploadAsistencia(file: File): Promise<number> {
  const formData = new FormData();
  formData.append("archivo", file);

  const resp = await fetch(`${API_BASE}/api/asistencia/upload`, {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    throw new Error("Error al subir lista de asistencia");
  }

  const json = (await resp.json()) as UploadResponse;
  if (!json.ok || !json.archivoId) {
    throw new Error("Respuesta inválida al subir lista de asistencia");
  }
  return json.archivoId;
}

export async function procesarAsistencia(
  archivoId: number,
  periodoEtiqueta?: string
): Promise<AsistenciaResumen> {
  const body: Record<string, unknown> = {};
  if (periodoEtiqueta) body.periodoEtiqueta = periodoEtiqueta;

  const resp = await fetch(
    `${API_BASE}/api/asistencia/process/${archivoId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    throw new Error("Error al procesar lista de asistencia");
  }

  const json = (await resp.json()) as ProcessResponse;
  if (!json.ok || !json.resumen) {
    throw new Error("Respuesta inválida al procesar lista de asistencia");
  }

  return json.resumen;
}
