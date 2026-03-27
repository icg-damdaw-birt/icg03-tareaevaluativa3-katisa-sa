/**
 * TESTS DE RATING (Valoración)
 * 
 * Este archivo contiene tests para la funcionalidad de actualizar la valoración.
 * Usamos MOCKS de Prisma para no tocar la base de datos real durante los tests.
 * También mockeamos el middleware de autenticación.
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================

// Mock del módulo prisma ANTES de importar el servidor
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

// Mock del middleware de autenticación
jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: API DE RATING
// ============================================
describe('API de Rating', () => {
  // Limpiar todos los mocks después de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TESTS DE ACTUALIZAR RATING (PATCH /api/movies/:id/rating)
  // ==========================================
  describe('PATCH /api/movies/:id/rating', () => {
    
    // 1. Camino feliz: Actualizar el rating correctamente
    it('debería actualizar el rating correctamente (camino feliz)', async () => {
      // Configuramos los mocks para que encuentren una película y devuelvan la película con rating 4
      const peliculaExistente = { id: 'movie-1', ownerId: 'user-123', rating: 0 };
      const peliculaActualizada = { ...peliculaExistente, rating: 4 };

      prisma.movie.findFirst.mockResolvedValue(peliculaExistente);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // Enviamos la petición
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 4 });

      // Verificamos estatus y datos
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      
      // Verificamos que se han llamado los métodos de base de datos correctos
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 4 },
      });
    });

    // 2. Errores de validación: Rating mayor que 5
    it('debería devolver 400 si el rating es mayor que 5', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('La valoración debe ser un número entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    // 3. Errores de validación: Rating menor que 0
    it('debería devolver 400 si el rating es menor que 0', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('La valoración debe ser un número entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    // 4. Errores de validación: Sin enviar body
    it('debería devolver 400 si no se proporciona rating', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('La valoración debe ser un número entero entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

  });
});
