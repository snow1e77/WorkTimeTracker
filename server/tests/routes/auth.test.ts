import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import { describe, it, expect } from '@jest/globals';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  
  describe('POST /api/auth/login', () => {
    it('должен требовать номер телефона', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number is required');
    });

    it('должен валидировать формат номера телефона', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('international format');
    });
  });

  describe('POST /api/auth/register', () => {
    it('должен требовать номер телефона и имя', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('должен валидировать длину имени', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          phoneNumber: '+1234567890',
          name: 'A' // слишком короткое имя
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 2 characters');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('должен требовать refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('должен требовать refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request body is required');
    });
  });
}); 