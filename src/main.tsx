import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createHashRouter } from 'react-router-dom'
import App from './App'
import Home from './routes/Home'
import TripDetail from './routes/TripDetail'
import TripExport from './routes/TripExport'
import TripBudget from './routes/TripBudget'
import TripPacking from './routes/TripPacking'
import './index.css'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'trips/:id', element: <TripDetail /> },
      { path: 'trips/:id/budget', element: <TripBudget /> },
      { path: 'trips/:id/packing', element: <TripPacking /> },
      { path: 'trips/:id/export', element: <TripExport /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
