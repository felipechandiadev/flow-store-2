import { withAuth } from 'next-auth/middleware';
export default withAuth({
  pages: { signIn: '/' },
});
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ui-components/:path*',
    '/sales/:path*',
    '/purchasing/:path*',
    '/inventory/:path*',
    '/accounting/:path*',
    '/treasury/:path*',
    '/hr/:path*',
    '/settings/:path*',
  ],
};