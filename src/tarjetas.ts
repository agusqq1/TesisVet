// Reglas del pago con tarjeta de la tienda. El pago es simulado: no se cobra nada.
// Las usa el formulario de pago y el servidor para validar lo que recibe.

export const MARCAS_TARJETA = ["Visa", "Mastercard", "American Express"];

export const CUOTAS = [1, 3, 6];

// Deduce la marca por los primeros dígitos; null si todavía no se puede saber
export function detectarMarca(numero: string): string | null {
  if (/^4/.test(numero)) return "Visa";
  if (/^3[47]/.test(numero)) return "American Express";
  if (/^(5[1-5]|2[2-7])/.test(numero)) return "Mastercard";
  return null;
}

// Dígito verificador de los números de tarjeta (algoritmo de Luhn)
export function numeroValido(numero: string) {
  if (!/^\d{13,19}$/.test(numero)) return false;
  let suma = 0;
  for (let i = 0; i < numero.length; i++) {
    let digito = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  return suma % 10 === 0;
}
