"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Bentham } from "next/font/google";
import { Button, Modal } from "@/components/ui";
import {
  uploadHorarios,
  procesarHorarios,
  HorariosResumen,
  getHorariosHistorial,
} from "@/services/horariosService";
import {
  getHorarios,
  createHorario,
  updateHorario,
  deleteHorario,
} from "@/services/scheduleService";
import { ScheduleRecord } from "@/types";
import ScheduleUploadPanel from "./components/ScheduleUploadPanel";
import ScheduleTable from "./ScheduleTable";

// Exportar a Excel
import * as XLSX from "xlsx";

type ViewMode = "empty" | "table" | "upload";
type EditMode = "edit" | "create" | null;

type HistorialItemUI = {
  id: number;
  fecha: string; // dd/MM/aa
  nombre: string;
  estado: string;
};

const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

export default function ScheduleReportView() {
  const [viewMode, setViewMode] = useState<ViewMode>("empty");

  const [isiFile, setIsiFile] = useState<File | null>(null);
  const [preFile, setPreFile] = useState<File | null>(null);

  const [horarios, setHorarios] = useState<ScheduleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [resumen, setResumen] = useState<HorariosResumen | null>(null);
  const [historial, setHistorial] = useState<HistorialItemUI[]>([]);
  const [editingRecord, setEditingRecord] = useState<ScheduleRecord | null>(
    null
  );
  const [editForm, setEditForm] = useState<Partial<ScheduleRecord>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filtros individuales
  const [filterPeriodo, setFilterPeriodo] = useState<string>("ALL");
  const [filterCodigo, setFilterCodigo] = useState<string>("ALL");
  const [filterGrupo, setFilterGrupo] = useState<string>("ALL");
  const [filterNumEmpleado, setFilterNumEmpleado] = useState<string>("ALL");

  // Opciones únicas derivadas de los registros
  const periodoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          horarios
            .map((r) => r.periodo)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [horarios]
  );

  const codigoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          horarios
            .map((r) => r.codigo_materia)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [horarios]
  );

  const grupoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          horarios
            .map((r) => r.grupo)
            .filter((v): v is string => !!v && v.trim() !== "")
        )
      ).sort(),
    [horarios]
  );

  const numEmpleadoOptions = useMemo(
    () =>
      Array.from(
        new Set(
          horarios
            .map((r) =>
              r.num_empleado !== null && r.num_empleado !== undefined
                ? String(r.num_empleado)
                : ""
            )
            .filter((v) => v.trim() !== "")
        )
      ).sort(),
    [horarios]
  );

  const formatearFechaCorta = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso; // por si acaso

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
  };

  // Cargar TODOS los horarios de la vista (sin filtrar por periodo)
  useEffect(() => {
    getHorarios()
      .then((records) => {
        setHorarios(records);
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Error al cargar horarios:", err);
      });
  }, []);

  // Cargar historial de archivos de horarios cuando la vista es "upload"
  useEffect(() => {
    if (viewMode !== "upload") return;

    getHorariosHistorial()
      .then((items) => {
        const mapped: HistorialItemUI[] = items.map((i) => ({
          id: i.id,
          fecha: formatearFechaCorta(i.fecha),
          nombre: i.nombre_archivo,
          estado: i.estado,
        }));
        setHistorial(mapped);
      })
      .catch((err) => {
        console.error("Error al cargar historial de horarios:", err);
      });
  }, [viewMode]);

  const handleUpload = async () => {
    if (!isiFile && !preFile) {
      alert("Selecciona al menos un archivo (ISI o Prelistas)");
      return;
    }

    try {
      const uploadResp = await uploadHorarios(
        isiFile ?? undefined,
        preFile ?? undefined
      );
      const { archivoIdISI, archivoIdPrelistas } = uploadResp;

      const procResp = await procesarHorarios(archivoIdISI, archivoIdPrelistas);
      setResumen(procResp.resumen);

      const updated = await getHorarios();
      setHorarios(updated);

      setViewMode("table");
    } catch (err) {
      console.error("Error al procesar horarios:", err);

      let message = "Ocurrió un error al procesar los horarios.";
      if (err instanceof Error && err.message) {
        message = `Ocurrió un error al procesar los horarios: ${err.message}`;
      }

      alert(message);
    }
  };

  // Filtro por búsqueda (materia, profe, grupo, periodo, aula, etc.)
  const filtered = horarios.filter((r) => {
    const texto = `${r.periodo ?? ""} ${r.codigo_materia ?? ""} ${
      r.nombre_materia ?? ""
    } ${r.grupo ?? ""} ${r.profesor_nombre ?? ""} ${
      r.profesor_apellido_paterno ?? ""
    } ${r.profesor_apellido_materno ?? ""} ${r.aula ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesPeriodo =
      filterPeriodo === "ALL" || r.periodo === filterPeriodo;

    const matchesCodigo =
      filterCodigo === "ALL" || r.codigo_materia === filterCodigo;

    const matchesGrupo =
      filterGrupo === "ALL" || r.grupo === filterGrupo;

    const matchesNumEmpleado =
      filterNumEmpleado === "ALL" ||
      String(r.num_empleado ?? "") === filterNumEmpleado;

    return texto && matchesPeriodo && matchesCodigo && matchesGrupo && matchesNumEmpleado;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginated = filtered.slice(startIndex, endIndex);

  // === Acciones de edición / creación / eliminación en la tabla ===
  const handleEditClick = (record: ScheduleRecord) => {
    setEditMode("edit");
    setEditingRecord(record);
    setEditForm({
      periodo: record.periodo,
      codigo_materia: record.codigo_materia,
      nombre_materia: record.nombre_materia,
      grupo: record.grupo,
      dia_semana: record.dia_semana,
      aula: record.aula,
      hora_inicio: record.hora_inicio,
      hora_fin: record.hora_fin,
      num_empleado: record.num_empleado,
      profesor_nombre: record.profesor_nombre,
      profesor_apellido_paterno: record.profesor_apellido_paterno,
      profesor_apellido_materno: record.profesor_apellido_materno,
      cupo: record.cupo,
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
      dia_semana: undefined,
      aula: undefined,
      hora_inicio: undefined,
      hora_fin: undefined,
      num_empleado: undefined,
      profesor_nombre: undefined,
      profesor_apellido_paterno: undefined,
      profesor_apellido_materno: undefined,
      cupo: undefined,
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setEditForm({});
    setEditMode(null);
  };

  const handleEditFieldChange = (
    field: keyof ScheduleRecord,
    value: string | number | undefined
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    // Validaciones básicas
    if (
      !editForm.periodo ||
      !editForm.codigo_materia ||
      !editForm.nombre_materia ||
      !editForm.grupo
    ) {
      alert(
        "Periodo, código, nombre de materia y grupo son obligatorios."
      );
      return;
    }

    if (!editMode) return;

    try {
      if (editMode === "edit" && editingRecord) {
        // EDITAR
        const payload: Partial<ScheduleRecord> = {
          ...editingRecord,
          ...editForm,
        };

        const updated = await updateHorario(editingRecord.id, payload);

        setHorarios((prev) =>
          prev.map((h) => (h.id === editingRecord.id ? updated : h))
        );
      } else if (editMode === "create") {
        // CREAR
        const payload: Partial<ScheduleRecord> = {
          periodo: editForm.periodo,
          codigo_materia: editForm.codigo_materia,
          nombre_materia: editForm.nombre_materia,
          grupo: editForm.grupo,
          dia_semana: editForm.dia_semana,
          aula: editForm.aula,
          hora_inicio: editForm.hora_inicio,
          hora_fin: editForm.hora_fin,
          num_empleado: editForm.num_empleado,
          profesor_nombre: editForm.profesor_nombre,
          profesor_apellido_paterno: editForm.profesor_apellido_paterno,
          profesor_apellido_materno: editForm.profesor_apellido_materno,
          cupo: editForm.cupo,
        };

        const created = await createHorario(payload);
        setHorarios((prev) => [created, ...prev]);
        setCurrentPage(1);
      }

      handleCloseEditModal();
    } catch (error) {
      console.error("Error al guardar horario:", error);
      alert("Ocurrió un error al guardar el horario.");
    }
  };

  const handleDeleteClick = async (record: ScheduleRecord) => {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar el horario del grupo ${record.grupo} (${record.nombre_materia})?`
    );
    if (!confirmado) return;

    try {
      await deleteHorario(record.id);
      setHorarios((prev) => prev.filter((h) => h.id !== record.id));
    } catch (error) {
      console.error("Error al eliminar horario:", error);
      alert("Ocurrió un error al eliminar el horario.");
    }
  };

  const handleShowTable = () => setViewMode("table");
  const handleShowUpload = () => setViewMode("upload");

  const handleExport = () => {
    if (!filtered.length) {
      alert("No hay registros para exportar.");
      return;
    }

    // Armamos los datos como una tabla “bonita” para Excel
    const dataForExcel = filtered.map((r) => ({
      Periodo: r.periodo ?? "",
      CodigoMateria: r.codigo_materia ?? "",
      NombreMateria: r.nombre_materia ?? "",
      Grupo: r.grupo ?? "",
      NumEmpleado: r.num_empleado ?? "",
      ProfesorNombre: r.profesor_nombre ?? "",
      ProfesorApellidoPaterno: r.profesor_apellido_paterno ?? "",
      ProfesorApellidoMaterno: r.profesor_apellido_materno ?? "",
      DiaSemana: r.dia_semana ?? "",
      HoraInicio: r.hora_inicio ?? "",
      HoraFin: r.hora_fin ?? "",
      Aula: r.aula ?? "",
      Cupo: r.cupo ?? "",
    }));

    // Crear hoja y libro
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Horarios");

    // Nombre de archivo con fecha
    const today = new Date().toISOString().slice(0, 10);
    const fileName = `horarios_${today}.xlsx`;

    // Descargar
    XLSX.writeFile(workbook, fileName);
  };

  // =================== VISTA VACÍA ===================
  if (viewMode === "empty") {
    return (
      <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
        <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          <h3
            className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
          >
            Carga un archivo para visualizarlo
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShowTable}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 bg.white"
            >
              <svg
                width="15"
                height="17"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366117 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366117 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM13.75 15H1.25V5H13.75V15Z"
                  fill="#2E4258"
                />
              </svg>
              Horarios
            </Button>

            <Button
              onClick={handleShowUpload}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2E4258] text-white rounded-full hover:bg-[#1E2B3A]"
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
          </div>
        </div>

        <div className="h-[420px] sm:h-[500px] md:h-[560px] lg:h-[620px] px-3 py-6" />
      </div>
    );
  }

  // =================== VISTA TABLA ===================
  if (viewMode === "table") {
    return (
      <div className="bg-white px-3 sm:px-6 lg:px-[54px] rounded-lg shadow-lg border border-gray-200">
        {/* Header: buscador + botones */}
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
                placeholder="Buscar materia, profesor, grupo, aula..."
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

            {/* Filtro Núm. empleado */}
            <select
              value={filterNumEmpleado}
              onChange={(e) => {
                setFilterNumEmpleado(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los empleados</option>
              {numEmpleadoOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* DERECHA: botones */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleShowUpload}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg
                width="15"
                height="17"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366117 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366117 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM13.75 15H1.25V5H13.75V15Z"
                  fill="#2E4258"
                />
              </svg>
              Historial
            </Button>

            <Button
              onClick={handleShowUpload}
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
              Nuevo horario
            </Button>
          </div>
        </div>


        {/* Tabla + resumen */}
        <div className="px-3 py-4">
          {resumen && (
            <div className="mb-4 text-xs text-gray-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="font-semibold">
                Última ingesta de horarios:
              </span>{" "}
              {typeof resumen.gruposUpsert === "number" && (
                <>Grupos upsert: {resumen.gruposUpsert}. </>
              )}
              {typeof resumen.horariosUpsert === "number" && (
                <>Horarios: {resumen.horariosUpsert}.</>
              )}
            </div>
          )}

          <ScheduleTable
            records={paginated}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        </div>

        {/* Paginación + texto */}
        <div className="px-3 pb-6 border-t border-gray-200 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-xs text-gray-600">
            Mostrando{" "}
            <span className="font-semibold">
              {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
            </span>{" "}
            de <span className="font-semibold">{totalItems}</span> registros de
            horarios
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
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, totalPages)
                  )
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

            {/* Exportar a Excel */}
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

        <Modal isOpen={showEditModal} onClose={handleCloseEditModal}>
          <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              {editMode === "create" ? "Crear horario" : "Editar horario"}
            </h2>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Periodo
                  </label>
                  <input
                    type="text"
                    value={editForm.periodo ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange("periodo", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
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
                      handleEditFieldChange(
                        "codigo_materia",
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre materia
                </label>
                <input
                  type="text"
                  value={editForm.nombre_materia ?? ""}
                  onChange={(e) =>
                    handleEditFieldChange(
                      "nombre_materia",
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Día semana
                  </label>
                  <input
                    type="number"
                    value={editForm.dia_semana ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "dia_semana",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Aula
                  </label>
                  <input
                    type="text"
                    value={editForm.aula ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange("aula", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hora inicio
                    </label>
                    <input
                      type="text"
                      placeholder="HH:MM"
                      value={editForm.hora_inicio ?? ""}
                      onChange={(e) =>
                        handleEditFieldChange(
                          "hora_inicio",
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hora fin
                    </label>
                    <input
                      type="text"
                      placeholder="HH:MM"
                      value={editForm.hora_fin ?? ""}
                      onChange={(e) =>
                        handleEditFieldChange(
                          "hora_fin",
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Núm. empleado
                  </label>
                  <input
                    type="number"
                    value={editForm.num_empleado ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "num_empleado",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cupo
                  </label>
                  <input
                    type="number"
                    value={editForm.cupo ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "cupo",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nombre profesor
                  </label>
                  <input
                    type="text"
                    value={editForm.profesor_nombre ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "profesor_nombre",
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Apellido paterno
                  </label>
                  <input
                    type="text"
                    value={editForm.profesor_apellido_paterno ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "profesor_apellido_paterno",
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Apellido materno
                  </label>
                  <input
                    type="text"
                    value={editForm.profesor_apellido_materno ?? ""}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "profesor_apellido_materno",
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editMode === "create"
                  ? "Crear horario"
                  : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // =================== VISTA CARGA + HISTORIAL ===================
  if (viewMode === "upload") {
    return (
      <div className="bg-white px-3 sm:px-6 lg:px-[45px] rounded-lg shadow-lg border border-gray-200">
        <div className="flex justify-between items-center px-3 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          <h3
            className={`text-xl sm:text-2xl lg:text-3xl font-normal text-blue-800 ${bentham.className}`}
          >
            Historial
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShowTable}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg
                width="15"
                height="17"
                viewBox="0 0 15 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.75 1.25H11.875V0.625C11.875 0.45924 11.8092 0.300268 11.6919 0.183058C11.5747 0.065848 11.4158 0 11.25 0C11.0842 0 10.9253 0.065848 10.8081 0.183058C10.6908 0.300268 10.625 0.45924 10.625 0.625V1.25H4.375V0.625C4.375 0.45924 4.30915 0.300268 4.19194 0.183058C4.07473 0.065848 3.91576 0 3.75 0C3.58424 0 3.42527 0.065848 3.30806 0.183058C3.19085 0.300268 3.125 0.45924 3.125 0.625V1.25H1.25C0.918479 1.25 0.600537 1.3817 0.366117 1.61612C0.131696 1.85054 0 2.16848 0 2.5V15C0 15.3315 0.131696 15.6495 0.366117 15.8839C0.600537 16.1183 0.918479 16.25 1.25 16.25H13.75C14.0815 16.25 14.3995 16.1183 14.6339 15.8839C14.8683 15.6495 15 15.3315 15 15V2.5C15 2.16848 14.8683 1.85054 14.6339 1.61612C14.3995 1.3817 14.0815 1.25 13.75 1.25ZM13.75 15H1.25V5H13.75V15Z"
                  fill="#2E4258"
                />
              </svg>
              Horarios
            </Button>
            <Button
              onClick={handleShowUpload}
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
          </div>
        </div>

        <div className="px-3 py-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ScheduleUploadPanel
            setIsiFile={setIsiFile}
            setPreFile={setPreFile}
            onUpload={handleUpload}
          />

          <div className="border border-[#16469B] rounded-lg overflow-hidden">
            <div className="bg-[#16469B] text-white px-4 py-3 text-sm font-semibold flex justify-between">
              <span>Fecha de carga</span>
              <span className="flex-1 text-center">Nombre del archivo</span>
              <span className="w-28 text-right">Estado</span>
            </div>
            <div className="divide-y divide-gray-200 bg-white">
              {historial.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No hay cargas registradas de horarios.
                </div>
              )}

              {historial.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center text-sm hover:bg-gray-50"
                >
                  <div className="w-24 text-gray-700">{item.fecha}</div>
                  <div className="flex-1 text-center text-gray-800">
                    {item.nombre}
                  </div>
                  <div className="w-28 text-right font-semibold">
                    <span
                      className={
                        item.estado === "Válido"
                          ? "text-green-600"
                          : item.estado === "Rechazado"
                          ? "text-red-600"
                          : "text-gray-600"
                      }
                    >
                      {item.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
