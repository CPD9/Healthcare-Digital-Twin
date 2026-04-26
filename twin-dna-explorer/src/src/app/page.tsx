"use client";

import {
  Activity,
  Dna,
  MessageSquareHeart,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ChatRail,
  PANEL_CHIP_LABELS,
  type ChatMessage,
  type PanelKind,
} from "~/components/chat-rail";
import {
  DynamicInsightPanels,
  type ActivePanel,
} from "~/components/dynamic-insight-panels";
import GeneViewer from "~/components/gene-viewer";
import { TwinVisualizer } from "~/components/twin-visualizer";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  chatWithTwin,
  createTwinProfile,
  type ChromosomeFromSeach,
  type GeneFromSearch,
  type GenomeAssemblyFromSearch,
  type TwinProfileRequest,
  type TwinSimulationResponse,
  getAvailableGenomes,
  getGenomeChromosomes,
  searchGenes,
  simulateTwinProfile,
} from "~/utils/genome-api";
import { TERM_LABELS } from "~/utils/plain-language";

type Mode = "browse" | "search";
type DnaMode = "provided" | "unknown";
type InterventionFocus = "sleep" | "activity" | "stress";

export default function HomePage() {
  const [genomes, setGenomes] = useState<GenomeAssemblyFromSearch[]>([]);
  const [selectedGenome, setSelectedGenome] = useState<string>("hg38");
  const [chromosomes, setChromosomes] = useState<ChromosomeFromSeach[]>([]);
  const [selectedChromosome, setSelectedChromosome] = useState<string>("chr1");
  const [selectedGene, setSelectedGene] = useState<GeneFromSearch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeneFromSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("search");
  const [dnaMode, setDnaMode] = useState<DnaMode>("unknown");

  const [hasCompletedIntake, setHasCompletedIntake] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [twinError, setTwinError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const [twinProfile, setTwinProfile] = useState({
    name: "",
    age: "30",
    sleep_hours: "6.5",
    stress_level: "6",
    activity_minutes_per_week: "90",
    nutrition_quality: "3",
    smoking: "false",
    dna_summary: "",
  });
  const [interventionFocus, setInterventionFocus] =
    useState<InterventionFocus>("sleep");
  const [interventionDelta, setInterventionDelta] = useState("1");
  const [simulationResult, setSimulationResult] =
    useState<TwinSimulationResponse | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Dynamic injected panels
  const [activePanels, setActivePanels] = useState<ActivePanel[]>([]);

  const addPanel = (kind: PanelKind) => {
    setActivePanels((prev) => {
      if (prev.some((p) => p.kind === kind)) return prev;
      return [...prev, { id: `${kind}-${Date.now()}`, kind }];
    });
    // Scroll to bottom so the user sees the new panel
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const removePanel = (id: string) => {
    setActivePanels((prev) => prev.filter((p) => p.id !== id));
  };

  const getRiskBand = (riskScore: number) => {
    if (riskScore >= 0.7) return "Higher";
    if (riskScore >= 0.45) return "Moderate";
    return "Lower";
  };

  useEffect(() => {
    const fetchGenomes = async () => {
      try {
        setIsLoading(true);
        const data = await getAvailableGenomes();
        if (data.genomes?.Human) {
          setGenomes(data.genomes.Human);
        }
      } catch {
        setError("Failed to load genome data");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchGenomes();
  }, []);

  useEffect(() => {
    const fetchChromosomes = async () => {
      try {
        setIsLoading(true);
        const data = await getGenomeChromosomes(selectedGenome);
        setChromosomes(data.chromosomes);
        if (data.chromosomes.length > 0) {
          setSelectedChromosome(data.chromosomes[0]!.name);
        }
      } catch {
        setError("Failed to load chromosome data");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchChromosomes();
  }, [selectedGenome]);

  const performGeneSearch = async (
    query: string,
    genome: string,
    filterFn?: (gene: GeneFromSearch) => boolean,
  ) => {
    try {
      setIsLoading(true);
      const data = await searchGenes(query, genome);
      const results = filterFn ? data.results.filter(filterFn) : data.results;
      setSearchResults(results);
    } catch {
      setError("Failed to search genes. Try a gene symbol like BRCA1.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChromosome || mode !== "browse") return;
    void performGeneSearch(
      selectedChromosome,
      selectedGenome,
      (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
    );
  }, [selectedChromosome, selectedGenome, mode]);

  const handleGenomeChange = (value: string) => {
    setSelectedGenome(value);
    setSearchResults([]);
    setSelectedGene(null);
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setSearchResults([]);
    setSelectedGene(null);
    setError(null);
    if (newMode === "browse" && selectedChromosome) {
      void performGeneSearch(
        selectedChromosome,
        selectedGenome,
        (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
      );
    }
    setMode(newMode);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    void performGeneSearch(searchQuery, selectedGenome);
  };

  const loadBRCA1Example = () => {
    setMode("search");
    setSearchQuery("BRCA1");
    void performGeneSearch("BRCA1", selectedGenome);
  };

  const buildTwinProfilePayload = (): TwinProfileRequest => ({
    name: twinProfile.name.trim(),
    age: parseInt(twinProfile.age, 10),
    lifestyle: {
      sleep_hours: parseFloat(twinProfile.sleep_hours),
      stress_level: parseInt(twinProfile.stress_level, 10),
      activity_minutes_per_week: parseInt(
        twinProfile.activity_minutes_per_week,
        10,
      ),
      nutrition_quality: parseInt(twinProfile.nutrition_quality, 10),
      smoking: twinProfile.smoking === "true",
    },
    has_dna_data: dnaMode === "provided",
    genome_assembly: dnaMode === "provided" ? selectedGenome : undefined,
    dna_summary:
      dnaMode === "provided" && twinProfile.dna_summary.trim()
        ? twinProfile.dna_summary.trim()
        : undefined,
  });

  const runTwinSimulation = async (profile: TwinProfileRequest) => {
    const delta = parseFloat(interventionDelta);
    const cleanDelta = Number.isNaN(delta) ? 1 : delta;
    const result = await simulateTwinProfile({
      profile,
      intervention_focus: interventionFocus,
      intervention_delta: cleanDelta,
    });
    setSimulationResult(result);
    return result;
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwinError(null);
    setChatError(null);

    if (!twinProfile.name.trim()) {
      setTwinError("Please enter your name to create your Twin profile.");
      return;
    }
    const parsedAge = parseInt(twinProfile.age, 10);
    if (Number.isNaN(parsedAge) || parsedAge < 18 || parsedAge > 110) {
      setTwinError("Please enter a valid age between 18 and 110.");
      return;
    }

    const payload = buildTwinProfilePayload();
    try {
      setIsSubmittingIntake(true);
      await createTwinProfile(payload);
      const result = await runTwinSimulation(payload);
      setHasCompletedIntake(true);
      setChatMessages([
        {
          role: "assistant",
          content: `Hi ${payload.name}, your Twin is ready. Baseline risk is ${getRiskBand(result.current_state_summary.baseline_risk_score).toLowerCase()}. Ask me what to change this week, or explore your DNA variants below.`,
        },
      ]);
    } catch (err) {
      setTwinError(err instanceof Error ? err.message : "Failed to create Twin.");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const handleRefreshSimulation = async () => {
    if (!hasCompletedIntake) return;
    setTwinError(null);
    try {
      setIsSubmittingIntake(true);
      const payload = buildTwinProfilePayload();
      await runTwinSimulation(payload);
    } catch (err) {
      setTwinError(
        err instanceof Error ? err.message : "Failed to refresh simulation.",
      );
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !simulationResult) return;

    const message = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      setIsChatLoading(true);
      const response = await chatWithTwin({
        message,
        profile: buildTwinProfilePayload(),
        simulation: simulationResult,
      });

      // Build panel trigger chips from the intent response
      const panelTriggers = (response.ui_intents ?? []).map((intent) => ({
        kind: intent.panel_type as PanelKind,
        label:
          PANEL_CHIP_LABELS[intent.panel_type as PanelKind] ??
          intent.panel_type,
      }));

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.assistant_message,
          actionSuggestion: response.action_suggestion,
          expectedImpact: response.expected_impact,
          uncertaintyNote: response.uncertainty_note,
          safetyNote: response.safety_note,
          panelTriggers: panelTriggers.length > 0 ? panelTriggers : undefined,
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "Failed to message Twin chat.",
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── DNA explorer cards (reused in both pre- and post-intake layouts) ─────────
  const dnaExplorerCards = (
    <>
      <Card className="gap-0 border-none bg-white py-0 shadow-sm">
        <CardHeader className="pt-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
              Step 5 - DNA data explorer (advanced)
            </CardTitle>
            <div className="text-xs text-[#3c4f3d]/60">
              Organism: <span className="font-medium">Human</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <Select
            value={selectedGenome}
            onValueChange={handleGenomeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="h-9 w-full border-[#3c4f3d]/10">
              <SelectValue placeholder="Select genome assembly" />
            </SelectTrigger>
            <SelectContent>
              {genomes.map((genome) => (
                <SelectItem key={genome.id} value={genome.id}>
                  {genome.id} - {genome.name}
                  {genome.active ? " (active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGenome && (
            <p className="mt-2 text-xs text-[#3c4f3d]/60">
              {TERM_LABELS.genomeAssembly.subtitle}.{" "}
              {genomes.find((g) => g.id === selectedGenome)?.sourceName}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 border-none bg-white py-0 shadow-sm">
        <CardHeader className="pt-4 pb-2">
          <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
            Step 6 - Explore DNA signals
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <Tabs
            value={mode}
            onValueChange={(value) => switchMode(value as Mode)}
          >
            <TabsList className="mb-4 bg-[#e9eeea]">
              <TabsTrigger
                className="data-[state=active]:bg-white data-[state=active]:text-[#3c4f3d]"
                value="search"
              >
                Search Gene Signals
              </TabsTrigger>
              <TabsTrigger
                className="data-[state=active]:bg-white data-[state=active]:text-[#3c4f3d]"
                value="browse"
              >
                Browse by Chromosome
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-0">
              <div className="space-y-4">
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Enter gene symbol or name (e.g. BRCA1)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 border-[#3c4f3d]/10 pr-10"
                    />
                    <Button
                      type="submit"
                      className="absolute top-0 right-0 h-full cursor-pointer rounded-l-none bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90"
                      size="icon"
                      disabled={isLoading || !searchQuery.trim()}
                    >
                      <Search className="h-4 w-4" />
                      <span className="sr-only">Search</span>
                    </Button>
                  </div>
                </form>
                <Button
                  variant="link"
                  className="h-auto cursor-pointer p-0 text-[#de8246] hover:text-[#de8246]/80"
                  onClick={loadBRCA1Example}
                >
                  Try BRCA1 baseline signal
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="browse" className="mt-0">
              <div className="max-h-[150px] overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {chromosomes.map((chrom) => (
                    <Button
                      key={chrom.name}
                      variant="outline"
                      size="sm"
                      className={`h-8 cursor-pointer border-[#3c4f3d]/10 hover:bg-[#e9eeea] hover:text-[#3c4f3d] ${selectedChromosome === chrom.name ? "bg-[#e9eeea] text-[#3c4f3d]" : ""}`}
                      onClick={() => setSelectedChromosome(chrom.name)}
                    >
                      {chrom.name}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3c4f3d]/30 border-t-[#de8243]" />
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {searchResults.length > 0 && !isLoading && (
            <div className="mt-6">
              <div className="mb-2">
                <h4 className="text-xs font-normal text-[#3c4f3d]/70">
                  {mode === "search" ? (
                    <>
                      Search Results:{" "}
                      <span className="font-medium text-[#3c4f3d]">
                        {searchResults.length} genes
                      </span>
                    </>
                  ) : (
                    <>
                      Genes on {selectedChromosome}:{" "}
                      <span className="font-medium text-[#3c4f3d]">
                        {searchResults.length} found
                      </span>
                    </>
                  )}
                </h4>
              </div>

              <div className="overflow-hidden rounded-md border border-[#3c4f3d]/5">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#e9eeea]/50 hover:bg-[e9eeea]/70">
                      <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                        Symbol
                      </TableHead>
                      <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                        Location
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((gene, index) => (
                      <TableRow
                        key={`${gene.symbol}-${index}`}
                        className="cursor-pointer border-b border-[#3c4f3d]/5 hover:bg-[#e9eeea]/50"
                        onClick={() => setSelectedGene(gene)}
                      >
                        <TableCell className="py-2 font-medium text-[#3c4f3d]">
                          {gene.symbol}
                        </TableCell>
                        <TableCell className="py-2 font-medium text-[#3c4f3d]">
                          {gene.name}
                        </TableCell>
                        <TableCell className="py-2 font-medium text-[#3c4f3d]">
                          {gene.chrom}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!isLoading && !error && searchResults.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center text-center text-gray-400">
              <Search className="mb-4 h-10 w-10 text-gray-400" />
              <p className="text-sm leading-relaxed">
                {mode === "search"
                  ? "Search a gene to open the current Twin baseline workflow"
                  : selectedChromosome
                    ? "No genes found on this chromosome for this assembly"
                    : "Select a chromosome to inspect available genes"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-[#e9eeea]">
      <header className="border-b border-[#3c4f3d]/10 bg-white">
        <div className="container mx-auto px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-wide text-[#3c4f3d]">
                Twin
              </h1>
              <p className="text-sm text-[#3c4f3d]/70">
                Your future-health twin, explained in everyday language
              </p>
            </div>
            <div className="text-xs text-[#3c4f3d]/60">
              Monash demo base: Next.js UI + Modal Evo2 inference
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {selectedGene ? (
          <GeneViewer
            gene={selectedGene}
            genomeId={selectedGenome}
            onClose={() => setSelectedGene(null)}
            twinProfile={hasCompletedIntake ? buildTwinProfilePayload() : undefined}
            simulationResult={simulationResult ?? undefined}
          />
        ) : (
          <>
            {/* ── Explainer card ────────────────────────────────────────── */}
            <Card className="mb-6 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                  How the twin works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <p className="text-sm text-[#3c4f3d]/80">
                  We combine your lifestyle inputs and optional DNA insights to
                  estimate risk trends and suggest practical next steps.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[#3c4f3d]">
                      <MessageSquareHeart className="h-4 w-4 text-[#de8246]" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Your inputs
                      </span>
                    </div>
                    <p className="text-xs text-[#3c4f3d]/75">
                      You share your habits and, if available, selected DNA
                      information.
                    </p>
                  </div>
                  <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[#3c4f3d]">
                      <Dna className="h-4 w-4 text-[#de8246]" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Risk engine
                      </span>
                    </div>
                    <p className="text-xs text-[#3c4f3d]/75">
                      Evo2 estimates whether selected DNA changes may raise or
                      lower risk.
                    </p>
                  </div>
                  <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[#3c4f3d]">
                      <Activity className="h-4 w-4 text-[#de8246]" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Action guidance
                      </span>
                    </div>
                    <p className="text-xs text-[#3c4f3d]/75">
                      The twin turns scores into weekly actions and plain-language
                      explanations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Intake CTA banner (shown only before intake) ──────────── */}
            {!hasCompletedIntake && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#de8246]/30 bg-[#de8246]/5 px-4 py-3">
                <span className="text-lg">👇</span>
                <p className="text-sm text-[#3c4f3d]">
                  <span className="font-medium">Complete Step 1 below</span> to
                  unlock the split dashboard and your personal chat twin.
                </p>
              </div>
            )}

            {/* ── Intake form ───────────────────────────────────────────── */}
            <Card className="mb-6 gap-0 border-none bg-white py-0 shadow-sm">
              <CardHeader className="pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                    Step 1 - Tell us about your current routine
                  </CardTitle>
                  {hasCompletedIntake && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      Twin active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={handleIntakeSubmit}
                >
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Name
                    </label>
                    <Input
                      value={twinProfile.name}
                      onChange={(e) =>
                        setTwinProfile((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Age
                    </label>
                    <Input
                      value={twinProfile.age}
                      onChange={(e) =>
                        setTwinProfile((prev) => ({
                          ...prev,
                          age: e.target.value,
                        }))
                      }
                      type="number"
                      min={18}
                      max={110}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Average sleep (hours/night)
                    </label>
                    <Input
                      value={twinProfile.sleep_hours}
                      onChange={(e) =>
                        setTwinProfile((prev) => ({
                          ...prev,
                          sleep_hours: e.target.value,
                        }))
                      }
                      type="number"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Stress (1-10)
                    </label>
                    <Input
                      value={twinProfile.stress_level}
                      onChange={(e) =>
                        setTwinProfile((prev) => ({
                          ...prev,
                          stress_level: e.target.value,
                        }))
                      }
                      type="number"
                      min={1}
                      max={10}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Activity (minutes/week)
                    </label>
                    <Input
                      value={twinProfile.activity_minutes_per_week}
                      onChange={(e) =>
                        setTwinProfile((prev) => ({
                          ...prev,
                          activity_minutes_per_week: e.target.value,
                        }))
                      }
                      type="number"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Nutrition quality (1-5)
                    </label>
                    <Input
                      value={twinProfile.nutrition_quality}
                      onChange={(e) =>
                        setTwinProfile((prev) => ({
                          ...prev,
                          nutrition_quality: e.target.value,
                        }))
                      }
                      type="number"
                      min={1}
                      max={5}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      Smoking
                    </label>
                    <Select
                      value={twinProfile.smoking}
                      onValueChange={(value) =>
                        setTwinProfile((prev) => ({ ...prev, smoking: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                      DNA information
                    </label>
                    <Select
                      value={dnaMode}
                      onValueChange={(value) => setDnaMode(value as DnaMode)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">
                          I don&apos;t know / skip for now
                        </SelectItem>
                        <SelectItem value="provided">I have DNA data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dnaMode === "provided" && (
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-[#3c4f3d]/70">
                        DNA notes (optional)
                      </label>
                      <Input
                        value={twinProfile.dna_summary}
                        onChange={(e) =>
                          setTwinProfile((prev) => ({
                            ...prev,
                            dna_summary: e.target.value,
                          }))
                        }
                        placeholder="e.g. BRCA1 known family history or selected variants"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2 space-y-2">
                    <Button
                      type="submit"
                      className="cursor-pointer bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90"
                      disabled={isSubmittingIntake}
                    >
                      {isSubmittingIntake
                        ? "Creating your twin..."
                        : hasCompletedIntake
                          ? "Update my twin"
                          : "Create my twin baseline"}
                    </Button>
                    {!hasCompletedIntake && (
                      <p className="text-xs text-[#3c4f3d]/60">
                        After this, your dashboard and chat twin will appear side by side.
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {twinError && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {twinError}
              </div>
            )}

            {/* ── POST-INTAKE: split layout ─────────────────────────────── */}
            {hasCompletedIntake && simulationResult ? (
              <>
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                  {/* LEFT column: dashboard cards */}
                  <div className="min-w-0 flex-1 space-y-6">
                    {/* Step 2: future health trend */}
                    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
                      <CardHeader className="pt-4 pb-2">
                        <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                          Step 2 - See your future health trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pb-4">
                        <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/30 p-3">
                          <p className="text-xs text-[#3c4f3d]/70">Main takeaway</p>
                          <p className="text-sm font-medium text-[#3c4f3d]">
                            Your current trend looks{" "}
                            {getRiskBand(
                              simulationResult.current_state_summary
                                .baseline_risk_score,
                            ).toLowerCase()}{" "}
                            risk, and this scenario could improve your 5-year score
                            by {simulationResult.delta.health_index_gain_5y} points.
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                            <p className="text-xs text-[#3c4f3d]/70">
                              Personalization level
                            </p>
                            <p className="text-sm font-medium text-[#3c4f3d]">
                              {simulationResult.confidence_tier === "enhanced"
                                ? "Genome-enhanced"
                                : "Lifestyle-only"}
                            </p>
                          </div>
                          <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                            <p className="text-xs text-[#3c4f3d]/70">
                              Baseline risk
                            </p>
                            <p className="text-sm font-medium text-[#3c4f3d]">
                              {getRiskBand(
                                simulationResult.current_state_summary
                                  .baseline_risk_score,
                              )}
                            </p>
                          </div>
                          <div className="rounded-md border border-[#3c4f3d]/10 bg-[#e9eeea]/40 p-3">
                            <p className="text-xs text-[#3c4f3d]/70">5Y gain</p>
                            <p className="text-sm font-medium text-[#3c4f3d]">
                              +{simulationResult.delta.health_index_gain_5y}{" "}
                              projected points
                            </p>
                          </div>
                        </div>
                        <details className="rounded-md border border-[#3c4f3d]/10 bg-white p-3">
                          <summary className="cursor-pointer text-xs font-medium text-[#3c4f3d]">
                            Scientific details
                          </summary>
                          <p className="mt-2 text-xs text-[#3c4f3d]/70">
                            Baseline risk score:{" "}
                            {
                              simulationResult.current_state_summary
                                .baseline_risk_score
                            }
                            . Risk reduction delta:{" "}
                            {simulationResult.delta.risk_reduction}. Confidence
                            tier: {simulationResult.confidence_tier}.
                          </p>
                        </details>
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px]">
                          <Select
                            value={interventionFocus}
                            onValueChange={(value) =>
                              setInterventionFocus(value as InterventionFocus)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Intervention focus" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sleep">Improve sleep</SelectItem>
                              <SelectItem value="activity">
                                Increase activity
                              </SelectItem>
                              <SelectItem value="stress">Reduce stress</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={interventionDelta}
                            onChange={(e) =>
                              setInterventionDelta(e.target.value)
                            }
                            type="number"
                            step="0.5"
                            placeholder="Delta"
                          />
                          <Button
                            className="cursor-pointer bg-[#de8246] text-white hover:bg-[#de8246]/90"
                            onClick={handleRefreshSimulation}
                            disabled={isSubmittingIntake}
                          >
                            Re-run
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Step 3: 3D twin visual */}
                    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
                      <CardHeader className="pt-4 pb-2">
                        <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                          Step 3 - View your digital twin
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <TwinVisualizer
                          genomeAssembly={selectedGenome}
                          chromosome={selectedChromosome}
                          geneSymbol={searchQuery.trim() || undefined}
                        />
                      </CardContent>
                    </Card>

                    {/* Steps 5 + 6: DNA explorer */}
                    {dnaExplorerCards}
                  </div>

                  {/* RIGHT column: sticky chat rail */}
                  <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-5rem)] xl:w-[420px] xl:shrink-0">
                    <ChatRail
                      profileName={twinProfile.name}
                      messages={chatMessages}
                      isLoading={isChatLoading}
                      input={chatInput}
                      error={chatError}
                      disabled={isChatLoading || !simulationResult}
                      onInputChange={setChatInput}
                      onSend={() => void handleSendChat()}
                      onAddPanel={addPanel}
                    />
                  </div>
                </div>

                {/* Dynamic panels injected below the split */}
                <DynamicInsightPanels
                  panels={activePanels}
                  genomeId={selectedGenome}
                  onRemovePanel={removePanel}
                />
              </>
            ) : (
              /* ── PRE-INTAKE: show DNA explorer below form ─────────────── */
              <div className="space-y-6">{dnaExplorerCards}</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
