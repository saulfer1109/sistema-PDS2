"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Bentham } from "next/font/google";
import { AttendanceRecord } from "@/types";
import { getAttendanceResumen, createAttendance } from "@/services/attendanceService";
import {
  uploadAsistencia,
  procesarAsistencia,
} from "@/services/asistenciaService";
import { Button } from "@/components/ui";
import AttendanceTable from "./AttendanceTable";
import AttendanceUploadPanel from "./components/AttendanceUploadPanel";
import * as XLSX from "xlsx";


const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

type ViewMode = "table" | "upload";
type EditMode = "edit" | "create" | null;

type AsistenciaResumen = {
  periodoEtiqueta: string | null;
  alumnosVinculados: number;
  alumnosSinAlumno: number;
  alumnosSinGrupo: number;
  inscripcionesCreadas: number;
  warnings?: string[];
};

export default function AttendanceReportView() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Upload / procesamiento
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resumen, setResumen] = useState<AsistenciaResumen | null>(null);

  // Búsqueda tipo "search"
  const [search, setSearch] = useState("");

  // Filtros individuales (periodo, código, grupo)
  const [filterPeriodo, setFilterPeriodo] = useState<string>("ALL");
  const [filterCodigo, setFilterCodigo] = useState<string>("ALL");
  const [filterGrupo, setFilterGrupo] = useState<string>("ALL");

  // Opciones únicas para cada filtro, derivadas de los registros
  const periodoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((r) => r.periodo)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [records]
  );

  const codigoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((r) => r.codigo_materia)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [records]
  );

  const grupoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((r) => r.grupo)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [records]
  );

  // Paginación (igual estilo que Horarios)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Edición / eliminación (solo front por ahora)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);

  // Cargar datos iniciales (sin filtro) al montar
  useEffect(() => {
    void cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const data = await getAttendanceResumen({});
      setRecords(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al cargar el resumen de asistencia.");
    } finally {
      setLoading(false);
    }
  };

  // Filtro tipo buscador (periodo, materia, alumno, grupo, etc.)
  const filteredRecords = records.filter((r) => {
    const texto = `${r.periodo ?? ""} ${r.codigo_materia ?? ""} ${
      r.nombre_materia ?? ""
    } ${r.grupo ?? ""} ${r.matricula ?? ""} ${r.nombre_alumno ?? ""} ${
      r.apellido_paterno ?? ""
    } ${r.apellido_materno ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesPeriodo =
      filterPeriodo === "ALL" || r.periodo === filterPeriodo;

    const matchesCodigo =
      filterCodigo === "ALL" || r.codigo_materia === filterCodigo;

    const matchesGrupo = filterGrupo === "ALL" || r.grupo === filterGrupo;

    return texto && matchesPeriodo && matchesCodigo && matchesGrupo;
  });

  // === Paginación estilo Horarios ===
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginated = filteredRecords.slice(startIndex, endIndex);

  // === Exportar a Excel (idéntico a Horarios) ===
const handleExport = () => {
  if (!filteredRecords.length) {
    alert("No hay registros para exportar.");
    return;
  }

  // Crear versión "bonita" para Excel
  const dataForExcel = filteredRecords.map((r) => ({
    Periodo: r.periodo ?? "",
    CodigoMateria: r.codigo_materia ?? "",
    NombreMateria: r.nombre_materia ?? "",
    Grupo: r.grupo ?? "",
    Matricula: r.matricula ?? "",
    NombreAlumno: r.nombre_alumno ?? "",
    ApellidoPaterno: r.apellido_paterno ?? "",
    ApellidoMaterno: r.apellido_materno ?? "",
    FechaAlta: r.fecha_alta ?? "",
    Fuente: r.fuente ?? "",
    Archivo: r.nombre_archivo ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `asistencia_${today}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};


  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg("Selecciona un archivo de asistencia antes de subirlo.");
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg(null);

      // 1. Subir archivo
      const archivoId: number = await uploadAsistencia(selectedFile);

      // 2. Procesar archivo
      const resumenResp = await procesarAsistencia(archivoId);
      setResumen(resumenResp);

      // 3. Refrescar tabla completa
      await cargarRegistros();

      // Si el backend detectó periodo, lo ponemos en el buscador
      if (resumenResp.periodoEtiqueta) {
        setSearch(resumenResp.periodoEtiqueta);
        setCurrentPage(1);
      }

      // Volver a la vista de tabla
      setViewMode("table");
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al subir o procesar el archivo de asistencia.");
    } finally {
      setProcessing(false);
    }
  };

  // ==== Edición local (solo front) ====

  const handleEditClick = (record: AttendanceRecord) => {
  setEditMode("edit");
  setEditingRecord(record);
  setEditForm({
    periodo: record.periodo,
    codigo_materia: record.codigo_materia,
    nombre_materia: record.nombre_materia,
    grupo: record.grupo,
    matricula: record.matricula,
    nombre_alumno: record.nombre_alumno,
    apellido_paterno: record.apellido_paterno,
    apellido_materno: record.apellido_materno,
  });
  setShowEditModal(true);
};

