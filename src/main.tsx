import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { inicializarApariencia } from './lib/apariencia'

inicializarApariencia()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
