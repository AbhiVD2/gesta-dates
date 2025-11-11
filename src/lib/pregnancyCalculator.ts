import { addWeeks, addDays, format } from 'date-fns';

export interface ScanCalculation {
  scanName: string;
  weekRange: string;
  calculatedDate: string;
  dateRange: string;
  weekStart: number;
  weekEnd: number;
}

export function calculateEDD(lmpDate: Date): Date {
  // EDD = LMP + 280 days (40 weeks)
  return addDays(lmpDate, 280);
}

export function calculateScanDate(
  lmpDate: Date,
  weekStart: number,
  weekEnd: number
): ScanCalculation {
  // Calculate middle of week range
  const midWeek = Math.floor((weekStart + weekEnd) / 2);
  const calculatedDate = addWeeks(lmpDate, midWeek);
  
  // Calculate date range
  const rangeStart = addWeeks(lmpDate, weekStart);
  const rangeEnd = addWeeks(lmpDate, weekEnd);
  
  return {
    scanName: '',
    weekRange: `${weekStart}-${weekEnd} weeks`,
    calculatedDate: format(calculatedDate, 'dd-MMM-yyyy'),
    dateRange: `${format(rangeStart, 'dd-MMM-yyyy')} to ${format(rangeEnd, 'dd-MMM-yyyy')}`,
    weekStart,
    weekEnd
  };
}

export function calculateAllScans(lmpDate: Date, scanTypes: Array<{ 
  name: string; 
  week_range_start: number; 
  week_range_end: number;
}>): ScanCalculation[] {
  return scanTypes.map(scan => ({
    ...calculateScanDate(lmpDate, scan.week_range_start, scan.week_range_end),
    scanName: scan.name
  }));
}