const handleCreateClick = () => {
  setEditMode("create");
  setEditingRecord(null);
  setEditForm({
    periodo: undefined,
    codigo_materia: undefined,
    nombre_materia: undefined,
    grupo: undefined,
    matricula: undefined,
    nombre_alumno: undefined,
    apellido_paterno: undefined,
    apellido_materno: undefined,
  });
  setShowEditModal(true);
};


  const handleDeleteClick = (record: AttendanceRecord) => {
    const ok = window.confirm(
      `¿Seguro que deseas eliminar la relación del alumno ${record.matricula} con el grupo ${record.grupo}?`
    );
    if (!ok) return;

    // Por ahora solo se elimina del estado local.
    // Luego puedes conectar aquí un DELETE al backend.
    setRecords((prev) =>
      prev.filter(
        (r) =>
          !(
            r.periodo === record.periodo &&
            r.codigo_materia === record.codigo_materia &&
            r.grupo === record.grupo &&
            r.matricula === record.matricula
          )
      )
    );
  };

  const handleCloseEditModal = () => {
  setShowEditModal(false);
  setEditingRecord(null);
  setEditForm({});
  setEditMode(null);
};

  const handleEditFieldChange = (
  field: keyof AttendanceRecord,
  value: string
) => {
  setEditForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};


 const handleSaveEdit = async () => {
  if (!editMode) return;

  // Validación básica para CREAR
  if (editMode === "create") {
    if (
      !editForm.periodo ||
      !editForm.codigo_materia ||
      !editForm.grupo ||
      !editForm.matricula
    ) {
      setErrorMsg(
        "Periodo, código de materia, grupo y matrícula son obligatorios para crear la relación."
      );
      return;
    }
  }

  try {
    if (editMode === "edit" && editingRecord) {
      // === EDITAR (por ahora solo front, como antes) ===
      setRecords((prev) =>
        prev.map((r) => {
          const same =
            r.periodo === editingRecord.periodo &&
            r.codigo_materia === editingRecord.codigo_materia &&
            r.grupo === editingRecord.grupo &&
            r.matricula === editingRecord.matricula;

          if (!same) return r;

          return {
            ...r,
            ...editForm,
          };
        })
      );
      // Aquí luego podrías llamar a update en backend si lo expones.
    } else if (editMode === "create") {
      // === CREAR (llamando al backend) ===
      const payload: Partial<AttendanceRecord> = {
        periodo: editForm.periodo,
        codigo_materia: editForm.codigo_materia,
        nombre_materia: editForm.nombre_materia,
        grupo: editForm.grupo,
        matricula: editForm.matricula, // aquí puedes poner "mat1, mat2, mat3"
        nombre_alumno: editForm.nombre_alumno,
        apellido_paterno: editForm.apellido_paterno,
        apellido_materno: editForm.apellido_materno,
      };

      // ⬇⬇⬇ ahora el servicio regresa un array
      const createdRecords = await createAttendance(payload);

      // Lo metemos al inicio de la lista
      setRecords((prev) => [...createdRecords, ...prev]);
      setCurrentPage(1);
    }

    handleCloseEditModal();
  } catch (err) {
    console.error("Error al guardar relación de asistencia:", err);
    setErrorMsg("Error al guardar la relación de asistencia.");
  }
};


  // =================== RENDER ===================

  return (
    <div className="w-full flex flex-col gap-4 ">
      {/* Encabezado descriptivo (card superior) */}
      <div className="bg-white shadow-md rounded-3xl p-6 md:p-8 mt-4 w-full">
        <div className="flex-1 px-2 sm:px-4 md:px-6">
          <h1
            className={`text-2xl md:text-3xl text-[#16469B] mb-2 ${bentham.className}`}
          >
            Resumen de Grupos
          </h1>

          <p className="text-sm text-gray-600 w-full">
            Visualiza y administra las relaciones{" "}
            <strong>alumno–grupo–materia</strong> que se generan a partir de
            las listas de asistencia cargadas al sistema. Puedes revisar los
            registros resultantes e, incluso, ajustar o eliminar relaciones de
            forma manual.
          </p>

          {totalItems > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Mostrando <strong>{totalItems}</strong> registros (filtrados).
            </p>
          )}
        </div>
