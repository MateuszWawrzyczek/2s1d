import { Outlet, Link } from 'react-router';

export const Layout = () => {
  return (
    <div>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '15px' }}>
          Main page
        </Link>
        <Link to="/about" style={{ marginRight: '15px' }}>
          About
        </Link>
        <Link to="/statuses" style={{ marginRight: '15px' }}>
          Statuses page
        </Link>
        <Link to="/contact">Non-existent page</Link>
      </nav>

      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>

      <footer style={{ marginTop: '50px', fontSize: '12px' }}>2026</footer>
    </div>
  );
};
