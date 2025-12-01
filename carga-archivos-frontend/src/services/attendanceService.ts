// src/services/attendanceService.ts
import { AttendanceRecord } from "@/types";



export interface AttendanceFilters {
  periodo?: string;
}

// Debe coincidir 1:1 con lo que devuelve el backend
type RawAttendanceRow = {
  periodo: string;
  codigo_materia: string;
  nombre_materia: string;
  grupo: string;

  matricula: string;
  expediente: string | null;

  nombre_alumno: string;
  apellido_paterno: string;
  apellido_materno: string | null;

  fecha_alta: string;
  fuente: string;

  archivo_id: number | null;
  nombre_archivo: string | null;
  fecha_archivo: string | null;
};


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function getAttendanceResumen(
  filters: AttendanceFilters = {}
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();

  if (filters.periodo) {
    params.append("periodo", filters.periodo);
  }

  const qs = params.toString();
  // 👇 aquí asumimos que en el back montas app.use("/api/asistencia", asistenciaRoutes);
  const url = `${API_BASE}/asistencia/resumen${qs ? `?${qs}` : ""}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!resp.ok) {
    // Esto es lo que está cayendo ahora
    throw new Error("Error al obtener el resumen de asistencia");
  }

  const json = (await resp.json()) as {
    ok: boolean;
    items?: RawAttendanceRow[];
  };

  if (!json.ok || !Array.isArray(json.items)) {
    // Si aquí viene algo raro, devolvemos [] pero NO mostramos error rojo
    return [];
  }

  return json.items.map((row) => ({
    periodo: row.periodo,
    codigo_materia: row.codigo_materia,
    nombre_materia: row.nombre_materia,
    grupo: row.grupo,

    matricula: row.matricula,
    expediente: row.expediente,

    nombre_alumno: row.nombre_alumno,
    apellido_paterno: row.apellido_paterno,
    apellido_materno: row.apellido_materno,

    fecha_alta: row.fecha_alta,
    fuente: row.fuente,

    archivo_id: row.archivo_id,
    nombre_archivo: row.nombre_archivo,
    fecha_archivo: row.fecha_archivo,
  }));
}

export async function createAttendance(
  payload: Partial<AttendanceRecord>
): Promise<AttendanceRecord[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/asistencia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error al crear relación de asistencia");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}


export async function uploadAttendance(file: File): Promise<{ archivoId: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch(`${API_BASE}/asistencia/upload`, {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) throw new Error("Error al subir archivo de asistencia");
  const json = await resp.json();
  if (!json.ok || !json.archivoId) {
    throw new Error(json.error || "Respuesta inválida al subir asistencia");
  }

  return { archivoId: json.archivoId };
}

export async function procesarAttendance(archivoId: number) {
  const resp = await fetch(`${API_BASE}/asistencia/process/${archivoId}`, {
    method: "POST",
  });

  if (!resp.ok) throw new Error("Error al procesar archivo de asistencia");
  const json = await resp.json();
  if (!json.ok) {
    throw new Error(json.error || "Error en ingesta de asistencia");
  }

  return json.resumen as {
    periodoEtiqueta: string;
    alumnosVinculados: number;
    alumnosSinAlumno: number;
    alumnosSinGrupo: number;
    inscripcionesCreadas: number;
    warnings: string[];
  };
}

