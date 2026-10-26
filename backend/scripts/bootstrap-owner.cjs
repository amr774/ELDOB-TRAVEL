'use strict';

// Local-only, first-owner bootstrap. Never accept passwords as command arguments.
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const email = process.argv[2];
const checkOnly = process.argv[3] === '--check';
const api = 'http://127.0.0.1:3000';
let prisma;
let created = false;

function stop(message) {
  const error = new Error(message);
  error.safe = true;
  throw error;
}

async function checkEligibility(db) {
  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing)
    stop(
      'Email already exists. No changes made. Explicit confirmation is required before any role change.',
    );
  if (await db.user.count({ where: { role: 'OWNER' } })) {
    stop('An OWNER already exists. First-owner bootstrap is disabled.');
  }
}

async function request(route, options = {}) {
  return fetch(`${api}${route}`, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
}

async function main() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    stop('A valid email argument is required.');
  const url = new URL(process.env.DATABASE_URL);
  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/eldob_travel' ||
    (url.port && url.port !== '5432') ||
    url.searchParams.has('host')
  )
    stop(
      'Refusing to run: only the local database eldob_travel on port 5432 is allowed.',
    );
  prisma = new PrismaClient({ log: [] });
  await prisma.$connect();
  const identity =
    await prisma.$queryRaw`SELECT current_database() AS name, inet_server_addr()::text AS address`;
  if (
    identity[0]?.name !== 'eldob_travel' ||
    !['127.0.0.1', '::1'].includes(identity[0]?.address?.split('/')[0])
  ) {
    stop('Database server identity is not the expected local database.');
  }
  // Check the live User table and role enum, not just the generated client.
  const columns =
    await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User'`;
  if (
    !['id', 'email', 'password', 'role', 'fullName'].every((name) =>
      columns.some((c) => c.column_name === name),
    )
  ) {
    stop('User schema does not match the expected Prisma schema.');
  }
  const roles =
    await prisma.$queryRaw`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'Role'`;
  if (!roles.some((r) => r.enumlabel === 'OWNER'))
    stop('OWNER role is missing from the database schema.');
  await checkEligibility(prisma);
  if (!(await request('/health')).ok) stop('Backend health check failed.');
  if ((await request('/dashboard')).status !== 401)
    stop('Unauthenticated dashboard protection check failed.');
  console.log(
    'Verified local PostgreSQL, User schema, OWNER eligibility, backend health, and dashboard authentication guard.',
  );
  if (checkOnly) return;
  if (process.stdin.isTTY)
    stop('Use bootstrap-owner.ps1 for secure password entry.');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 4096) stop('Password input is too large.');
  }
  let credentials;
  try {
    credentials = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch {
    stop('Invalid secure input. Run the PowerShell launcher.');
  }
  input = '';
  let password = credentials.password;
  credentials.password = null;
  if (
    typeof password !== 'string' ||
    password.length < 14 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    stop(
      'Use a unique password of at least 14 characters and at most 72 UTF-8 bytes.',
    );
  }
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    // Serializes this bootstrap script; table lock also prevents concurrent user creation/promotion.
    await tx.$executeRaw`LOCK TABLE "User" IN SHARE ROW EXCLUSIVE MODE`;
    await checkEligibility(tx);
    return tx.user.create({
      data: {
        email,
        password: hash,
        fullName: 'ELDOB TRAVEL Owner',
        role: 'OWNER',
      },
      select: { id: true, email: true, role: true },
    });
  });
  created = true;
  console.log(`Created and verified OWNER: ${user.email}`);
  let refreshToken;
  try {
    const response = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    password = null;
    if (!response.ok)
      stop(
        'Account created, but login verification failed. Do not rerun bootstrap.',
      );
    const session = await response.json();
    refreshToken = session.refreshToken;
    if (
      session.user?.id !== user.id ||
      session.user?.role !== 'OWNER' ||
      !session.accessToken ||
      !refreshToken
    ) {
      stop('Account created, but authentication identity verification failed.');
    }
    const dashboard = await request('/dashboard', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    session.accessToken = null;
    session.refreshToken = null;
    if (dashboard.status !== 200)
      stop('Account created, but OWNER dashboard authorization failed.');
    await dashboard.body?.cancel();
    console.log(
      'PASS: password login and OWNER dashboard authorization (HTTP 200).',
    );
  } finally {
    password = null;
    if (refreshToken) {
      // Revoke only the refresh token issued by this verification, including on HTTP failure.
      const { createHash } = require('node:crypto');
      await prisma.refreshToken.updateMany({
        where: {
          userId: user.id,
          token: createHash('sha256').update(refreshToken).digest('hex'),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      refreshToken = null;
      console.log(
        'Verification refresh token revoked. No passwords or tokens were saved to files.',
      );
    }
  }
  console.log('Login: http://127.0.0.1:5173/login');
  console.log('Owner dashboard: http://127.0.0.1:5173/owner');
}

main()
  .catch((error) => {
    // Never print raw database/HTTP errors: they can contain credentials or request data.
    console.error(
      error.safe
        ? error.message
        : `Bootstrap failed safely.${created ? ' Account was already created; do not rerun.' : ''} No sensitive error details printed.`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
