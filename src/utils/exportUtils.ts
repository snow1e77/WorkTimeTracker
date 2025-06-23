import { Platform } from 'react-native';
import { WorkReport, Violation } from '../types';

// For web platforms - CSV export
export const exportToCSV = (reports: WorkReport[], period: string): void => {
  if (Platform.OS !== 'web') {
    console.warn('CSV export is only available on web platform');
    return;
  }

  const headers = ['Employee', 'Site', 'Working Hours', 'Total Minutes', 'Shifts Count', 'Date', 'Violations'];
  const csvContent = [
    headers.join(','),
    ...reports.map(report => [
      `"${report.userName}"`,
      `"${report.siteName}"`,
      `${report.totalHours}.${Math.round((report.totalMinutes % 60) * 100 / 60)}`,
      report.totalMinutes.toString(),
      report.shiftsCount.toString(),
      `"${report.date}"`,
      report.violations.toString()
    ].join(','))
  ].join('\n');

  // Create and download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `work_reports_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Generate HTML table for reports
export const generateReportHTML = (reports: WorkReport[], period: string): string => {
  const totalHours = reports.reduce((sum, report) => sum + report.totalHours, 0);
  const totalWorkers = reports.length;
  const totalViolations = reports.reduce((sum, report) => sum + report.violations, 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Work Reports - ${period}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #3498db;
          padding-bottom: 20px;
        }
        .stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        .stat-label {
          font-size: 14px;
          color: #7f8c8d;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #3498db;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .violations {
          color: #e74c3c;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #7f8c8d;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Work Time Reports</h1>
        <h2>Period: ${period.charAt(0).toUpperCase() + period.slice(1)}</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>

      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">${totalWorkers}</div>
          <div class="stat-label">Total Workers</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${totalHours.toFixed(1)}h</div>
          <div class="stat-label">Total Hours</div>
        </div>
        <div class="stat-item">
          <div class="stat-value ${totalViolations > 0 ? 'violations' : ''}">${totalViolations}</div>
          <div class="stat-label">Violations</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Site</th>
            <th>Working Hours</th>
            <th>Total Minutes</th>
            <th>Shifts</th>
            <th>Date</th>
            <th>Violations</th>
          </tr>
        </thead>
        <tbody>
          ${reports.map(report => `
            <tr>
              <td>${report.userName}</td>
              <td>${report.siteName}</td>
              <td>${report.totalHours}h ${report.totalMinutes % 60}m</td>
              <td>${report.totalMinutes}</td>
              <td>${report.shiftsCount}</td>
              <td>${new Date(report.date).toLocaleDateString()}</td>
              <td class="${report.violations > 0 ? 'violations' : ''}">${report.violations || 'None'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>WorkTime Tracker - Admin Report</p>
        <p>This report contains confidential information and should be handled according to company policies.</p>
      </div>
    </body>
    </html>
  `;
};

// Export to PDF (web only - using print functionality)
export const exportToPDF = (reports: WorkReport[], period: string): void => {
  if (Platform.OS !== 'web') {
    console.warn('PDF export is only available on web platform');
    return;
  }

  const htmlContent = generateReportHTML(reports, period);
  
  // Create new window with print-optimized content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow!.print();
      // Close window after printing (user will be prompted to save as PDF)
      setTimeout(() => {
        printWindow!.close();
      }, 100);
    };
  }
};

// Export violations to CSV
export const exportViolationsToCSV = (violations: Violation[], period: string): void => {
  if (Platform.OS !== 'web') {
    console.warn('CSV export is only available on web platform');
    return;
  }

  const headers = ['Employee', 'Site', 'Violation Type', 'Description', 'Severity', 'Timestamp', 'Status'];
  const csvContent = [
    headers.join(','),
    ...violations.map(violation => [
      `"${(violation as any).userName || 'Unknown'}"`,
      `"${(violation as any).siteName || 'Unknown Site'}"`,
      `"${violation.type.replace(/_/g, ' ')}"`,
      `"${violation.description}"`,
      violation.severity,
      `"${new Date(violation.timestamp).toLocaleString()}"`,
      violation.isResolved ? 'Resolved' : 'Pending'
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `violations_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Generate summary statistics for reports
export const generateReportSummary = (reports: WorkReport[]) => {
  const totalHours = reports.reduce((sum, report) => sum + report.totalHours, 0);
  const totalMinutes = reports.reduce((sum, report) => sum + (report.totalMinutes % 60), 0);
  const totalWorkers = reports.length;
  const totalViolations = reports.reduce((sum, report) => sum + report.violations, 0);
  const totalShifts = reports.reduce((sum, report) => sum + report.shiftsCount, 0);
  
  const averageHoursPerWorker = totalWorkers > 0 ? totalHours / totalWorkers : 0;
  const violationRate = totalShifts > 0 ? (totalViolations / totalShifts) * 100 : 0;

  // Group by site
  const siteStats = reports.reduce((acc, report) => {
    if (!acc[report.siteName]) {
      acc[report.siteName] = {
        workers: 0,
        totalHours: 0,
        violations: 0,
        shifts: 0
      };
    }
    acc[report.siteName].workers += 1;
    acc[report.siteName].totalHours += report.totalHours;
    acc[report.siteName].violations += report.violations;
    acc[report.siteName].shifts += report.shiftsCount;
    return acc;
  }, {} as Record<string, {
    workers: number;
    totalHours: number;
    violations: number;
    shifts: number;
  }>);

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalMinutes: totalMinutes,
    totalWorkers,
    totalViolations,
    totalShifts,
    averageHoursPerWorker: Math.round(averageHoursPerWorker * 100) / 100,
    violationRate: Math.round(violationRate * 100) / 100,
    siteStats
  };
};

// Mobile-friendly sharing (for React Native platforms)
export const shareReport = async (reports: WorkReport[], period: string): Promise<void> => {
  try {
    // This would require react-native-share package
    const summary = generateReportSummary(reports);
    const message = `
Work Time Report - ${period}

Summary:
- Total Workers: ${summary.totalWorkers}
- Total Hours: ${summary.totalHours}h
- Total Violations: ${summary.totalViolations}
- Average Hours per Worker: ${summary.averageHoursPerWorker}h

Generated on: ${new Date().toLocaleString()}
    `;

    // For now, just copy to clipboard (would need Clipboard API)
    console.log('Report summary:', message);
    return Promise.resolve();
  } catch (error) {
    console.error('Error sharing report:', error);
    throw error;
  }
}; 