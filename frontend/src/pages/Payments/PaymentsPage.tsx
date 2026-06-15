import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle2, Clock, XCircle, Calendar, RefreshCcw, Download, Users, AlertTriangle, List } from "lucide-react";
import { getPayments, generateMonthlyPayments } from "../../api/paymentApi";
import type { BoxPayment } from "../../types";
import { PaymentModal } from "./PaymentModal";

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<BoxPayment | null>(null);
  const [activeTab, setActiveTab] = useState<'mensual' | 'general' | 'profesional'>('mensual');
  const [selectedMonthToGenerate, setSelectedMonthToGenerate] = useState<string>(new Date().toISOString().slice(0, 7));

  const { data: payments = [], isLoading } = useQuery<BoxPayment[]>({
    queryKey: ["payments"],
    queryFn: getPayments,
  });

  const generateMutation = useMutation({
    mutationFn: (monthYear: string) => generateMonthlyPayments(monthYear),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      alert(`Ciclo generado: Se crearon ${data.generated_count} pagos para el mes ${data.month_year}.`);
    },
    onError: () => {
      alert("Error al generar el ciclo de pagos.");
    }
  });

  // Agrupamos por mes para facilitar la vista
  const paymentsByMonth = payments.reduce((acc, p) => {
    if (!acc[p.month_year]) acc[p.month_year] = [];
    acc[p.month_year].push(p);
    return acc;
  }, {} as Record<string, BoxPayment[]>);

  const sortedMonths = Object.keys(paymentsByMonth).sort((a, b) => b.localeCompare(a));

  // Agrupamos por profesional para ver deudas
  const paymentsByProfessional = payments.reduce((acc, p) => {
    if (!acc[p.professional_email]) {
      acc[p.professional_email] = {
        email: p.professional_email,
        paidMonths: [],
        pendingMonths: [],
        totalOwed: 0,
        totalContract: 0,
        totalGenerated: 0,
        seenBoxes: new Set<string>()
      };
    }
    const prof = acc[p.professional_email];

    const boxShiftKey = `${p.box_id}-${p.shift}`;
    if (!prof.seenBoxes.has(boxShiftKey)) {
      prof.seenBoxes.add(boxShiftKey);
      prof.totalContract += (p.contract_duration || 1);
    }
    prof.totalGenerated += 1;

    if (p.status === 'PAID') {
      prof.paidMonths.push(p.month_year);
    } else {
      prof.pendingMonths.push({ month: p.month_year, amount: p.amount || 0 });
      prof.totalOwed += (p.amount || 0);
    }
    return acc;
  }, {} as Record<string, { email: string, paidMonths: string[], pendingMonths: { month: string, amount: number }[], totalOwed: number, totalContract: number, totalGenerated: number, seenBoxes: Set<string> }>);

  const professionals = Object.values(paymentsByProfessional).sort((a, b) => {
    // Sort debtors first, then by email
    if (a.pendingMonths.length > 0 && b.pendingMonths.length === 0) return -1;
    if (a.pendingMonths.length === 0 && b.pendingMonths.length > 0) return 1;
    return a.email.localeCompare(b.email);
  });

  const exportToCsv = () => {
    // --- SECTION 1: Historial de Pagos ---
    const headers1 = ["Mes", "Profesional", "Box", "Estado", "Fecha de Pago", "Monto", "Notas"];

    // Order payments by month_year descending, then by professional email
    const sortedPayments = [...payments].sort((a, b) =>
      b.month_year.localeCompare(a.month_year) ||
      a.professional_email.localeCompare(b.professional_email)
    );

    const rows1 = sortedPayments.map(p => {
      const status = p.status === 'PAID' ? 'Pagado' : p.status === 'IN_PROGRESS' ? 'En Curso' : 'Pendiente';
      const date = p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A';
      const amount = p.amount ? p.amount : '0';
      const box = `${p.box_name} (${p.shift === 'MORNING' ? 'Mañana' : 'Tarde'})`;
      const notes = p.notes ? p.notes.replace(/"/g, '""') : ''; // Escape quotes in notes

      return [
        `"${p.month_year}"`,
        `"${p.professional_email}"`,
        `"${box}"`,
        `"${status}"`,
        `"${date}"`,
        `"${amount}"`,
        `"${notes}"`
      ];
    });

    // --- SECTION 2: Resumen por Profesional (Deudores) ---
    const headers2 = ["Profesional", "Estado General", "Meses Restantes", "Meses Pagados", "Meses Adeudados", "Total Adeudado"];
    const rows2 = professionals.map(prof => {
      const estado = prof.pendingMonths.length > 0 ? 'Deudor' : 'Al Día';
      const restantes = `${Math.max(0, prof.totalContract - prof.totalGenerated)} de ${prof.totalContract}`;
      const pagos = prof.paidMonths.join(", ");
      const deudas = prof.pendingMonths.map(p => `${p.month} ($${p.amount})`).join(", ");
      return [
        `"${prof.email}"`,
        `"${estado}"`,
        `"${restantes}"`,
        `"${pagos}"`,
        `"${deudas}"`,
        `"${prof.totalOwed}"`
      ];
    });

    // Combine sections side by side
    const maxRows = Math.max(rows1.length, rows2.length);
    const combinedRows = [];

    // Titles
    combinedRows.push([
      "--- HISTORIAL DE PAGOS ---", "", "", "", "", "", "",
      "",
      "--- RESUMEN POR PROFESIONAL (DEUDORES) ---"
    ]);

    // Headers
    combinedRows.push([...headers1, "", ...headers2]);

    // Rows
    for (let i = 0; i < maxRows; i++) {
      const r1 = rows1[i] || ["", "", "", "", "", "", ""];
      const r2 = rows2[i] || ["", "", "", "", ""];
      combinedRows.push([...r1, "", ...r2]);
    }

    const csvContent = "\uFEFF" + combinedRows.map(row => row.join(";")).join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_completo_pagos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="border-b pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <CreditCard className="h-6 w-6" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Pagos y Contratos</h2>
          </div>
          <p className="text-muted-foreground text-sm">Administra la facturación mensual de los profesionales asignados a boxes.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCsv}
            disabled={payments.length === 0}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </button>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonthToGenerate}
              onChange={(e) => setSelectedMonthToGenerate(e.target.value)}
              className="bg-background border border-input rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary h-[38px]"
            />
            <button
              onClick={() => generateMutation.mutate(selectedMonthToGenerate)}
              disabled={generateMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 rounded-xl transition-colors text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 h-[38px]"
            >
              <RefreshCcw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Generar Ciclo
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando pagos...</p>
      ) : payments.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed rounded-2xl border-border/60 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No hay historial de pagos registrado.</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <input
              type="month"
              value={selectedMonthToGenerate}
              onChange={(e) => setSelectedMonthToGenerate(e.target.value)}
              className="bg-background border border-input rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => generateMutation.mutate(selectedMonthToGenerate)}
              className="text-primary hover:underline text-sm font-medium"
            >
              Generar ciclo seleccionado
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-border/40 pb-2">
            <button
              onClick={() => setActiveTab('mensual')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'mensual' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <Calendar className="h-4 w-4" />
              Historial Mensual
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <List className="h-4 w-4" />
              Historial General
            </button>
            <button
              onClick={() => setActiveTab('profesional')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'profesional' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              <Users className="h-4 w-4" />
              Estado por Profesional
            </button>
          </div>

          {activeTab === 'mensual' && (
            <div className="space-y-8 animate-in fade-in">
              {sortedMonths.map(month => (
                <div key={month} className="space-y-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Mes: {month}
                  </h3>

                  <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                          <tr>
                            <th className="px-4 py-3">Profesional</th>
                            <th className="px-4 py-3">Box</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Fecha Pago</th>
                            <th className="px-4 py-3">Monto</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {paymentsByMonth[month].map(payment => (
                            <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{payment.professional_email}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {payment.box_name} ({payment.shift === 'MORNING' ? 'Mañana' : 'Tarde'})
                              </td>
                              <td className="px-4 py-3">
                                <div className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold items-center gap-1.5
                                  ${payment.status === 'PAID' ? 'bg-emerald-500/70 text-white dark:bg-emerald-500/50 dark:text-white' :
                                    payment.status === 'IN_PROGRESS' ? 'bg-orange-500/70 text-white dark:bg-orange-500/50 dark:text-white' :
                                      'bg-rose-500/70 text-white dark:bg-rose-500/50 dark:text-white'}`}>
                                  {payment.status === 'PAID' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                                    payment.status === 'IN_PROGRESS' ? <Clock className="h-3.5 w-3.5" /> :
                                      <XCircle className="h-3.5 w-3.5" />}
                                  {payment.status === 'PAID' ? 'Pagado' :
                                    payment.status === 'IN_PROGRESS' ? 'En Curso' : 'Pendiente'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {payment.amount ? `$${payment.amount}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedPayment(payment)}
                                  className="text-primary hover:underline font-medium text-xs bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  Actualizar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="animate-in fade-in space-y-4">
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Mes</th>
                        <th className="px-4 py-3">Profesional</th>
                        <th className="px-4 py-3">Box</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha Pago</th>
                        <th className="px-4 py-3">Monto</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[...payments].sort((a, b) => b.month_year.localeCompare(a.month_year) || a.professional_email.localeCompare(b.professional_email)).map(payment => (
                        <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{payment.month_year}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{payment.professional_email}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {payment.box_name} ({payment.shift === 'MORNING' ? 'Mañana' : 'Tarde'})
                          </td>
                          <td className="px-4 py-3">
                            <div className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold items-center gap-1.5
                              ${payment.status === 'PAID' ? 'bg-emerald-500/70 text-white dark:bg-emerald-500/50 dark:text-white' :
                                payment.status === 'IN_PROGRESS' ? 'bg-orange-500/70 text-white dark:bg-orange-500/50 dark:text-white' :
                                  'bg-rose-500/70 text-white dark:bg-rose-500/50 dark:text-white'}`}>
                              {payment.status === 'PAID' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                                payment.status === 'IN_PROGRESS' ? <Clock className="h-3.5 w-3.5" /> :
                                  <XCircle className="h-3.5 w-3.5" />}
                              {payment.status === 'PAID' ? 'Pagado' :
                                payment.status === 'IN_PROGRESS' ? 'En Curso' : 'Pendiente'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {payment.amount ? `$${payment.amount}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="text-primary hover:underline font-medium text-xs bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Actualizar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profesional' && (
            <div className="animate-in fade-in space-y-4">
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Profesional</th>
                        <th className="px-4 py-3">Estado General</th>
                        <th className="px-4 py-3">Meses Restantes</th>
                        <th className="px-4 py-3">Meses Pagados</th>
                        <th className="px-4 py-3">Meses Adeudados</th>
                        <th className="px-4 py-3 text-right">Total Adeudado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {professionals.map(prof => (
                        <tr key={prof.email} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4 font-medium text-foreground">{prof.email}</td>
                          <td className="px-4 py-4">
                            {prof.pendingMonths.length > 0 ? (
                              <div className="inline-flex px-2 py-1 rounded-md text-xs font-semibold items-center gap-1.5 bg-rose-500/70 text-white dark:bg-rose-500/50 dark:text-white">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Deudor
                              </div>
                            ) : (
                              <div className="inline-flex px-2 py-1 rounded-md text-xs font-semibold items-center gap-1.5 bg-emerald-500/70 text-white dark:bg-emerald-500/50 dark:text-white">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Al Día
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-semibold text-foreground mr-1">{Math.max(0, prof.totalContract - prof.totalGenerated)}</span>
                            <span className="text-muted-foreground text-xs">de {prof.totalContract}</span>
                          </td>
                          <td className="px-4 py-4">
                            {prof.paidMonths.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {prof.paidMonths.map(m => (
                                  <span key={m} className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{m}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {prof.pendingMonths.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {prof.pendingMonths.map(p => (
                                  <span key={p.month} className="px-2 py-0.5 bg-rose-500/70 text-white dark:bg-rose-500/50 dark:text-white rounded text-xs font-medium">
                                    {p.month} (${p.amount})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-foreground">
                            {prof.totalOwed > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">${prof.totalOwed}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">$0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}
