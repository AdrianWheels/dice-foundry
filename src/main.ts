import './ui/styles.css';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { createScene } from './render/scene';
import { createTable } from './render/table';
import { APP_VERSION } from './app/version';

async function boot(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app no existe');
  const status = document.createElement('p');
  status.dataset.testid = 'boot-status';
  status.textContent = 'Cargando…';
  app.append(status);

  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.step();
  world.free();

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(64, 64, false);
  renderer.dispose();

  status.textContent = `OK rapier+three v${APP_VERSION}`;
}

/** Banco de pruebas de la escena (Tarea 14): `/?dev=scene`. */
function devScene(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const ctx = createScene(canvas);
  createTable(ctx.scene);
  const tick = (): void => {
    ctx.render();
    requestAnimationFrame(tick);
  };
  tick();
  const status = document.createElement('p');
  status.dataset.testid = 'boot-status';
  status.textContent = 'OK scene';
  document.getElementById('app')?.append(status);
}

const params = new URLSearchParams(location.search);
if (params.get('dev') === 'scene') {
  devScene();
} else {
  boot().catch((err: unknown) => {
    const status = document.querySelector('[data-testid="boot-status"]');
    if (status) status.textContent = `ERROR ${String(err)}`;
    console.error(err);
  });
}
