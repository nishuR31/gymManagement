import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { FloatingDock } from './FloatingDock';
import { PublicFloatingDock } from './PublicFloatingDock';

export function AppDock() {
  const token = useAppSelector((state) => state.auth.token);
  return token ? <FloatingDock /> : <PublicFloatingDock />;
}
