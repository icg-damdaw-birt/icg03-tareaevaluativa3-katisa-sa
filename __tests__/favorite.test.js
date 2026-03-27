/**
 * TESTS DE FAVORITOS
 * 
 * Este archivo contiene tests para la funcionalidad de marcar/desmarcar favoritos.
 * Usamos MOCKS de Prisma para no tocar la base de datos real durante los tests.
 * 
 * Todas las rutas de películas requieren autenticación, por lo que
 * también mockeamos el middleware de autenticación.
 * 
 * Herramientas:
 * - Jest: Framework de testing
 * - Supertest: Para hacer peticiones HTTP a la API
 * - Mocks: Impostores de Prisma y del middleware de auth
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================

// Mock del módulo prisma ANTES de importar el servidor
const mockPrisma = {
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

// Mock del middleware de autenticación
// Simula que el usuario está autenticado con userId 'user-123'
jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: API DE FAVORITOS
// ============================================
describe('Favoritos', () => {
  // Limpiar todos los mocks después de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TESTS DE ALTERNAR FAVORITO (PATCH /api/movies/:id/favorite)
  // ==========================================
  describe('PATCH /api/movies/:id/favorite', () => {
    
    it('debería marcar como favorita una película no favorita', async () => {
      // ARRANGE
      const peliculaNoFavorita = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        ownerId: 'user-123',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaMarcadaFavorita = {
        ...peliculaNoFavorita,
        isFavorite: true,
        updatedAt: new Date(),
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaNoFavorita);
      prisma.movie.update.mockResolvedValue(peliculaMarcadaFavorita);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
      expect(response.body.title).toBe('Inception');

      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });

      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { isFavorite: true },
      });
    });

    it('debería desmarcar una película favorita', async () => {
      // ARRANGE
      const peliculaFavorita = {
        id: 'movie-2',
        title: 'The Matrix',
        director: 'Wachowski Sisters',
        year: 1999,
        posterUrl: 'https://example.com/matrix.jpg',
        ownerId: 'user-123',
        isFavorite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaDesmarcada = {
        ...peliculaFavorita,
        isFavorite: false,
        updatedAt: new Date(),
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaFavorita);
      prisma.movie.update.mockResolvedValue(peliculaDesmarcada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-2/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(false);
      expect(response.body.title).toBe('The Matrix');

      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-2' },
        data: { isFavorite: false },
      });
    });

    it('debería devolver 404 si la película no existe', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/no-existe/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 404 si la película no pertenece al usuario', async () => {
      // ARRANGE
      // Simula que la película existe pero pertenece a otro usuario
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-otro-user/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');

      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-otro-user', ownerId: 'user-123' },
      });
    });

    it('debería devolver 500 si hay un error inesperado en findFirst', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockRejectedValue(new Error('Database connection error'));

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('No se pudo actualizar favorito');
    });

    it('debería devolver 500 si hay un error inesperado en update', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue({
        id: 'movie-1',
        isFavorite: false,
        ownerId: 'user-123',
      });

      prisma.movie.update.mockRejectedValue(new Error('Update failed'));

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('No se pudo actualizar favorito');
    });

    it('debería alternar múltiples veces correctamente', async () => {
      // ARRANGE - Primera llamada: marcar favorita
      const peliculaInicial = {
        id: 'movie-1',
        ownerId: 'user-123',
        isFavorite: false,
      };

      const peliculaFavorita = {
        ...peliculaInicial,
        isFavorite: true,
      };

      prisma.movie.findFirst.mockResolvedValue(peliculaInicial);
      prisma.movie.update.mockResolvedValue(peliculaFavorita);

      // ACT - Primera llamada
      const response1 = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT - Primera llamada
      expect(response1.status).toBe(200);
      expect(response1.body.isFavorite).toBe(true);

      // ARRANGE - Segunda llamada: desmarcar favorita
      jest.clearAllMocks();
      prisma.movie.findFirst.mockResolvedValue(peliculaFavorita);

      const peliculaNoFavoritaAhora = {
        ...peliculaFavorita,
        isFavorite: false,
      };

      prisma.movie.update.mockResolvedValue(peliculaNoFavoritaAhora);

      // ACT - Segunda llamada
      const response2 = await request(app)
        .patch('/api/movies/movie-1/favorite')
        .set('Authorization', 'Bearer fake-token');

      // ASSERT - Segunda llamada
      expect(response2.status).toBe(200);
      expect(response2.body.isFavorite).toBe(false);
    });
  });
});

/**
 * NOTAS PARA ESTUDIANTES:
 * 
 * 1. PATRÓN AAA (ARRANGE-ACT-ASSERT):
 *    - Arrange: Configuramos los mocks con los datos que esperamos
 *    - Act: Hacemos la petición HTTP
 *    - Assert: Verificamos respuesta y llamadas a Prisma
 * 
 * 2. ¿QUÉ ESTAMOS TESTEANDO?
 *    - PATCH /api/movies/:id/favorite: Alterna el estado de favorito
 *    
 *    Casos de éxito:
 *    - Marcar no favorita como favorita
 *    - Desmarcar favorita como no favorita
 *    - Alternar múltiples veces
 *    
 *    Casos de error:
 *    - Película no existe (findFirst retorna null)
 *    - Película pertenece a otro usuario (findFirst retorna null)
 *    - Error en base de datos
 * 
 * 3. SEGURIDAD:
 *    Fíjate cómo verificamos que Prisma se llama con:
 *    - findFirst: { id, ownerId } - Asegura que solo puedes alternar favorito en tus películas
 *    - update: { where: { id } } - Acceso directo (ya validamos propiedad antes)
 * 
 * 4. MOCKS:
 *    - mockResolvedValue: Simula un resultado exitoso
 *    - mockRejectedValue: Simula un error
 *    - jest.clearAllMocks: Limpia para cada test
 */
