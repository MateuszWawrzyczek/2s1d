import { Hono } from 'hono';
import type { Connection } from 'mysql2/promise';
import { authMiddleware } from '../middleware/auth';
import { badRequest, notFound, serviceUnavailable } from '../lib/errors';

type Variables = {
  rawDb: Connection;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

interface StaffRow {
  id: number;
  imie: string;
  nazwisko: string;
  email: string;
  pokoj: string;
  tel: string;
  www: string;
  stopien_pl: string;
  stopien_en: string;
  grupa_pl: string;
  grupa_en: string;
  zespol_pl: string;
  zespol_en: string;
}

function staffResponse(r: StaffRow) {
  return {
    id: r.id,
    firstName: r.imie,
    lastName: r.nazwisko,
    email: r.email,
    room: r.pokoj,
    phone: r.tel,
    website: r.www,
    degree: { pl: r.stopien_pl, en: r.stopien_en },
    group: { pl: r.grupa_pl, en: r.grupa_en },
    team: { pl: r.zespol_pl, en: r.zespol_en },
  };
}

function validateNonNegativeInteger(
  value: string | undefined,
  fallback: number,
  name: string
): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0)
    badRequest(`${name} must be a non-negative integer`);
  return parsed;
}

function handleStaffQueryError(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_NO_SUCH_TABLE'
  ) {
    serviceUnavailable('Reference staff database is not configured');
  }
  throw error;
}

const STAFF_QUERY = `
  SELECT p.id, p.imie, p.nazwisko, p.email, p.pokoj, p.tel, p.www,
    s.pl AS stopien_pl, s.en AS stopien_en,
    g.pl AS grupa_pl, g.en AS grupa_en,
    z.pl AS zespol_pl, z.en AS zespol_en
  FROM pracownicy p
  LEFT JOIN stopnie s ON s.id = p.id_stopnia
  LEFT JOIN grupy g ON g.id = p.id_grupy
  LEFT JOIN zespoly z ON z.id = p.id_zespolu
  WHERE p.widocznosc = 'tak'
`;

// GET /api/v1/staff
router.get('/', async (c) => {
  const rawDb = c.get('rawDb');
  const search = c.req.query('search');
  const limit = Math.min(
    validateNonNegativeInteger(c.req.query('limit'), 100, 'limit'),
    500
  );
  const offset = validateNonNegativeInteger(c.req.query('offset'), 0, 'offset');

  let query = STAFF_QUERY;
  const params: Array<string | number> = [];

  if (search) {
    query += ` AND (p.imie LIKE ? OR p.nazwisko LIKE ? OR p.email LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY p.nazwisko ASC, p.imie ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  try {
    const [rows] = await rawDb.execute(query, params);
    return c.json((rows as StaffRow[]).map(staffResponse));
  } catch (error) {
    handleStaffQueryError(error);
  }
});

// GET /api/v1/staff/:id
router.get('/:id', async (c) => {
  const rawDb = c.get('rawDb');
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0)
    badRequest('id must be a positive integer');

  try {
    const [rows] = await rawDb.execute(`${STAFF_QUERY} AND p.id = ?`, [id]);
    const arr = rows as StaffRow[];
    if (arr.length === 0) notFound('Staff member not found');
    return c.json(staffResponse(arr[0]));
  } catch (error) {
    handleStaffQueryError(error);
  }
});

export { router as staffRouter };
