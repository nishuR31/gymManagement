
import { useAppSelector } from '../../store/hooks';
import { FloatingDock } from './FloatingDock';
import { PublicFloatingDock } from './PublicFloatingDock';

export function AppDock() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  return accessToken ? <FloatingDock /> : <PublicFloatingDock />;
}
