/**
 * Servicio de Cálculo Financiero para Créditos Hipotecarios
 * Método: Francés Vencido Ordinario (Base 30/360)
 * Actualizado: Diciembre 2024
 */

import { Injectable } from '@angular/core';
import { BancoDataService, Seguro, Comision, BonoMiVivienda } from './banco-data.service';

export interface ParametrosCredito {
  valorVivienda: number;
  cuotaInicial: number;
  valorAsegurable: number;
  bancoId: number;
  plazoMeses: number;
  tea: number; // Tasa Efectiva Anual en decimal (ej: 0.1299 para 12.99%)
  
  // Seguros seleccionados
  seguroDesgravamen: Seguro;
  seguroInmueble?: Seguro;
  
  // Bonos aplicables
  esViviendaVerde: boolean;
  esGrupoVulnerable: boolean;
  
  // Periodo de gracia
  tipoGracia: 'Sin gracia' | 'Parcial' | 'Total';
  mesesGracia: number;
}

export interface FilaPlanPagos {
  mes: number;
  saldoInicial: number;
  interes: number;
  amortizacion: number;
  seguroDesgravamen: number;
  seguroInmueble: number;
  comisionMensual: number;
  cuotaFija: number; // CF sin seguros ni comisiones
  cuotaTotal: number; // CF + seguros + comisiones
  saldoFinal: number;
  esGracia: boolean;
}

export interface ResultadoCredito {
  capitalInicial: number; // Antes de bonos
  totalBonos: number;
  capitalFinanciado: number; // Después de bonos
  tem: number;
  tea: number;
  cuotaFija: number; // Cuota sin seguros
  cuotaTotalPrimerMes: number;
  
  // Costos iniciales
  costosIniciales: number;
  desembolsoTotal: number; // cuota inicial + costos iniciales
  
  // Indicadores financieros
  van: number;
  tirMensual: number;
  tirAnual: number;
  tcea: number;
  
  // Plan de pagos
  plan: FilaPlanPagos[];
  
