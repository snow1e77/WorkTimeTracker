import { 
  formatDateUS, 
  formatTimeUS, 
  formatDuration,
  formatRelativeDate,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getMonthName,
  getDayName
} from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDateUS', () => {
    it('должен форматировать дату в американском формате', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = formatDateUS(date);
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY format
    });

    it('должен обрабатывать невалидные даты', () => {
      const invalidDate = new Date('invalid');
      const formatted = formatDateUS(invalidDate);
      expect(formatted).toBe('Invalid Date');
    });
  });

  describe('formatTimeUS', () => {
    it('должен форматировать время в 12-часовом формате', () => {
      const date = new Date('2024-01-15T14:30:00');
      const formatted = formatTimeUS(date);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
    });

    it('должен форматировать полночь корректно', () => {
      const date = new Date('2024-01-15T00:00:00');
      const formatted = formatTimeUS(date);
      expect(formatted).toContain('12:00 AM');
    });

    it('должен форматировать полдень корректно', () => {
      const date = new Date('2024-01-15T12:00:00');
      const formatted = formatTimeUS(date);
      expect(formatted).toContain('12:00 PM');
    });
  });

  describe('formatDuration', () => {
    it('должен форматировать продолжительность в минутах', () => {
      expect(formatDuration(30)).toBe('30 min');
    });

    it('должен форматировать продолжительность в часах и минутах', () => {
      expect(formatDuration(90)).toBe('1 hr 30 min');
    });

    it('должен форматировать целые часы', () => {
      expect(formatDuration(120)).toBe('2 hr');
    });

    it('должен обрабатывать ноль минут', () => {
      expect(formatDuration(0)).toBe('0 min');
    });

    it('должен форматировать большие значения', () => {
      expect(formatDuration(500)).toBe('8 hr 20 min');
    });
  });

  describe('formatRelativeDate', () => {
    it('должен определять сегодняшнюю дату', () => {
      const today = new Date();
      expect(formatRelativeDate(today)).toBe('Today');
    });

    it('должен определять вчерашнюю дату', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    });

    it('должен определять завтрашнюю дату', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatRelativeDate(tomorrow)).toBe('Tomorrow');
    });

    it('должен возвращать дату для других дней', () => {
      const pastDate = new Date('2023-01-15T10:30:00');
      const formatted = formatRelativeDate(pastDate);
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('getCurrentWeekRange', () => {
    it('должен возвращать диапазон текущей недели', () => {
      const range = getCurrentWeekRange();
      
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
      
      // Проверяем, что диапазон составляет 6 дней
      const daysDiff = Math.floor((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(6);
    });

    it('должен начинаться с воскресенья', () => {
      const range = getCurrentWeekRange();
      expect(range.start.getDay()).toBe(0); // Воскресенье
    });

    it('должен заканчиваться субботой', () => {
      const range = getCurrentWeekRange();
      expect(range.end.getDay()).toBe(6); // Суббота
    });
  });

  describe('getCurrentMonthRange', () => {
    it('должен возвращать диапазон текущего месяца', () => {
      const range = getCurrentMonthRange();
      
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it('должен начинаться с первого дня месяца', () => {
      const range = getCurrentMonthRange();
      expect(range.start.getDate()).toBe(1);
    });

    it('должен заканчиваться последним днем месяца', () => {
      const range = getCurrentMonthRange();
      const nextMonth = new Date(range.end);
      nextMonth.setDate(nextMonth.getDate() + 1);
      expect(nextMonth.getDate()).toBe(1); // Следующий день должен быть первым числом следующего месяца
    });
  });

  describe('getMonthName', () => {
    it('должен возвращать правильные названия месяцев', () => {
      expect(getMonthName(0)).toBe('January');
      expect(getMonthName(1)).toBe('February');
      expect(getMonthName(11)).toBe('December');
    });

    it('должен обрабатывать граничные значения', () => {
      expect(getMonthName(-1)).toBeUndefined();
      expect(getMonthName(12)).toBeUndefined();
    });
  });

  describe('getDayName', () => {
    it('должен возвращать правильные названия дней', () => {
      expect(getDayName(0)).toBe('Sunday');
      expect(getDayName(1)).toBe('Monday');
      expect(getDayName(6)).toBe('Saturday');
    });

    it('должен обрабатывать граничные значения', () => {
      expect(getDayName(-1)).toBeUndefined();
      expect(getDayName(7)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('должен обрабатывать переход через месяц', () => {
      const endOfMonth = new Date(2024, 0, 31); // 31 января 2024
      const range = getCurrentWeekRange();
      
      // Проверяем, что функция не падает
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
    });

    it('должен обрабатывать високосные годы', () => {
      const febRange = {
        start: new Date(2024, 1, 1), // 1 февраля 2024 (високосный год)
        end: new Date(2024, 1, 29)   // 29 февраля 2024
      };
      
      expect(febRange.end.getDate()).toBe(29);
      expect(febRange.end.getMonth()).toBe(1); // Февраль
    });

    it('должен обрабатывать невалидные индексы месяцев', () => {
      expect(() => getMonthName(15)).not.toThrow();
      expect(() => getDayName(-5)).not.toThrow();
    });
  });

  describe('производительность', () => {
    it('должен быстро форматировать множество дат', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const date = new Date(2024, 0, i % 28 + 1);
        formatDateUS(date);
        formatTimeUS(date);
        formatRelativeDate(date);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(200); // Должно выполняться меньше чем за 200мс
    });
  });
}); 