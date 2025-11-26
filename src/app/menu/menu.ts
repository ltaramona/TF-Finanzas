/**
 * MenuComponent completo (Standalone) - Wizard
 *
 * Incluye:
 * - Conversión TNA/TEA/TEM (capitalizaciones)
 * - Gracia parcial / total
 * - Plan de pagos método francés
 * - Seguros y gastos
 * - VAN, TIR (IRR por bisección mensual -> anual) y TCEA aproximada
 * - Guardado de operación en localStorage (historial)
 * - Exportar plan CSV
 *
 * Supuestos se describen en el README de la UI y en los comentarios del código.
 */

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class MenuComponent {

  // WIZARD
  steps = ['Cliente', 'Inmueble', 'Configuración', 'Banco', 'Revisar', 'Resultados'];
  currentStep = 0;

  // CONFIG
  config = {
    moneda: 'Soles',
    tipoTasa: 'Efectiva', // 'Nominal' o 'Efectiva'
    capitalizacion: 12,   // si nominal -> veces al año
    graciaTipo: 'Sin gracia', // 'Sin gracia' | 'Parcial' | 'Total'
    graciaMeses: 0
  };

  // CLIENTE
  cliente: any = {
    nombre: '',
    dni: '',
    ingreso: 0,
    edad: 30,
    estadoCivil: 'Soltero',
    dependientes: 0
  };

  // INMUEBLE
  inmueble: any = {
    precio: 0,
    cuotaInicial: 0,
    valorAsegurable: 0,
    area: 0,
    ubicacion: '',
    tipo: 'Departamento'
  };

  // BANCOS (datos base). Nota: desgravamen/inmueble se expresan en % mensual (ej. 0.044 -> 0.044%)
  bancos = [
    { nombre: "BCP", tasaDefault: 13.99, desgravamen: 0.044, seguroInmueble: 0, tasacion: 0, notariales: 0 },
    { nombre: "BBVA", tasaDefault: 12.90, desgravamen: 0.0520, seguroInmueble: 0, tasacion: 0, notariales: 0 },
    { nombre: "Scotiabank", tasaDefault: 12.10, desgravamen: 0.0, seguroInmueble: 0.0, tasacion: 0, notariales: 0 },
    { nombre: "Pichincha", tasaDefault: 15.00, desgravamen: 0.047, seguroInmueble: 0.031, tasacion: 140, notariales: 350 },
    { nombre: "BanBif", tasaDefault: 13.00, desgravamen: 0.0, seguroInmueble: 0.0, tasacion: 0, notariales: 0 },
    { nombre: "Interbank", tasaDefault: 8.80, desgravamen: 0.028, seguroInmueble: 0.34, tasacion: 0, notariales: 0 }
  ];

  bancoSeleccionado: any = null;

  parametros: any = {
    tasaBruta: 0, // input TEA o TNA según config
    seguroDesgravamen: 0,
    seguroInmueble: 0,
    tasacion: 0,
    notariales: 0
  };

  // CÁLCULO
  calculo: any = {
    plazo: 180, // meses
    gastos: 0,
    bonificacion: 0
  };

  // RESULTADOS
  resultado: any = null;
  plan: any[] = [];
  mensajeValidacion = '';

  // historial
  historial: any[] = [];

  constructor(private router: Router) {
    this.cargarHistorial();
  }

  // WIZARD NAV
  nextStep() {
    if (this.currentStep < this.steps.length - 1) this.currentStep++;
  }
  prevStep() {
    if (this.currentStep > 0) this.currentStep--;
  }
  gotoStep(i: number) {
    if (i <= this.currentStep + 1) this.currentStep = i;
  }

  logout() {
    localStorage.removeItem('logged');
    this.router.navigate(['/']);
  }

  aplicarBanco() {
    if (!this.bancoSeleccionado) return;
    this.parametros.tasaBruta = this.bancoSeleccionado.tasaDefault;
    this.parametros.seguroDesgravamen = this.bancoSeleccionado.desgravamen;
    this.parametros.seguroInmueble = this.bancoSeleccionado.seguroInmueble;
    this.parametros.tasacion = this.bancoSeleccionado.tasacion || 0;
    this.parametros.notariales = this.bancoSeleccionado.notariales || 0;
  }

  ejecutarCalculoCompleto() {
    this.mensajeValidacion = '';
    // Validaciones previas básicas
    if (!this.cliente.nombre) { this.mensajeValidacion = 'Ingrese nombre del cliente, vuelve al paso 1.';return; }
    if (this.inmueble.precio <= 0) { this.mensajeValidacion = 'Ingrese precio válido del inmueble, vuelve al paso 2.';return; }
    if (this.inmueble.cuotaInicial < this.inmueble.precio * 0.10) { this.mensajeValidacion = 'La cuota inicial mínima es 10% del precio, vuelve al paso 2.';return; }
    if (!this.bancoSeleccionado) { this.mensajeValidacion = 'Seleccione una entidad financiera, vuelve al paso 4.';return; }
    if (this.parametros.tasaBruta <= 0) { this.mensajeValidacion = 'Ingrese una tasa válida, vuelve al paso 4.';return; }
    // Ejecutar cálculo principal
    const ok = this.calcular();
    if (ok) this.gotoStep(5); // mostrar resultados
  }

  // ----- Funciones financieras -----

  /**
   * Convierte la tasa ingresada (según config) a TEA y TEM.
   * - Si config.tipoTasa == 'Efectiva': parametros.tasaBruta = TEA (en %)
   * - Si 'Nominal': parametros.tasaBruta = TNA (en %), capitalizacion = veces/año
   *
   * Retorna { teaDecimal, temDecimal }
   */
  obtenerTeaTem() {
    const tasa = parseFloat(this.parametros.tasaBruta) || 0;
    let teaDecimal = 0;
    if (this.config.tipoTasa === 'Efectiva') {
      teaDecimal = tasa / 100;
    } else {
      // TNA -> TEA: TEA = (1 + TNA/m)^{m} - 1
      const m = Number(this.config.capitalizacion) || 12;
      const tnaDecimal = tasa / 100;
      teaDecimal = Math.pow(1 + tnaDecimal / m, m) - 1;
    }
    const temDecimal = Math.pow(1 + teaDecimal, 1 / 12) - 1;
    return { teaDecimal, temDecimal };
  }

  /**
   * Calcula plan de pagos francés considerando periodos de gracia.
   * - Gracia parcial: paga intereses + seguros, no amortiza, luego se calcula cuota para meses restantes.
   * - Gracia total: no paga; intereses se capitalizan (se suman al saldo). Luego cuota calculada sobre saldo capitalizado.
   *
   * Retorna objeto resultado y plan (array).
   */
  calcular() {
    // variables de control para cuota fija
    let cuotaFija: number = 0;
    let cuotaFijaCalculada = false;

    // Validaciones adicionales (ingreso mínimo y edad)
    if ((this.cliente.ingreso || 0) < 1500) {
      this.mensajeValidacion = 'Ingreso mínimo requerido: S/ 1500 (o equivalente).';
      this.gotoStep(0);
      return false;
    }
    const edadFinal = (this.cliente.edad || 0) + (this.calculo.plazo / 12);
    if (edadFinal > 75) {
      this.mensajeValidacion = `Edad al final del crédito (${edadFinal.toFixed(1)}) excede 75 años.`;
      this.gotoStep(0);
      return false;
    }

    // Capital a financiar
    const capitalInicial = (this.inmueble.precio || 0) - (this.inmueble.cuotaInicial || 0);
    if (capitalInicial <= 0) {
      this.mensajeValidacion = 'Capital a financiar debe ser mayor que 0.';
      this.gotoStep(1);
      return false;
    }

    // Conversión de tasa
    const { teaDecimal, temDecimal } = this.obtenerTeaTem();

    // Parametros seguros y gastos
    const segDesgravMensPct = (this.parametros.seguroDesgravamen || 0) / 100; // ej. 0.044% -> 0.00044
    const segInmuebleMensPct = (this.parametros.seguroInmueble || 0) / 100; // % sobre valor asegurable
    const tasacion = Number(this.parametros.tasacion) || 0;
    const notariales = Number(this.parametros.notariales) || 0;
    const otrosGastos = Number(this.calculo.gastos) || 0;

    // Plazo y gracia
    const plazoTotal = Number(this.calculo.plazo) || 0;
    const graciaMeses = Number(this.config.graciaMeses) || 0;
    const tipoGracia = this.config.graciaTipo || 'Sin gracia';

    // Plan array
    const plan: any[] = [];

    // Saldo inicial variable (puede capitalizarse en gracia total)
    let saldo = capitalInicial;

    // Recorremos todos los meses
    for (let m = 1; m <= plazoTotal; m++) {
      const mes = m;
      const interes = saldo * temDecimal; // interés sobre saldo actual
      const segDesgrav = saldo * segDesgravMensPct; // desgravamen sobre saldo
      const segInmueble = (this.inmueble.valorAsegurable || 0) * segInmuebleMensPct; // seguro inmueble sobre valor asegurado

      let amortizacion = 0;
      let cuota = 0;

      if (m <= graciaMeses) {
        // Periodo de gracia
        if (tipoGracia === 'Sin gracia') {
          // no hay gracia (este bloque no debería activarse si graciaMeses==0)
        } else if (tipoGracia === 'Parcial') {
          // Paga intereses + seguros. No amortiza.
          cuota = interes + segDesgrav + segInmueble;
          amortizacion = 0;
          // saldo no cambia
        } else if (tipoGracia === 'Total') {
          // No paga; capitalizamos interés al saldo
          amortizacion = 0;
          cuota = 0; // asumo que no se paga cuota en gracia total (si deseas cobrar seguros aquí, ajustar)
          saldo += interes; // capitalizamos interés
        }
      } else {
        // Fase de amortización: método francés
        const mesesRestantes = plazoTotal - graciaMeses;

        // calcular cuota fija solo al primer mes de amortización
        if (m === graciaMeses + 1) {
          if (temDecimal === 0) {
            cuotaFija = saldo / mesesRestantes;
          } else {
            cuotaFija = saldo * (temDecimal / (1 - Math.pow(1 + temDecimal, -mesesRestantes)));
          }
          cuotaFijaCalculada = true;
        }

        const interesMes = saldo * temDecimal;

        if (cuotaFijaCalculada) {
          // cuota fija + seguros
          cuota = cuotaFija + segDesgrav + segInmueble;
          amortizacion = cuotaFija - interesMes;
        } else {
          // fallback (no debería pasar)
          cuota = segDesgrav + segInmueble;
          amortizacion = 0;
        }

        // actualizar saldo
        saldo = Math.max(0, saldo - amortizacion);
      }

      const saldoInicialMes = (plan.length === 0) ? capitalInicial : plan[plan.length - 1].saldoFinal;
      // cálculo de saldo final para el registro del mes
      const saldoFinalMes = (tipoGracia === 'Total' && m <= graciaMeses) ? saldo : (saldoInicialMes - amortizacion);

      plan.push({
        mes,
        saldoInicial: parseFloat(saldoInicialMes.toFixed(10)),
        interes: parseFloat(interes.toFixed(10)),
        amortizacion: parseFloat(amortizacion.toFixed(10)),
        segDesgravamen: parseFloat(segDesgrav.toFixed(10)),
        segInmueble: parseFloat(segInmueble.toFixed(10)),
        cuota: parseFloat(cuota.toFixed(10)),
        saldoFinal: parseFloat(saldoFinalMes.toFixed(10))
      });
    } // fin for

    // calcular cuota fija final sobre el saldo en el inicio de amortización (más robusto)
    const mesesRestantesGlobal = Math.max(1, plazoTotal - graciaMeses);
    // saldoParaAmort corresponde al saldo justo antes de comenzar amortización: si hubo plan, tomar primer mes de amortización
    const primerMesAmort = plan.find(p => p.amortizacion > 0);
    const saldoParaAmort = primerMesAmort ? primerMesAmort.saldoInicial : saldo; // si no hay amort, usar saldo final
    let cuotaFijaFinal = 0;
    if (mesesRestantesGlobal > 0) {
      if (temDecimal === 0) cuotaFijaFinal = saldoParaAmort / mesesRestantesGlobal;
      else cuotaFijaFinal = saldoParaAmort * (temDecimal / (1 - Math.pow(1 + temDecimal, -mesesRestantesGlobal)));
    }

    // cuota mostrada = cuotaFijaFinal + seguros del primer mes de amortizacion (si existe)
    const segInmueblePrimer = (this.inmueble.valorAsegurable || 0) * segInmuebleMensPct;
    const segDesgravPrimer = (primerMesAmort ? primerMesAmort.saldoInicial : capitalInicial) * segDesgravMensPct;
    const cuotaMostrada = cuotaFijaFinal + segDesgravPrimer + segInmueblePrimer;

    // Consturir flujos para VAN/TIR desde la perspectiva del cliente
    const desembolsoInicial = (this.inmueble.cuotaInicial || 0) + tasacion + notariales + otrosGastos - (this.calculo.bonificacion || 0);

    const flujos: number[] = [];
    flujos.push(-desembolsoInicial);
    for (let i = 0; i < plan.length; i++) {
      flujos.push(- (plan[i].cuota || 0));
    }

    // PV de pagos descontados al temDecimal
    let pvPagos = 0;
    for (let t = 1; t <= plan.length; t++) {
      const pago = Math.abs(flujos[t]);
      pvPagos += pago / Math.pow(1 + temDecimal, t);
    }
    // VAN: PV(pagos) - desembolsoInicial
    const van = pvPagos - desembolsoInicial;

    // TIR: IRR mensual
    const irrMensual = this.irrBiseccion(flujos, 0.0000001, -0.99, 1);
    const tirAnual = irrMensual !== null ? (Math.pow(1 + irrMensual, 12) - 1) * 100 : 0;

    // TCEA: anualizar irr mensual (si se obtuvo)
    const tcea = irrMensual !== null ? Math.pow(1 + irrMensual, 12) - 1 : 0;

    // Validación capacidad de pago (40% del ingreso)
    const cuotaReferencia = cuotaMostrada;
    if ((this.cliente.ingreso || 0) * 0.40 < cuotaReferencia) {
      this.mensajeValidacion = `La cuota estimada (${cuotaReferencia.toFixed(2)}) excede el 40% del ingreso (${((this.cliente.ingreso || 0) * 0.4).toFixed(2)}).`;
      return false;
    }

    // Guardar resultado en this
    this.plan = plan;
    this.resultado = {
      cuotaMensual: cuotaMostrada,
      van,
      tirAnual,
      tcea,
      capital: capitalInicial,
      tem: temDecimal,
      tea: teaDecimal
    };

    this.mensajeValidacion = '';
    return true;
  }

  // IRR por bisección (entrada: flujos con f0, f1...)
  irrBiseccion(flujos: number[], tol = 1e-7, low = -0.9, high = 1.0, maxIter = 200) {
    const npv = (rate: number) => {
      return flujos.reduce((acc, f, i) => acc + f / Math.pow(1 + rate, i), 0);
    };
    let a = low, b = high;
    let fa = npv(a), fb = npv(b);
    if (isNaN(fa) || isNaN(fb)) return null;
    if (fa * fb > 0) {
      // no guaranteed sign change; try expanding
      a = -0.9999; b = 10;
      fa = npv(a); fb = npv(b);
      if (fa * fb > 0) return null;
    }
    let mid = (a + b) / 2;
    for (let i = 0; i < maxIter; i++) {
      mid = (a + b) / 2;
      const fm = npv(mid);
      if (Math.abs(fm) < tol) return mid;
      if (fa * fm < 0) { b = mid; fb = fm; } else { a = mid; fa = fm; }
    }
    return mid;
  }

  // EXPORT CSV
  exportPlanCSV() {
    if (!this.plan || this.plan.length === 0) return;
    const headers = ['mes', 'saldoInicial', 'interes', 'amortizacion', 'segDesgravamen', 'segInmueble', 'cuota', 'saldoFinal'];
    const rows = [headers.join(',')];
    for (const r of this.plan) {
      rows.push([r.mes, r.saldoInicial, r.interes, r.amortizacion, r.segDesgravamen, r.segInmueble, r.cuota, r.saldoFinal].join(','));
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_${this.cliente.nombre || 'sim'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // GUARDAR OPERACIÓN EN HISTORIAL (localStorage)
  guardarOperacion() {
    const op = {
      fecha: new Date().toLocaleString(),
      cliente: { ...this.cliente },
      inmueble: { ...this.inmueble },
      config: { ...this.config },
      parametros: { ...this.parametros },
      calculo: { ...this.calculo },
      resultado: { ...this.resultado },
      plan: JSON.parse(JSON.stringify(this.plan))
    };
    const arr = JSON.parse(localStorage.getItem('historial_ops') || '[]');
    arr.unshift(op);
    localStorage.setItem('historial_ops', JSON.stringify(arr));
    this.cargarHistorial();
    alert('Operación guardada en historial local.');
  }

  cargarHistorial() {
    this.historial = JSON.parse(localStorage.getItem('historial_ops') || '[]');
  }

  limpiarHistorial() {
    if (!confirm('Eliminar todo el historial local?')) return;
    localStorage.removeItem('historial_ops');
    this.cargarHistorial();
  }

  cargarOperacion(op: any) {
    // Cargar en formularios
    this.cliente = { ...op.cliente };
    this.inmueble = { ...op.inmueble };
    this.config = { ...op.config };
    this.parametros = { ...op.parametros };
    this.calculo = { ...op.calculo };
    this.resultado = { ...op.resultado };
    this.plan = JSON.parse(JSON.stringify(op.plan));
    this.gotoStep(5);
  }
}
