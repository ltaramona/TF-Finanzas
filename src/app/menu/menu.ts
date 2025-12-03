/**
 * MenuComponent - Calculadora de Crédito Hipotecario MiVivienda
 * Wizard de 6 pasos con integración completa de servicios
 * Método: Francés Vencido Ordinario
 * Actualizado: Diciembre 2024
 */

import { Component, OnInit } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';

import { 
  BancoDataService, 
  Banco, 
  Tasa, 
  Seguro, 
  BonoMiVivienda,
  CondicionCredito 
} from '../services/banco-data.service';

import { 
  CalculoFinancieroService, 
  ParametrosCredito, 
  ResultadoCredito 
} from '../services/calculo-financiero.service';

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
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class MenuComponent implements OnInit {

  // ==================== WIZARD ====================
  steps = ['Cliente', 'Inmueble', 'Configuración', 'Banco', 'Revisar', 'Resultados'];
  currentStep = 0;

  // ==================== DATOS DEL FORMULARIO ====================
  
  // CLIENTE
  cliente = {
    nombre: '',
    dni: '',
    ingreso: 0,
    edad: 30,
    estadoCivil: 'Soltero',
    dependientes: 0,
    esGrupoVulnerable: false // Para Bono Integrador
  };

  // INMUEBLE
  inmueble = {
    precio: 0,
    cuotaInicial: 0,
    cuotaInicialPorcentaje: 10, // %
    valorAsegurable: 0,
    area: 0,
    ubicacion: '',
    tipo: 'Departamento',
    esVerde: false // Para Bono Verde
  };

  // CONFIGURACIÓN
  config = {
    plazoMeses: 180,
    tipoGracia: 'Sin gracia',
    mesesGracia: 0
  };

  // BANCO Y SEGUROS
  bancoSeleccionado: Banco | null = null;
  tasaAplicable: Tasa | null = null;
  segurosDisponibles: Seguro[] = [];
  seguroDesgravamenSeleccionado: Seguro | null = null;
  seguroInmuebleSeleccionado: Seguro | null = null;
  condicionesCredito: CondicionCredito | undefined = undefined;

  // BONOS
  bonosAplicables: BonoMiVivienda[] = [];
  totalBonos = 0;

  // ==================== RESULTADOS ====================
  resultado: ResultadoCredito | null = null;
  mensajeValidacion = '';

  // ==================== DATOS DE CATÁLOGO ====================
  bancos: Banco[] = [];
  segurosDesgravamen: Seguro[] = [];
  segurosInmueble: Seguro[] = [];

  // ==================== HISTORIAL ====================
  historial: any[] = [];

  constructor(
    private router: Router,
    private bancoData: BancoDataService,
    private calculoService: CalculoFinancieroService
  ) {}

  ngOnInit() {
    this.cargarBancos();
    this.cargarHistorial();
  }

  // ==================== CARGA INICIAL ====================

  cargarBancos() {
    this.bancos = this.bancoData.getBancos().filter(b => b.afiliado_mivivienda);
  }

  // ==================== NAVEGACIÓN WIZARD ====================

  nextStep() {
    // Validaciones por paso antes de avanzar
    if (!this.validarPasoActual()) return;
    
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  gotoStep(step: number) {
      this.currentStep = step;
      this.mensajeValidacion = '';
  }

  // ==================== VALIDACIONES POR PASO ====================

  validarPasoActual(): boolean {
    this.mensajeValidacion = '';

    switch (this.currentStep) {
      case 0: // Cliente
        if (!this.cliente.nombre.trim()) {
          this.mensajeValidacion = 'Ingrese el nombre del cliente';
          return false;
        }
        if (this.cliente.ingreso < 1500) {
          this.mensajeValidacion = 'Ingreso mínimo requerido: S/ 1,500';
          return false;
        }
        if (this.cliente.edad < 18 || this.cliente.edad > 70) {
          this.mensajeValidacion = 'Edad debe estar entre 18 y 70 años';
          return false;
        }
        return true;

      case 1: // Inmueble
        if (this.inmueble.precio <= 0) {
          this.mensajeValidacion = 'Ingrese un precio válido';
          return false;
        }
        if (this.inmueble.precio > 488800) {
          this.mensajeValidacion = 'Precio máximo para MiVivienda: S/ 488,800';
          return false;
        }
        if (this.inmueble.precio < 68800) {
          this.mensajeValidacion = 'Precio mínimo para MiVivienda: S/ 68,800';
          return false;
        }
        if (this.inmueble.cuotaInicial <= 0) {
          this.mensajeValidacion = 'Ingrese una cuota inicial válida';
          return false;
        }
        
        // Calcular bonos aplicables
        this.calcularBonos();
        
        const porcentajeCuotaInicial = (this.inmueble.cuotaInicial / this.inmueble.precio) * 100;
        if (porcentajeCuotaInicial < 7.5) {
          this.mensajeValidacion = 'Cuota inicial mínima: 7.5% del precio';
          return false;
        }

        if (this.inmueble.valorAsegurable <= 0) {
          this.mensajeValidacion = 'Ingrese el valor asegurable (valor de reconstrucción)';
          return false;
        }
        return true;

      case 2: // Configuración
        if (this.config.plazoMeses < 60 || this.config.plazoMeses > 300) {
          this.mensajeValidacion = 'Plazo debe estar entre 60 y 300 meses';
          return false;
        }
        
        if (this.config.tipoGracia !== 'Sin gracia' && this.config.mesesGracia <= 0) {
          this.mensajeValidacion = 'Ingrese los meses de gracia';
          return false;
        }
        
        if (this.config.mesesGracia > 6) {
          this.mensajeValidacion = 'Máximo 6 meses de gracia';
          return false;
        }

        // Validar edad al término del crédito
        const edadFinal = this.cliente.edad + (this.config.plazoMeses / 12);
        if (edadFinal > 75) {
          this.mensajeValidacion = `Edad al término del crédito (${edadFinal.toFixed(1)} años) excede el máximo de 75 años`;
          return false;
        }
        return true;

      case 3: // Banco
        if (!this.bancoSeleccionado) {
          this.mensajeValidacion = 'Seleccione una entidad financiera';
          return false;
        }
        if (!this.seguroDesgravamenSeleccionado) {
          this.mensajeValidacion = 'Seleccione una modalidad de seguro de desgravamen';
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  // ==================== LÓGICA DE NEGOCIO ====================

  calcularBonos() {
    this.bonosAplicables = this.bancoData.getBonosAplicables(this.inmueble.precio, 'MiVivienda');
    this.totalBonos = this.bancoData.calcularTotalBonos(
      this.inmueble.precio,
      this.inmueble.esVerde,
      this.cliente.esGrupoVulnerable
    );
  }

  aplicarBanco() {
    if (!this.bancoSeleccionado) return;

    // Obtener condiciones del banco
    this.condicionesCredito = this.bancoData.getCondiciones(this.bancoSeleccionado.id);

    // Calcular monto a financiar (temporal)
    const montoFinanciar = this.inmueble.precio - this.inmueble.cuotaInicial - this.totalBonos;

    // Obtener tasa aplicable según monto
    this.tasaAplicable = this.bancoData.getTasaAplicable(
      this.bancoSeleccionado.id,
      montoFinanciar,
      'MiVivienda'
    );

    // Cargar seguros disponibles del banco
    const seguros = this.bancoData.getSeguros(this.bancoSeleccionado.id);
    this.segurosDesgravamen = seguros.filter(s => s.tipo_seguro === 'Desgravamen');
    this.segurosInmueble = seguros.filter(s => s.tipo_seguro === 'Inmueble');

    // Seleccionar primer seguro por defecto
    this.seguroDesgravamenSeleccionado = this.segurosDesgravamen[0] || null;
    this.seguroInmuebleSeleccionado = this.segurosInmueble[0] || null;
  }

  onCuotaInicialPorcentajeChange() {
    this.inmueble.cuotaInicial = (this.inmueble.precio * this.inmueble.cuotaInicialPorcentaje) / 100;
  }

  onCuotaInicialChange() {
    if (this.inmueble.precio > 0) {
      this.inmueble.cuotaInicialPorcentaje = (this.inmueble.cuotaInicial / this.inmueble.precio) * 100;
    }
  }

  // ==================== CÁLCULO PRINCIPAL ====================

  ejecutarCalculoCompleto() {
    if (!this.validarPasoActual()) return;

    try {
      // Validación final de capacidad de pago (se hará después del cálculo)
      
      // Construir parámetros
      const params: ParametrosCredito = {
        valorVivienda: this.inmueble.precio,
        cuotaInicial: this.inmueble.cuotaInicial,
        valorAsegurable: this.inmueble.valorAsegurable,
        bancoId: this.bancoSeleccionado!.id,
        plazoMeses: this.config.plazoMeses,
        tea: (this.tasaAplicable?.tea || 0) / 100, // Convertir a decimal
        seguroDesgravamen: this.seguroDesgravamenSeleccionado!,
        seguroInmueble: this.seguroInmuebleSeleccionado || undefined,
        esViviendaVerde: this.inmueble.esVerde,
        esGrupoVulnerable: this.cliente.esGrupoVulnerable,
        tipoGracia: this.config.tipoGracia as any,
        mesesGracia: this.config.mesesGracia
      };

      // EJECUTAR CÁLCULO
      this.resultado = this.calculoService.calcularCredito(params);

      // Validación de capacidad de pago (40% del ingreso)
      const ingresoDisponible = this.cliente.ingreso * 0.40;
      if (this.resultado.cuotaTotalPrimerMes > ingresoDisponible) {
        this.mensajeValidacion = `La cuota mensual (S/ ${this.resultado.cuotaTotalPrimerMes.toFixed(2)}) excede el 40% del ingreso (S/ ${ingresoDisponible.toFixed(2)}). Considere aumentar la cuota inicial o extender el plazo.`;
        this.resultado = null;
        return;
      }

      // Ir a resultados
      this.gotoStep(5);
      this.mensajeValidacion = '';

    } catch (error: any) {
      this.mensajeValidacion = 'Error en el cálculo: ' + error.message;
      console.error(error);
    }
  }

  // ==================== EXPORTAR Y GUARDAR ====================

  exportarPlanCSV() {
    if (!this.resultado) return;

    const headers = [
      'Mes',
      'Saldo Inicial',
      'Interés',
      'Amortización',
      'Cuota Fija',
      'Seguro Desgravamen',
      'Seguro Inmueble',
      'Comisión Mensual',
      'Cuota Total',
      'Saldo Final',
      'Es Gracia'
    ];

    const rows = [headers.join(',')];

    this.resultado.plan.forEach(fila => {
      rows.push([
        fila.mes,
        fila.saldoInicial.toFixed(2),
        fila.interes.toFixed(2),
        fila.amortizacion.toFixed(2),
        fila.cuotaFija.toFixed(2),
        fila.seguroDesgravamen.toFixed(2),
        fila.seguroInmueble.toFixed(2),
        fila.comisionMensual.toFixed(2),
        fila.cuotaTotal.toFixed(2),
        fila.saldoFinal.toFixed(2),
        fila.esGracia ? 'Sí' : 'No'
      ].join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan_pagos_${this.cliente.nombre.replace(/\s/g, '_')}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  guardarOperacion() {
    if (!this.resultado) return;

    const operacion = {
      fecha: new Date().toLocaleString('es-PE'),
      cliente: { ...this.cliente },
      inmueble: { ...this.inmueble },
      config: { ...this.config },
      banco: this.bancoSeleccionado?.nombre,
      tasa: this.tasaAplicable?.tea,
      totalBonos: this.totalBonos,
      resultado: {
        capitalFinanciado: this.resultado.capitalFinanciado,
        cuotaMensual: this.resultado.cuotaTotalPrimerMes,
        tcea: this.resultado.tcea
      }
    };

    const historial = JSON.parse(localStorage.getItem('historial_mivivienda') || '[]');
    historial.unshift(operacion);
    
    // Limitar a 20 operaciones
    if (historial.length > 20) {
      historial.pop();
    }

    localStorage.setItem('historial_mivivienda', JSON.stringify(historial));
    this.cargarHistorial();
    alert('Operación guardada en el historial local');
  }

  cargarHistorial() {
    this.historial = JSON.parse(localStorage.getItem('historial_mivivienda') || '[]');
  }

  limpiarHistorial() {
    if (!confirm('¿Eliminar todo el historial local?')) return;
    localStorage.removeItem('historial_mivivienda');
    this.cargarHistorial();
  }

  cargarOperacion(op: any) {
    // Restaurar datos del formulario
    this.cliente = { ...op.cliente };
    this.inmueble = { ...op.inmueble };
    this.config = { ...op.config };
    
    // Buscar banco
    this.bancoSeleccionado = this.bancos.find(b => b.nombre === op.banco) || null;
    if (this.bancoSeleccionado) {
      this.aplicarBanco();
    }

    this.totalBonos = op.totalBonos || 0;
    
    // Ir al paso de revisión
    this.gotoStep(4);
  }

  nuevaSimulacion() {
    if (!confirm('¿Iniciar una nueva simulación? Se perderán los datos actuales.')) return;
    
    // Resetear formulario
    this.cliente = {
      nombre: '',
      dni: '',
      ingreso: 0,
      edad: 30,
      estadoCivil: 'Soltero',
      dependientes: 0,
      esGrupoVulnerable: false
    };

    this.inmueble = {
      precio: 0,
      cuotaInicial: 0,
      cuotaInicialPorcentaje: 10,
      valorAsegurable: 0,
      area: 0,
      ubicacion: '',
      tipo: 'Departamento',
      esVerde: false
    };

    this.config = {
      plazoMeses: 180,
      tipoGracia: 'Sin gracia',
      mesesGracia: 0
    };

    this.bancoSeleccionado = null;
    this.resultado = null;
    this.mensajeValidacion = '';
    this.gotoStep(0);
  }

  logout() {
    localStorage.removeItem('logged');
    this.router.navigate(['/']);
  }
}