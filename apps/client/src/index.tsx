import { render } from 'solid-js/web';
import { lazy } from 'solid-js';
import { Router } from '@solidjs/router';
import './assets/style/index.css';
// import { Toaster } from 'solid-toast';

const routes = [
  {
    path: '/',
    component: lazy(() => import('./routes/lobby')),
    // component: lazy(() => import('./routes/test')),
  },
  {
    path: '/room/:id',
    component: lazy(() => import('./routes/room')),
  },
];

const root = document.getElementById('root');
if (root) {
  render(
    () => (
      <div>
        <Router>{routes}</Router>
        {/*<Toaster />*/}
      </div>
    ),
    root,
  );
}
