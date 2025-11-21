import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import universitiesData from "../api/universities.json";
import "../styles/SearchBox.css";

const SearchBox: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fuzzySearch = (text: string, query: string): boolean =>
    !query || text.toLowerCase().includes(query.toLowerCase());

  const filteredUniversities = useMemo(
    () => universitiesData.filter((u: string) => fuzzySearch(u, searchTerm)),
    [searchTerm]
  );

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="Search universities..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {searchTerm && (
        <div className="results-container">
          {filteredUniversities.length > 0 ? (
            <ul className="results-list">
              {filteredUniversities.map((u, i) => (
                <li key={i} onClick={() => navigate(`/university/${encodeURIComponent(u)}`)}>
                  {u}
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-results">No universities found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
