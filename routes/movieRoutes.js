const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  toggleFavorite,
  updateRating,
} = require('../controllers/movieController');

const router = express.Router();

// TODAS las rutas de películas están protegidas
// El middleware de autenticación se ejecuta ANTES de cualquier controlador
router.use(authMiddleware);

// Rutas CRUD protegidas:
router.get('/', getAllMovies);           // GET /api/movies - Listar mis películas
router.get('/:id', getMovieById);        // GET /api/movies/:id - Ver una película
router.post('/', createMovie);           // POST /api/movies - Crear película
router.put('/:id', updateMovie);         // PUT /api/movies/:id - Actualizar película
router.delete('/:id', deleteMovie);      // DELETE /api/movies/:id - Eliminar película
router.patch('/:id/favorite', toggleFavorite); // PATCH /api/movies/:id/favorite - Alternar favorito
router.patch('/:id/rating', updateRating);     // PATCH /api/movies/:id/rating - Actualizar valoración de la película

module.exports = router;
