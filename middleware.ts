import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cities/:path*",
    "/locations/:path*",
    "/map/:path*",
    "/profile/:path*",
    "/achievements/:path*",
    "/stats/:path*",
  ],
};
