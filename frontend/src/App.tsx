import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Error from "./pages/Error";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Search from "./pages/Search";
import UniversityDetail from "./pages/UniversityDetail";
import {NotFound, NotImplemented} from "./pages/Default";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/university/:universityName" element={<UniversityDetail />} />

      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/error" element={<Error />} />

      <Route path="/dashboard" element={<Dashboard />} />
      
      <Route path="/applications" element={<NotImplemented />} />

      <Route path="/*" element={<NotFound />} />
    </Routes>
  );
}
