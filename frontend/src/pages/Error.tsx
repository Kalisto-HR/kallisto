import { useLocation, useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { code: number; title: string; message: string };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-6xl font-bold text-[#003A81]">{state?.code || "500"}</h1>
      <h2 className="text-3xl mt-4 font-semibold">{state?.title || "Aw Snap!"}</h2>
      <p className="mt-2 text-gray-700 text-center max-w-md">{state?.message || "Something went wrong"}</p>
      <button
        onClick={() => navigate("/signin")}
        className="mt-6 px-6 py-3 bg-[#5FB22E] text-white rounded-lg hover:bg-blue-700 transition"
      >
        Go to Sign In
      </button>
    </div>
  );
}
/*
import { useLocation, useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { code: number; title: string; message: string };

  return (
    <div className="h-screen flex flex-col justify-center items-center text-[#003A81] px-4">
      <h1 className="text-6xl font-bold text-[#006D3E]">{state?.code || "500"}</h1>
      <h2 className="text-3xl mt-4 font-semibold text-white">{state?.title || "Aw Snap!"}</h2>
      <p className="mt-2 text-white text-center max-w-md">{state?.message || "Something went wrong"}</p>
      <button
        onClick={() => navigate("/")}
        className="mt-6 px-6 py-3 bg-[#5FB22E] text-white rounded-lg hover:bg-[#006D3E] transition"
      >
        Take Me Home :(
      </button>
    </div>
  );
}
  */
