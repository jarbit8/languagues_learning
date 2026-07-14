import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import TabBar from './components/TabBar'
import Inicio from './screens/Inicio'
import Aprender from './screens/Aprender'
import Examen from './screens/Examen'
import Hablar from './screens/Hablar'
import Progreso from './screens/Progreso'

export default function App() {
  return (
    <HashRouter>
      <div className="mx-auto flex min-h-full max-w-md flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <main className="flex-1 px-4 pb-24 pt-5">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/aprender" element={<Aprender />} />
            <Route path="/examen" element={<Examen />} />
            <Route path="/hablar" element={<Hablar />} />
            <Route path="/progreso" element={<Progreso />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </HashRouter>
  )
}
