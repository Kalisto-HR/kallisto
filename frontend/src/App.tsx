// App.tsx - main routing configuration with auth protection
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Error from "./pages/Error";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Search from "./pages/Search";
import UniversityDetail from "./pages/UniversityDetail";
import Applications from "./pages/Applications";
import ApplicationDetail from "./pages/ApplicationDetail";
import { NotFound } from "./pages/Default";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/university/:id" element={<UniversityDetail />} />

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/error" element={<Error />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/applications" element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        } />
        <Route path="/applications/:universityId/:cycle" element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        } />
        <Route path="/applications/:universityId/:cycle/edit" element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        } />

        <Route path="/*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
