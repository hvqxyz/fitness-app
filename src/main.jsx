import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Chart from 'chart.js/auto'
import './common/style.css'
import App from './App.jsx'

// common/workout-chart.js (reused as-is from the vanilla site) refers to the
// bare `Chart` global, which the vanilla pages get from a CDN <script> tag.
// Here Chart.js is an npm dependency instead, so expose it the same way.
window.Chart = Chart

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
