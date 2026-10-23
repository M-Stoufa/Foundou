import { useHashRoute } from './lib/router';
import { MenuPage } from './components/MenuPage';
import { AdminApp } from './admin/AdminApp';

export function App() {
  const route = useHashRoute();

  if (route.name === 'menu') {
    return <MenuPage anchor={route.anchor} />;
  }

  return <AdminApp view={route.name === 'admin-dashboard' ? 'dashboard' : 'login'} />;
}
