import { describe, it, expect } from 'vitest';
import { parseQuickCapture } from '@/lib/api';

describe('API Library', () => {
  describe('parseQuickCapture', () => {
    it('should parse simple task title', () => {
      const result = parseQuickCapture('Buy milk');
      expect(result).toEqual({
        title: 'Buy milk',
        priority: 'medium',
        priority_score: 50,
        estimated_duration: undefined,
        effort_score: undefined,
        value_score: 50,
        status: 'backlog',
      });
    });

    it('should parse high priority', () => {
      const result = parseQuickCapture('Buy milk !high');
      expect(result.priority).toBe('high');
      expect(result.priority_score).toBeGreaterThan(60);
      expect(result.title).toBe('Buy milk');
    });

    it('should parse low priority', () => {
      const result = parseQuickCapture('Chill !low');
      expect(result.priority).toBe('low');
      expect(result.title).toBe('Chill');
    });

    it('should parse duration in minutes (m)', () => {
      const result = parseQuickCapture('Meeting 30m');
      expect(result.estimated_duration).toBe(30);
      expect(result.effort_score).toBe(30);
      expect(result.title).toBe('Meeting');
    });

    it('should parse duration in hours (h)', () => {
      const result = parseQuickCapture('Deep work 2h');
      expect(result.estimated_duration).toBe(120);
      expect(result.effort_score).toBe(120);
      expect(result.title).toBe('Deep work');
    });

    it('should parse duration with explicit e: prefix', () => {
      const result = parseQuickCapture('Task e:45m');
      expect(result.estimated_duration).toBe(45);
      expect(result.effort_score).toBe(45);
      expect(result.title).toBe('Task');
    });

    it('should parse value score (v:)', () => {
      const result = parseQuickCapture('Big project v:90');
      expect(result.value_score).toBe(90);
      expect(result.title).toBe('Big project');
    });

    it('should clamp value score between 1 and 100', () => {
      const result = parseQuickCapture('Overload v:999');
      expect(result.value_score).toBe(100);

      const resultLow = parseQuickCapture('Low v:0');
      expect(resultLow.value_score).toBe(1);
    });

    it('should parse all metadata together', () => {
      const result = parseQuickCapture('Complex task v:80 e:1.5h !high');
      expect(result.title).toBe('Complex task');
      expect(result.value_score).toBe(80);
      expect(result.estimated_duration).toBe(90); // 1.5 * 60
      expect(result.effort_score).toBe(90);
      expect(result.priority).toBe('high');
    });

    it('should be case insensitive', () => {
      const result = parseQuickCapture('TASK V:50 E:20M !HIGH');
      expect(result.title).toBe('TASK');
      expect(result.value_score).toBe(50);
      expect(result.estimated_duration).toBe(20);
      expect(result.effort_score).toBe(20);
      expect(result.priority).toBe('high');
    });
  });
});
