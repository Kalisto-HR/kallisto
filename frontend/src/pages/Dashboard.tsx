import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import avatarIcon from "../assets/avatar.svg";
import { api } from "../api/client";

const topMenuItems = ["Settings", "Personal Info", "Search", "Applications"];
const leftMenuItems: Record<string, string[]> = {
  Settings: ["Theme", "Notifications", "Privacy"],
  "Personal Info": ["Name", "Email", "Siblings", "Passport"],
  Search: ["Filter by Country", "Filter by Major", "Sort by Ranking"],
  Applications: ["University A", "University B", "University C"],
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedTop, setSelectedTop] = useState("Settings");
  const [selectedLeft, setSelectedLeft] = useState(leftMenuItems[selectedTop][0]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api("/v1.0/profile", { method: "GET" });

        if (res.ok && res.data && res.data.user_meta.first_name) {
          setUserName(res.data.user_meta.first_name);
        } else if (res.status === 401) {
          // Unauthorized → redirect to /signin
          navigate("/signin");
        } else {
          // Other errors → redirect to generic error page
          navigate("/error", {
            state: {
              code: res.status,
              title: "Aw Snap!",
              message: res.data?.msg || "Failed to fetch profile",
            },
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        navigate("/error", {
          state: {
            code: 500,
            title: "Aw Snap!",
            message: "Failed to fetch profile due to network error",
          },
        });
      }
    };

    fetchProfile();
  }, [navigate]);

  return (
    <Layout>
      {/* Top Menu */}<header className="bg-[#003A81] text-white px-4 md:px-10 py-4 shadow">
  {/* Top line: welcome left, avatar right */}
  <div className="flex justify-between items-center w-full">
    {/* Left: Welcome message */}
    {userName && (
      <span className="text-white font-serif italic leading-tight text-sm md:text-base">
        Welcome, {userName}!
      </span>
    )}

    {/* Right: Avatar */}
    <img
      src={avatarIcon}
      alt="User avatar"
      className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white p-1"
    />
  </div>

  {/* Navigation buttons below avatar, aligned to right */}
  <div className="flex w-full mt-2">
    <nav className="flex gap-2 ml-auto flex-wrap">
      {topMenuItems.map((item) => (
        <button
          key={item}
          onClick={() => {
            setSelectedTop(item);
            setSelectedLeft(leftMenuItems[item][0]);
          }}
          className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition ${
            selectedTop === item
              ? "bg-[#5FB22E] text-white"
              : "hover:bg-[#006D3E]/60"
          }`}
        >
          {item}
        </button>
      ))}
    </nav>
  </div>
</header>



      {/* Body Layout */}
      <div className="flex flex-col md:flex-row p-4 gap-6">
        {/* LEFT SIDEBAR */}
        <aside className="md:w-64 bg-white p-4 rounded-xl shadow space-y-2">
          {leftMenuItems[selectedTop].map((leftItem) => (
            <button
              key={leftItem}
              onClick={() => setSelectedLeft(leftItem)}
              className={`block w-full text-left px-4 py-3 rounded-md font-medium transition ${
                selectedLeft === leftItem ? "bg-[#5FB22E] text-white" : "hover:bg-[#006D3E]/20"
              }`}
            >
              {leftItem}
            </button>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-[#003A81] tracking-wide">
              {selectedLeft}
            </h2>

            {/* GRID OF CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {["University A", "University B", "University C"].map((u) => (
                <div
                  key={u}
                  className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold text-[#003A81]">{u}</h3>
                  <p className="text-gray-600 mt-2">Application details...</p>
                  <button className="mt-4 px-4 py-2 bg-[#006D3E] text-white rounded-md hover:bg-[#5FB22E] transition">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
