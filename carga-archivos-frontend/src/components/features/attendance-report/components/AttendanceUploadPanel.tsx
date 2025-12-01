// src/components/features/attendance-report/components/AttendanceUploadPanel.tsx
import React, { useState, ChangeEvent, DragEvent } from "react";

interface Props {
  setFile: (f: File | null) => void;
  onUpload: () => void;
  loading?: boolean;
}

export default function AttendanceUploadPanel({
  setFile,
  onUpload,
  loading = false,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0] ?? null;
    setSelectedFile(file);
    setFile(file);
  };

  const disabled = loading || !selectedFile;

  return (
    <div className="bg-white shadow-md rounded-3xl p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-[#0C3A5B]">
        Carga de lista de asistencia
      </h2>
      <p className="text-sm text-gray-600">
        Sube el archivo de lista de asistencia exportado desde el sistema
        académico para vincular alumnos a sus grupos y materias.
      </p>

      <div
        className={`border-2 border-dashed rounded-2xl px-6 py-8 text-center ${
          dragActive ? "border-[#16469B] bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <p className="text-sm text-gray-600 mb-2">
          Arrastra y suelta tu archivo aquí
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Formato recomendado: Excel (.xlsx)
        </p>
        <label className="inline-block px-4 py-2 rounded-3xl bg-[#0C3A5B] text-white text-sm font-semibold cursor-pointer hover:bg-[#06263B]">
          Seleccionar archivo
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {selectedFile && (
          <p className="mt-3 text-xs text-gray-600">
            Archivo seleccionado:{" "}
            <span className="font-medium">{selectedFile.name}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onUpload}
        disabled={disabled}
        className={`mt-4 px-8 py-2 rounded-3xl text-sm font-semibold ${
          disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-[#0C3A5B] text-white hover:bg-[#06263B]"
        }`}
      >
        {loading ? "Procesando..." : "Subir y procesar"}
      </button>
    </div>
  );
}
