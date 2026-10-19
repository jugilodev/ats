// Archivo de prueba básico para ATS-NUEVO
// Este módulo suma dos números enteros

/**
 * @param {number} num1 - Primer número entero
 * @param {number} num2 - Segundo número entero
 * @returns {number} La suma de ambos números
 */
export function sumarNumeros(num1, num2) {
    // Validación de tipos
    if (!Number.isInteger(num1)) {
        throw new Error(`El primer número ${num1} no es un entero válido`);
    }
    if (!Number.isInteger(num2)) {
        throw new Error(`El segundo número ${num2} no es un entero válido`);
    }
    
    return num1 + num2;
}

// Módulo para CommonJS (Node.js)
export default sumarNumeros;