</div>

      {/* ====== VISTA TABLA ====== */}
      {viewMode === "table" && (
        <div className="bg-white px-3 sm:px-6 lg:px-[54px] rounded-lg shadow-lg border border-gray-200">
          {/* Header: buscador + botón Cargar archivo (como Schedule) */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
            {/* IZQUIERDA: buscador + filtros */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Buscador */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar periodo, grupo, materia, alumno..."
                  className="w-72 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtro Periodo */}
              <select
                value={filterPeriodo}
                onChange={(e) => {
                  setFilterPeriodo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos los periodos</option>
                {periodoOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Filtro Código materia */}
              <select
                value={filterCodigo}
                onChange={(e) => {
                  setFilterCodigo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todas las materias</option>
                {codigoOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Filtro Grupo */}
              <select
                value={filterGrupo}
                onChange={(e) => {
                  setFilterGrupo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos los grupos</option>
                {grupoOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* DERECHA: botones (igual que ya tenías) */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode("upload")}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#2E4258] rounded-lg hover:bg-[#2E4258]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Cargar archivo
              </Button>

              <Button
                variant="outline"
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Nuevo registro
              </Button>
            </div>
          </div>


          {/* Tabla + paginación */}
          <div className="px-3 py-4">
            {loading ? (
              <p className="text-sm text-gray-500">Cargando registros...</p>
            ) : (
              <AttendanceTable
                records={paginated}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            )}

            {errorMsg && (
              <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
            )}
          </div>

          {/* Paginación + texto (clonado de Horarios, adaptado) */}
          <div className="px-3 pb-6 border-t border-gray-200 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-xs text-gray-600">
              Mostrando{" "}
              <span className="font-semibold">
                {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
              </span>{" "}
              de <span className="font-semibold">{totalItems}</span> registros
              de asistencia
            </div>

            <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs font-bold bg.white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-1 py-1 text-xs rounded-full min-w-[30px] min-h-[30px] border border-gray-300 font-bold ${
                        currentPage === pageNumber
                          ? "bg-[#2E4258] text-white"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 py-1 text-xs text-gray-500">
                      ...
                    </span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-1 py-1 text-xs rounded-full min-w-[30px] min-h-[30px] border border-gray-300 font-bold bg-white hover:bg-gray-100"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs font-bold bg-white hover:bg-gray-100 rounded-full min-w-[30px] min-h-[30px] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                Exportar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====== VISTA CARGA + RESUMEN ====== */}
      {viewMode === "upload" && (
        <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
          <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
            <h3
              className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
            >
              Cargar listas de asistencia
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode("table")}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Ver tabla
              </Button>
            </div>
          </div>

          <div className="px-3 py-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* Panel de carga */}
            <AttendanceUploadPanel
              setFile={setSelectedFile}
              onUpload={handleUpload}
              loading={processing}
            />

            {/* Panel de resumen de ingesta */}
            <div className="bg-gray-50 border border-[#16469B] rounded-lg overflow-hidden text-xs">
              <div className="bg-[#16469B] text-white px-4 py-3 text-sm font-semibold">
                Resumen de ingesta
              </div>
              <div className="px-4 py-3">
                {processing && (
                  <p className="text-gray-600">Procesando archivo...</p>
                )}

                {!processing && !resumen && (
                  <p className="text-gray-500">
                    Sube y procesa un archivo para visualizar aquí el resumen de
                    la vinculación alumnos–grupos.
                  </p>
                )}

                {!processing && resumen && (
                  <ul className="space-y-1">
                    <li>
                      Periodo:{" "}
                      <strong>
                        {resumen.periodoEtiqueta ?? "No detectado"}
                      </strong>
                    </li>
                    <li>Alumnos vinculados: {resumen.alumnosVinculados}</li>
                    <li>Sin alumno en sistema: {resumen.alumnosSinAlumno}</li>
                    <li>Sin grupo encontrado: {resumen.alumnosSinGrupo}</li>
                    <li>
                      Inscripciones creadas: {resumen.inscripcionesCreadas}
                    </li>
                    {resumen.warnings && resumen.warnings.length > 0 && (
                      <li className="pt-1">
                        <span className="font-semibold">Avisos:</span>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {resumen.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición simple (solo front) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-lg">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              {editMode === "create"
                ? "Crear relación de asistencia"
                : "Editar relación de asistencia"}
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Periodo
              </label>
              <input
                type="text"
                value={editForm.periodo ?? ""}
                onChange={(e) => handleEditFieldChange("periodo", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Matrícula
                </label>
                <input
                  type="text"
                  value={editForm.matricula ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("matricula", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Grupo
                </label>
                <input
                  type="text"
                  value={editForm.grupo ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("grupo", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código materia
                </label>
                <input
                  type="text"
                  value={editForm.codigo_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("codigo_materia", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre materia
                </label>
                <input
                  type="text"
                  value={editForm.nombre_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange("nombre_materia", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRecord(null);
                  setEditForm({});
                  handleCloseEditModal();
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs bg-[#16469B] text-white hover:bg-[#0E325E]"
                onClick={handleSaveEdit}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
