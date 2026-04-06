import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import React, { lazy, Suspense } from "react";
import LoginPage from "./pages/LoginPage";
import ReleveurSelectPage from "./pages/ReleveurSelectPage";
import DashboardPage from "./pages/DashboardPage";
import BottomNav from "./components/BottomNav";
import NotFound from "./pages/NotFound";

const TourneePage = lazy(() => import("./pages/TourneePage"));
const RelevePage = lazy(() => import("./pages/RelevePage"));
const HistoriquePage = lazy(() => import("./pages/HistoriquePage"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const AidePage = lazy(() => import("./pages/AidePage"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, releveurSelected, selectReleveur } = useApp();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (!releveurSelected) {
    return (
      <ReleveurSelectPage
        onSelect={(releveur, sectionGeo, mobile) => {
          selectReleveur({
            id: releveur.id,
            nom: releveur.nom,
            prenom: releveur.prenom,
            matricule: releveur.matricule,
            tournee: '01',
            sectionGeo,
            mobile,
          });
        }}
      />
    );
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tournee" element={<TourneePage />} />
          <Route path="/releve/:id" element={<RelevePage />} />
          <Route path="/historique" element={<HistoriquePage />} />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/aide" element={<AidePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <div className="max-w-lg mx-auto min-h-screen bg-background">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