  // Resumen
  totalIntereses: number;
  totalSeguros: number;
  totalComisiones: number;
  totalPagado: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalculoFinancieroService {

  constructor(private bancoData: BancoDataService) {}

  /**
   * Calcula el plan de pagos completo
   */
  calcularCredito(params: ParametrosCredito): ResultadoCredito {
    // 1. CALCULAR BONOS APLICABLES
    const bonos = this.bancoData.getBonosAplicables(params.valorVivienda);
    const totalBonos = this.calcularTotalBonos(
      params.valorVivienda,
      bonos,
      params.esViviendaVerde,
      params.esGrupoVulnerable
    );

    // 2. CAPITAL FINANCIADO (después de cuota inicial y bonos)
    const capitalInicial = params.valorVivienda - params.cuotaInicial;
    const capitalFinanciado = capitalInicial - totalBonos;

    if (capitalFinanciado <= 0) {
      throw new Error('El capital a financiar debe ser mayor a cero');
    }

    // 3. CONVERSIÓN DE TASAS
    const tem = this.calcularTEM(params.tea);

    // 4. OBTENER COMISIONES DEL BANCO
    const comisiones = this.bancoData.getComisiones(params.bancoId);
    const comisionMensual = this.obtenerComisionMensual(comisiones);
    const costosIniciales = this.calcularCostosIniciales(comisiones);

    // 5. GENERAR PLAN DE PAGOS
    const plan = this.generarPlanPagos(
      capitalFinanciado,
      tem,
      params.plazoMeses,
      params.seguroDesgravamen,
      params.seguroInmueble,
      params.valorAsegurable,
      comisionMensual,
      params.tipoGracia,
      params.mesesGracia
    );

    // 6. CALCULAR INDICADORES FINANCIEROS
    const desembolsoTotal = params.cuotaInicial + costosIniciales;
    const { van, tirMensual, tirAnual, tcea } = this.calcularIndicadores(
      plan,
      desembolsoTotal,
      capitalFinanciado
    );

    // 7. RESUMEN
    const totalIntereses = plan.reduce((sum, row) => sum + row.interes, 0);
    const totalSeguros = plan.reduce((sum, row) => sum + row.seguroDesgravamen + row.seguroInmueble, 0);
    const totalComisiones = plan.reduce((sum, row) => sum + row.comisionMensual, 0);
    const totalPagado = plan.reduce((sum, row) => sum + row.cuotaTotal, 0);

    const cuotaFija = plan.find(r => r.cuotaFija > 0)?.cuotaFija || 0;
    const cuotaTotalPrimerMes = plan[0]?.cuotaTotal || 0;

    return {
      capitalInicial,
      totalBonos,
      capitalFinanciado,
      tem,
      tea: params.tea,
      cuotaFija,
      cuotaTotalPrimerMes,
      costosIniciales,
      desembolsoTotal,
      van,
      tirMensual,
      tirAnual,
      tcea,
      plan,
      totalIntereses,
      totalSeguros,
      totalComisiones,
      totalPagado
    };
  }

  /**
   * Convierte TEA a TEM usando base 30/360
   * TEM = (1 + TEA)^(1/12) - 1
   */
  private calcularTEM(tea: number): number {
    return Math.pow(1 + tea, 1 / 12) - 1;
  }

  /**
   * Calcula total de bonos aplicables
   */
  private calcularTotalBonos(
    valorVivienda: number,
    bonos: BonoMiVivienda[],
    esVerde: boolean,
    esVulnerable: boolean
  ): number {
    let total = 0;

    // Bono Buen Pagador (obligatorio si aplica)
    const bbp = bonos.find(b => b.bono_tipo === 'Bono Buen Pagador');
    if (bbp) total += bbp.bono_monto;

    // Bono Verde (opcional)
    if (esVerde) {
      const verde = bonos.find(b => b.bono_tipo === 'Bono Verde');
      if (verde) total += verde.bono_monto;
    }

    // Bono Integrador (opcional)
    if (esVulnerable) {
      const integrador = bonos.find(b => b.bono_tipo === 'Bono Integrador');
      if (integrador) total += integrador.bono_monto;
    }

    return total;
  }

  /**
   * Obtiene comisión mensual total
   */
  private obtenerComisionMensual(comisiones: Comision[]): number {
    return comisiones
      .filter(c => c.frecuencia === 'Mensual')
      .reduce((sum, c) => sum + c.monto_fijo, 0);
  }

  /**
   * Calcula costos iniciales (tasación, notariales, etc.)
   */
  private calcularCostosIniciales(comisiones: Comision[]): number {
    return comisiones
      .filter(c => c.frecuencia === 'Unica')
      .reduce((sum, c) => sum + c.monto_fijo, 0);
  }

  /**
   * Genera el plan de pagos completo
   */
  private generarPlanPagos(
    capitalFinanciado: number,
    tem: number,
    plazoMeses: number,
    seguroDesgravamen: Seguro,
    seguroInmueble: Seguro | undefined,
    valorAsegurable: number,
    comisionMensual: number,
    tipoGracia: string,
    mesesGracia: number
  ): FilaPlanPagos[] {
    const plan: FilaPlanPagos[] = [];
    let saldo = capitalFinanciado;

    // Calcular meses de amortización real
    const mesesAmortizacion = plazoMeses - mesesGracia;

    // IMPORTANTE: La cuota fija se calcula sobre el saldo AL INICIO de la amortización
    let cuotaFija = 0;
    let saldoParaAmortizacion = capitalFinanciado;

    // Si hay gracia total, el saldo se capitaliza primero
    if (tipoGracia === 'Total') {
      for (let i = 0; i < mesesGracia; i++) {
        saldoParaAmortizacion += saldoParaAmortizacion * tem;
      }
    }

    // Calcular cuota fija usando fórmula francesa
    if (mesesAmortizacion > 0) {
      if (tem === 0) {
        cuotaFija = saldoParaAmortizacion / mesesAmortizacion;
      } else {
        cuotaFija = saldoParaAmortizacion * (tem * Math.pow(1 + tem, mesesAmortizacion)) / 
                    (Math.pow(1 + tem, mesesAmortizacion) - 1);
      }
    }

    // GENERAR PLAN MES A MES
    for (let mes = 1; mes <= plazoMeses; mes++) {
      const esGracia = mes <= mesesGracia;
      const interes = saldo * tem;

      let amortizacion = 0;
      let cuotaMes = 0;

      // PERIODO DE GRACIA
      if (esGracia) {
        if (tipoGracia === 'Sin gracia') {
          // No debería llegar aquí si mesesGracia = 0
          amortizacion = cuotaFija - interes;
          cuotaMes = cuotaFija;
        } else if (tipoGracia === 'Parcial') {
          // Paga solo intereses
          amortizacion = 0;
          cuotaMes = interes;
        } else if (tipoGracia === 'Total') {
          // No paga nada, intereses se capitalizan
          amortizacion = 0;
          cuotaMes = 0;
          saldo += interes; // Capitalizar interés
        }
      } 
      // PERIODO DE AMORTIZACION
      else {
        amortizacion = cuotaFija - interes;
        cuotaMes = cuotaFija;
      }

      // Calcular seguros
      const segDesgrav = this.calcularSeguro(seguroDesgravamen, saldo, valorAsegurable);
      const segInmueble = seguroInmueble ? this.calcularSeguro(seguroInmueble, saldo, valorAsegurable) : 0;

      // Cuota total incluye seguros y comisiones (excepto en gracia total)
      let cuotaTotal = cuotaMes + segDesgrav + segInmueble + comisionMensual;
      
      // En gracia total no se paga nada
      if (tipoGracia === 'Total' && esGracia) {
        cuotaTotal = 0;
      }

      const saldoInicial = saldo;
      const saldoFinal = Math.max(0, saldo - amortizacion);

      plan.push({
        mes,
        saldoInicial: this.redondear(saldoInicial),
        interes: this.redondear(interes),
        amortizacion: this.redondear(amortizacion),
        seguroDesgravamen: this.redondear(segDesgrav),
        seguroInmueble: this.redondear(segInmueble),
        comisionMensual: this.redondear(comisionMensual),
        cuotaFija: this.redondear(esGracia ? cuotaMes : cuotaFija),
        cuotaTotal: this.redondear(cuotaTotal),
        saldoFinal: this.redondear(saldoFinal),
        esGracia
      });

      saldo = saldoFinal;
    }

    return plan;
  }

  /**
   * Calcula seguro mensual según su tipo
   */
  private calcularSeguro(seguro: Seguro, saldoDeudor: number, valorAsegurable: number): number {
    if (seguro.sobre_saldo) {
      return saldoDeudor * seguro.tasa_mensual;
    } else {
      return valorAsegurable * seguro.tasa_mensual;
    }
  }

  /**
   * Calcula VAN, TIR mensual, TIR anual y TCEA
   */
  private calcularIndicadores(plan: FilaPlanPagos[], desembolsoInicial: number, capitalFinanciado: number) {
    // Net cash at t0: lo que efectivamente ingresa el cliente (prestamo recibido menos desembolso inicial)
    const flujo0 = capitalFinanciado - desembolsoInicial;

    // Construir flujos desde la perspectiva del cliente: ingreso inicial positivo, luego pagos negativos
    const flujos: number[] = [this.redondear(flujo0)];
    plan.forEach(fila => {
      flujos.push(this.redondear(-fila.cuotaTotal));
    });

    // Calcular TIR mensual
    const tirMensual = this.calcularTIR(flujos);
    const tirAnual = tirMensual !== null ? (Math.pow(1 + tirMensual, 12) - 1) : 0;
    const tcea = tirAnual;

    // Para VAN usamos TEM estimado por la periodicidad del plan.
    // Intentamos obtener la TEM promedio: si no hay intereses (raro), usamos 0.
    const tem = plan.length > 0 && plan[0].saldoInicial > 0 ? (plan[0].interes / plan[0].saldoInicial) : 0;

    // VAN: valor presente de pagos (notar signos: flujos[0] positivo, pagos negativos)
    let van = 0;
    flujos.forEach((f, idx) => {
      van += f / Math.pow(1 + tem, idx);
    });

    return {
      van: this.redondear(van),
      tirMensual: tirMensual || 0,
      tirAnual: this.redondear(tirAnual * 100), // porcentaje
      tcea: this.redondear(tcea * 100) // porcentaje
    };
  }


  /**
   * Calcula TIR usando método de bisección
   */
  private calcularTIR(flujos: number[], tolerancia = 1e-7, maxIter = 200): number | null {
    const vpn = (tasa: number): number => {
      return flujos.reduce((acc, flujo, idx) => {
        return acc + flujo / Math.pow(1 + tasa, idx);
      }, 0);
    };

    let low = -0.99;
    let high = 2.0;
    let vpnLow = vpn(low);
    let vpnHigh = vpn(high);

    // Verificar que hay cambio de signo
    if (vpnLow * vpnHigh > 0) {
      // Intentar expandir el rango
      low = -0.9999;
      high = 10;
      vpnLow = vpn(low);
      vpnHigh = vpn(high);
      if (vpnLow * vpnHigh > 0) {
        return null; // No se puede calcular TIR
      }
    }

    // Bisección
    for (let i = 0; i < maxIter; i++) {
      const mid = (low + high) / 2;
      const vpnMid = vpn(mid);

      if (Math.abs(vpnMid) < tolerancia) {
        return mid;
      }

      if (vpnLow * vpnMid < 0) {
        high = mid;
        vpnHigh = vpnMid;
      } else {
        low = mid;
        vpnLow = vpnMid;
      }
    }

    return (low + high) / 2;
  }

  /**
   * Redondea a 2 decimales
   */
  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}