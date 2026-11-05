import { constants } from "node:fs";
import { open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import AppError from "../errors/AppError.js";

const defaultN8nPathPrefix = "/home/node/.n8n-files/CVs/";

const isPathInside = (root, candidate) => {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
};

const getConfiguredPrefix = (configuredPrefix) => {
  const prefix = (configuredPrefix || defaultN8nPathPrefix).trim();
  const segments = prefix.split("/");

  if (
    !prefix.startsWith("/") ||
    prefix.includes("\\") ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new AppError("La configuración de CV_N8N_PATH_PREFIX no es válida", 503);
  }

  return `${prefix.replace(/\/+$/, "")}/`;
};

const resolveStoredPath = (root, prefix, storedPath) => {
  if (typeof storedPath !== "string" || !storedPath.startsWith(prefix)) {
    throw new AppError("La hoja de vida no está disponible", 404);
  }

  const relativePath = storedPath.slice(prefix.length);
  const segments = relativePath.split("/");

  if (
    !relativePath ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[\\:<>"|?*\u0000-\u001f]/.test(segment) ||
        /[. ]$/.test(segment),
    ) ||
    path.posix.extname(relativePath).toLowerCase() !== ".pdf"
  ) {
    throw new AppError("La hoja de vida no está disponible", 404);
  }

  const candidate = path.resolve(root, ...segments);
  if (!isPathInside(root, candidate)) {
    throw new AppError("La hoja de vida no está disponible", 404);
  }

  return candidate;
};

const getFileNotFoundError = () =>
  new AppError("No se encontró el archivo de la hoja de vida", 404);

export const openCvFile = async ({
  rootDir,
  pathPrefix,
  storedPath,
}) => {
  if (!rootDir?.trim()) {
    throw new AppError("Configura CV_ROOT_DIR en el backend", 503);
  }
  const configuredRoot = rootDir.trim();
  if (!path.isAbsolute(configuredRoot)) {
    throw new AppError("CV_ROOT_DIR debe ser una ruta absoluta", 503);
  }

  const prefix = getConfiguredPrefix(pathPrefix);
  let realRoot;
  try {
    realRoot = await realpath(configuredRoot);
    if (!(await stat(realRoot)).isDirectory()) {
      throw new AppError("CV_ROOT_DIR debe apuntar a una carpeta", 503);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw new AppError("La carpeta configurada en CV_ROOT_DIR no existe", 503);
    }
    throw new AppError("No se pudo acceder a la carpeta CV_ROOT_DIR", 503);
  }

  const candidate = resolveStoredPath(realRoot, prefix, storedPath);
  let resolvedFile;
  try {
    resolvedFile = await realpath(candidate);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw getFileNotFoundError();
    }
    throw new AppError("No se pudo acceder a la hoja de vida", 500);
  }

  if (
    !isPathInside(realRoot, resolvedFile) ||
    path.extname(resolvedFile).toLowerCase() !== ".pdf"
  ) {
    throw new AppError("La hoja de vida no está disponible", 404);
  }

  let fileHandle;
  try {
    const flags = constants.O_RDONLY | (constants.O_NOFOLLOW || 0);
    fileHandle = await open(resolvedFile, flags);
    const fileStat = await fileHandle.stat();
    if (!fileStat.isFile()) {
      await fileHandle.close();
      throw getFileNotFoundError();
    }

    return { fileHandle, size: fileStat.size };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (fileHandle) await fileHandle.close();
    if (error.code === "ENOENT" || error.code === "ENOTDIR" || error.code === "ELOOP") {
      throw getFileNotFoundError();
    }
    if (error.code === "EACCES" || error.code === "EPERM") {
      throw new AppError("No tienes permiso para leer la hoja de vida", 403);
    }
    throw new AppError("No se pudo leer la hoja de vida", 500);
  }
};
