// Gives every admin screen (sign-in, loading, dashboard) the same wine
// backdrop as the rest of the site's inner pages.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="theme-wine w-full">{children}</div>;
}
