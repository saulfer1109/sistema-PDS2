"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bentham } from "next/font/google";
import { Button, Modal } from "@/components/ui";
import * as XLSX from "xlsx";

import { PlanRecord } from "@/types";
import PlanTable from "./PlanTable";
import PlanUploadPanel from "./components/PlanUploadPanel";
import {
  getPlanMaterias,
  getPlanesCatalog,
  PlanOption,
  uploadPlanPdf,
  createPlanMateria,
  updatePlanMateria,
  deletePlanMateria,
  PlanMateriaFormData,
  PlanUploadResponse,
} from "@/services/planService";

type ViewMode = "table" | "upload";

const bentham = Bentham({
  weight: "400",
  subsets: ["latin"],
});

export default function PlanReportView() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [records, setRecords] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros
  const [search, setSearch] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<number | "all">("all");
  const [selectedTipo, setSelectedTipo] = useState<"ALL" | "OBLIGATORIA" | "OPTATIVA">("ALL");

  // paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // catálogo de planes para filtros y formularios
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);

  // upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [lastUpload, setLastUpload] = useState<PlanUploadResponse | null>(null);

  // edición / creación
  const [editingRecord, setEditingRecord] = useState<PlanRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<"edit" | "create" | null>(null);
  const [editForm, setEditForm] = useState<PlanMateriaFormData>({
    codigo: "",
    nombre_materia: "",
    creditos: 0,
    tipo: "OBLIGATORIA",
    plan_id: 0,
  });

  // carga inicial
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [planes, materias] = await Promise.all([
        getPlanesCatalog(),
        getPlanMaterias(),
      ]);

      setPlanOptions(planes);
      setRecords(materias);

      if (planes.length > 0 && editForm.plan_id === 0) {
        setEditForm((prev) => ({ ...prev, plan_id: planes[0].id }));
      }
    } catch (err) {
      console.error("Error al cargar planes:", err);
      setErrorMsg("Error al cargar la información de planes de estudio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtros combinados
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        `${r.codigo} ${r.nombre_materia} ${r.plan_nombre} ${r.plan_version}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesPlan =
        selectedPlanId === "all" ? true : r.plan_id === selectedPlanId;

      const matchesTipo =
        selectedTipo === "ALL" ? true : r.tipo.toUpperCase() === selectedTipo;

      return matchesSearch && matchesPlan && matchesTipo;
    });
  }, [records, search, selectedPlanId, selectedTipo]);

  // paginación estilo horarios/asistencia
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginated = filteredRecords.slice(startIndex, endIndex);

  const handleShowUpload = () => setViewMode("upload");
  const handleShowTable = () => setViewMode("table");

  // exportar a Excel
  const handleExport = () => {
    if (!filteredRecords.length) {
      alert("No hay registros para exportar.");
      return;
    }

    const dataForExcel = filteredRecords.map((r) => ({
      Codigo: r.codigo,
      NombreMateria: r.nombre_materia,
      Creditos: r.creditos,
      Tipo: r.tipo,
      Plan: r.plan_nombre,
      Version: r.plan_version,
      CreditosPlan: r.plan_total_creditos ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PlanesEstudio");

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `planes_estudio_${today}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // upload / procesar plan PDF
  const handleUploadPlan = async () => {
    if (!uploadFile) {
      alert("Selecciona primero un archivo PDF de plan de estudios.");
      return;
    }

    try {
      setUploadLoading(true);
      setErrorMsg(null);

      const resp = await uploadPlanPdf(uploadFile, { debug: true });
      setLastUpload(resp);

      // recarga materias después de ingesta
      await loadData();
      setViewMode("table");
    } catch (err) {
      console.error("Error al subir plan:", err);
      setErrorMsg("Ocurrió un error al subir / procesar el plan de estudios.");
    } finally {
      setUploadLoading(false);
    }
  };

  // edición / creación
  const openEdit = (record: PlanRecord) => {
    setEditMode("edit");
    setEditingRecord(record);
    setEditForm({
      codigo: record.codigo,
      nombre_materia: record.nombre_materia,
      creditos: record.creditos,
      tipo: record.tipo,
      plan_id: record.plan_id,
    });
    setShowEditModal(true);
  };

  const openCreate = () => {
    setEditMode("create");
    setEditingRecord(null);
    setEditForm({
      codigo: "",
      nombre_materia: "",
      creditos: 0,
      tipo: "OBLIGATORIA",
      plan_id: planOptions[0]?.id ?? 0,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (record: PlanRecord) => {
    if (
      !confirm(
        `¿Seguro que deseas eliminar la materia "${record.nombre_materia}" (${record.codigo}) del plan "${record.plan_nombre}"?`
      )
    ) {
      return;
    }

    try {
      await deletePlanMateria(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      console.error("Error al eliminar materia de plan:", err);
      alert("No se pudo eliminar la materia de plan.");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setEditMode(null);
  };

  const handleEditFieldChange = <K extends keyof PlanMateriaFormData>(
    field: K,
    value: PlanMateriaFormData[K]
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (
      !editForm.codigo.trim() ||
      !editForm.nombre_materia.trim() ||
      !editForm.plan_id
    ) {
      alert("Código, nombre de materia y plan son obligatorios.");
      return;
    }

    try {
      if (editMode === "edit" && editingRecord) {
        const updated = await updatePlanMateria(editingRecord.id, editForm);
        setRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      } else if (editMode === "create") {
        const created = await createPlanMateria(editForm);
        setRecords((prev) => [created, ...prev]);
        setCurrentPage(1);
      }

      handleCloseEditModal();
    } catch (err) {
      console.error("Error al guardar materia de plan:", err);
      alert("Ocurrió un error al guardar la materia de plan.");
    }
  };

  // === RENDER ===
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Encabezado descriptivo */}
      <div className="bg-white shadow-md rounded-3xl p-6 md:p-8 mt-4 w-full">
        <div className="flex-1 px-2 sm:px-4 md:px-6">
          <h1
            className={`text-2xl md:text-3xl text-[#16469B] mb-2 ${bentham.className}`}
          >
            Planes de estudio
          </h1>

          <p className="text-sm text-gray-600 w-full">
            Visualiza y administra las <strong>materias</strong> asociadas a cada{" "}
            <strong>plan de estudio</strong>. Puedes cargar nuevos planes desde
            archivos PDF, revisar las materias resultantes y, si es necesario,
            crear o editar materias directamente desde esta vista.
          </p>

          {totalItems > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Mostrando <strong>{totalItems}</strong> materias (filtradas).
            </p>
          )}
        </div>
      </div>

      {/* Card principal: filtros + tabla / upload */}
      <div className="bg-white px-3 sm:px-6 lg:px-[54px] rounded-lg shadow-lg border border-gray-200">
        {/* Header: buscador + filtros + botón Cargar archivo */}
        <div className="flex flex-col gap-4 pt-4 sm:pt-6 pb-4 border-b-2 border-[#16469B]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* IZQUIERDA: buscador + filtros simples */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* buscador */}
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
                  placeholder="Buscar código, materia o plan..."
                  className="w-72 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* filtro plan */}
              <select
                value={selectedPlanId === "all" ? "all" : selectedPlanId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedPlanId(
                    value === "all" ? "all" : Number.parseInt(value, 10)
                  );
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los planes</option>
                {planOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* filtro tipo */}
              <select
                value={selectedTipo}
                onChange={(e) => {
                  setSelectedTipo(e.target.value as typeof selectedTipo);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="OBLIGATORIA">Obligatoria</option>
                <option value="OPTATIVA">Optativa</option>
              </select>
            </div>

            {/* DERECHA: botones */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "outline" : "default"}
                onClick={handleShowTable}
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                Tabla
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
                    d="M4 4v16h16M8 12h8M12 8v8"
                  />
                </svg>
                Cargar plan
              </Button>
            </div>
          </div>

          {/* Resumen última carga (si existe) */}
          {lastUpload && (
            <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-4">
              <div>
                <span className="font-semibold">Última acción:</span>{" "}
                {lastUpload.action}
              </div>
              {lastUpload.parsed?.plan && (
                <div>
                  <span className="font-semibold">Plan:</span>{" "}
                  {lastUpload.parsed.plan.nombre} (v
                  {lastUpload.parsed.plan.version})
                </div>
              )}
              {lastUpload.ingesta && (
                <>
                  <div>
                    <span className="font-semibold">Materias entrada:</span>{" "}
                    {lastUpload.ingesta.materiasInput}
                  </div>
                  <div>
                    <span className="font-semibold">Agregadas:</span>{" "}
                    {lastUpload.ingesta.added}
                  </div>
                  <div>
                    <span className="font-semibold">Actualizadas:</span>{" "}
                    {lastUpload.ingesta.updated}
                  </div>
                  <div>
                    <span className="font-semibold">Sin cambios:</span>{" "}
                    {lastUpload.ingesta.unchanged}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* CONTENIDO: tabla o upload */}
        <div className="py-4 space-y-4">
          {viewMode === "upload" ? (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-stretch">
                {/* Panel de carga (izquierda, ~2/3) */}
                <div>
                <PlanUploadPanel
                    setFile={setUploadFile}
                    onUpload={handleUploadPlan}
                    loading={uploadLoading}
                />
                </div>

                {/* Resumen de ingesta (derecha, 1/3) */}
                <div className="lg:col-span-1">
                 <div className="h-full flex flex-col bg-[#F7FAFC] border border-[#16469B] rounded-3xl overflow-hidden">
                    {/* Header azul */}
                    <div className="bg-[#16469B] text-white px-4 py-3 text-sm font-semibold">
                    Resumen de ingesta
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 p-4 text-xs text-gray-700 space-y-2">
                    {!lastUpload && (
                        <p>
                        Sube y procesa un archivo de <strong>plan de estudios</strong> para
                        visualizar aquí el resumen del plan detectado y las materias
                        procesadas.
                        </p>
                    )}

                    {lastUpload && (
                        <>
                        <p className="text-[11px] text-gray-500">
                            Archivo ID: <strong>{lastUpload.archivoId}</strong>
                        </p>

                        {lastUpload.parsed?.plan && (
                            <div className="mt-2">
                            <p className="font-semibold text-[12px] text-gray-800">
                                Plan detectado
                            </p>
                            <p className="mt-1">
                                <span className="block">
                                Nombre:{" "}
                                <strong>{lastUpload.parsed.plan.nombre ?? "N/D"}</strong>
                                </span>
                                <span className="block">
                                Versión:{" "}
                                <strong>{lastUpload.parsed.plan.version ?? "N/D"}</strong>
                                </span>
                                {typeof lastUpload.parsed.plan.total_creditos ===
                                "number" && (
                                <span className="block">
                                    Créditos totales:{" "}
                                    <strong>{lastUpload.parsed.plan.total_creditos}</strong>
                                </span>
                                )}
                                {typeof lastUpload.parsed.plan.semestres_sugeridos ===
                                "number" && (
                                <span className="block">
                                    Semestres sugeridos:{" "}
                                    <strong>
                                    {lastUpload.parsed.plan.semestres_sugeridos}
                                    </strong>
                                </span>
                                )}
                            </p>
                            </div>
                        )}

                        {lastUpload.ingesta && (
                            <div className="mt-3">
                            <p className="font-semibold text-[12px] text-gray-800 mb-1">
                                Resultado de ingesta
                            </p>
                            <ul className="space-y-1">
                                <li>
                                Materias en archivo:{" "}
                                <strong>{lastUpload.ingesta.materiasInput}</strong>
                                </li>
                                <li>
                                Agregadas:{" "}
                                <strong className="text-green-700">
                                    {lastUpload.ingesta.added}
                                </strong>
                                </li>
                                <li>
                                Actualizadas:{" "}
                                <strong className="text-blue-700">
                                    {lastUpload.ingesta.updated}
                                </strong>
                                </li>
                                <li>
                                Sin cambios:{" "}
                                <strong className="text-gray-700">
                                    {lastUpload.ingesta.unchanged}
                                </strong>
                                </li>
                            </ul>
                            </div>
                        )}

                        {lastUpload.parsed?.warnings && 
                            lastUpload.parsed.warnings.length > 0 && (
                            <div className="mt-3">
                                <p className="font-semibold text-[12px] text-gray-800 mb-1">
                                Advertencias
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                {lastUpload.parsed.warnings.map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                ))}
                                </ul>
                            </div>
                            )}
                        </>
                    )}
                    </div>
                </div>
                </div>
            </div>
            ) : (
            <>
              {errorMsg && (
                <div className="mb-2 text-xs text-red-600">{errorMsg}</div>
              )}

              <div className="mt-2">
                <PlanTable
                  records={paginated}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>

              {/* Paginación + Exportar */}
              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>
                    Página <strong>{currentPage}</strong> de{" "}
                    <strong>{totalPages}</strong>
                  </span>
                  <span>
                    | Mostrando <strong>{paginated.length}</strong> de{" "}
                    <strong>{totalItems}</strong> materias
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* botones de paginación estilo horarios/asistencia */}
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      «
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>
                    <span className="px-2 py-1 text-xs">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <Button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 text-xs bg-[#16469B] text-white rounded-lg hover:bg-[#0E325E]"
                  >
                    <span>Crear materia</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR MATERIA */}
      <Modal isOpen={showEditModal} onClose={handleCloseEditModal}>
        <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            {editMode === "create"
              ? "Crear materia de plan"
              : "Editar materia de plan"}
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Plan de estudio
              </label>
              <select
                value={editForm.plan_id}
                onChange={(e) =>
                  handleEditFieldChange("plan_id", Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1"
              >
                {planOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700">
                  Código
                </label>
                <input
                  type="text"
                  value={editForm.codigo}
                  onChange={(e) =>
                    handleEditFieldChange("codigo", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-gray-700">
                  Créditos
                </label>
                <input
                  type="number"
                  value={editForm.creditos}
                  onChange={(e) =>
                    handleEditFieldChange(
                      "creditos",
                      Number.parseInt(e.target.value || "0", 10)
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Nombre de la materia
              </label>
              <input
                type="text"
                value={editForm.nombre_materia}
                onChange={(e) =>
                  handleEditFieldChange("nombre_materia", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Tipo
              </label>
              <select
                value={editForm.tipo}
                onChange={(e) =>
                  handleEditFieldChange("tipo", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="OBLIGATORIA">Obligatoria</option>
                <option value="OPTATIVA">Optativa</option>
                <option value="TALLER">Taller / Otra</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="px-3 py-1.5 rounded-full text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-3 py-1.5 rounded-full text-xs bg-[#16469B] text-white hover:bg-[#0E325E]"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
