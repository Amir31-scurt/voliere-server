import { supabase } from '../config/supabase.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

// ── POST /api/auth/register ──────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { email, password, nom } = req.body;

  // Vérifier si l'email existe déjà
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return res.status(409).json({ message: 'Cet email est déjà utilisé' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password: hashedPassword, nom })
    .select('id, email, nom, created_at')
    .single();

  if (error) throw error;

  const token = generateToken({ id: user.id, email: user.email });

  res.status(201).json({ token, user });
});

// ── POST /api/auth/login ─────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, nom, password')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }

  const token = generateToken({ id: user.id, email: user.email });
  const { password: _, ...safeUser } = user; // exclure le mot de passe de la réponse

  res.json({ token, user: safeUser });
});

// ── GET /api/auth/me ─────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, nom, created_at')
    .eq('id', req.user.id)
    .single();

  if (error || !user) {
    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  }

  res.json(user);
});
