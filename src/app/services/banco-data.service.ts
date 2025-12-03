/**
 * Servicio de datos bancarios para MiVivienda
 * Datos actualizados: Diciembre 2024
 * Fuente: Páginas oficiales de bancos y Fondo MiVivienda
 */

import { Injectable } from '@angular/core';

export interface Banco {
  id: number;
  nombre: string;
  nombreCorto: string;
  afiliado_mivivienda: boolean;
  afiliado_techo_propio: boolean;
}

export interface Tasa {
  id: number;
  banco_id: number;
  programa: string;
  monto_min: number;
  monto_max: number;
  tea: number;
  tcea?: number;
  nota?: string;
}

export interface Seguro {
  id: number;
  banco_id: number;
  tipo_seguro: 'Desgravamen' | 'Inmueble';
  modalidad: string;
  tasa_mensual: number; // Decimal (ej: 0.0003 = 0.03%)
  sobre_saldo: boolean; // true = sobre saldo deudor, false = sobre valor asegurable
  descripcion?: string;
}

export interface Comision {
  id: number;
  banco_id: number;
  tipo_comision: string;
  monto_fijo: number;
  tasa_porcentual?: number;
  frecuencia: 'Mensual' | 'Unica';
}

export interface BonoMiVivienda {
  id: number;
  banco_id: number;
  programa: string;
  valor_min: number;
  valor_max: number;
  bono_tipo: string;
  bono_monto: number;
  condiciones?: string;
}

