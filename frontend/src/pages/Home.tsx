import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* HERO SECTION */}
      <section className="bg-[#003A81] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl !text-white font-serif italic leading-tight">
            Navigate universities, manage applications, <br />
            and discover the best path for your academic journey — all in one place.
          </h1>

          <div className="mt-10 flex justify-center gap-4">
            <button
              className="px-6 py-3 bg-white text-[#003A81] rounded-lg font-semibold hover:bg-gray-200 transition"
              onClick={() => navigate("/signin")}
            >
              Log In
            </button>

            <button
              className="px-6 py-3 bg-[#5FB22E] rounded-lg font-semibold hover:bg-[#48A322] transition"
              onClick={() => navigate("/signup")}
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl font-bold text-[#003A81] mb-12 tracking-wide">
            Why students choose Kallisto
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-[#003A81]">Smart Search</h3>
              <p className="text-gray-600 mt-3">
                Filter universities by country, major, ranking, and more.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-[#003A81]">Application Tracker</h3>
              <p className="text-gray-600 mt-3">
                Manage all applications in one clean, organized dashboard.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-[#003A81]">Personalized Insights</h3>
              <p className="text-gray-600 mt-3">
                Get recommendations based on your preferences and profile.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
