import type { Debt } from '../types';

export interface InstallmentDetails {
  totalInstallments: number;
  installmentValue: number;
  paidInstallments: number;
  currentInstallment: number;
  remainingInstallments: number;
  remainingAmount: number;
  isPaid: boolean;
  startMonthLabel: string;
  endMonthLabel: string;
  progressPercent: number;
  elapsedMonths: number;
}

export const getInstallmentDetails = (debt: Debt): InstallmentDetails => {
  const totalInstallments = Math.max(1, debt.installmentsCount || 1);
  const installmentValue = debt.principalAmount / totalInstallments;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 9 = Out)

  let startYear = currentYear;
  let startMonthIdx = currentMonth;

  if (debt.startMonth) {
    const parts = debt.startMonth.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        startYear = y;
        startMonthIdx = m - 1;
      }
    }
  } else if (debt.startDate) {
    const parts = debt.startDate.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        startYear = y;
        startMonthIdx = m - 1;
      }
    }
  }

  // Elapsed months between start month and current month
  const elapsedMonths = Math.max(0, (currentYear - startYear) * 12 + (currentMonth - startMonthIdx));

  // Determine how many installments have already been paid (by elapsed time or by manual payment)
  const paidByTime = Math.min(totalInstallments, elapsedMonths);
  const paidByAmount = Math.min(totalInstallments, Math.floor((debt.paidAmount || 0) / (installmentValue || 1)));
  const paidInstallments = Math.max(paidByTime, paidByAmount);

  const currentInstallment = Math.min(totalInstallments, paidInstallments + 1);
  const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);

  const effectivePaidAmount = Math.max(
    debt.paidAmount || 0,
    paidInstallments * installmentValue
  );

  const remainingAmount = Math.max(0, debt.principalAmount - effectivePaidAmount);
  const isPaid = debt.status === 'paid_off' || remainingInstallments === 0 || remainingAmount <= 0;

  const startDateObj = new Date(startYear, startMonthIdx, 1);
  const endDateObj = new Date(startYear, startMonthIdx + totalInstallments - 1, 1);

  const formatMonth = (d: Date) => {
    const str = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    return str.charAt(0).toUpperCase() + str.slice(1).replace('.', '');
  };

  return {
    totalInstallments,
    installmentValue,
    paidInstallments,
    currentInstallment,
    remainingInstallments,
    remainingAmount,
    isPaid,
    startMonthLabel: formatMonth(startDateObj),
    endMonthLabel: formatMonth(endDateObj),
    progressPercent: Math.min(100, Math.round((paidInstallments / totalInstallments) * 100)),
    elapsedMonths,
  };
};