export interface CondicionCredito {
  id: number;
  banco_id: number;
  cuota_inicial_min: number;
  cuota_inicial_max: number;
  plazo_min: number; // meses
  plazo_max: number; // meses
  porcentaje_financiamiento_max: number;
  tiene_gracia: boolean;
  max_meses_gracia: number;
  edad_maxima_termino: number;
  requisitos?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BancoDataService {

  // ==================== BANCOS ====================
  private readonly bancos: Banco[] = [
    { id: 1, nombre: "Banco de Crédito del Perú", nombreCorto: "BCP", afiliado_mivivienda: true, afiliado_techo_propio: false },
    { id: 2, nombre: "BBVA Perú", nombreCorto: "BBVA", afiliado_mivivienda: true, afiliado_techo_propio: true },
    { id: 3, nombre: "Scotiabank Perú", nombreCorto: "Scotiabank", afiliado_mivivienda: true, afiliado_techo_propio: true },
    { id: 4, nombre: "Interbank", nombreCorto: "Interbank", afiliado_mivivienda: true, afiliado_techo_propio: true },
    { id: 5, nombre: "BanBif", nombreCorto: "BanBif", afiliado_mivivienda: true, afiliado_techo_propio: true },
    { id: 6, nombre: "Banco Pichincha", nombreCorto: "Pichincha", afiliado_mivivienda: true, afiliado_techo_propio: true }
  ];

  // ==================== TASAS ====================
  private readonly tasas: Tasa[] = [
    // BCP (banco_id: 1)
    { id: 1, banco_id: 1, programa: "MiVivienda", monto_min: 60000, monto_max: 319590, tea: 13.99, nota: "Tasa fija referencial" },

    // BBVA (banco_id: 2)
    { id: 2, banco_id: 2, programa: "MiVivienda", monto_min: 10000, monto_max: 94999, tea: 13.10 },
    { id: 3, banco_id: 2, programa: "MiVivienda", monto_min: 95000, monto_max: 450000, tea: 12.90 },

    // Scotiabank (banco_id: 3)
    { id: 4, banco_id: 3, programa: "MiVivienda", monto_min: 58800, monto_max: 100000, tea: 12.40 },
    { id: 5, banco_id: 3, programa: "MiVivienda", monto_min: 100001, monto_max: 200000, tea: 10.99 },
    { id: 6, banco_id: 3, programa: "MiVivienda", monto_min: 200001, monto_max: 488800, tea: 9.99, nota: "Tasa preferencial sujeta a evaluación crediticia" },

    // Interbank (banco_id: 4)
    { id: 7, banco_id: 4, programa: "MiVivienda", monto_min: 68800, monto_max: 488800, tea: 14.42, tcea: 15.37 },

    // BanBif (banco_id: 5)
    { id: 8, banco_id: 5, programa: "MiVivienda", monto_min: 60000, monto_max: 427600, tea: 13.00 },

    // Pichincha (banco_id: 6)
    { id: 9, banco_id: 6, programa: "MiVivienda", monto_min: 0, monto_max: 100000, tea: 15.00 },
    { id: 10, banco_id: 6, programa: "MiVivienda", monto_min: 100001, monto_max: 200000, tea: 14.00 },
    { id: 11, banco_id: 6, programa: "MiVivienda", monto_min: 200001, monto_max: 488800, tea: 13.00 }
  ];

  // ==================== SEGUROS ====================
  private readonly seguros: Seguro[] = [
    // BCP (banco_id: 1) - NOTA: Seguro inmueble sobre saldo deudor (diferente a otros bancos)
    { id: 1, banco_id: 1, tipo_seguro: "Desgravamen", modalidad: "Individual", tasa_mensual: 0.0003, sobre_saldo: true, descripcion: "0.03% mensual sobre saldo" },
    { id: 2, banco_id: 1, tipo_seguro: "Inmueble", modalidad: "Todo Riesgo", tasa_mensual: 0.00021, sobre_saldo: true, descripcion: "0.021% mensual sobre saldo deudor" },

    // BBVA (banco_id: 2)
    { id: 3, banco_id: 2, tipo_seguro: "Desgravamen", modalidad: "Individual Convencional", tasa_mensual: 0.000028, sobre_saldo: true },
    { id: 4, banco_id: 2, tipo_seguro: "Desgravamen", modalidad: "Individual con Devolución", tasa_mensual: 0.000052, sobre_saldo: true },
    { id: 5, banco_id: 2, tipo_seguro: "Desgravamen", modalidad: "Mancomunado Convencional", tasa_mensual: 0.000029, sobre_saldo: true },
    { id: 6, banco_id: 2, tipo_seguro: "Desgravamen", modalidad: "Mancomunado con Devolución", tasa_mensual: 0.000099, sobre_saldo: true },

    // Scotiabank (banco_id: 3)
    { id: 7, banco_id: 3, tipo_seguro: "Desgravamen", modalidad: "Individual", tasa_mensual: 0.00028, sobre_saldo: true },
    { id: 8, banco_id: 3, tipo_seguro: "Desgravamen", modalidad: "Mancomunado", tasa_mensual: 0.00121, sobre_saldo: true },
    { id: 9, banco_id: 3, tipo_seguro: "Inmueble", modalidad: "Todo Riesgo", tasa_mensual: 0.0034, sobre_saldo: false, descripcion: "0.34% sobre valor asegurable" },

    // Interbank (banco_id: 4)
    { id: 10, banco_id: 4, tipo_seguro: "Desgravamen", modalidad: "Individual", tasa_mensual: 0.00028, sobre_saldo: true },
    { id: 11, banco_id: 4, tipo_seguro: "Desgravamen", modalidad: "Mancomunado", tasa_mensual: 0.00080, sobre_saldo: true },
    { id: 12, banco_id: 4, tipo_seguro: "Inmueble", modalidad: "Todo Riesgo", tasa_mensual: 0.0034, sobre_saldo: false },

    // BanBif (banco_id: 5)
    { id: 13, banco_id: 5, tipo_seguro: "Desgravamen", modalidad: "Individual", tasa_mensual: 0.00056, sobre_saldo: true },
    { id: 14, banco_id: 5, tipo_seguro: "Desgravamen", modalidad: "Mancomunado", tasa_mensual: 0.00111, sobre_saldo: true },
    { id: 15, banco_id: 5, tipo_seguro: "Inmueble", modalidad: "Todo Riesgo", tasa_mensual: 0.00031, sobre_saldo: false },

    // Pichincha (banco_id: 6)
    { id: 16, banco_id: 6, tipo_seguro: "Desgravamen", modalidad: "Individual", tasa_mensual: 0.00047, sobre_saldo: true },
    { id: 17, banco_id: 6, tipo_seguro: "Desgravamen", modalidad: "Individual con Devolución 20%", tasa_mensual: 0.00269, sobre_saldo: true },
    { id: 18, banco_id: 6, tipo_seguro: "Desgravamen", modalidad: "Mancomunado", tasa_mensual: 0.00080, sobre_saldo: true },
    { id: 19, banco_id: 6, tipo_seguro: "Desgravamen", modalidad: "Mancomunado con Devolución 20%", tasa_mensual: 0.00538, sobre_saldo: true },
    { id: 20, banco_id: 6, tipo_seguro: "Inmueble", modalidad: "Todo Riesgo", tasa_mensual: 0.00031, sobre_saldo: false }
  ];

  // ==================== COMISIONES ====================
  private readonly comisiones: Comision[] = [
    // BCP (banco_id: 1)
    { id: 1, banco_id: 1, tipo_comision: "Tasación", monto_fijo: 265, frecuencia: "Unica" },
    { id: 2, banco_id: 1, tipo_comision: "Envío Estado de Cuenta", monto_fijo: 0, frecuencia: "Mensual" },

    // BBVA (banco_id: 2)
    { id: 3, banco_id: 2, tipo_comision: "Tasación", monto_fijo: 265, frecuencia: "Unica" },
    { id: 4, banco_id: 2, tipo_comision: "Envío Estado de Cuenta", monto_fijo: 10, frecuencia: "Mensual" },

    // Scotiabank (banco_id: 3)
    { id: 5, banco_id: 3, tipo_comision: "Tasación", monto_fijo: 140, frecuencia: "Unica" },
    { id: 6, banco_id: 3, tipo_comision: "Notaría Vivienda Terminada", monto_fijo: 350, frecuencia: "Unica" },
    { id: 7, banco_id: 3, tipo_comision: "Notaría Vivienda Proyecto", monto_fijo: 470, frecuencia: "Unica" },
    { id: 8, banco_id: 3, tipo_comision: "Envío Estado de Cuenta", monto_fijo: 11, frecuencia: "Mensual" },
    { id: 9, banco_id: 3, tipo_comision: "Modificación de Condiciones", monto_fijo: 300, frecuencia: "Unica" },
    { id: 10, banco_id: 3, tipo_comision: "Estudio Póliza Inmueble", monto_fijo: 200, frecuencia: "Unica" },

    // Interbank (banco_id: 4)
    { id: 11, banco_id: 4, tipo_comision: "Tasación", monto_fijo: 140, frecuencia: "Unica" },
    { id: 12, banco_id: 4, tipo_comision: "Notaría Vivienda Terminada", monto_fijo: 350, frecuencia: "Unica" },
    { id: 13, banco_id: 4, tipo_comision: "Envío Estado de Cuenta", monto_fijo: 10, frecuencia: "Mensual" },

    // BanBif (banco_id: 5)
    { id: 14, banco_id: 5, tipo_comision: "Envío Estado de Cuenta", monto_fijo: 0, frecuencia: "Mensual" },
    { id: 15, banco_id: 5, tipo_comision: "Costos Iniciales", monto_fijo: 0, frecuencia: "Unica" },

    // Pichincha (banco_id: 6)
    { id: 16, banco_id: 6, tipo_comision: "Tasación", monto_fijo: 140, frecuencia: "Unica" },
    { id: 17, banco_id: 6, tipo_comision: "Notaría Vivienda Terminada", monto_fijo: 350, frecuencia: "Unica" },
    { id: 18, banco_id: 6, tipo_comision: "Notaría Vivienda Proyecto", monto_fijo: 470, frecuencia: "Unica" },
    { id: 19, banco_id: 6, tipo_comision: "Envío Estado de Cuenta", monto_fijo: 11, frecuencia: "Mensual" },
    { id: 20, banco_id: 6, tipo_comision: "Modificación de Condiciones", monto_fijo: 200, frecuencia: "Unica" }
  ];

  // ==================== BONOS MIVIVIENDA ====================
  // Actualizados según resoluciones 2024-2025
  private readonly bonos: BonoMiVivienda[] = [
    // Bono Buen Pagador (todos los bancos aplican según valor vivienda)
    { id: 1, banco_id: 0, programa: "MiVivienda", valor_min: 68800, valor_max: 176300, bono_tipo: "Bono Buen Pagador", bono_monto: 19400, condiciones: "Aplica para todos los bancos" },
    { id: 2, banco_id: 0, programa: "MiVivienda", valor_min: 176301, valor_max: 244600, bono_tipo: "Bono Buen Pagador", bono_monto: 23600, condiciones: "Aplica para todos los bancos" },
    { id: 3, banco_id: 0, programa: "MiVivienda", valor_min: 244601, valor_max: 362100, bono_tipo: "Bono Buen Pagador", bono_monto: 27400, condiciones: "Aplica para todos los bancos" },

    // Bono Verde (adicional)
    { id: 4, banco_id: 0, programa: "MiVivienda", valor_min: 0, valor_max: 999999, bono_tipo: "Bono Verde", bono_monto: 6300, condiciones: "Solo viviendas sostenibles certificadas" },

    // Bono Integrador
    { id: 5, banco_id: 0, programa: "MiVivienda", valor_min: 0, valor_max: 999999, bono_tipo: "Bono Integrador", bono_monto: 3600, condiciones: "Grupos vulnerables (madres solteras, discapacitados)" },

    // Techo Propio
    { id: 6, banco_id: 0, programa: "Techo Propio", valor_min: 0, valor_max: 128400, bono_tipo: "BFH Compra", bono_monto: 46545, condiciones: "Construcción en Sitio Propio" },
    { id: 7, banco_id: 0, programa: "Techo Propio", valor_min: 0, valor_max: 67000, bono_tipo: "BFH Construcción", bono_monto: 30900, condiciones: "Adquisición de vivienda nueva" },
    { id: 8, banco_id: 0, programa: "Techo Propio", valor_min: 0, valor_max: 999999, bono_tipo: "Premio Buen Pagador", bono_monto: 6400, condiciones: "Construcción en Sitio Propio" }
  ];

  // ==================== CONDICIONES DE CRÉDITO ====================
  private readonly condiciones: CondicionCredito[] = [
    { id: 1, banco_id: 1, cuota_inicial_min: 7.5, cuota_inicial_max: 100, plazo_min: 60, plazo_max: 300, porcentaje_financiamiento_max: 90, tiene_gracia: true, max_meses_gracia: 6, edad_maxima_termino: 75 },
    { id: 2, banco_id: 2, cuota_inicial_min: 7.5, cuota_inicial_max: 100, plazo_min: 60, plazo_max: 300, porcentaje_financiamiento_max: 92.5, tiene_gracia: true, max_meses_gracia: 6, edad_maxima_termino: 75 },
    { id: 3, banco_id: 3, cuota_inicial_min: 10, cuota_inicial_max: 100, plazo_min: 60, plazo_max: 300, porcentaje_financiamiento_max: 90, tiene_gracia: true, max_meses_gracia: 6, edad_maxima_termino: 75 },
    { id: 4, banco_id: 4, cuota_inicial_min: 7.5, cuota_inicial_max: 100, plazo_min: 60, plazo_max: 300, porcentaje_financiamiento_max: 100, tiene_gracia: true, max_meses_gracia: 6, edad_maxima_termino: 75 },
    { id: 5, banco_id: 5, cuota_inicial_min: 7.5, cuota_inicial_max: 100, plazo_min: 72, plazo_max: 300, porcentaje_financiamiento_max: 90, tiene_gracia: true, max_meses_gracia: 6, edad_maxima_termino: 70 },
    { id: 6, banco_id: 6, cuota_inicial_min: 7.5, cuota_inicial_max: 100, plazo_min: 60, plazo_max: 300, porcentaje_financiamiento_max: 90, tiene_gracia: true, max_meses_gracia: 6, edad_maxima_termino: 75 }
  ];

  // ==================== MÉTODOS PÚBLICOS ====================

  getBancos(): Banco[] {
    return [...this.bancos];
  }

  getBanco(id: number): Banco | undefined {
    return this.bancos.find(b => b.id === id);
  }

  getTasaAplicable(bancoId: number, monto: number, programa: string = "MiVivienda"): Tasa | null {
    const tasasDelBanco = this.tasas.filter(t => t.banco_id === bancoId && t.programa === programa);
    
    for (const tasa of tasasDelBanco) {
      if (monto >= tasa.monto_min && monto <= tasa.monto_max) {
        return tasa;
      }
    }
    
    return tasasDelBanco.length > 0 ? tasasDelBanco[0] : null;
  }

  getSeguros(bancoId: number): Seguro[] {
    return this.seguros.filter(s => s.banco_id === bancoId);
  }

  getComisiones(bancoId: number): Comision[] {
    return this.comisiones.filter(c => c.banco_id === bancoId);
  }

  getBonosAplicables(valorVivienda: number, programa: string = "MiVivienda"): BonoMiVivienda[] {
    return this.bonos.filter(b => 
      b.programa === programa && 
      valorVivienda >= b.valor_min && 
      valorVivienda <= b.valor_max
    );
  }

  getCondiciones(bancoId: number): CondicionCredito | undefined {
    return this.condiciones.find(c => c.banco_id === bancoId);
  }

  // Calcula el total de bonos aplicables
  calcularTotalBonos(valorVivienda: number, esViviendalVerde: boolean = false, esGrupoVulnerable: boolean = false): number {
    let total = 0;
    
    // Bono Buen Pagador (obligatorio)
    const bbp = this.bonos.find(b => 
      b.bono_tipo === "Bono Buen Pagador" && 
      valorVivienda >= b.valor_min && 
      valorVivienda <= b.valor_max
    );
    if (bbp) total += bbp.bono_monto;

    // Bono Verde (opcional)
    if (esViviendalVerde) {
      const verde = this.bonos.find(b => b.bono_tipo === "Bono Verde");
      if (verde) total += verde.bono_monto;
    }

    // Bono Integrador (opcional)
    if (esGrupoVulnerable) {
      const integrador = this.bonos.find(b => b.bono_tipo === "Bono Integrador");
      if (integrador) total += integrador.bono_monto;
    }

    return total;
  }
}