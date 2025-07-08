import { query } from '../config/database';
import { WorkReport, ExcelExportRequest } from '../types';
import { ReportService } from './ReportService';

interface ExcelWorkbook {
  sheets: ExcelSheet[];
  metadata: {
    title: string;
    author: string;
    created: Date;
    description: string;
  };
}

interface ExcelSheet {
  name: string;
  headers: string[];
  data: any[][];
  chartData?: {
    type: 'pie' | 'bar' | 'line';
    title: string;
    data: { label: string; value: number }[];
  };
  summaryData?: {
    title: string;
    items: { label: string; value: string | number }[];
  };
}

export class ExcelExportService {
  // Главный метод экспорта
  static async exportToExcel(
    request: ExcelExportRequest,
    exportedBy: string
  ): Promise<{
    success: boolean;
    data?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const workbook = await this.generateWorkbook(request, exportedBy);

      if (request.format === 'xlsx') {
        return {
          success: true,
          data: JSON.stringify(workbook),
          filename: this.generateFilename(request),
        };
      } else {
        const csvData = this.convertWorkbookToCSV(workbook);
        return {
          success: true,
          data: csvData,
          filename: this.generateFilename(request, 'csv'),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  // Генерация рабочей книги Excel
  private static async generateWorkbook(
    request: ExcelExportRequest,
    exportedBy: string
  ): Promise<ExcelWorkbook> {
    const sheets: ExcelSheet[] = [];

    switch (request.type) {
      case 'work':
        sheets.push(await this.generateWorkReportSheet(request));
        break;
      case 'violations':
        sheets.push(await this.generateViolationsSheet(request));
        break;
      case 'statistics':
        sheets.push(await this.generateStatisticsSheet(request));
        break;
      case 'users':
        sheets.push(await this.generateUsersSheet(request));
        break;
      case 'detailed':
        sheets.push(
          await this.generateWorkReportSheet(request),
          await this.generateViolationsSheet(request),
          await this.generateStatisticsSheet(request),
          await this.generateUsersSheet(request)
        );
        break;
    }

    return {
      sheets,
      metadata: {
        title: `WorkTime Tracker - ${this.getReportTitle(request.type)}`,
        author: exportedBy,
        created: new Date(),
        description: `Экспорт данных ${this.getDateRangeString(request.startDate, request.endDate)}`,
      },
    };
  }

  // Генерация листа с рабочими отчетами
  private static async generateWorkReportSheet(
    request: ExcelExportRequest
  ): Promise<ExcelSheet> {
    const reports = await ReportService.getWorkReports({
      startDate: request.startDate,
      endDate: request.endDate,
      userId: request.userId,
      siteId: request.siteId,
      groupBy: 'user',
    });

    const headers = [
      'Сотрудник',
      'Телефон',
      'Объект',
      'Количество смен',
      'Общее время (часы)',
      'Нарушения',
      'Последняя смена',
      'Средняя продолжительность смены',
      'Эффективность (%)',
    ];

    const data = reports.map((report) => [
      report.userName || 'Неизвестно',
      report.userPhone || '',
      report.siteName || 'Общий отчет',
      report.shiftsCount,
      Number(report.totalHours.toFixed(2)),
      report.violationsCount,
      report.lastShiftDate
        ? new Date(report.lastShiftDate).toLocaleDateString('ru-RU')
        : '',
      report.shiftsCount > 0
        ? Number((report.totalHours / report.shiftsCount).toFixed(2))
        : 0,
      this.calculateEfficiencyPercentage(
        report.totalHours,
        report.shiftsCount,
        report.violationsCount
      ),
    ]);

    // Данные для графика
    const chartData = request.includeCharts
      ? {
          type: 'bar' as const,
          title: 'Распределение рабочего времени по сотрудникам',
          data: reports.slice(0, 10).map((report) => ({
            label: report.userName || 'Неизвестно',
            value: Number(report.totalHours.toFixed(1)),
          })),
        }
      : undefined;

    // Сводные данные
    const summaryData = request.includeSummary
      ? {
          title: 'Сводка по рабочему времени',
          items: [
            { label: 'Всего сотрудников', value: reports.length },
            {
              label: 'Общее время работы (часы)',
              value: Number(
                reports.reduce((sum, r) => sum + r.totalHours, 0).toFixed(2)
              ),
            },
            {
              label: 'Всего смен',
              value: reports.reduce((sum, r) => sum + r.shiftsCount, 0),
            },
            {
              label: 'Всего нарушений',
              value: reports.reduce((sum, r) => sum + r.violationsCount, 0),
            },
            {
              label: 'Среднее время на сотрудника (часы)',
              value:
                reports.length > 0
                  ? Number(
                      (
                        reports.reduce((sum, r) => sum + r.totalHours, 0) /
                        reports.length
                      ).toFixed(2)
                    )
                  : 0,
            },
            {
              label: 'Процент нарушений',
              value: this.calculateViolationPercentage(reports),
            },
          ],
        }
      : undefined;

    return {
      name: 'Рабочие отчеты',
      headers,
      data,
      chartData,
      summaryData,
    };
  }

  // Генерация листа с нарушениями
  private static async generateViolationsSheet(
    request: ExcelExportRequest
  ): Promise<ExcelSheet> {
    const violationsData = await ReportService.getViolationsReport({
      startDate: request.startDate,
      endDate: request.endDate,
      userId: request.userId,
      siteId: request.siteId,
    });

    // Получаем детальную информацию о нарушениях
    const detailedViolations = await this.getDetailedViolations(request);

    const headers = [
      'Дата',
      'Сотрудник',
      'Объект',
      'Тип нарушения',
      'Описание',
      'Серьезность',
      'Статус',
      'Решено',
      'Кем решено',
      'Время создания',
    ];

    const data = detailedViolations.map((violation: any) => [
      new Date(violation.createdAt).toLocaleDateString('ru-RU'),
      violation.userName || 'Неизвестно',
      violation.siteName || 'Неизвестно',
      this.translateViolationType(violation.type),
      this.translateSeverity(violation.severity),
      violation.description || '',
      violation.resolvedAt ? 'Решено' : 'Активно',
    ]);

    // График распределения нарушений по типам
    const chartData = request.includeCharts
      ? {
          type: 'pie' as const,
          title: 'Распределение нарушений по типам',
          data: Object.entries(violationsData.byType).map(([type, count]) => ({
            label: this.translateViolationType(type),
            value: count,
          })),
        }
      : undefined;

    // Сводка по нарушениям
    const summaryData = request.includeSummary
      ? {
          title: 'Сводка по нарушениям',
          items: [
            { label: 'Всего нарушений', value: violationsData.total },
            { label: 'Решено', value: violationsData.resolved },
            { label: 'Ожидает решения', value: violationsData.unresolved },
            {
              label: 'Низкая серьезность',
              value: violationsData.bySeverity.low,
            },
            {
              label: 'Средняя серьезность',
              value: violationsData.bySeverity.medium,
            },
            {
              label: 'Высокая серьезность',
              value: violationsData.bySeverity.high,
            },
            {
              label: 'Процент решенных',
              value:
                violationsData.total > 0
                  ? Number(
                      (
                        (violationsData.resolved / violationsData.total) *
                        100
                      ).toFixed(1)
                    )
                  : 0,
            },
          ],
        }
      : undefined;

    return {
      name: 'Нарушения',
      headers,
      data,
      chartData,
      summaryData,
    };
  }

  // Генерация листа со статистикой
  private static async generateStatisticsSheet(
    request: ExcelExportRequest
  ): Promise<ExcelSheet> {
    const stats = await ReportService.getSystemStatistics({
      startDate: request.startDate,
      endDate: request.endDate,
    });

    const headers = ['Категория', 'Метрика', 'Значение', 'Процент от общего'];

    const data = [
      ['Пользователи', 'Всего пользователей', stats.users.total, '100%'],
      [
        'Пользователи',
        'Активные пользователи',
        stats.users.active,
        `${((stats.users.active / stats.users.total) * 100).toFixed(1)}%`,
      ],
      [
        'Пользователи',
        'Рабочие',
        stats.users.workers,
        `${((stats.users.workers / stats.users.total) * 100).toFixed(1)}%`,
      ],
      [
        'Пользователи',
        'Администраторы',
        stats.users.admins,
        `${((stats.users.admins / stats.users.total) * 100).toFixed(1)}%`,
      ],
      ['Объекты', 'Всего объектов', stats.sites.total, '100%'],
      [
        'Объекты',
        'Активные объекты',
        stats.sites.active,
        `${stats.sites.total > 0 ? ((stats.sites.active / stats.sites.total) * 100).toFixed(1) : 0}%`,
      ],
      ['Смены', 'Всего смен', stats.shifts.total, '100%'],
      [
        'Смены',
        'Активные смены',
        stats.shifts.active,
        `${stats.shifts.total > 0 ? ((stats.shifts.active / stats.shifts.total) * 100).toFixed(1) : 0}%`,
      ],
      [
        'Смены',
        'Завершенные смены',
        stats.shifts.completed,
        `${stats.shifts.total > 0 ? ((stats.shifts.completed / stats.shifts.total) * 100).toFixed(1) : 0}%`,
      ],
      [
        'Смены',
        'Общее время (часы)',
        Number(stats.shifts.totalHours.toFixed(2)),
        '',
      ],
      ['Нарушения', 'Всего нарушений', stats.violations.total, '100%'],
      [
        'Нарушения',
        'Решенные нарушения',
        stats.violations.resolved,
        `${stats.violations.total > 0 ? ((stats.violations.resolved / stats.violations.total) * 100).toFixed(1) : 0}%`,
      ],
      [
        'Нарушения',
        'Нерешенные нарушения',
        stats.violations.unresolved,
        `${stats.violations.total > 0 ? ((stats.violations.unresolved / stats.violations.total) * 100).toFixed(1) : 0}%`,
      ],
    ];

    const summaryData = request.includeSummary
      ? {
          title: 'Ключевые показатели',
          items: [
            {
              label: 'Общая эффективность системы',
              value: `${this.calculateSystemEfficiency(stats)}%`,
            },
            {
              label: 'Среднее время смены (часы)',
              value:
                stats.shifts.completed > 0
                  ? Number(
                      (
                        stats.shifts.totalHours / stats.shifts.completed
                      ).toFixed(2)
                    )
                  : 0,
            },
            {
              label: 'Пользователей на объект',
              value:
                stats.sites.active > 0
                  ? Number((stats.users.active / stats.sites.active).toFixed(1))
                  : 0,
            },
            {
              label: 'Смен на пользователя',
              value:
                stats.users.workers > 0
                  ? Number(
                      (stats.shifts.total / stats.users.workers).toFixed(1)
                    )
                  : 0,
            },
          ],
        }
      : undefined;

    return {
      name: 'Общая статистика',
      headers,
      data,
      summaryData,
    };
  }

  // Генерация листа с пользователями
  private static async generateUsersSheet(
    _request: ExcelExportRequest
  ): Promise<ExcelSheet> {
    const usersResult = await query(
      `SELECT 
         u.id, u.name, u.phone_number, u.role, u.company_name,
         u.is_active, u.is_verified, u.created_at,
         al.max_users, al.max_sites, al.max_projects,
         al.can_export_excel, al.can_manage_users,
         COUNT(ws.id) as total_shifts,
         COALESCE(SUM(ws.total_hours), 0) as total_hours,
         COUNT(v.id) as violations_count
       FROM users u
       LEFT JOIN admin_limits al ON u.admin_limit_id = al.id
       LEFT JOIN work_shifts ws ON u.id = ws.user_id AND ws.end_time IS NOT NULL
       LEFT JOIN violations v ON u.id = v.user_id
       WHERE u.is_active = true
       GROUP BY u.id, al.id
       ORDER BY u.name`,
      []
    );

    const headers = [
      'Имя',
      'Телефон',
      'Роль',
      'Компания',
      'Статус',
      'Подтвержден',
      'Дата регистрации',
      'Всего смен',
      'Общее время (часы)',
      'Нарушения',
      'Лимит пользователей',
      'Лимит объектов',
      'Может экспортировать',
    ];

    const data = usersResult.rows.map((user: any) => [
      user.name,
      user.phone_number,
      user.role === 'admin' ? 'Администратор' : 'Рабочий',
      user.company_name || 'Не указана',
      user.is_verified ? 'Да' : 'Нет',
      user.is_active ? 'Активен' : 'Неактивен',
      new Date(user.created_at).toLocaleDateString('ru-RU'),
      user.total_shifts || 0,
      user.total_hours ? Number(user.total_hours).toFixed(1) : '0',
      user.violations_count || 0,
    ]);

    const summaryData =
      usersResult.rows.length > 0
        ? {
            title: 'Сводка по пользователям',
            items: [
              {
                label: 'Всего активных пользователей',
                value: usersResult.rows.length,
              },
              {
                label: 'Администраторы',
                value: usersResult.rows.filter((u: any) => u.role === 'admin')
                  .length,
              },
              {
                label: 'Рабочие',
                value: usersResult.rows.filter((u: any) => u.role === 'worker')
                  .length,
              },
              {
                label: 'Подтвержденные аккаунты',
                value: usersResult.rows.filter((u: any) => u.is_verified)
                  .length,
              },
              {
                label: 'Средние смены на пользователя',
                value:
                  usersResult.rows.length > 0
                    ? Number(
                        (
                          usersResult.rows.reduce(
                            (sum: number, u: any) =>
                              sum + Number(u.total_shifts || 0),
                            0
                          ) / usersResult.rows.length
                        ).toFixed(1)
                      )
                    : 0,
              },
            ],
          }
        : undefined;

    return {
      name: 'Пользователи',
      headers,
      data,
      summaryData,
    };
  }

  // Получение детальной информации о нарушениях
  private static async getDetailedViolations(request: ExcelExportRequest) {
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (request.startDate) {
      whereConditions.push(`v.created_at >= $${paramIndex++}`);
      queryParams.push(request.startDate);
    }

    if (request.endDate) {
      whereConditions.push(`v.created_at <= $${paramIndex++}`);
      queryParams.push(request.endDate);
    }

    if (request.userId) {
      whereConditions.push(`v.user_id = $${paramIndex++}`);
      queryParams.push(request.userId);
    }

    if (request.siteId) {
      whereConditions.push(`v.site_id = $${paramIndex++}`);
      queryParams.push(request.siteId);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const result = await query(
      `SELECT 
         v.*,
         u.name as userName,
         cs.name as siteName,
         resolver.name as resolvedByName
       FROM violations v
       LEFT JOIN users u ON v.user_id = u.id
       LEFT JOIN construction_sites cs ON v.site_id = cs.id
       LEFT JOIN users resolver ON v.resolved_by = resolver.id
       ${whereClause}
       ORDER BY v.created_at DESC`,
      queryParams
    );

    return result.rows;
  }

  // Конвертация рабочей книги в CSV
  private static convertWorkbookToCSV(workbook: ExcelWorkbook): string {
    let csvContent = '';

    for (const sheet of workbook.sheets) {
      csvContent += `\n=== ${sheet.name} ===\n`;

      // Добавляем сводку если есть
      if (sheet.summaryData) {
        csvContent += `\n${sheet.summaryData.title}\n`;
        for (const item of sheet.summaryData.items) {
          csvContent += `${item.label},${item.value}\n`;
        }
        csvContent += '\n';
      }

      // Добавляем заголовки
      csvContent += sheet.headers.join(',') + '\n';

      // Добавляем данные
      for (const row of sheet.data) {
        csvContent +=
          row
            .map((cell) =>
              typeof cell === 'string' &&
              (cell.includes(',') || cell.includes('"'))
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(',') + '\n';
      }

      csvContent += '\n';
    }

    return csvContent;
  }

  // Генерация имени файла
  private static generateFilename(
    request: ExcelExportRequest,
    extension?: string
  ): string {
    const ext = extension || (request.format === 'csv' ? 'csv' : 'xlsx');
    const type = request.type;
    const date = new Date().toISOString().split('T')[0];
    const timeString = new Date().toTimeString().split(' ')[0];
    const time = timeString ? timeString.replace(/:/g, '-') : '00-00-00';

    return `worktime_${type}_${date}_${time}.${ext}`;
  }

  // Получение заголовка отчета
  private static getReportTitle(type: string): string {
    const titles = {
      work: 'Рабочие отчеты',
      violations: 'Отчет по нарушениям',
      statistics: 'Общая статистика',
      users: 'Отчет по пользователям',
      detailed: 'Детальный отчет',
    };
    return titles[type as keyof typeof titles] || 'Отчет';
  }

  // Формирование строки диапазона дат
  private static getDateRangeString(startDate?: Date, endDate?: Date): string {
    if (!startDate && !endDate) return 'за все время';
    if (startDate && !endDate)
      return `с ${startDate.toLocaleDateString('ru-RU')}`;
    if (!startDate && endDate)
      return `до ${endDate.toLocaleDateString('ru-RU')}`;
    return `с ${startDate!.toLocaleDateString('ru-RU')} по ${endDate!.toLocaleDateString('ru-RU')}`;
  }

  // Расчет эффективности сотрудника
  private static calculateEfficiencyPercentage(
    totalHours: number,
    shiftsCount: number,
    violationsCount: number
  ): number {
    if (shiftsCount === 0) return 0;

    const averageShiftHours = totalHours / shiftsCount;
    const idealShiftHours = 8; // Предполагаем 8-часовой рабочий день

    const hoursEfficiency = Math.min(
      (averageShiftHours / idealShiftHours) * 100,
      100
    );
    const violationPenalty = Math.min(violationsCount * 5, 50); // Максимум 50% штрафа

    return Math.max(hoursEfficiency - violationPenalty, 0);
  }

  // Расчет процента нарушений
  private static calculateViolationPercentage(reports: WorkReport[]): number {
    const totalShifts = reports.reduce((sum, r) => sum + r.shiftsCount, 0);
    const totalViolations = reports.reduce(
      (sum, r) => sum + r.violationsCount,
      0
    );

    return totalShifts > 0
      ? Number(((totalViolations / totalShifts) * 100).toFixed(1))
      : 0;
  }

  // Расчет общей эффективности системы
  private static calculateSystemEfficiency(stats: any): number {
    const userEfficiency =
      stats.users.total > 0
        ? (stats.users.active / stats.users.total) * 100
        : 0;
    const siteEfficiency =
      stats.sites.total > 0
        ? (stats.sites.active / stats.sites.total) * 100
        : 0;
    const shiftCompletionRate =
      stats.shifts.total > 0
        ? (stats.shifts.completed / stats.shifts.total) * 100
        : 0;
    const violationRate =
      stats.violations.total > 0
        ? (stats.violations.resolved / stats.violations.total) * 100
        : 100;

    return Number(
      (
        (userEfficiency +
          siteEfficiency +
          shiftCompletionRate +
          violationRate) /
        4
      ).toFixed(1)
    );
  }

  // Перевод типов нарушений
  private static translateViolationType(type: string): string {
    const translations = {
      late_start: 'Опоздание на работу',
      early_end: 'Ранний уход',
      location_violation: 'Нарушение местоположения',
      no_checkout: 'Не зафиксирован конец смены',
      other: 'Другое',
    };
    return translations[type as keyof typeof translations] || type;
  }

  // Перевод уровней серьезности
  private static translateSeverity(severity: string): string {
    const translations = {
      low: 'Низкая',
      medium: 'Средняя',
      high: 'Высокая',
    };
    return translations[severity as keyof typeof translations] || severity;
  }
}
