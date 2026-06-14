import { NextResponse } from 'next/server';

const ADMIN_COOKIE = 'diy-admin';
const ADMIN_API = process.env.NEXT_PUBLIC_VENDURE_ADMIN_API?.startsWith('http')
  ? process.env.NEXT_PUBLIC_VENDURE_ADMIN_API
  : process.env.INTERNAL_VENDURE_ADMIN_API ?? 'http://localhost:13001/admin-api';

const ADMIN_LOGIN = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password, rememberMe: true) {
      ... on CurrentUser { id identifier }
      ... on InvalidCredentialsError { message }
      ... on NativeAuthStrategyError { message }
    }
  }
`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body?.username?.trim();
  const password = body?.password;
  if (!username || !password) {
    return NextResponse.json({ success: false, message: 'Admin credentials required' }, { status: 401 });
  }

  try {
    const vendureResponse = await fetch(ADMIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': 'mn' },
      credentials: 'include',
      body: JSON.stringify({ query: ADMIN_LOGIN, variables: { username, password } }),
    });
    if (!vendureResponse.ok) {
      return NextResponse.json({ success: false, message: 'Admin login failed' }, { status: 401 });
    }
    const json = await vendureResponse.json() as {
      data?: { login?: { id?: string; message?: string } };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length || !json.data?.login?.id) {
      return NextResponse.json({ success: false, message: json.data?.login?.message ?? json.errors?.[0]?.message ?? 'Admin login failed' }, { status: 401 });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'development' || !['admin', 'superadmin'].includes(username.toLowerCase())) {
      return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Admin login failed' }, { status: 401 });
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '1', {
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
