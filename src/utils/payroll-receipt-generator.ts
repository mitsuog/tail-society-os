import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PayrollDetail {
    employee: { id: string; name: string; role: string; color: string };
    days_worked: number;
    lost_days: number;
    commission_type: string;
    participation_pct: number;
    calculation_note: string;
    // Campos financieros
    full_salary_weekly?: number; // Opcional por si viene de datos viejos
    salary_penalty?: number;     // Opcional
    payout_bank: number;
    payout_cash_salary: number;
    payout_commission: number;
    payout_cash_total: number;
    total_payout: number;
    commission_bonus: number;
    commission_penalty: number;
}

interface PayrollPeriod {
    start: string;
    end: string;
}

interface CompanyInfo {
    name: string;
    rfc: string;
    address: string;
    phone: string;
    logo?: string;
}

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

const formatDateRange = (startStr: string, endStr: string) => {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const startDay = format(start, 'EEEE dd', { locale: es });
    const endDay = format(end, 'EEEE dd', { locale: es });
    const monthYear = format(end, "MMMM yyyy", { locale: es });
    return `${startDay} al ${endDay} de ${monthYear}`;
};

const ROLE_TRANSLATIONS: Record<string, string> = {
    'Estilista': 'Estilista',
    'groomer': 'Estilista',
    'Bañador': 'Bañador(a)',
    'bather': 'Bañador(a)',
    'Recepción': 'Recepcionista',
    'receptionist': 'Recepcionista',
    'Gerencia': 'Gerente',
    'manager': 'Gerente',
    'Admin': 'Admin',
    'Limpieza': 'Limpieza'
};

