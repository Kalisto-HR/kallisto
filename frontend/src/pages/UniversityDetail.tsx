import { useParams } from "react-router-dom";

export default function UniversityDetail() {
  const { universityName } = useParams();
  const decoded = universityName ? decodeURIComponent(universityName) : "";

  return (
    <div className="page-container">
      <h1>{decoded}</h1>
      <div className="card">
        <p>Information about {decoded} will appear here.</p>
        <button className="btn btn-primary" onClick={()=>alert("More details coming soon!")}>
          View Programs
        </button>
      </div>
    </div>
  );
}
