import React from 'react';
import 'antd/dist/antd.css';
import ReactDOM from 'react-dom';

import type { DevtoolActions } from '../panel/devtool-actions';
import type { CanvasTree } from '../shared/types';
import App from './App';

export function mountDevtool(container: Element, data: CanvasTree[], actions: DevtoolActions): void {
  ReactDOM.render(<App data={data} actions={actions} />, container);
}
