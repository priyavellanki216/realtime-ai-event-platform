import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertsPage, AnomaliesPage, EventsPage, ModelsPage, OverviewPage, PipelinePage, TopologyPage } from "@/pages/platform";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <DashboardLayout><Switch><Route path="/" component={OverviewPage} /><Route path="/anomalies" component={AnomaliesPage} /><Route path="/topology" component={TopologyPage} /><Route path="/pipeline" component={PipelinePage} /><Route path="/models" component={ModelsPage} /><Route path="/events" component={EventsPage} /><Route path="/alerts" component={AlertsPage} /><Route component={OverviewPage} /></Switch></DashboardLayout>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster theme="dark" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