export function generatePayrollReceipt(
    detail: PayrollDetail,
    period: PayrollPeriod,
    companyInfo: CompanyInfo = {
        name: 'Tail Society',
        rfc: 'TSO190521V24',
        address: 'Av. Manuel Gómez Morín 404 - San Pedro Garza García',
        phone: '+52 (81) 8356 9271'
    }
) {
    const doc = new jsPDF();
    
    // Colores
    const slate900: [number, number, number] = [15, 23, 42];
    const slate700: [number, number, number] = [51, 65, 85];
    const slate500: [number, number, number] = [100, 116, 139];
    const slate300: [number, number, number] = [203, 213, 225];
    const blue600: [number, number, number] = [37, 99, 235];
    const blue50: [number, number, number] = [239, 246, 255];
    
    let yPos = 15;

    // Header
    doc.setFillColor(slate900[0], slate900[1], slate900[2]);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name, 15, yPos + 8);
    
    doc.setFontSize(8);
    doc.setTextColor(slate300[0], slate300[1], slate300[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`RFC: ${companyInfo.rfc}`, 15, yPos + 15);
    doc.text(companyInfo.address, 15, yPos + 20);
    doc.text(`Tel: ${companyInfo.phone}`, 15, yPos + 25);

    const receiptNumber = `${period.start.replace(/-/g, '')}-${detail.employee.id.substring(0, 6).toUpperCase()}`;
    doc.setFontSize(9);
    doc.text('FOLIO', 195, yPos + 8, { align: 'right' });
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(receiptNumber, 195, yPos + 14, { align: 'right' });

    yPos = 55;

    // Título
    doc.setFontSize(16);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE NÓMINA', 105, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${formatDateRange(period.start, period.end)}`, 105, yPos, { align: 'center' });

    yPos += 12;

    // Info Empleado
    doc.setFillColor(blue50[0], blue50[1], blue50[2]);
    doc.rect(15, yPos, 180, 28, 'F');
    doc.setDrawColor(blue600[0], blue600[1], blue600[2]);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, 180, 28);
    
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(detail.employee.name.toUpperCase(), 20, yPos);
    
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    doc.setFont('helvetica', 'normal');
    
    // Fila 1
    doc.text('Puesto:', 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(ROLE_TRANSLATIONS[detail.employee.role] || detail.employee.role, 45, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Días laborados:', 110, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${detail.days_worked}`, 145, yPos);
    
    if (detail.lost_days > 0) {
        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'normal');
        doc.text(`(-${detail.lost_days} faltas)`, 155, yPos);
    }
    
    yPos += 7;
    
    // Fila 2
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Esquema:', 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(detail.commission_type === 'grooming' ? 'Comisión Grooming' : 'Comisión Global', 45, yPos);

    yPos += 15;

    // ========== PERCEPCIONES (Ingresos) ==========
    const perceptionsData: any[] = [];
    
    // 1. SUELDO BASE (COMPLETO, antes de descuentos)
    // Si tenemos la variable full_salary_weekly, la usamos. Si no, reconstruimos sumando el descuento.
    const fullSalary = detail.full_salary_weekly || (detail.payout_bank + detail.payout_cash_salary + (detail.salary_penalty || 0));
    
    if (fullSalary > 0) {
        perceptionsData.push(['Sueldo Semanal', formatMoney(fullSalary)]);
    }
    
    // 2. COMISIÓN BRUTA (Generada antes de multas)
    const baseCommission = detail.payout_commission - detail.commission_bonus + detail.commission_penalty;
    
    if (baseCommission > 0) {
        perceptionsData.push([
            `Comisión Generada (${detail.commission_type === 'grooming' ? 'Grooming' : 'Tienda'})`,
            formatMoney(baseCommission)
        ]);
    }
    
    // 3. BONO (Redistribución)
    if (detail.commission_bonus > 0) {
        perceptionsData.push(['Bono por Asistencia (Redistribución)', formatMoney(detail.commission_bonus)]);
    }

    if (perceptionsData.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(slate900[0], slate900[1], slate900[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('PERCEPCIONES', 15, yPos);
        yPos += 5;
        autoTable(doc, {
            startY: yPos,
            head: [['Concepto', 'Importe']],
            body: perceptionsData,
            theme: 'grid',
            headStyles: {
                fillColor: slate700,
                textColor: [255, 255, 255] as [number, number, number],
                fontSize: 9, fontStyle: 'bold', halign: 'left', cellPadding: 3
            },
            bodyStyles: { fontSize: 9, textColor: slate900, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 130, halign: 'left' },
                1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 15, right: 15 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // ========== DEDUCCIONES (Descuentos) ==========
    const deductionsData: any[] = [];
    
    // 1. DEDUCCIÓN SALARIO BASE (Día descontado / 7)
    if (detail.salary_penalty && detail.salary_penalty > 0) {
        deductionsData.push(['Faltas Injustificadas (Descuento Sueldo Base)', formatMoney(detail.salary_penalty)]);
    } else if (detail.lost_days > 0) {
        // Fallback si no viene el dato exacto: Calcularlo aprox
        // Deducción = Sueldo Completo - Sueldo Pagado
        const salaryPaid = detail.payout_bank + detail.payout_cash_salary;
        const diff = fullSalary - salaryPaid;
        if(diff > 0.1) deductionsData.push(['Faltas Injustificadas (Descuento Sueldo Base)', formatMoney(diff)]);
    }
    
    // 2. DEDUCCIÓN COMISIÓN (Multa al bote)
    if (detail.commission_penalty > 0) {
        deductionsData.push(['Faltas Injustificadas (Descuento Comisión)', formatMoney(detail.commission_penalty)]);
    }

    if (deductionsData.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(slate900[0], slate900[1], slate900[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('DEDUCCIONES', 15, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Concepto', 'Importe']],
            body: deductionsData,
            theme: 'grid',
            headStyles: {
                fillColor: [220, 38, 38] as [number, number, number],
                textColor: [255, 255, 255] as [number, number, number],
                fontSize: 9, fontStyle: 'bold', halign: 'left', cellPadding: 3
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [153, 27, 27] as [number, number, number],
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 130, halign: 'left' },
                1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 15, right: 15 },
            styles: { lineColor: [254, 202, 202] as [number, number, number], lineWidth: 0.1 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Total
    doc.setFillColor(slate900[0], slate900[1], slate900[2]);
    doc.rect(15, yPos, 180, 20, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL NETO A PAGAR:', 20, yPos + 8);
    
    doc.setFontSize(16);
    doc.text(formatMoney(detail.total_payout), 190, yPos + 8, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(slate300[0], slate300[1], slate300[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Efectivo: ${formatMoney(detail.payout_cash_total)}  |  Depósito: ${formatMoney(detail.payout_bank)}`, 20, yPos + 15);

    yPos += 30;

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(slate300[0], slate300[1], slate300[2]);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 25, 195, pageHeight - 25);
    
    doc.setFontSize(7);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.setFont('helvetica', 'italic');
    doc.text('Este documento es un comprobante informativo de pago. Conservar para registro personal.', 105, pageHeight - 18, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`${companyInfo.name} • RFC: ${companyInfo.rfc} • ${companyInfo.phone}`, 105, pageHeight - 13, { align: 'center' });
    
    doc.setFontSize(6);
    doc.text(`Folio: ${receiptNumber} • Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 105, pageHeight - 8, { align: 'center' });

    return doc;
}

export function downloadSingleReceipt(detail: PayrollDetail, period: PayrollPeriod, companyInfo?: CompanyInfo) {
    const doc = generatePayrollReceipt(detail, period, companyInfo);
    doc.save(`Recibo_${detail.employee.name.replace(/\s+/g, '_')}_${period.start}.pdf`);
}

export function previewReceipt(detail: PayrollDetail, period: PayrollPeriod, companyInfo?: CompanyInfo) {
    const doc = generatePayrollReceipt(detail, period, companyInfo);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
}