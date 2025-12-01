import React from "react";
import { Search } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { UserTableProps } from "@/types";
import { UserTableSkeleton } from "./UserTableSkeleton";

export function UserTable({
  currentUsers,
  onEditUser,
  onDeleteUser,
  loading = false,
  showActions = true,
}: UserTableProps) {
  if (loading) {
    return <UserTableSkeleton />;
  }

  return (
    <div className="overflow-x-auto px-2 sm:px-6 lg:px-[45px]">
      <table className="w-full min-w-[700px] table-fixed">
        <thead className="bg-[#2E4258] text-white">
          <tr className="flex w-full">
            <th className="flex-[0_0_8%] px-2 py-3 text-left flex items-center">
              <input
                type="checkbox"
                className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-sm"
              />
            </th>

            {/* Nombre */}
            <th className="flex-[0_0_30%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Nombre completo</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Correo */}
            <th className="flex-[0_0_23%] px-2 py-3 text-left text-xs font-normal hidden md:flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Correo institucional</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Núm. empleado */}
            <th className="flex-[0_0_12%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Núm. empleado</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Rol */}
            <th className="flex-[0_0_12%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Rol</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>

            {/* Acciones */}
            <th className="flex-[0_0_15%] px-2 py-3 text-left text-xs font-normal flex items-center">
              <div className="flex items-center justify-between w-full">
                <span>Acciones</span>
                <svg
                  width="12"
                  height="16"
                  viewBox="0 0 12 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="cursor-pointer"
                >
                  <path d="M6 1L11.1962 5.5H0.803848L6 1Z" fill="#9C9C9C" />
                  <path d="M6 15L0.803848 10.5H11.1962L6 15Z" fill="#9C9C9C" />
                </svg>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {currentUsers.length > 0 ? (
            currentUsers.map((user, index) => (
              <tr
                key={user.id}
                className={`flex w-full border-b border-gray-200 hover:bg-gray-50 ${
                  index % 2 === 0 ? "bg-[#F9FAFB]" : "bg-[#F3F8FF]"
                }`}
              >
                {/* Checkbox */}
                <td className="flex-[0_0_8%] px-2 py-3 flex items-center">
                  <input
                    type="checkbox"
                    className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-sm border-[1px] border-gray-300"
                  />
                </td>

                {/* Nombre */}
                <td className="flex-[0_0_30%] px-2 py-3 flex items-center">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <UserAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-normal text-[#3B5571] truncate">
                        {user.nombre}
                      </div>
                      <div className="text-xs text-[#3B5571] md:hidden truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Correo */}
                <td className="flex-[0_0_23%] px-2 py-3 whitespace-nowrap hidden md:flex items-center">
                  <div className="text-xs text-[#3B5571] truncate">
                    {user.email}
                  </div>
                </td>

                {/* Núm. empleado */}
                <td className="flex-[0_0_12%] px-2 py-3 whitespace-nowrap flex items-center">
                  <div className="text-xs text-[#3B5571]">
                    {user.numEmpleado}
                  </div>
                </td>

                {/* Rol */}
                <td className="flex-[0_0_12%] px-2 py-3 whitespace-nowrap flex items-center">
                  <div className="text-xs text-[#3B5571]">{user.rol}</div>
                </td>

                {/* Acciones */}
                {showActions && (
                  <td className="flex-[0_0_15%] px-2 py-3 whitespace-nowrap flex items-center">
                    <div className="flex items-center justify-end w-full space-x-2">
                      {/* Botón Editar */}
                      <button
                        onClick={() => onEditUser(user)}
                        className="text-[#3B5571] p-1"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M17.7594 5.73184L14.268 2.24122C14.1519 2.12511 14.0141 2.03301 13.8624 1.97018C13.7107 1.90734 13.5482 1.875 13.384 1.875C13.2198 1.875 13.0572 1.90734 12.9056 1.97018C12.7539 2.03301 12.6161 2.12511 12.5 2.24122L2.86641 11.8748C2.74983 11.9905 2.65741 12.1281 2.59451 12.2798C2.5316 12.4315 2.49948 12.5942 2.50001 12.7584V16.2498C2.50001 16.5813 2.6317 16.8993 2.86612 17.1337C3.10054 17.3681 3.41849 17.4998 3.75001 17.4998H16.875C17.0408 17.4998 17.1997 17.434 17.3169 17.3168C17.4342 17.1995 17.5 17.0406 17.5 16.8748C17.5 16.7091 17.4342 16.5501 17.3169 16.4329C17.1997 16.3157 17.0408 16.2498 16.875 16.2498H9.00938L17.7594 7.49981C17.8755 7.38373 17.9676 7.24592 18.0304 7.09425C18.0933 6.94257 18.1256 6.78 18.1256 6.61583C18.1256 6.45165 18.0933 6.28908 18.0304 6.13741C17.9676 5.98573 17.8755 5.84792 17.7594 5.73184Z"
                            fill="#2E4258"
                          />
                        </svg>
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        onClick={() => onDeleteUser(user)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.875 3.75H13.75V3.125C13.75 2.62772 13.5525 2.15081 13.2008 1.79917C12.8492 1.44754 12.3723 1.25 11.875 1.25H8.125C7.62772 1.25 7.15081 1.44754 6.79917 1.79917C6.44754 2.15081 6.25 2.62772 6.25 3.125V3.75H3.125C2.95924 3.75 2.80027 3.81585 2.68306 3.93306C2.56585 4.05027 2.5 4.20924 2.5 4.375C2.5 4.54076 2.56585 4.69973 2.68306 4.81694C2.80027 4.93415 2.95924 5 3.125 5H3.75V16.25C3.75 16.5815 3.8817 16.8995 4.11612 17.1339C4.35054 17.3683 4.66848 17.5 5 17.5H15C15.3315 17.5 15.6495 17.3683 15.8839 17.1339C16.1183 16.8995 16.25 16.5815 16.25 16.25V5H16.875C17.0408 5 17.1997 4.93415 17.3169 4.81694C17.4342 4.69973 17.5 4.54076 17.5 4.375C17.5 4.20924 17.4342 4.05027 17.3169 3.93306C17.1997 3.81585 17.0408 3.75 16.875 3.75ZM7.5 3.125C7.5 2.95924 7.56585 2.80027 7.68306 2.68306C7.80027 2.56585 7.95924 2.5 8.125 2.5H11.875C12.0408 2.5 12.1997 2.56585 12.3169 2.68306C12.4342 2.80027 12.5 2.95924 12.5 3.125V3.75H7.5V3.125ZM15 16.25H5V5H15V16.25ZM8.75 8.125V13.125C8.75 13.2908 8.68415 13.4497 8.56694 13.5669C8.44973 13.6842 8.29076 13.75 8.125 13.75C7.95924 13.75 7.80027 13.6842 7.68306 13.5669C7.56585 13.4497 7.5 13.2908 7.5 13.125V8.125C7.5 7.95924 7.56585 7.80027 7.68306 7.68306C7.80027 7.56585 7.95924 7.5 8.125 7.5C8.29076 7.5 8.44973 7.56585 8.56694 7.68306C8.68415 7.80027 8.75 7.95924 8.75 8.125ZM12.5 8.125V13.125C12.5 13.2908 12.4342 13.4497 12.3169 13.5669C12.1997 13.6842 12.0408 13.75 11.875 13.75C11.7092 13.75 11.5503 13.6842 11.4331 13.5669C11.3158 13.4497 11.25 13.2908 11.25 13.125V8.125C11.25 7.95924 11.3158 7.80027 11.4331 7.68306C11.5503 7.56585 11.7092 7.5 11.875 7.5C12.0408 7.5 12.1997 7.56585 12.3169 7.68306C12.4342 7.80027 12.5 7.95924 12.5 8.125Z"
                            fill="#DC3545"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr className="flex w-full">
              <td className="w-full px-2 sm:px-2 py-1 sm:py-1 text-center">
                <div className="text-gray-500">
                  <Search className="mx-auto h-6 w-6 sm:h-9 sm:w-9 text-gray-300 mb-3" />
                  <p className="text-sm sm:text-base font-medium">
                    No se encontraron usuarios
                  </p>
                  <p className="text-xs">
                    Intenta ajustar tus filtros o búsqueda
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
