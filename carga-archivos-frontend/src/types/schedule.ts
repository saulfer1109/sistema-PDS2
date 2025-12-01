export interface ScheduleRecord {
  id: number; 
  periodo: string;
  codigo_materia: string;
  nombre_materia: string;
  grupo: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string;
  num_empleado?: number;
  profesor_nombre?: string;
  profesor_apellido_paterno?: string;
  profesor_apellido_materno?: string;
  cupo?: number;
}
