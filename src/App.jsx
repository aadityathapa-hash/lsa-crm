import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import LeadExplorer from "./pages/LeadExplorer";
import AgentPerformance from "./pages/AgentPerformance";
import AgentDetail from "./pages/AgentDetail";
import MarketReports from "./pages/MarketReports";
import DailyReport from "./pages/DailyReport";
import AgentCallForm from "./pages/AgentCallForm";
import CsvUpload from "./pages/CsvUpload";
import Admin from "./pages/Admin";
import Exceptions from "./pages/Exceptions";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Layout><LeadExplorer /></Layout></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><Layout><AgentPerformance /></Layout></ProtectedRoute>} />
          <Route path="/agents/:agentId" element={<ProtectedRoute><Layout><AgentDetail /></Layout></ProtectedRoute>} />
          <Route path="/markets" element={<ProtectedRoute><Layout><MarketReports /></Layout></ProtectedRoute>} />
          <Route path="/daily" element={<ProtectedRoute><Layout><DailyReport /></Layout></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Layout><Exceptions /></Layout></ProtectedRoute>} />
          <Route path="/log-call" element={<ProtectedRoute roles={["admin","agent"]}><Layout><AgentCallForm /></Layout></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute roles={["admin"]}><Layout><CsvUpload /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Layout><Admin /></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
